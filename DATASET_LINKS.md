# Required Datasets for Groundwater Crisis Predictor Project

This document lists all the open-source datasets required to build the ML/DL groundwater forecasting model. All data sources are publicly available.

## Primary Data Sources

| # | Dataset Name | Data Type & Format | Description | Direct Link |
|---|--------------|--------------------|-------------|-------------|
| 1 | **India-WRIS** (Water Resources Information System) | **Groundwater Levels** <br>*(CSV / Excel)* | Historical quarterly groundwater level data (in meters below ground level - mbgl) for specific wells. Contains well ID, latitude, longitude, and depth readings. | [Visit Portal](https://indiawris.gov.in/wris/#/groundWater) |
| 2 | **CHIRPS** (Climate Hazards Group InfraRed Precipitation with Station data) | **Rainfall / Precipitation** <br>*(NetCDF / TIFF / API)* | High-resolution (0.05°), daily gridded rainfall data. Essential for calculating lag features (e.g., rainfall 3 months ago). | [Get Data](https://www.chc.ucsb.edu/data/chirps) |
| 3 | **NASA POWER** (Prediction of Worldwide Energy Resources) | **Soil & Agro-Climatology** <br>*(JSON API)* | Satellite-derived meteorological data including soil moisture, evapotranspiration (ET), humidity, and temperature. | [Access API](https://power.larc.nasa.gov/) |
| 4 | **Open-Meteo** | **Historical Weather** <br>*(JSON API)* | Free historical weather archive for temperature (min/max), relative humidity, and wind speed. Used to fill gaps and complement NASA data. | [API Docs](https://open-meteo.com/en/docs/historical-weather-api) |
| 5 | **GSDA Maharashtra** (Groundwater Surveys and Development Agency) | **State Well Reports** <br>*(PDF / Excel)* | Granular, state-specific well monitoring reports for Maharashtra villages. Useful for validation against state government data. | [Visit Website](https://gsda.maharashtra.gov.in/) |
| 6 | **Census of India** (2011/2021) | **Demographics & Irrigation** <br>*(CSV)* | Village-level data on population, area under irrigation, and cropping patterns. Useful for weighting crisis impact. | [Census Digital Library](https://censusindia.gov.in/) |

## Data Variables Dictionary

When collecting data, ensure you extract the following specific variables:

### 1. Target Variable (What we predict)
*   **`depth_mbgl`**: Groundwater depth in "Meters Below Ground Level".
    *   *Source:* India-WRIS

### 2. Meteorological Features (Predictors)
*   **`rainfall_mm`**: Daily/Monthly cumulative precipitation.
    *   *Source:* CHIRPS / Open-Meteo
*   **`temperature_avg`**: Average daily temperature (°C).
    *   *Source:* Open-Meteo / NASA POWER
*   **`evapotranspiration`**: Rate of water loss from soil/plants (ET0).
    *   *Source:* NASA POWER
*   **`soil_moisture`**: Root zone soil wetness.
    *   *Source:* NASA POWER

### 3. Geospatial Features (Static)
*   **`latitude` / `longitude`**: Coordinates of the well/village.
    *   *Source:* India-WRIS
*   **`elevation`**: Height above sea level (can be fetched via Open-Meteo Elevation API).
    *   *Source:* Open-Meteo
*   **`district` / `block` / `village`**: Administrative region names.
    *   *Source:* India-WRIS / Census

---

## Additional Open-Source Data Repositories

### Kaggle Datasets

| Dataset Title | Description | Link |
|---------------|-------------|------|
| **India Weather Data (IMD)** | Historical weather data from India Meteorological Department. Includes temperature, rainfall, humidity for multiple stations across India. | [Kaggle: India Weather](https://www.kaggle.com/datasets/rajanand/rainfall-in-india) |
| **Rainfall in India (1901-2015)** | Subdivision-wise monthly, seasonal, and annual rainfall data. Useful for long-term trend analysis. | [Kaggle: Rainfall India](https://www.kaggle.com/datasets/rajanand/rainfall-in-india) |
| **India Groundwater & Irrigation** | Aggregated state-level groundwater statistics and irrigation patterns. | [Kaggle Search](https://www.kaggle.com/search?q=india+groundwater) |
| **Maharashtra District-Level Data** | Socio-economic and agricultural data for Maharashtra districts including water resource indicators. | [Kaggle: Maharashtra Data](https://www.kaggle.com/datasets/danofer/india-village-directory) |
| **Climate Data India** | Temperature, humidity, wind speed datasets aggregated from various sources (1980-2020). | [Kaggle Search](https://www.kaggle.com/search?q=india+climate+data) |

### GitHub Repositories

| Repository Name | Description | Link |
|-----------------|-------------|------|
| **india-wris-data** | Python scripts to scrape and download groundwater data from India-WRIS portal in bulk. Includes CSV exporters. | [GitHub Search](https://github.com/search?q=india+wris+groundwater) |
| **CHIRPS-data-downloader** | Automated scripts to download CHIRPS rainfall data for specific regions/coordinates. Saves NetCDF to CSV. | [GitHub: CHIRPS Tools](https://github.com/topics/chirps) |
| **NASA-POWER-API-Python** | Python wrapper for NASA POWER API with examples for fetching agro-meteorological data. | [GitHub Search](https://github.com/search?q=nasa+power+api+python) |
| **India-Weather-Repository** | Collection of cleaned Indian weather station data (CSV format) from multiple sources (IMD, GSDA). | [GitHub: India Weather](https://github.com/topics/india-weather) |
| **Open-Meteo-Python** | Community-built Python client for Open-Meteo API with batch download capabilities. | [GitHub: Open-Meteo](https://github.com/open-meteo/python-requests) |
| **Groundwater-ML-India** | Pre-built ML models and datasets for groundwater prediction in Indian states. Useful as benchmark. | [GitHub Search](https://github.com/search?q=groundwater+prediction+india) |
| **Maharashtra-GIS-Data** | Shapefiles, GeoJSON boundaries for Maharashtra districts, talukas, villages. Useful for geospatial mapping. | [GitHub: India GIS](https://github.com/datameet/maps) |

---

## Specific Dataset Recommendations for This Project

### Quick Start: Ready-to-Use Datasets

1. **For Immediate Prototyping:**
   - **Kaggle**: [Rainfall in India (1901-2015)](https://www.kaggle.com/datasets/rajanand/rainfall-in-india)
     - *Why*: Pre-cleaned, monthly resolution, covers Vidarbha region
   - **Kaggle**: [India Districts Weather Data](https://www.kaggle.com/search?q=india+district+weather)
     - *Why*: District-level aggregation matches administrative boundaries

2. **For Groundwater History:**
   - **India-WRIS** (Primary Government Source)
   - **GitHub**: Search for `india-wris-scraper` to automate downloads
   - **Alternative**: Contact CGWB (Central Ground Water Board) for direct data exports

3. **For Spatial Analysis:**
   - **GitHub**: [DataMeet India Maps](https://github.com/datameet/maps)
     - *Why*: Official district/taluka boundaries for Maharashtra in GeoJSON format
     - *Usage*: Overlay wells on maps, calculate spatial features

4. **For Feature Engineering:**
   - **GitHub**: Pre-built feature extraction scripts in repositories tagged `hydrology`, `rainfall-analysis`
   - **Kaggle Notebooks**: Search for "groundwater prediction" to find feature engineering examples

---

## Data Collection Strategy

### Step-by-Step Approach

1. **Start with Kaggle** for quick exploratory analysis (pre-cleaned data)
2. **Use GitHub scrapers** to automate India-WRIS downloads (official source, larger volume)
3. **Fetch live data** from NASA POWER and Open-Meteo APIs using Python scripts
4. **Merge datasets** using latitude/longitude as keys
5. **Validate** against GSDA published reports (cross-reference accuracy)

### Code Example: Batch Download from GitHub Tools

```python
# Example: Using a hypothetical India-WRIS scraper
# Check GitHub for actual repository names and install instructions

# Install from GitHub
# pip install git+https://github.com/username/india-wris-scraper.git

from wris_scraper import WRISDownloader

# Initialize downloader
downloader = WRISDownloader(
    state='Maharashtra',
    districts=['Nagpur', 'Yavatmal', 'Wardha'],
    start_year=2010,
    end_year=2025
)

# Download to CSV
downloader.fetch_groundwater_data(output_file='data/raw/groundwater_vidarbha.csv')
```

---

## Access Notes

*   **API Keys:** NASA POWER and Open-Meteo are free and usually do not require complex API keys (NASA may require a simple registration).
*   **India-WRIS:** Requires a free account registration to download bulk data.
*   **CHIRPS:** Large files; recommended to use Python/Google Earth Engine to extract only the Vidarbha region data instead of downloading global maps.
*   **Kaggle:** Free account required. Download datasets directly or use Kaggle API (`kaggle datasets download -d <dataset-path>`).
*   **GitHub:** All repositories listed are open-source. Clone with `git clone <repo-url>` and follow repository-specific setup instructions.
