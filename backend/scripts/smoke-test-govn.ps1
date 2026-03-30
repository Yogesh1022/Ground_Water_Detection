param(
    [string]$BaseUrl = "http://localhost:8080/api/v1/govn-user",
    [string]$Token = "REPLACE_WITH_JWT"
)

function Invoke-Govn {
    param([string]$Path)
    $headers = @{ Authorization = "Bearer $Token" }
    Write-Host "GET $Path" -ForegroundColor Cyan
    try {
        Invoke-RestMethod -Method Get -Uri ($BaseUrl + $Path) -Headers $headers -TimeoutSec 10
    } catch {
        Write-Host "Request failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Invoke-Govn "/overview"
Invoke-Govn "/requests?limit=3"
Invoke-Govn "/districts/analytics"
Invoke-Govn "/forecast"
Invoke-Govn "/forecast/long"
Invoke-Govn "/tankers"
Invoke-Govn "/tasks?limit=5"
Invoke-Govn "/activity-log?limit=5"
