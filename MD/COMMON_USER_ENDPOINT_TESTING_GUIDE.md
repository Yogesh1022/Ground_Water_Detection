# Common User Endpoint Testing Guide

## Goal

Validate every common_user endpoint end-to-end for:

1. Correct status code
2. Correct response structure
3. Basic success and failure paths
4. Data persistence where applicable

## Endpoints To Test

1. GET /api/v1/common-user/me
2. GET /api/v1/common-user/wells
3. GET /api/v1/common-user/wells/:id
4. GET /api/v1/common-user/districts/summary
5. GET /api/v1/common-user/alerts
6. POST /api/v1/common-user/predict
7. POST /api/v1/common-user/complaints
8. GET /api/v1/common-user/complaints/track/:tracking

## Prerequisites

1. PostgreSQL is running and schema is applied.
2. Backend server is running at http://localhost:8080
3. You have wells and district_stats data populated (for meaningful list/detail checks).
4. Optional: ML service URL configured for live model call. If not configured, fallback prediction path should still pass.

## Test Method 1 - Manual PowerShell (Recommended First Pass)

Open PowerShell and run step by step.

Set base URL:

$base = "http://localhost:8080"

## 1) Health Check

$health = Invoke-RestMethod -Method Get -Uri "$base/health"
$health

Expected:

1. HTTP 200
2. status field present

## 2) GET /common-user/me

$me = Invoke-RestMethod -Method Get -Uri "$base/api/v1/common-user/me"
$me

Expected:

1. HTTP 200
2. JSON contains id, name, role

## 3) GET /common-user/wells (Default)

$wells = Invoke-RestMethod -Method Get -Uri "$base/api/v1/common-user/wells"
$wells

Expected:

1. HTTP 200
2. data array exists
3. meta object has page, limit, total_items, total_pages

## 4) GET /common-user/wells with pagination and district filter

$wellsFiltered = Invoke-RestMethod -Method Get -Uri "$base/api/v1/common-user/wells?page=1&limit=5&district=Nagpur"
$wellsFiltered

Expected:

1. HTTP 200
2. data length less than or equal to 5
3. rows match district when data exists

## 5) GET /common-user/wells/:id success path

Pick one ID from wells list:

$wellId = $wells.data[0].id
$wellDetail = Invoke-RestMethod -Method Get -Uri "$base/api/v1/common-user/wells/$wellId"
$wellDetail

Expected:

1. HTTP 200
2. fields include latest_depth_mbgl and risk_level

## 6) GET /common-user/wells/:id failure path

try {
  Invoke-RestMethod -Method Get -Uri "$base/api/v1/common-user/wells/999999999"
} catch {
  $_.Exception.Response.StatusCode.value__
}

Expected:

1. HTTP 404

## 7) GET /common-user/districts/summary

$districts = Invoke-RestMethod -Method Get -Uri "$base/api/v1/common-user/districts/summary"
$districts

Expected:

1. HTTP 200
2. data array
3. each row contains district, avg_depth_mbgl, risk_status

## 8) GET /common-user/alerts (all)

$alerts = Invoke-RestMethod -Method Get -Uri "$base/api/v1/common-user/alerts"
$alerts

Expected:

1. HTTP 200
2. data array

## 9) GET /common-user/alerts with filters

$alertsFiltered = Invoke-RestMethod -Method Get -Uri "$base/api/v1/common-user/alerts?district=Nagpur&type=warning"
$alertsFiltered

Expected:

1. HTTP 200
2. filtered results when records exist

## 10) POST /common-user/predict success

$predictBody = @{
  latitude = 21.1458
  longitude = 79.0882
  rainfall_mm = 22.5
  temperature_c = 31.2
  humidity_pct = 58
  ndvi = 0.43
} | ConvertTo-Json

$predict = Invoke-RestMethod -Method Post -Uri "$base/api/v1/common-user/predict" -ContentType "application/json" -Body $predictBody
$predict

Expected:

1. HTTP 200
2. depth_mbgl, risk_level, confidence_pct present
3. multi_month_forecast present

## 11) POST /common-user/predict validation failure

$badPredictBody = @{
  latitude = 999
  longitude = 999
} | ConvertTo-Json

try {
  Invoke-RestMethod -Method Post -Uri "$base/api/v1/common-user/predict" -ContentType "application/json" -Body $badPredictBody
} catch {
  $_.Exception.Response.StatusCode.value__
}

Expected:

1. HTTP 400

## 12) POST /common-user/complaints success

$complaintBody = @{
  type = "water_shortage"
  district = "Nagpur"
  taluka = "Nagpur Rural"
  village = "Sample Village"
  severity = "high"
  description = "Water supply has been unavailable for several days in our area."
} | ConvertTo-Json

$complaint = Invoke-RestMethod -Method Post -Uri "$base/api/v1/common-user/complaints" -ContentType "application/json" -Body $complaintBody
$complaint

Expected:

1. HTTP 201
2. tracking_number is returned

## 13) GET /common-user/complaints/track/:tracking success

$tracking = $complaint.tracking_number
$tracked = Invoke-RestMethod -Method Get -Uri "$base/api/v1/common-user/complaints/track/$tracking"
$tracked

Expected:

1. HTTP 200
2. same tracking_number
3. status field exists

## 14) GET /common-user/complaints/track/:tracking not found

try {
  Invoke-RestMethod -Method Get -Uri "$base/api/v1/common-user/complaints/track/R-XXXXXX"
} catch {
  $_.Exception.Response.StatusCode.value__
}

Expected:

1. HTTP 404

## Test Method 2 - Postman Collection

Use this sequence:

1. Create environment variable baseUrl = http://localhost:8080
2. Add 8 requests (one per endpoint)
3. Add tests in each request:
   - pm.response.code matches expected
   - required JSON fields are present
4. For complaint flow:
   - Save tracking_number into env var from create response
   - Reuse in track endpoint URL

## Test Method 3 - Automated Smoke Script Extension

You already have a smoke script at:

[backend/scripts/smoke-test-api.ps1](backend/scripts/smoke-test-api.ps1)

Add a common_user section to this script so these checks run automatically on every local validation.

## Minimum Pass Criteria

1. All 8 endpoints return expected status codes.
2. Predict endpoint works both with ML service and fallback mode.
3. Complaint create and track flow works end-to-end.
4. Wells endpoints return correct pagination metadata.
5. Not-found and invalid-input paths return 404 and 400 respectively.

## Quick Troubleshooting

1. Empty wells or district summary data:
   - Seed wells and well_readings and refresh district_stats.
2. Predict returns 500:
   - Check backend logs and DB predictions table insert constraints.
3. Complaint create fails:
   - Verify complaint enum values and required payload fields.
4. Route not found:
   - Confirm server restarted after latest route wiring.
