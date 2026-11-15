# Databricks notebook source
# MAGIC %md
# MAGIC # Offload Planner: 02 What the data says (problem → evidence → the planner's options)
# MAGIC Reads the Delta table from notebook 01 (`workspace.default.brooklyn_friday_calls`).
# MAGIC Every chart is tagged **REAL** (NYC 911 data) or **SIM** (our digital twin).
# MAGIC
# MAGIC 1. How much ambulance time is lost at hospitals? (REAL)
# MAGIC 2. When in the night does it pile up, and at which ER? (REAL)
# MAGIC 3. Are holiday weekends worse? (REAL)
# MAGIC 4. Honest check: do busier-at-hospital hours mean more late urgent patients here? (REAL)
# MAGIC 5. Which neighbourhoods wait longest? (REAL)
# MAGIC 6. What the planner compared, and what it picks (SIM)

# COMMAND ----------

import json
from datetime import date
import pandas as pd

TABLE = "workspace.default.brooklyn_friday_calls"
calls = spark.table(TABLE).toPandas()
calls["night"] = pd.to_datetime(calls["night"]).dt.date
calls["hour"] = (calls["t"] // 60).astype(int).clip(0, 11)          # hours after 6 PM
calls["late"] = calls["urgent"] & (calls["response_min"] > 10)
print(len(calls), "calls on", calls.night.nunique(), "Friday nights")

# COMMAND ----------

# MAGIC %md ## 1. How much ambulance time is lost at hospitals? (REAL)
# MAGIC Time at hospital = arrival → crew clears the call (includes waiting to hand over, handover and paperwork).
# MAGIC The widely used benchmark for the handover itself is 20 minutes.

# COMMAND ----------

per_night = (calls.groupby("night")
             .agg(calls=("incident_id", "count"),
                  ambulance_hours_at_hospital=("time_at_hosp_min", lambda s: s.sum() / 60))
             .reset_index())
tah = calls["time_at_hosp_min"].dropna()
summary = pd.DataFrame([{
    "median_minutes_at_hospital": round(tah.median(), 1),
    "pct_stays_over_30_min": round(100 * (tah > 30).mean(), 1),
    "pct_stays_over_60_min": round(100 * (tah > 60).mean(), 1),
    "median_ambulance_hours_per_friday": round(per_night.ambulance_hours_at_hospital.median(), 1),
    "same_as_ambulances_parked_all_night": round(per_night.ambulance_hours_at_hospital.median() / 12, 1),
}])
display(summary)

# COMMAND ----------

# MAGIC %md Chart idea: histogram of `ambulance_hours_at_hospital` (one bar per range of hours, each night counted once).

# COMMAND ----------

display(per_night)

# COMMAND ----------

# MAGIC %md ## 2. When does it pile up, and where? (REAL)
# MAGIC Ambulance-hours at hospital per Friday, by the hour the 911 call came in, for each ER.
# MAGIC Chart idea: line chart, x = `hour_after_6pm`, y = `avg_ambulance_hours`, series = `er`.

# COMMAND ----------

n_nights = calls.night.nunique()
by_hour = (calls.groupby(["hosp", "hour"])["time_at_hosp_min"].sum() / 60 / n_nights).round(2)
by_hour = by_hour.reset_index().rename(columns={"hosp": "er", "hour": "hour_after_6pm",
                                                "time_at_hosp_min": "avg_ambulance_hours"})
display(by_hour)

# COMMAND ----------

# MAGIC %md ## 3. Are holiday weekends worse? (REAL)
# MAGIC Friday nights within 3 days of a US federal holiday vs all other Fridays.
# MAGIC On average they are only slightly busier. The pressure comes from specific busy nights (see the top-10 list),
# MAGIC so the planner plans per night instead of using one fixed schedule.
# MAGIC Chart idea: bar chart, x = `kind`, y = each metric.

# COMMAND ----------

HOLIDAYS = [date.fromisoformat(d) for d in (
    "2024-01-01 2024-01-15 2024-02-19 2024-05-27 2024-06-19 2024-07-04 2024-09-02 2024-10-14 "
    "2024-11-11 2024-11-28 2024-12-25 2025-01-01 2025-01-20 2025-02-17 2025-05-26 2025-06-19 "
    "2025-07-04 2025-09-01 2025-10-13 2025-11-11 2025-11-27 2025-12-25 2026-01-01 2026-01-19 "
    "2026-02-16 2026-05-25 2026-06-19 2026-07-03 2026-09-07").split()]
near_holiday = {n for n in calls.night.unique() if any(abs((n - h).days) <= 3 for h in HOLIDAYS)}
calls["kind"] = calls.night.map(lambda n: "Holiday weekend" if n in near_holiday else "Normal Friday")
urg = calls[calls.urgent & calls.response_min.notna()]
holiday = pd.DataFrame({
    "nights": calls.groupby("kind").night.nunique(),
    "calls_per_night": calls.groupby("kind").size() / calls.groupby("kind").night.nunique(),
    "ambulance_hours_per_night": calls.groupby("kind").time_at_hosp_min.sum() / 60 / calls.groupby("kind").night.nunique(),
    "pct_urgent_late": 100 * urg.groupby("kind").late.mean(),
}).round(1).reset_index()
display(holiday)

# COMMAND ----------

# MAGIC %md The 10 busiest Friday nights in the data:

# COMMAND ----------

display(per_night.sort_values("calls", ascending=False).head(10))

# COMMAND ----------

# MAGIC %md ## 4. Honest check: more ambulances at hospitals → more late urgent patients? (REAL)
# MAGIC We split every (night, hour) into four groups by ambulance-hours at hospital and compare the share of
# MAGIC urgent patients reached after 10 minutes. In this area the link is **weak**: NYC sends ambulances
# MAGIC city-wide, so neighbours cover. That is why the planner's main measure is ambulance-hours
# MAGIC given back, and late-patient numbers are SIM estimates only.

# COMMAND ----------

hourly = (calls.groupby(["night", "hour"])
          .agg(hosp_hours=("time_at_hosp_min", lambda s: s.sum() / 60),
               urgent=("urgent", "sum"), late=("late", "sum")).reset_index())
hourly = hourly[hourly.urgent > 0]
hourly["load"] = pd.qcut(hourly.hosp_hours.rank(method="first"), 4,
                         labels=["1 lightest", "2", "3", "4 heaviest"])
check = hourly.groupby("load", observed=True).agg(hours=("hour", "size"), urgent=("urgent", "sum"),
                                                  late=("late", "sum")).reset_index()
check["pct_urgent_late"] = (100 * check.late / check.urgent).round(1)
display(check)

# COMMAND ----------

# MAGIC %md ## 5. Which neighbourhoods wait longest? (REAL)
# MAGIC Share of urgent patients reached after 10 minutes, by zip code (zips with ≥ 200 urgent calls).

# COMMAND ----------

by_zip = urg.groupby("zip").agg(urgent_calls=("late", "size"), pct_late=("late", "mean")).reset_index()
by_zip["pct_late"] = (100 * by_zip.pct_late).round(1)
display(by_zip[by_zip.urgent_calls >= 200].sort_values("pct_late", ascending=False))

# COMMAND ----------

# MAGIC %md ## 6. What the planner compared (SIM)
# MAGIC For each demo night, every fix the planner tested on the digital twin: cost, ambulance-hours given back,
# MAGIC and urgent patients reached late (average of 5 replays). Produced by `sim/export.py` in the repo.
# MAGIC Costs are estimates: $180 per 2-hour nurse block, $2,640 per extra ambulance per night.
# MAGIC Chart idea: scatter, x = `cost_usd`, y = `hours_back`, group = `option`; or bars of `hours_per_1000_usd`.

# COMMAND ----------

OPTIONS = json.loads(r"""[{"night":"Typical Friday (2026-08-21)","option":"Do nothing","cost_usd":0,"hours_back":0.0,"late_urgent":22.8},{"night":"Typical Friday (2026-08-21)","option":"+1 ambulance","cost_usd":2640,"hours_back":11.4,"late_urgent":20.2},{"night":"Typical Friday (2026-08-21)","option":"+2 ambulances","cost_usd":5280,"hours_back":23.8,"late_urgent":19.2},{"night":"Typical Friday (2026-08-21)","option":"1 nurse shift","cost_usd":180,"hours_back":8.9,"late_urgent":22.4},{"night":"Typical Friday (2026-08-21)","option":"2 nurse shifts","cost_usd":360,"hours_back":15.8,"late_urgent":21},{"night":"Typical Friday (2026-08-21)","option":"3 nurse shifts","cost_usd":540,"hours_back":22.6,"late_urgent":19.4},{"night":"Typical Friday (2026-08-21)","option":"4 nurse shifts","cost_usd":720,"hours_back":28.3,"late_urgent":18.4},{"night":"Typical Friday (2026-08-21)","option":"5 nurse shifts","cost_usd":900,"hours_back":33.2,"late_urgent":17.8},{"night":"Typical Friday (2026-08-21)","option":"6 nurse shifts","cost_usd":1080,"hours_back":38.8,"late_urgent":16.8},{"night":"Typical Friday (2026-08-21)","option":"+1 ambulance & 1 nurse shift","cost_usd":2820,"hours_back":20.2,"late_urgent":19.2},{"night":"Typical Friday (2026-08-21)","option":"+1 ambulance & 2 nurse shifts","cost_usd":3000,"hours_back":26.2,"late_urgent":19},{"night":"Typical Friday (2026-08-21)","option":"+1 ambulance & 3 nurse shifts","cost_usd":3180,"hours_back":32.7,"late_urgent":18.2},{"night":"Typical Friday (2026-08-21)","option":"+1 ambulance & 4 nurse shifts","cost_usd":3360,"hours_back":38.6,"late_urgent":16.8},{"night":"Holiday weekend Friday (2025-07-04)","option":"Do nothing","cost_usd":0,"hours_back":0.0,"late_urgent":48.2},{"night":"Holiday weekend Friday (2025-07-04)","option":"+1 ambulance","cost_usd":2640,"hours_back":11.3,"late_urgent":44.2},{"night":"Holiday weekend Friday (2025-07-04)","option":"+2 ambulances","cost_usd":5280,"hours_back":22.7,"late_urgent":42},{"night":"Holiday weekend Friday (2025-07-04)","option":"1 nurse shift","cost_usd":180,"hours_back":7.8,"late_urgent":46.8},{"night":"Holiday weekend Friday (2025-07-04)","option":"2 nurse shifts","cost_usd":360,"hours_back":15.9,"late_urgent":41.6},{"night":"Holiday weekend Friday (2025-07-04)","option":"3 nurse shifts","cost_usd":540,"hours_back":22.6,"late_urgent":39.8},{"night":"Holiday weekend Friday (2025-07-04)","option":"4 nurse shifts","cost_usd":720,"hours_back":28.1,"late_urgent":38.2},{"night":"Holiday weekend Friday (2025-07-04)","option":"5 nurse shifts","cost_usd":900,"hours_back":33.8,"late_urgent":38},{"night":"Holiday weekend Friday (2025-07-04)","option":"6 nurse shifts","cost_usd":1080,"hours_back":38.4,"late_urgent":36.8},{"night":"Holiday weekend Friday (2025-07-04)","option":"+1 ambulance & 1 nurse shift","cost_usd":2820,"hours_back":19.3,"late_urgent":42.2},{"night":"Holiday weekend Friday (2025-07-04)","option":"+1 ambulance & 2 nurse shifts","cost_usd":3000,"hours_back":27.7,"late_urgent":37.2},{"night":"Holiday weekend Friday (2025-07-04)","option":"+1 ambulance & 3 nurse shifts","cost_usd":3180,"hours_back":34.5,"late_urgent":36},{"night":"Holiday weekend Friday (2025-07-04)","option":"+1 ambulance & 4 nurse shifts","cost_usd":3360,"hours_back":40.0,"late_urgent":34.4},{"night":"Busy summer Friday (2025-06-06)","option":"Do nothing","cost_usd":0,"hours_back":0.0,"late_urgent":22.8},{"night":"Busy summer Friday (2025-06-06)","option":"+1 ambulance","cost_usd":2640,"hours_back":12.0,"late_urgent":20.2},{"night":"Busy summer Friday (2025-06-06)","option":"+2 ambulances","cost_usd":5280,"hours_back":24.3,"late_urgent":17.2},{"night":"Busy summer Friday (2025-06-06)","option":"1 nurse shift","cost_usd":180,"hours_back":9.0,"late_urgent":20.2},{"night":"Busy summer Friday (2025-06-06)","option":"2 nurse shifts","cost_usd":360,"hours_back":17.3,"late_urgent":17.8},{"night":"Busy summer Friday (2025-06-06)","option":"3 nurse shifts","cost_usd":540,"hours_back":23.7,"late_urgent":17.8},{"night":"Busy summer Friday (2025-06-06)","option":"4 nurse shifts","cost_usd":720,"hours_back":28.4,"late_urgent":17.6},{"night":"Busy summer Friday (2025-06-06)","option":"5 nurse shifts","cost_usd":900,"hours_back":32.6,"late_urgent":15.4},{"night":"Busy summer Friday (2025-06-06)","option":"6 nurse shifts","cost_usd":1080,"hours_back":36.7,"late_urgent":15},{"night":"Busy summer Friday (2025-06-06)","option":"+1 ambulance & 1 nurse shift","cost_usd":2820,"hours_back":21.0,"late_urgent":18.6},{"night":"Busy summer Friday (2025-06-06)","option":"+1 ambulance & 2 nurse shifts","cost_usd":3000,"hours_back":29.2,"late_urgent":15},{"night":"Busy summer Friday (2025-06-06)","option":"+1 ambulance & 3 nurse shifts","cost_usd":3180,"hours_back":35.5,"late_urgent":15},{"night":"Busy summer Friday (2025-06-06)","option":"+1 ambulance & 4 nurse shifts","cost_usd":3360,"hours_back":40.3,"late_urgent":14.8}]""")
opts = pd.DataFrame(OPTIONS)
opts["hours_per_1000_usd"] = (1000 * opts.hours_back / opts.cost_usd.where(opts.cost_usd > 0)).round(1)
spark.createDataFrame(opts).write.mode("overwrite").option("overwriteSchema", "true") \
    .saveAsTable("workspace.default.planner_options")
display(opts)

# COMMAND ----------

# MAGIC %md ### The planner's pick per budget (cheapest option with the most ambulance-hours back)

# COMMAND ----------

display(spark.sql("""
  WITH budgets AS (SELECT DISTINCT night, cost_usd AS budget FROM workspace.default.planner_options WHERE cost_usd > 0),
  ranked AS (
    SELECT b.night, b.budget, o.option, o.cost_usd, o.hours_back, o.late_urgent,
           row_number() OVER (PARTITION BY b.night, b.budget ORDER BY o.hours_back DESC, o.cost_usd) AS r
    FROM budgets b JOIN workspace.default.planner_options o ON o.night = b.night AND o.cost_usd <= b.budget)
  SELECT night, budget, option, cost_usd, hours_back, late_urgent FROM ranked WHERE r = 1 ORDER BY night, budget"""))
