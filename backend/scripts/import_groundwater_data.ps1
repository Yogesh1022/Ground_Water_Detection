param(
    [string]$CsvPath = "P:\AI-Based Groundwater Potential Mapping and Risk Prediction System\Dataset\training_ready_data\vidarbha_groundwater_model_ready.csv",
    [string]$ContainerName = "aquavidarbha-postgres",
    [string]$Database = "aquavidarbha",
    [string]$User = "postgres",
    [string]$Password = $env:POSTGRES_PASSWORD
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $CsvPath)) {
    throw "CSV file not found: $CsvPath"
}

if ([string]::IsNullOrWhiteSpace($Password)) {
    $Password = "postgres"
}

$seedSqlPath = Join-Path $PSScriptRoot "..\migrations\seed_groundwater_from_csv.sql"
if (-not (Test-Path $seedSqlPath)) {
    throw "Seed SQL not found: $seedSqlPath"
}

$containerState = docker inspect -f "{{.State.Running}}" $ContainerName 2>$null
if ($LASTEXITCODE -ne 0 -or $containerState.Trim() -ne "true") {
    throw "Postgres container '$ContainerName' is not running. Start Docker Compose first."
}

Write-Host "Copying CSV into container..."
docker cp $CsvPath "${ContainerName}:/tmp/vidarbha_groundwater_model_ready.csv"
if ($LASTEXITCODE -ne 0) {
    throw "Failed to copy CSV into the container."
}

Write-Host "Copying seed SQL into container..."
docker cp $seedSqlPath "${ContainerName}:/tmp/seed_groundwater_from_csv.sql"
if ($LASTEXITCODE -ne 0) {
    throw "Failed to copy seed SQL into the container."
}

Write-Host "Loading CSV into PostgreSQL..."
docker exec -e PGPASSWORD=$Password $ContainerName psql -U $User -d $Database -v csv_path='/tmp/vidarbha_groundwater_model_ready.csv' -f /tmp/seed_groundwater_from_csv.sql
if ($LASTEXITCODE -ne 0) {
    throw "Failed to load groundwater data into PostgreSQL."
}

Write-Host "Refreshing district stats..."
docker exec -e PGPASSWORD=$Password $ContainerName psql -U $User -d $Database -c "REFRESH MATERIALIZED VIEW district_stats;"
if ($LASTEXITCODE -ne 0) {
    throw "Failed to refresh district_stats."
}

Write-Host "Import complete. Quick verification:"
docker exec -e PGPASSWORD=$Password $ContainerName psql -U $User -d $Database -c "SELECT COUNT(*) AS wells_count FROM wells; SELECT COUNT(*) AS readings_count FROM well_readings; SELECT COUNT(DISTINCT well_id) AS distinct_wells FROM well_readings;"