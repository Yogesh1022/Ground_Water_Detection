import pandas as pd

df = pd.read_csv('data/vidarbha_groundwater_extended_v2.csv')
m = df.groupby('month')['depth_mbgl'].mean()
months = {1:'Jan',2:'Feb',3:'Mar',4:'Apr',5:'May',6:'Jun',7:'Jul',8:'Aug',9:'Sep',10:'Oct',11:'Nov',12:'Dec'}

print('Monthly mean depths:')
for mo, val in m.items():
    print(f'  {months[mo]:3s}: {val:7.2f}m')

print(f'\nShallowest: month {m.idxmin()} ({months[m.idxmin()]}) = {m.min():.2f}m')
print(f'Deepest:    month {m.idxmax()} ({months[m.idxmax()]}) = {m.max():.2f}m')
print(f'Seasonal range: {m.max()-m.min():.2f}m  (was 0.02m, target: 15-25m)')
print(f'Lag correlation: {df["depth_mbgl"].corr(df["depth_lag_1q"]):.4f}  (should be >0.90)')
print(f'Shape: {df.shape[0]:,} rows x {df.shape[1]} cols')
print(f'Depth range: {df["depth_mbgl"].min():.2f}m - {df["depth_mbgl"].max():.2f}m')
