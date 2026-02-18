"""Check if dataset can support the planned application"""
import pandas as pd
import numpy as np

ext = pd.read_csv('data/vidarbha_groundwater_extended_v2.csv')

print('=== DATASET SHAPE ===')
print(f'Rows: {ext.shape[0]:,}, Cols: {ext.shape[1]}')

print(f'\n=== ALL COLUMNS + STATS ===')
for c in ext.columns:
    if ext[c].dtype in ['float64','int64']:
        print(f'  {c:30s}  dtype={str(ext[c].dtype):8s}  min={ext[c].min():>10.3f}  max={ext[c].max():>10.3f}  mean={ext[c].mean():>10.3f}')
    else:
        print(f'  {c:30s}  dtype={str(ext[c].dtype):8s}  nunique={ext[c].nunique()}  sample={ext[c].iloc[0]}')

print(f'\n=== TARGET: depth_mbgl ===')
print(ext['depth_mbgl'].describe())
print(f'\nDepth percentiles:')
for p in [10, 25, 50, 75, 90, 95, 99]:
    print(f'  {p}th percentile: {ext["depth_mbgl"].quantile(p/100):.2f} m')

print(f'\n=== WELLS PER DISTRICT ===')
print(ext.groupby('district')['well_id'].nunique().to_string())

print(f'\n=== DATE RANGE ===')
print(f'Min: {ext["date"].min()}, Max: {ext["date"].max()}')
print(f'Years: {sorted(ext["year"].unique())}')
print(f'Months per well: {ext.groupby("well_id").size().iloc[0]}')

print(f'\n=== SEASON ENCODING ===')
print(ext[['month','season_encoded']].drop_duplicates().sort_values('month').to_string(index=False))

print(f'\n=== SEASONAL DEPTH PATTERNS ===')
for s, name in [(0,'Winter'), (1,'Summer'), (2,'Monsoon'), (3,'Post-Monsoon')]:
    subset = ext[ext['season_encoded']==s]
    if len(subset):
        print(f'  {name:15s}: mean_depth={subset["depth_mbgl"].mean():.2f}m  std={subset["depth_mbgl"].std():.2f}')

print(f'\n=== SPATIAL DENSITY ===')
wells = ext.drop_duplicates('well_id')
print(f'Total wells: {len(wells)}')
print(f'Lat: {wells["latitude"].min():.4f} - {wells["latitude"].max():.4f}')
print(f'Lon: {wells["longitude"].min():.4f} - {wells["longitude"].max():.4f}')
area_km2 = (wells['latitude'].max()-wells['latitude'].min())*111 * (wells['longitude'].max()-wells['longitude'].min())*85
print(f'Area: ~{area_km2:,.0f} km2')
print(f'Density: ~1 well per {area_km2/len(wells):.0f} km2')

# kNN analysis
from scipy.spatial import cKDTree
coords = wells[['latitude','longitude']].values
tree = cKDTree(coords)
dists, idxs = tree.query(coords, k=6)  # self + 5 nearest
nn = dists[:,1:]*111  # convert deg to ~km

print(f'\n=== kNN NEIGHBOR DISTANCES (km) ===')
for k in range(5):
    print(f'  {k+1}th NN: mean={nn[:,k].mean():.2f}km  min={nn[:,k].min():.2f}km  max={nn[:,k].max():.2f}km')

print(f'\n=== FEATURES AVAILABLE FOR ML ===')
feature_cols = [c for c in ext.columns if c not in ['well_id','date','district','year']]
print(f'  Total features: {len(feature_cols)}')
print(f'  Spatial: latitude, longitude, elevation_m, slope_degree')
print(f'  Climate: rainfall_mm, temperature_avg, humidity, evapotranspiration')
print(f'  Hydro:   soil_moisture_index, rainfall_lag_1m/2m/3m, rolling_3m/6m')
print(f'  Deficit: rainfall_deficit, cumulative_deficit, temp_rainfall_ratio')
print(f'  History: depth_lag_1q, depth_lag_2q, depth_change_rate')
print(f'  Land:    soil_type_encoded, ndvi')
print(f'  Time:    month, season_encoded')
print(f'  Target:  depth_mbgl')

# Check if new GPS location can be served
print(f'\n=== kNN PREDICTION SIMULATION ===')
# Simulate: user at Amravati city center (20.93, 77.76)
test_lat, test_lon = 20.93, 77.76
user_point = np.array([[test_lat, test_lon]])
d, idx = tree.query(user_point, k=5)
d_km = d[0]*111
print(f'  Test point: ({test_lat}, {test_lon}) - Amravati city')
print(f'  5 nearest wells:')
for i in range(5):
    w = wells.iloc[idx[0][i]]
    wdata = ext[ext['well_id']==w['well_id']]
    latest = wdata.sort_values('date').iloc[-1]
    print(f'    Well {w["well_id"]}: dist={d_km[i]:.1f}km  lat={w["latitude"]:.4f}  lon={w["longitude"]:.4f}  latest_depth={latest["depth_mbgl"]:.2f}m')

print(f'\n  kNN(k=5) weighted prediction at test point:')
weights = 1.0 / (d_km + 0.01)  # inverse distance
latest_depths = []
for i in range(5):
    w = wells.iloc[idx[0][i]]
    wdata = ext[ext['well_id']==w['well_id']]
    latest = wdata.sort_values('date').iloc[-1]
    latest_depths.append(latest['depth_mbgl'])
pred = np.average(latest_depths, weights=weights)
print(f'  Predicted depth: {pred:.2f} m below ground level')
print(f'  Recommended dig depth: {pred*1.3:.1f} m (with 30% safety margin)')

# Seasonal forecast
print(f'\n  SEASONAL FORECAST (next 4 months from Dec 2025):')
for mon, name in [(1,'Jan 2026 - Winter'), (2,'Feb 2026 - Winter'), (3,'Mar 2026 - Summer'), (4,'Apr 2026 - Summer')]:
    month_depths = []
    for i in range(5):
        w = wells.iloc[idx[0][i]]
        wdata = ext[(ext['well_id']==w['well_id']) & (ext['month']==mon)]
        if len(wdata):
            month_depths.append(wdata['depth_mbgl'].mean())
    if month_depths:
        fpred = np.average(month_depths, weights=weights[:len(month_depths)])
        print(f'    {name}: predicted depth = {fpred:.2f} m')
