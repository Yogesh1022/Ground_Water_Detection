# Groundwater Readings API Endpoint

## Overview
The groundwater readings API provides paginated access to CSV data that has been imported into PostgreSQL. It returns detailed measurements from 650 wells across 11 Vidarbha districts with 83,850 total readings.

## Endpoint

```
GET /api/v1/common-user/groundwater-readings
```

## Query Parameters

### Pagination
- `page` (optional, default=1): Page number (1-indexed)
- `limit` (optional, default=20, max=100): Items per page

### Filtering
- `district` (optional): Filter by district name (e.g., "Amravati", "Yavatmal")
- `well_id` (optional): Filter by specific well ID
- `start_date` (optional): Start date in YYYY-MM-DD format
- `end_date` (optional): End date in YYYY-MM-DD format

### Sorting
- `sort_by` (optional, default="reading_date"): Sort field
  - Valid values: `reading_date`, `well_id`, `depth_mbgl`, `rainfall_mm`
- `sort_order` (optional, default="DESC"): Sort direction
  - Valid values: `ASC`, `DESC`

## Example Requests

### Get first page with default pagination
```bash
curl "http://localhost:8080/api/v1/common-user/groundwater-readings"
```

### Filter by district with custom limit
```bash
curl "http://localhost:8080/api/v1/common-user/groundwater-readings?district=Amravati&limit=50&page=1"
```

### Filter by date range, sorted by depth
```bash
curl "http://localhost:8080/api/v1/common-user/groundwater-readings?start_date=2023-01-01&end_date=2023-12-31&sort_by=depth_mbgl&sort_order=ASC"
```

### Get specific well readings
```bash
curl "http://localhost:8080/api/v1/common-user/groundwater-readings?well_id=123&limit=100"
```

## Response Format

### Successful Response (200 OK)
```json
{
  "data": [
    {
      "id": 1,
      "well_id": 1,
      "well_name": "VID_AKO_0001",
      "district": "Akola",
      "reading_date": "2025-12-01T00:00:00Z",
      "depth_mbgl": 45.5,
      "rainfall_mm": 25.3,
      "temperature_avg": 28.5,
      "humidity": 65.2,
      "evapotranspiration": 4.2,
      "soil_moisture_index": 0.45,
      "rainfall_lag_1m": 18.7,
      "rainfall_lag_2m": 22.1,
      "rainfall_lag_3m": 31.5,
      "rainfall_rolling_3m": 76.1,
      "rainfall_rolling_6m": 156.3,
      "rainfall_deficit": -15.2,
      "cumulative_deficit": -42.1,
      "temp_rainfall_ratio": 1.13,
      "depth_lag_1q": 48.2,
      "depth_lag_2q": 51.3,
      "depth_change_rate": -2.7,
      "month": 12,
      "season": "rabi",
      "latitude": 20.5545,
      "longitude": 75.8500,
      "ndvi": 0.65
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total_items": 83850,
    "total_pages": 4193
  }
}
```

### Error Response (400 Bad Request)
```json
{
  "error": "invalid query parameter"
}
```

### Error Response (500 Internal Server Error)
```json
{
  "error": "failed to list groundwater readings"
}
```

## Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| id | int64 | Record unique identifier |
| well_id | int64 | Reference to the well |
| well_name | string | Well identifier (e.g., VID_AKO_0001) |
| district | string | District name |
| reading_date | ISO8601 | Date and time of measurement |
| depth_mbgl | float64 | Depth to water level (metres below ground level) |
| rainfall_mm | float64 | Current month rainfall in mm |
| temperature_avg | float64 | Average temperature in °C |
| humidity | float64 | Relative humidity percentage |
| evapotranspiration | float64 | Reference evapotranspiration (ET0) |
| soil_moisture_index | float64 | Soil moisture index (0-1) |
| rainfall_lag_*m | float64 | Rainfall from previous months (1m, 2m, 3m ago) |
| rainfall_rolling_* | float64 | Rolling rainfall totals (3m, 6m) |
| rainfall_deficit | float64 | Deficit vs historical average |
| cumulative_deficit | float64 | Cumulative rainfall deficit |
| temp_rainfall_ratio | float64 | Temperature to rainfall ratio |
| depth_lag_* | float64 | Water depth from previous periods (1q=1 quarter) |
| depth_change_rate | float64 | Rate of depth change |
| month | int | Month number (1-12) |
| season | string | Season encoded (kharif, rabi, summer) |
| latitude | float64 | Well latitude |
| longitude | float64 | Well longitude |
| ndvi | float64 | Normalized Difference Vegetation Index (-1 to 1) |

## Performance Notes

- Results are cached for 5 minutes in Redis
- Each request includes a cache status header (`X-Cache: HIT` or `X-Cache: MISS`)
- Maximum 100 records per page to optimize performance
- For large datasets, use date range and district filters
- B-tree indexes on well_id, reading_date, and district optimize queries

## Frontend Integration Example (React)

```javascript
import { useState, useEffect } from 'react';

function GroundwaterTable() {
  const [readings, setReadings] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ district: '', limit: 20 });

  useEffect(() => {
    async function fetchReadings() {
      const params = new URLSearchParams({
        page,
        ...filters,
      });
      
      const response = await fetch(
        `http://localhost:8080/api/v1/common-user/groundwater-readings?${params}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setReadings(data.data);
        setMeta(data.meta);
      }
    }

    fetchReadings();
  }, [page, filters]);

  return (
    <div>
      <input
        type="text"
        placeholder="Filter by district"
        onChange={(e) => setFilters({ ...filters, district: e.target.value })}
      />
      
      <table>
        <thead>
          <tr>
            <th>Well</th>
            <th>Date</th>
            <th>District</th>
            <th>Depth (m)</th>
            <th>Rainfall (mm)</th>
            <th>Temperature (°C)</th>
          </tr>
        </thead>
        <tbody>
          {readings.map((reading) => (
            <tr key={reading.id}>
              <td>{reading.well_name}</td>
              <td>{new Date(reading.reading_date).toLocaleDateString()}</td>
              <td>{reading.district}</td>
              <td>{reading.depth_mbgl?.toFixed(2)}</td>
              <td>{reading.rainfall_mm?.toFixed(2)}</td>
              <td>{reading.temperature_avg?.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button onClick={() => setPage(Math.max(1, page - 1))}>Previous</button>
        <span>Page {meta?.page} of {meta?.total_pages}</span>
        <button onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
```

## Database Info

- **Table**: well_readings
- **Records**: 83,850
- **Wells**: 650
- **Districts**: 11
- **Date Range**: 2015-04-01 to 2025-12-01
- **Indexes**: well_id, reading_date, (well_id, reading_date)

## Caching Strategy

- Cache key includes: district, date range, sort options, page, limit
- TTL: 5 minutes
- Cache invalidation: Manual via admin endpoints (future enhancement)
