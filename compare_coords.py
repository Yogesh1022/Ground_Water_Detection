"""Compare Grid Dataset vs Extended Dataset - Lat/Lon Analysis"""
import pandas as pd
import numpy as np

import json

print("Loading datasets...")
grid = pd.read_csv(r'E:\Ground_Water_Detection\data\grid_data_actual.csv')
ext = pd.read_csv(r'E:\Ground_Water_Detection\data\vidarbha_groundwater_extended_v2.csv')

# Extract lat/lon from grid .geo column (GeoJSON: coordinates=[lon, lat])
if '.geo' in grid.columns:
    geo_parsed = grid['.geo'].apply(json.loads)
    grid['longitude'] = geo_parsed.apply(lambda g: g['coordinates'][0])
    grid['latitude'] = geo_parsed.apply(lambda g: g['coordinates'][1])
    print("  Extracted lat/lon from .geo column")

lines = []
def p(s=''): lines.append(s)

p('='*85)
p('  GRID DATASET vs EXTENDED DATASET - LAT/LON COMPARISON')
p('='*85)

p(f'\n--- 1. BASIC INFO ---')
p(f'  Grid:     {grid.shape[0]:>8,} rows x {grid.shape[1]} cols')
p(f'  Extended: {ext.shape[0]:>8,} rows x {ext.shape[1]} cols')
p(f'\n  Grid columns: {list(grid.columns)}')
p(f'  Extended columns: {list(ext.columns)}')

# Find lat/lon columns (exact match to avoid false positives like 'cumulative_deficit')
import re
def find_col(cols, pattern):
    return [c for c in cols if re.search(pattern, c, re.I)]

lat_cols_g = find_col(grid.columns, r'^lat')
lon_cols_g = find_col(grid.columns, r'^lon')
lat_cols_e = find_col(ext.columns, r'^lat')
lon_cols_e = find_col(ext.columns, r'^lon')

p(f'\n  Grid lat cols: {lat_cols_g}, lon cols: {lon_cols_g}')
p(f'  Ext  lat cols: {lat_cols_e}, lon cols: {lon_cols_e}')

gl = lat_cols_g[0] if lat_cols_g else None
gn = lon_cols_g[0] if lon_cols_g else None
el = lat_cols_e[0] if lat_cols_e else None
en = lon_cols_e[0] if lon_cols_e else None

if not all([gl, gn, el, en]):
    p('\nERROR: Could not find lat/lon columns!')
    result = '\n'.join(lines)
    print(result)
    exit()

p(f'\n  Using: Grid({gl}, {gn}), Extended({el}, {en})')

# --- 2. UNIQUE COORDINATES ---
p(f'\n--- 2. UNIQUE COORDINATE COUNTS ---')
g_unique = grid[[gl, gn]].drop_duplicates()
e_unique = ext[[el, en]].drop_duplicates()

p(f'  Grid: {len(g_unique):>6,} unique (lat, lon) pairs')
p(f'  Ext:  {len(e_unique):>6,} unique (lat, lon) pairs')
p(f'\n  Grid: {grid[gl].nunique()} unique lats, {grid[gn].nunique()} unique lons')
p(f'  Ext:  {ext[el].nunique()} unique lats, {ext[en].nunique()} unique lons')

# --- 3. LAT STATS ---
p(f'\n--- 3. LATITUDE STATISTICS ---')
vid_lat = (19.0, 22.05)
vid_lon = (75.5, 80.9)
p(f'  {"Stat":10s}  {"Grid":>14s}  {"Extended":>14s}  {"Vidarbha Real":>14s}')
p(f'  {"min":10s}  {grid[gl].min():14.6f}  {ext[el].min():14.6f}  {vid_lat[0]:>14.4f}')
p(f'  {"max":10s}  {grid[gl].max():14.6f}  {ext[el].max():14.6f}  {vid_lat[1]:>14.4f}')
p(f'  {"mean":10s}  {grid[gl].mean():14.6f}  {ext[el].mean():14.6f}')
p(f'  {"std":10s}  {grid[gl].std():14.6f}  {ext[el].std():14.6f}')
p(f'  {"range":10s}  {grid[gl].max()-grid[gl].min():14.6f}  {ext[el].max()-ext[el].min():14.6f}  {vid_lat[1]-vid_lat[0]:>14.4f}')

