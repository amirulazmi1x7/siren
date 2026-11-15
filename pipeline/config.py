"""Every city-specific value lives here (any-city rule). Swap this dict to build another city's twin."""

CITY = {
    "name": "New York City",
    "area": "Brooklyn",
    "socrata_url": "https://data.cityofnewyork.us/resource/76xm-jjuj.json",
    "borough_filter": "BROOKLYN",
    "centroids_csv": "data/zcta_centroids.csv",
    # Three neighboring real 911-receiving ERs in central/east Brooklyn, geocoded with the US Census
    # geocoder. Always shown anonymized as A/B/C; never named in the app or pitch.
    "hospitals": [
        {"id": "A", "lat": 40.65577, "lon": -73.94523},
        {"id": "B", "lat": 40.65524, "lon": -73.91221},
        {"id": "C", "lat": 40.67802, "lon": -73.93851},
    ],
    # Keep only zip codes whose centroid is within this distance of the nearest of A/B/C.
    "area_radius_km": 2.5,
}

HOSPITALS = CITY["hospitals"]
BLOCKS = ["6-8P", "8-10P", "10P-12A", "12-2A", "2-4A", "4-6A"]
LATE_MIN = 10
# Nurse: BLS May 2023 NYC-metro RN mean wage $53.47/h; + ~30% benefits and an overtime/incentive premium -> ~$90/h.
NURSE_SHIFT_USD = 180   # one 2-hour block (est.)
# Ambulance: ~$220 per staffed unit-hour (EMS World cost model; CA EMSA 2025 strike-team rates ~$167-211/h).
AMB_UNIT_HOUR_USD = 220
AMB_EACH_NIGHT_USD = AMB_UNIT_HOUR_USD * 12          # one extra ambulance, 6 PM-6 AM (est.)
AMB_NIGHT_USD = 2 * AMB_EACH_NIGHT_USD               # '+2 ambulances' as the page shows it

RAW_COLUMNS = [
    "incident_id", "incident_datetime", "initial_severity_level_code", "zipcode",
    "valid_incident_rspns_time_indc", "incident_response_seconds_qy",
    "first_hosp_arrival_datetime", "incident_close_datetime",
]
