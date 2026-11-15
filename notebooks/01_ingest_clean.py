# Databricks notebook source
# MAGIC %md
# MAGIC # Offload Planner: 01 Ingest and clean NYC 911 data
# MAGIC Pulls every Friday-night (6 PM to 6 AM) EMS call in Brooklyn from NYC Open Data, keeps the
# MAGIC 11 zip codes around our three ERs (A, B, C), cleans it, and saves a Delta table.
# MAGIC This mirrors `pipeline/fetch.py` and `pipeline/clean.py` in the repo.
# MAGIC
# MAGIC **Output:** `workspace.default.brooklyn_friday_calls` plus the real numbers the digital twin is calibrated to.

# COMMAND ----------

# Settings (same values as pipeline/config.py: swap these to build another city's twin)
SOCRATA_URL = "https://data.cityofnewyork.us/resource/76xm-jjuj.json"
BOROUGH = "BROOKLYN"
START, END = "2024-01-01", "2026-10-02"
HOSPITALS = [  # anonymized: never named in the app
    {"id": "A", "lat": 40.65577, "lon": -73.94523},
    {"id": "B", "lat": 40.65524, "lon": -73.91221},
    {"id": "C", "lat": 40.67802, "lon": -73.93851},
]
AREA_RADIUS_KM = 2.5
TABLE = "workspace.default.brooklyn_friday_calls"
FALLBACK_PARQUET = "/Volumes/workspace/default/raw/fridays.parquet"  # only used if the download is blocked

# COMMAND ----------

# MAGIC %md ## 1. Download Friday-night calls (after-midnight half included)

# COMMAND ----------

import io
import numpy as np
import pandas as pd
import requests

COLUMNS = ["incident_id", "incident_datetime", "initial_severity_level_code", "zipcode",
           "valid_incident_rspns_time_indc", "incident_response_seconds_qy",
           "first_hosp_arrival_datetime", "incident_close_datetime"]
WHERE = (f"borough='{BOROUGH}' AND incident_datetime >= '{START}T00:00:00' AND incident_datetime < '{END}T00:00:00' "
         "AND ((date_extract_dow(incident_datetime)=5 AND date_extract_hh(incident_datetime)>=18) "
         "OR (date_extract_dow(incident_datetime)=6 AND date_extract_hh(incident_datetime)<6))")

def download() -> pd.DataFrame:
    rows, offset = [], 0
    while True:
        r = requests.get(SOCRATA_URL, params={"$select": ",".join(COLUMNS), "$where": WHERE,
                         "$order": "incident_id", "$limit": 50000, "$offset": offset}, timeout=120)
        r.raise_for_status()
        page = r.json()
        if not page:
            return pd.DataFrame(rows)
        rows += page
        offset += 50000

try:
    raw = download()
    print("downloaded", len(raw), "rows from NYC Open Data")
except Exception as e:
    print("download blocked, reading the uploaded file instead:", e)
    raw = pd.read_parquet(FALLBACK_PARQUET)
print(len(raw), "raw rows")

# COMMAND ----------

# MAGIC %md ## 2. Clean: night time, response time, time at hospital

# COMMAND ----------

ts = pd.to_datetime(raw["incident_datetime"])
night_start = (ts - pd.Timedelta(hours=18)).dt.normalize() + pd.Timedelta(hours=18)  # 1:30 AM Sat -> Fri night
df = pd.DataFrame({
    "incident_id": raw["incident_id"].astype(str),
    "night": night_start.dt.date,
    "t": (ts - night_start).dt.total_seconds() / 60,              # minutes since 6 PM
    "zip": raw["zipcode"].astype("string"),
    "severity": pd.to_numeric(raw["initial_severity_level_code"], errors="coerce").fillna(9).astype(int),
})
arrive = pd.to_datetime(raw["first_hosp_arrival_datetime"])
close = pd.to_datetime(raw["incident_close_datetime"])
df["transport"] = arrive.notna().to_numpy()
resp = pd.to_numeric(raw["incident_response_seconds_qy"], errors="coerce") / 60
df["response_min"] = resp.where(raw["valid_incident_rspns_time_indc"] == "Y").to_numpy()
tah = (close - arrive).dt.total_seconds() / 60
df["time_at_hosp_min"] = tah.where((tah > 0) & (tah <= 600)).to_numpy()   # drop impossible values
df = df[(df.t >= 0) & (df.t <= 720)]

