"""Read grid dataset (actually xlsx) and save analysis"""
import pandas as pd
import sys

print("Reading Vidarbha_Full_Grid_Dataset.csv as Excel...")
sys.stdout.flush()

try:
    df = pd.read_excel('Vidarbha_Full_Grid_Dataset.csv', engine='openpyxl')
    print(f"SUCCESS! Shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    print(f"\nDtypes:\n{df.dtypes}")
    print(f"\nFirst 3 rows:\n{df.head(3).to_string()}")
    
    # Save as actual CSV for future use
    df.to_csv('data/grid_data_actual.csv', index=False)
    print("\nSaved to data/grid_data_actual.csv")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
