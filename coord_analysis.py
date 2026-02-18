import pandas as pd
import numpy as np

df = pd.read_csv(r'E:\Ground_Water_Detection\data\vidarbha_groundwater_model_ready.csv')

print("="*60)
print("COORDINATE & WELL ANALYSIS")
print("="*60)

print(f"\nDataset shape: {df.shape}")
print(f"Columns: {list(df.columns)}")

# Check if well_id exists in extended
try:
    dfe = pd.read_csv(r'E:\Ground_Water_Detection\data\vidarbha_groundwater_extended_v2.csv')
    has_wellid = 'well_id' in dfe.columns
    print(f"\nExtended dataset has well_id: {has_wellid}")
    if has_wellid:
        print(f"Total unique well_ids: {dfe['well_id'].nunique()}")
except:
    pass

# Unique coordinates
uc = df[['latitude','longitude']].drop_duplicates()
print(f"\nUnique (lat, lon) pairs: {len(uc)}")

uce = df[['latitude','longitude','elevation_m']].drop_duplicates()
print(f"Unique (lat, lon, elev) triples: {len(uce)}")

print(f"\nUnique latitudes:  {df['latitude'].nunique()}")
print(f"Unique longitudes: {df['longitude'].nunique()}")
print(f"Unique elevations: {df['elevation_m'].nunique()}")

# Rows per coordinate group
grp = df.groupby(['latitude','longitude']).size().reset_index(name='n_rows')
grp['est_wells'] = (grp['n_rows'] / 129).round().astype(int)
print(f"\n--- Rows per (lat,lon) group ---")
print(f"Min rows: {grp['n_rows'].min()}, Max rows: {grp['n_rows'].max()}")
print(f"Groups with 129 rows (=1 well): {(grp['n_rows']==129).sum()}")
print(f"Groups with 258 rows (=2 wells): {(grp['n_rows']==258).sum()}")
print(f"Groups with >129 rows (>1 well same coords): {(grp['n_rows']>129).sum()}")

# Estimated wells per coord
print(f"\n--- Estimated wells per coordinate ---")
for nw in sorted(grp['est_wells'].unique()):
    cnt = (grp['est_wells']==nw).sum()
    print(f"  {nw} well(s) at same coord: {cnt} locations")

# Total wells estimate
total_wells = grp['est_wells'].sum()
print(f"\nTotal estimated wells: {total_wells}")

# Elevation per coordinate
elev_per_coord = df.groupby(['latitude','longitude'])['elevation_m'].nunique()
print(f"\n--- Elevation uniqueness per coordinate ---")
for n, cnt in elev_per_coord.value_counts().sort_index().items():
    print(f"  {n} distinct elevation(s): {cnt} coordinate pairs")

# Same elevation sharing
elev_counts = df[['latitude','longitude','elevation_m']].drop_duplicates()
elev_freq = elev_counts.groupby('elevation_m').size().reset_index(name='n_coords')
big_elev = elev_freq[elev_freq['n_coords'] >= 5].sort_values('n_coords', ascending=False)
print(f"\n--- Elevations shared by 5+ coordinates ---")
for _, r in big_elev.head(15).iterrows():
    print(f"  Elevation {r['elevation_m']:.1f}m: shared by {r['n_coords']} different coords")

# District-wise breakdown
districts = ['Nagpur','Wardha','Chandrapur','Yavatmal','Amravati','Akola','Washim','Buldhana','Bhandara','Gondia','Gadchiroli']
print(f"\n--- District-wise coordinate analysis ---")
for i, dname in enumerate(districts):
    sub = df[df['district_encoded']==i]
    uc_d = sub[['latitude','longitude']].drop_duplicates()
    uce_d = sub[['latitude','longitude','elevation_m']].drop_duplicates()
    grp_d = sub.groupby(['latitude','longitude']).size().reset_index(name='n')
    wells_est = (grp_d['n'] / 129).round().astype(int).sum()
    print(f"  {dname:15s}: {len(uc_d):3d} unique coords, {len(uce_d):3d} (lat,lon,elev), ~{wells_est} wells")

# Show top 10 locations with most wells stacked
print(f"\n--- Top 10 coordinates with most wells at same location ---")
top = grp.nlargest(10, 'n_rows')
for _, r in top.iterrows():
    dist_code = df[(df['latitude']==r['latitude'])&(df['longitude']==r['longitude'])]['district_encoded'].iloc[0]
    elev = df[(df['latitude']==r['latitude'])&(df['longitude']==r['longitude'])]['elevation_m'].iloc[0]
    print(f"  ({r['latitude']:.4f}, {r['longitude']:.4f}) dist={districts[dist_code]} elev={elev:.1f}m rows={r['n_rows']} (~{r['est_wells']} wells)")
