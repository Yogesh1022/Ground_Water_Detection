param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$AdminEmail = "admin@aquavidarbha.in",
    [string]$AdminPassword = "Admin@12345",
    [string]$GovEmail = "gov@aquavidarbha.in",
    [string]$GovPassword = "Gov@12345",
    [int]$TimeoutSec = 10
)

$ErrorActionPreference = "Stop"
$script:Failures = @()

function Add-Failure {
    param([string]$Message)
    $script:Failures += $Message
    Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Add-Pass {
    param([string]$Message)
    Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Resolve-RedirectPath {
    param([string]$Role)

    switch ($Role) {
        "admin" { return "/dashboard-admin" }
        "gov" { return "/dashboard-gov" }
        default { return "/dashboard-user" }
    }
}

function Invoke-Login {
    param(
        [string]$Email,
        [string]$Password
    )

    try {
        $resp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v1/auth/login" -ContentType "application/json" -Body (@{
            email = $Email
            password = $Password
        } | ConvertTo-Json) -TimeoutSec $TimeoutSec

        return [pscustomobject]@{
            Ok = $true
            Body = $resp
            Error = ""
        }
    }
    catch {
        return [pscustomobject]@{
            Ok = $false
            Body = $null
            Error = $_.Exception.Message
        }
    }
}

function Test-RoleRedirect {
    param(
        [string]$Email,
        [string]$Password,
        [string]$ExpectedRole
    )

    $result = Invoke-Login -Email $Email -Password $Password
    if (-not $result.Ok) {
        Add-Failure "Login failed for $Email :: $($result.Error)"
        return
    }

    $role = ""
    if ($null -ne $result.Body -and $null -ne $result.Body.user -and $null -ne $result.Body.user.role) {
        $role = [string]$result.Body.user.role
    }

    if ($role -ne $ExpectedRole) {
        Add-Failure "Role mismatch for $Email. expected=$ExpectedRole got=$role"
        return
    }

    $redirectPath = Resolve-RedirectPath -Role $role
    Add-Pass "Role=$role redirect=$redirectPath"
}

Write-Host "== Auth Redirect Smoke Test ==" -ForegroundColor Cyan
try {
    $null = Invoke-WebRequest -Method Get -Uri "$BaseUrl/health" -UseBasicParsing -TimeoutSec $TimeoutSec
}
catch {
    Add-Failure "Health check failed at $BaseUrl/health :: $($_.Exception.Message)"
    Write-Host "`nSmoke test finished with $($script:Failures.Count) failure(s)." -ForegroundColor Red
    exit 1
}

Test-RoleRedirect -Email $AdminEmail -Password $AdminPassword -ExpectedRole "admin"
Test-RoleRedirect -Email $GovEmail -Password $GovPassword -ExpectedRole "gov"

if ($script:Failures.Count -gt 0) {
    Write-Host "`nSmoke test finished with $($script:Failures.Count) failure(s)." -ForegroundColor Red
    exit 1
}

Write-Host "`nAll auth redirect smoke checks passed." -ForegroundColor Green
exit 0