# --- 4. LON STATS ---
p(f'\n--- 4. LONGITUDE STATISTICS ---')
p(f'  {"Stat":10s}  {"Grid":>14s}  {"Extended":>14s}  {"Vidarbha Real":>14s}')
p(f'  {"min":10s}  {grid[gn].min():14.6f}  {ext[en].min():14.6f}  {vid_lon[0]:>14.4f}')
p(f'  {"max":10s}  {grid[gn].max():14.6f}  {ext[en].max():14.6f}  {vid_lon[1]:>14.4f}')
p(f'  {"mean":10s}  {grid[gn].mean():14.6f}  {ext[en].mean():14.6f}')
p(f'  {"std":10s}  {grid[gn].std():14.6f}  {ext[en].std():14.6f}')
p(f'  {"range":10s}  {grid[gn].max()-grid[gn].min():14.6f}  {ext[en].max()-ext[en].min():14.6f}  {vid_lon[1]-vid_lon[0]:>14.4f}')

# --- 5. DECIMAL PRECISION ---
p(f'\n--- 5. DECIMAL PRECISION ---')
def get_precision(series, n=100):
    sample = series.drop_duplicates().head(n)
    precisions = []
    for v in sample:
        s = f'{v:.15f}'.rstrip('0')
        if '.' in s:
            precisions.append(len(s.split('.')[1]))
        else:
            precisions.append(0)
    return int(min(precisions)), int(max(precisions)), np.mean(precisions)

gpl = get_precision(grid[gl])
gpn = get_precision(grid[gn])
epl = get_precision(ext[el])
epn = get_precision(ext[en])

p(f'  Grid latitude:   {gpl[0]}-{gpl[1]} decimals (avg {gpl[2]:.1f})')
p(f'  Grid longitude:  {gpn[0]}-{gpn[1]} decimals (avg {gpn[2]:.1f})')
p(f'  Ext  latitude:   {epl[0]}-{epl[1]} decimals (avg {epl[2]:.1f})')
p(f'  Ext  longitude:  {epn[0]}-{epn[1]} decimals (avg {epn[2]:.1f})')
p(f'\n  Precision meaning:')
p(f'    1 decimal  = ~11.1 km accuracy')
p(f'    2 decimals = ~1.1 km accuracy')
p(f'    4 decimals = ~11 m accuracy (good for well)')
p(f'    6 decimals = ~0.11 m accuracy (GPS-grade)')

# --- 6. SPATIAL PATTERN ---
p(f'\n--- 6. SPATIAL PATTERN (Regular Grid vs Scattered) ---')
g_lats = sorted(grid[gl].unique())
e_lats = sorted(ext[el].unique())

if len(g_lats) > 2:
    g_lat_diffs = np.diff(g_lats)
    p(f'  Grid lat spacing: min={min(g_lat_diffs):.6f}, max={max(g_lat_diffs):.6f}, mean={np.mean(g_lat_diffs):.6f} deg')
    p(f'    Spacing std: {np.std(g_lat_diffs):.8f}')
    is_reg_g = np.std(g_lat_diffs) < 0.001
    p(f'    Pattern: {"REGULAR GRID" if is_reg_g else "IRREGULAR/SCATTERED"}')
    p(f'    Average spacing = ~{np.mean(g_lat_diffs)*111:.2f} km')

if len(e_lats) > 2:
    e_lat_diffs = np.diff(e_lats)
    p(f'  Ext  lat spacing: min={min(e_lat_diffs):.6f}, max={max(e_lat_diffs):.6f}, mean={np.mean(e_lat_diffs):.6f} deg')
    p(f'    Spacing std: {np.std(e_lat_diffs):.8f}')
    is_reg_e = np.std(e_lat_diffs) < 0.001
    p(f'    Pattern: {"REGULAR GRID" if is_reg_e else "IRREGULAR/SCATTERED"}')
    p(f'    Average spacing = ~{np.mean(e_lat_diffs)*111:.2f} km')

# --- 7. VIDARBHA BOUNDARY ---
p(f'\n--- 7. VIDARBHA BOUNDARY COVERAGE ---')
g_in = g_unique[(g_unique[gl]>=vid_lat[0]) & (g_unique[gl]<=vid_lat[1]) &
                (g_unique[gn]>=vid_lon[0]) & (g_unique[gn]<=vid_lon[1])]
e_in = e_unique[(e_unique[el]>=vid_lat[0]) & (e_unique[el]<=vid_lat[1]) &
                (e_unique[en]>=vid_lon[0]) & (e_unique[en]<=vid_lon[1])]
p(f'  Grid: {len(g_in):>6,}/{len(g_unique):>6,} inside Vidarbha ({len(g_in)/len(g_unique)*100:.1f}%)')
p(f'  Ext:  {len(e_in):>6,}/{len(e_unique):>6,} inside Vidarbha ({len(e_in)/len(e_unique)*100:.1f}%)')

# --- 8. SAMPLE COORDS ---
p(f'\n--- 8. SAMPLE COORDINATES (first 10 unique) ---')
p(f'  Grid:')
for _, r in g_unique.head(10).iterrows():
    p(f'    ({r[gl]:.6f}, {r[gn]:.6f})')