# COMMAND ----------

# MAGIC %md ## 3. Keep the 11 zip codes within 2.5 km of ER A/B/C, place calls, assign nearest ER

# COMMAND ----------

CENTROIDS_CSV = """zip,lat,lon
11201,40.6937,-73.989859
11203,40.649569,-73.934327
11204,40.618815,-73.984942
11205,40.696891,-73.968074
11206,40.70187,-73.942552
11207,40.670157,-73.893835
11208,40.674847,-73.87248
11209,40.621803,-74.03015
11210,40.62806,-73.946309
11211,40.714084,-73.945168
11212,40.662905,-73.913071
11213,40.671155,-73.936266
11214,40.59969,-73.996372
11215,40.662688,-73.98674
11216,40.680844,-73.949222
11217,40.681671,-73.978529
11218,40.64312,-73.976446
11219,40.63262,-73.99677
11220,40.641026,-74.016688
11221,40.691426,-73.927626
11222,40.72779,-73.947605
11223,40.597091,-73.973469
11224,40.577372,-73.988706
11225,40.663119,-73.953867
11226,40.646409,-73.956663
11228,40.616725,-74.013432
11229,40.601293,-73.944493
11230,40.622089,-73.96519
11231,40.677916,-74.005154
11232,40.656541,-74.005182
11233,40.678301,-73.919932
11234,40.607723,-73.910649
11235,40.58422,-73.943167
11236,40.639413,-73.900664
11237,40.70416,-73.921139
11238,40.671331,-73.965937
11239,40.64689,-73.864014
11249,40.704501,-73.966002"""
cents = pd.read_csv(io.StringIO(CENTROIDS_CSV), dtype={"zip": str})

def km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = np.sin((lat2 - lat1) / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    return 6371 * 2 * np.arcsin(np.sqrt(a))

near = np.min([km(cents.lat.values, cents.lon.values, h["lat"], h["lon"]) for h in HOSPITALS], axis=0)
area = cents[near <= AREA_RADIUS_KM]
calls = df.merge(area, on="zip", how="inner").sort_values("incident_id").reset_index(drop=True)
rng = np.random.default_rng(0)
calls["lat"] += rng.uniform(-0.004, 0.004, len(calls))
calls["lon"] += rng.uniform(-0.004, 0.004, len(calls))
d = np.stack([km(calls.lat.values, calls.lon.values, h["lat"], h["lon"]) for h in HOSPITALS], axis=1)
calls["hosp"] = [HOSPITALS[i]["id"] for i in d.argmin(axis=1)]
calls["urgent"] = calls.severity <= 3
print(len(area), "zips,", len(calls), "calls,", calls.night.nunique(), "Friday nights")

# COMMAND ----------

# MAGIC %md ## 4. Save as a Delta table

# COMMAND ----------

spark.createDataFrame(calls.astype({"zip": str})).write.mode("overwrite").option("overwriteSchema", "true").saveAsTable(TABLE)
display(spark.table(TABLE).limit(20))

# COMMAND ----------

# MAGIC %md ## 5. The real numbers our digital twin must match

# COMMAND ----------

display(spark.sql(f"""
  SELECT round(percentile_approx(response_min, 0.5), 1)     AS median_response_min,
         round(percentile_approx(time_at_hosp_min, 0.5), 1) AS median_time_at_hospital_min,
         count(*)                                           AS calls,
         round(avg(CAST(urgent AS INT)) * 100, 1)           AS pct_urgent
  FROM {TABLE}"""))

# COMMAND ----------

# MAGIC %md ## 6. When does time at hospital spike? (median by hour of the night, per ER)

# COMMAND ----------

display(spark.sql(f"""
  SELECT hosp, floor(t / 60) AS hours_after_6pm,
         round(percentile_approx(time_at_hosp_min, 0.5), 1) AS median_time_at_hospital_min,
         count(*) AS calls
  FROM {TABLE} WHERE time_at_hosp_min IS NOT NULL
  GROUP BY hosp, hours_after_6pm ORDER BY hosp, hours_after_6pm"""))