p(f'  Extended:')
for _, r in e_unique.head(10).iterrows():
    p(f'    ({r[el]:.6f}, {r[en]:.6f})')

# --- 9. ELEVATION ---
elev_cols_g = [c for c in grid.columns if 'elev' in c.lower()]
elev_cols_e = [c for c in ext.columns if 'elev' in c.lower()]
if elev_cols_g and elev_cols_e:
    ge = elev_cols_g[0]
    ee = elev_cols_e[0]
    p(f'\n--- 9. ELEVATION COMPARISON ---')
    p(f'  Grid ({ge}): mean={grid[ge].mean():.1f}, std={grid[ge].std():.1f}, range={grid[ge].min():.1f}-{grid[ge].max():.1f}')
    p(f'  Ext  ({ee}): mean={ext[ee].mean():.1f}, std={ext[ee].std():.1f}, range={ext[ee].min():.1f}-{ext[ee].max():.1f}')

# --- FINAL VERDICT ---
p(f'\n{"="*85}')
p(f'  FINAL VERDICT')
p(f'{"="*85}')

scores = {'Grid': 0, 'Extended': 0}
verdicts = []

# a) Spatial coverage
if len(g_unique) > len(e_unique):
    scores['Grid'] += 2
    verdicts.append(('Spatial point count', 'Grid', f'{len(g_unique):,} vs {len(e_unique):,}'))
else:
    scores['Extended'] += 2
    verdicts.append(('Spatial point count', 'Extended', f'{len(e_unique):,} vs {len(g_unique):,}'))

# b) Precision
avg_g = (gpl[2] + gpn[2]) / 2
avg_e = (epl[2] + epn[2]) / 2
if avg_g > avg_e + 0.5:
    scores['Grid'] += 2
    verdicts.append(('Decimal precision', 'Grid', f'{avg_g:.1f} vs {avg_e:.1f} avg decimals'))
elif avg_e > avg_g + 0.5:
    scores['Extended'] += 2
    verdicts.append(('Decimal precision', 'Extended', f'{avg_e:.1f} vs {avg_g:.1f} avg decimals'))
else:
    verdicts.append(('Decimal precision', 'TIE', f'{avg_g:.1f} vs {avg_e:.1f}'))

# c) Boundary fit
g_pct = len(g_in)/max(len(g_unique),1)*100
e_pct = len(e_in)/max(len(e_unique),1)*100
if g_pct > e_pct + 1:
    scores['Grid'] += 1
    verdicts.append(('Vidarbha boundary', 'Grid', f'{g_pct:.1f}% vs {e_pct:.1f}%'))
elif e_pct > g_pct + 1:
    scores['Extended'] += 1
    verdicts.append(('Vidarbha boundary', 'Extended', f'{e_pct:.1f}% vs {g_pct:.1f}%'))
else:
    verdicts.append(('Vidarbha boundary', 'TIE', f'{g_pct:.1f}% vs {e_pct:.1f}%'))

# d) Range
g_lat_range = grid[gl].max() - grid[gl].min()
e_lat_range = ext[el].max() - ext[el].min()
g_lon_range = grid[gn].max() - grid[gn].min()
e_lon_range = ext[en].max() - ext[en].min()
real_lat_range = vid_lat[1] - vid_lat[0]
real_lon_range = vid_lon[1] - vid_lon[0]
g_err = abs(g_lat_range - real_lat_range) + abs(g_lon_range - real_lon_range)
e_err = abs(e_lat_range - real_lat_range) + abs(e_lon_range - real_lon_range)
if g_err < e_err:
    scores['Grid'] += 1
    verdicts.append(('Range matches Vidarbha', 'Grid', f'err={g_err:.3f} vs {e_err:.3f}'))
else:
    scores['Extended'] += 1
    verdicts.append(('Range matches Vidarbha', 'Extended', f'err={e_err:.3f} vs {g_err:.3f}'))

verdicts.append(('Spatial pattern', 'Depends', 'Grid=uniform / Ext=well-location based'))

p(f'\n  {"Criterion":30s}  {"Winner":15s}  Detail')
p(f'  {"-"*75}')
for crit, winner, detail in verdicts:
    p(f'  {crit:30s}  {winner:15s}  {detail}')

p(f'\n  SCORES:  Grid = {scores["Grid"]}  |  Extended = {scores["Extended"]}')
winner = 'GRID' if scores['Grid'] > scores['Extended'] else 'EXTENDED' if scores['Extended'] > scores['Grid'] else 'TIE'
p(f'  WINNER FOR LAT/LON: {winner}')
p(f'{"="*85}')

result = '\n'.join(lines)
with open(r'E:\Ground_Water_Detection\data\grid_vs_ext_latlon.txt', 'w', encoding='utf-8') as f:
    f.write(result)
print(result)
