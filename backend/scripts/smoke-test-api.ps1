param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$AdminEmail = "admin@aquavidarbha.in",
    [string]$AdminPassword = "Admin@12345",
    [string]$GovEmail = "gov@aquavidarbha.in",
    [string]$GovPassword = "Gov@12345",
    [string]$CitizenEmail = "citizen@aquavidarbha.in",
    [string]$CitizenPassword = "Citizen@12345"
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

function Invoke-Api {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Url,
        [hashtable]$Headers,
        [object]$Body
    )

    $params = @{
        Method = $Method
        Uri = $Url
    }

    if ($null -ne $Headers) {
        $params.Headers = $Headers
    }

    if ($null -ne $Body) {
        $params.ContentType = "application/json"
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }

    try {
        $resp = Invoke-RestMethod @params
        return [pscustomobject]@{
            StatusCode = 200
            Body = $resp
        }
    }
    catch {
        $statusCode = 0
        $rawBody = ""

        if ($_.Exception.Response) {
            try {
                $statusCode = [int]$_.Exception.Response.StatusCode
            }
            catch {
                $statusCode = 0
            }

            try {
                $stream = $_.Exception.Response.GetResponseStream()
                if ($null -ne $stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $rawBody = $reader.ReadToEnd()
                    $reader.Close()
                }
            }
            catch {
                $rawBody = ""
            }
        }

        $parsed = $null
        if (-not [string]::IsNullOrWhiteSpace($rawBody)) {
            try {
                $parsed = $rawBody | ConvertFrom-Json
            }
            catch {
                $parsed = $rawBody
            }
        }

        return [pscustomobject]@{
            StatusCode = $statusCode
            Body = $parsed
        }
    }
}

function Invoke-ApiWithHeaders {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Url,
        [hashtable]$Headers,
        [object]$Body
    )

    $params = @{
        Method = $Method
        Uri = $Url
        UseBasicParsing = $true
    }

    if ($null -ne $Headers) {
        $params.Headers = $Headers
    }

    if ($null -ne $Body) {
        $params.ContentType = "application/json"
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }

    try {
        $resp = Invoke-WebRequest @params
        $parsedBody = $null
        if (-not [string]::IsNullOrWhiteSpace($resp.Content)) {
            try {
                $parsedBody = $resp.Content | ConvertFrom-Json
            }
            catch {
                $parsedBody = $resp.Content
            }
        }

        return [pscustomobject]@{
            StatusCode = [int]$resp.StatusCode
            Body = $parsedBody
            Headers = $resp.Headers
        }
    }
    catch {
        $statusCode = 0
        $rawBody = ""
        $headers = @{}

        if ($_.Exception.Response) {
            try {
                $statusCode = [int]$_.Exception.Response.StatusCode
            }
            catch {
                $statusCode = 0
            }

            try {
                $headers = $_.Exception.Response.Headers
            }
            catch {
                $headers = @{}
            }

            try {
                $stream = $_.Exception.Response.GetResponseStream()
                if ($null -ne $stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $rawBody = $reader.ReadToEnd()
                    $reader.Close()
                }
            }
            catch {
                $rawBody = ""
            }
        }

        $parsed = $null
        if (-not [string]::IsNullOrWhiteSpace($rawBody)) {
            try {
                $parsed = $rawBody | ConvertFrom-Json
            }
            catch {
                $parsed = $rawBody
            }
        }

        return [pscustomobject]@{
            StatusCode = $statusCode
            Body = $parsed
            Headers = $headers
        }
    }
}

function Get-HeaderValue {
    param(
        [Parameter(Mandatory = $true)][object]$Headers,
        [Parameter(Mandatory = $true)][string]$Name
    )

    if ($null -eq $Headers) {
        return ""
    }

    try {
        $value = $Headers[$Name]
        if ($null -eq $value) {
            $value = $Headers[$Name.ToLowerInvariant()]
        }
        if ($null -eq $value) {
            return ""
        }
        return [string]$value
    }
    catch {
        return ""
    }
}

function Test-CacheTransition {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][hashtable]$Headers
    )

    $first = Invoke-ApiWithHeaders -Method "GET" -Url $Url -Headers $Headers
    Expect-Status -Name "$Name (first call)" -Response $first -Expected 200

    $second = Invoke-ApiWithHeaders -Method "GET" -Url $Url -Headers $Headers
    Expect-Status -Name "$Name (second call)" -Response $second -Expected 200

    $firstCache = (Get-HeaderValue -Headers $first.Headers -Name "X-Cache-Status").ToUpperInvariant()
    $secondCache = (Get-HeaderValue -Headers $second.Headers -Name "X-Cache-Status").ToUpperInvariant()

    Write-Host ("[INFO] {0} cache transition: {1} -> {2}" -f $Name, $firstCache, $secondCache) -ForegroundColor Cyan

    if ($firstCache -eq "MISS" -and $secondCache -eq "HIT") {
        Add-Pass "$Name cache transition MISS -> HIT"
        return
    }

    Add-Failure "$Name cache transition expected MISS -> HIT but got $firstCache -> $secondCache"
}

function Assert-PaginationMeta {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][object]$Response
    )

    if ($Response.StatusCode -ne 200 -or $null -eq $Response.Body -or $null -eq $Response.Body.meta) {
        Add-Failure "$Name pagination metadata missing"
        return
    }

    $meta = $Response.Body.meta
    $hasPage = $null -ne $meta.page
    $hasLimit = $null -ne $meta.limit
    $hasTotalItems = $null -ne $meta.total_items
    $hasTotalPages = $null -ne $meta.total_pages

    if ($hasPage -and $hasLimit -and $hasTotalItems -and $hasTotalPages) {
        Add-Pass "$Name pagination metadata present"
        return
    }

    Add-Failure "$Name pagination metadata incomplete"
}

function Assert-AuditActionForTarget {
    param(
        [Parameter(Mandatory = $true)][string]$Action,
        [Parameter(Mandatory = $true)][int64]$TargetID,
        [Parameter(Mandatory = $true)][hashtable]$Headers
    )

    $url = "$BaseUrl/api/v1/admin/activity-log?action=$Action&target_table=users&page=1&limit=20"
    $resp = Invoke-Api -Method "GET" -Url $url -Headers $Headers
    Expect-Status -Name "GET /api/v1/admin/activity-log?action=$Action" -Response $resp -Expected 200

    if ($resp.StatusCode -ne 200 -or $null -eq $resp.Body -or $null -eq $resp.Body.data) {
        Add-Failure "Audit lookup for $Action did not return data"
        return
    }

    $found = $false
    foreach ($entry in @($resp.Body.data)) {
        if ($null -ne $entry -and [string]$entry.action -eq $Action -and [int64]$entry.target_id -eq $TargetID) {
            $found = $true
            break
        }
    }

    if ($found) {
        Add-Pass "Audit log contains $Action for target_id=$TargetID"
        return
    }

    Add-Failure "Audit log missing $Action for target_id=$TargetID"
}

function Expect-Status {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][object]$Response,
        [Parameter(Mandatory = $true)][int]$Expected
    )

    if ($Response.StatusCode -eq $Expected) {
        Add-Pass "$Name returned $Expected"
    }
    else {
        Add-Failure "$Name expected $Expected but got $($Response.StatusCode)"
    }
}

Write-Host "Running API smoke tests against $BaseUrl" -ForegroundColor Cyan

# 1) Health
$health = Invoke-Api -Method "GET" -Url "$BaseUrl/health"
Expect-Status -Name "GET /health" -Response $health -Expected 200

if ($health.StatusCode -eq 200 -and $health.Body.status -eq "ok") {
    Add-Pass "Health payload status=ok"
}
elseif ($health.StatusCode -eq 200) {
    Add-Failure "Health payload does not contain status=ok"
}

# 2) Admin login and /admin/me
$adminLogin = Invoke-Api -Method "POST" -Url "$BaseUrl/api/v1/auth/login" -Body @{
    email = $AdminEmail
    password = $AdminPassword
}
Expect-Status -Name "POST /api/v1/auth/login (admin)" -Response $adminLogin -Expected 200

$adminToken = $null
if ($adminLogin.StatusCode -eq 200 -and $adminLogin.Body.token) {
    $adminToken = [string]$adminLogin.Body.token
    Add-Pass "Admin token received"
}
else {
    Add-Failure "Admin login did not return token"
}

if ($adminToken) {
    $adminMe = Invoke-Api -Method "GET" -Url "$BaseUrl/api/v1/admin/me" -Headers @{ Authorization = "Bearer $adminToken" }
    Expect-Status -Name "GET /api/v1/admin/me (admin token)" -Response $adminMe -Expected 200

    if ($adminMe.StatusCode -eq 200 -and $adminMe.Body.role -eq "admin") {
        Add-Pass "Admin /me role is admin"
    }
    elseif ($adminMe.StatusCode -eq 200) {
        Add-Failure "Admin /me returned unexpected role"
    }

    Write-Host "" 
    Write-Host "Cache header smoke checks (X-Cache-Status):" -ForegroundColor Cyan

    $cacheProbe = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $adminAuthHeader = @{ Authorization = "Bearer $adminToken" }

    Test-CacheTransition -Name "GET /api/v1/admin/overview" -Url "$BaseUrl/api/v1/admin/overview" -Headers $adminAuthHeader
    Test-CacheTransition -Name "GET /api/v1/admin/users" -Url "$BaseUrl/api/v1/admin/users?page=1&limit=5&search=cache-smoke-$cacheProbe" -Headers $adminAuthHeader
    Test-CacheTransition -Name "GET /api/v1/admin/activity-log" -Url "$BaseUrl/api/v1/admin/activity-log?page=1&limit=5&action=CACHE_SMOKE_$cacheProbe" -Headers $adminAuthHeader

    Write-Host ""
    Write-Host "Phase 6 verification checks:" -ForegroundColor Cyan

    $phase6Probe = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $phase6Email = "phase6+$phase6Probe@aquavidarbha.in"
    $phase6Name = "Phase6 User $phase6Probe"

    # Warm overview and user-list caches, then verify they invalidate after user writes.
    $overviewWarm1 = Invoke-ApiWithHeaders -Method "GET" -Url "$BaseUrl/api/v1/admin/overview" -Headers $adminAuthHeader
    Expect-Status -Name "GET /api/v1/admin/overview (pre-write warm #1)" -Response $overviewWarm1 -Expected 200
    $overviewWarm2 = Invoke-ApiWithHeaders -Method "GET" -Url "$BaseUrl/api/v1/admin/overview" -Headers $adminAuthHeader
    Expect-Status -Name "GET /api/v1/admin/overview (pre-write warm #2)" -Response $overviewWarm2 -Expected 200
    $overviewTotalBefore = 0
    if ($overviewWarm2.StatusCode -eq 200 -and $null -ne $overviewWarm2.Body.total_users) {
        $overviewTotalBefore = [int]$overviewWarm2.Body.total_users
    }

    $usersSearchUrl = "$BaseUrl/api/v1/admin/users?page=1&limit=5&search=$phase6Email"
    $usersWarm1 = Invoke-ApiWithHeaders -Method "GET" -Url $usersSearchUrl -Headers $adminAuthHeader
    Expect-Status -Name "GET /api/v1/admin/users (pre-write warm #1)" -Response $usersWarm1 -Expected 200
    $usersWarm2 = Invoke-ApiWithHeaders -Method "GET" -Url $usersSearchUrl -Headers $adminAuthHeader
    Expect-Status -Name "GET /api/v1/admin/users (pre-write warm #2)" -Response $usersWarm2 -Expected 200

    # Validate pagination metadata on list endpoints.
    $usersPageCheck = Invoke-Api -Method "GET" -Url "$BaseUrl/api/v1/admin/users?page=1&limit=5" -Headers $adminAuthHeader
    Expect-Status -Name "GET /api/v1/admin/users (pagination)" -Response $usersPageCheck -Expected 200
    Assert-PaginationMeta -Name "GET /api/v1/admin/users" -Response $usersPageCheck

    $auditPageCheck = Invoke-Api -Method "GET" -Url "$BaseUrl/api/v1/admin/activity-log?page=1&limit=5" -Headers $adminAuthHeader
    Expect-Status -Name "GET /api/v1/admin/activity-log (pagination)" -Response $auditPageCheck -Expected 200
    Assert-PaginationMeta -Name "GET /api/v1/admin/activity-log" -Response $auditPageCheck

    # Validate self-protection rules.
    $adminID = 0
    if ($null -ne $adminMe.Body.id) {
        $adminID = [int64]$adminMe.Body.id
    }
    if ($adminID -gt 0) {
        $selfSuspend = Invoke-ApiWithHeaders -Method "PUT" -Url "$BaseUrl/api/v1/admin/users/$adminID/suspend" -Headers $adminAuthHeader
        Expect-Status -Name "PUT /api/v1/admin/users/:id/suspend (self)" -Response $selfSuspend -Expected 400

        $selfDelete = Invoke-ApiWithHeaders -Method "DELETE" -Url "$BaseUrl/api/v1/admin/users/$adminID" -Headers $adminAuthHeader
        Expect-Status -Name "DELETE /api/v1/admin/users/:id (self)" -Response $selfDelete -Expected 400
    }
    else {
        Add-Failure "Admin /me did not return valid admin id for self-protection checks"
    }

    # Create/update/suspend/activate/delete user and assert audit entries exist for each mutation.
    $createdUser = Invoke-ApiWithHeaders -Method "POST" -Url "$BaseUrl/api/v1/admin/users" -Headers $adminAuthHeader -Body @{
        email = $phase6Email
        password = "Phase6@Test123"
        name = $phase6Name
        role = "citizen"
        district = "Nagpur"
        phone = "9999999999"
    }
    Expect-Status -Name "POST /api/v1/admin/users (phase6)" -Response $createdUser -Expected 201

    $createdUserID = 0
    if ($createdUser.StatusCode -eq 201 -and $null -ne $createdUser.Body.id) {
        $createdUserID = [int64]$createdUser.Body.id
        Add-Pass "Phase 6 temp user created with id=$createdUserID"
    }
    else {
        Add-Failure "Phase 6 temp user creation did not return id"
    }

    if ($createdUserID -gt 0) {
        Assert-AuditActionForTarget -Action "CREATE_USER" -TargetID $createdUserID -Headers $adminAuthHeader

        # Cache invalidation check: overview and users should return MISS after a write.
        $overviewAfterWrite1 = Invoke-ApiWithHeaders -Method "GET" -Url "$BaseUrl/api/v1/admin/overview" -Headers $adminAuthHeader
        Expect-Status -Name "GET /api/v1/admin/overview (post-write #1)" -Response $overviewAfterWrite1 -Expected 200
        $overviewAfterWrite2 = Invoke-ApiWithHeaders -Method "GET" -Url "$BaseUrl/api/v1/admin/overview" -Headers $adminAuthHeader
        Expect-Status -Name "GET /api/v1/admin/overview (post-write #2)" -Response $overviewAfterWrite2 -Expected 200

        $overviewAfterWrite1Cache = (Get-HeaderValue -Headers $overviewAfterWrite1.Headers -Name "X-Cache-Status").ToUpperInvariant()
        $overviewAfterWrite2Cache = (Get-HeaderValue -Headers $overviewAfterWrite2.Headers -Name "X-Cache-Status").ToUpperInvariant()
        if ($overviewAfterWrite1Cache -eq "MISS" -and $overviewAfterWrite2Cache -eq "HIT") {
            Add-Pass "Overview cache invalidated by user write (MISS -> HIT)"
        }
        else {
            Add-Failure "Overview cache invalidation expected MISS -> HIT but got $overviewAfterWrite1Cache -> $overviewAfterWrite2Cache"
        }

        if ($null -ne $overviewAfterWrite1.Body.total_users) {
            $overviewTotalAfterCreate = [int]$overviewAfterWrite1.Body.total_users
            if ($overviewTotalAfterCreate -ge ($overviewTotalBefore + 1)) {
                Add-Pass "Overview total_users reflects post-create change"
            }
            else {
                Add-Failure "Overview total_users did not reflect create operation"
            }
        }

        $usersAfterWrite1 = Invoke-ApiWithHeaders -Method "GET" -Url $usersSearchUrl -Headers $adminAuthHeader
        Expect-Status -Name "GET /api/v1/admin/users (post-write #1)" -Response $usersAfterWrite1 -Expected 200
        $usersAfterWrite2 = Invoke-ApiWithHeaders -Method "GET" -Url $usersSearchUrl -Headers $adminAuthHeader
        Expect-Status -Name "GET /api/v1/admin/users (post-write #2)" -Response $usersAfterWrite2 -Expected 200

        $usersAfterWrite1Cache = (Get-HeaderValue -Headers $usersAfterWrite1.Headers -Name "X-Cache-Status").ToUpperInvariant()
        $usersAfterWrite2Cache = (Get-HeaderValue -Headers $usersAfterWrite2.Headers -Name "X-Cache-Status").ToUpperInvariant()
        if ($usersAfterWrite1Cache -eq "MISS" -and $usersAfterWrite2Cache -eq "HIT") {
            Add-Pass "Users list cache invalidated by user write (MISS -> HIT)"
        }
        else {
            Add-Failure "Users cache invalidation expected MISS -> HIT but got $usersAfterWrite1Cache -> $usersAfterWrite2Cache"
        }

        $searchFound = $false
        if ($usersAfterWrite1.StatusCode -eq 200 -and $null -ne $usersAfterWrite1.Body.data) {
            foreach ($u in @($usersAfterWrite1.Body.data)) {
                if ($null -ne $u -and [string]$u.email -eq $phase6Email) {
                    $searchFound = $true
                    break
                }
            }
        }
        if ($searchFound) {
            Add-Pass "Users list reflects post-create record"
        }
        else {
            Add-Failure "Users list did not include created phase6 user"
        }

        $updatedUser = Invoke-ApiWithHeaders -Method "PUT" -Url "$BaseUrl/api/v1/admin/users/$createdUserID" -Headers $adminAuthHeader -Body @{
            name = "$phase6Name Updated"
            district = "Wardha"
            phone = "9888888888"
            role = "citizen"
        }
        Expect-Status -Name "PUT /api/v1/admin/users/:id (phase6)" -Response $updatedUser -Expected 200
        Assert-AuditActionForTarget -Action "UPDATE_USER" -TargetID $createdUserID -Headers $adminAuthHeader

        $suspendUser = Invoke-ApiWithHeaders -Method "PUT" -Url "$BaseUrl/api/v1/admin/users/$createdUserID/suspend" -Headers $adminAuthHeader
        Expect-Status -Name "PUT /api/v1/admin/users/:id/suspend (phase6)" -Response $suspendUser -Expected 200
        Assert-AuditActionForTarget -Action "SUSPEND_USER" -TargetID $createdUserID -Headers $adminAuthHeader

        $activateUser = Invoke-ApiWithHeaders -Method "PUT" -Url "$BaseUrl/api/v1/admin/users/$createdUserID/activate" -Headers $adminAuthHeader
        Expect-Status -Name "PUT /api/v1/admin/users/:id/activate (phase6)" -Response $activateUser -Expected 200
        Assert-AuditActionForTarget -Action "ACTIVATE_USER" -TargetID $createdUserID -Headers $adminAuthHeader

        $deleteUser = Invoke-ApiWithHeaders -Method "DELETE" -Url "$BaseUrl/api/v1/admin/users/$createdUserID" -Headers $adminAuthHeader
        Expect-Status -Name "DELETE /api/v1/admin/users/:id (phase6)" -Response $deleteUser -Expected 200
        Assert-AuditActionForTarget -Action "DELETE_USER" -TargetID $createdUserID -Headers $adminAuthHeader
    }
}

# 3) Unauthorized check (no token)
$adminNoToken = Invoke-Api -Method "GET" -Url "$BaseUrl/api/v1/admin/me"
Expect-Status -Name "GET /api/v1/admin/me (no token)" -Response $adminNoToken -Expected 401

# 4) Gov login and role checks
$govLogin = Invoke-Api -Method "POST" -Url "$BaseUrl/api/v1/auth/login" -Body @{
    email = $GovEmail
    password = $GovPassword
}
Expect-Status -Name "POST /api/v1/auth/login (gov)" -Response $govLogin -Expected 200

$govToken = $null
if ($govLogin.StatusCode -eq 200 -and $govLogin.Body.token) {
    $govToken = [string]$govLogin.Body.token
    Add-Pass "Gov token received"
}
else {
    Add-Failure "Gov login did not return token"
}

if ($govToken) {
    $govMe = Invoke-Api -Method "GET" -Url "$BaseUrl/api/v1/govn-user/me" -Headers @{ Authorization = "Bearer $govToken" }
    Expect-Status -Name "GET /api/v1/govn-user/me (gov token)" -Response $govMe -Expected 200

    if ($govMe.StatusCode -eq 200 -and $govMe.Body.role -eq "gov") {
        Add-Pass "Gov /me role is gov"
    }
    elseif ($govMe.StatusCode -eq 200) {
        Add-Failure "Gov /me returned unexpected role"
    }

    $adminWithGov = Invoke-Api -Method "GET" -Url "$BaseUrl/api/v1/admin/me" -Headers @{ Authorization = "Bearer $govToken" }
    Expect-Status -Name "GET /api/v1/admin/me (gov token)" -Response $adminWithGov -Expected 403
}

# 5) Citizen login and role checks
$citizenLogin = Invoke-Api -Method "POST" -Url "$BaseUrl/api/v1/auth/login" -Body @{
    email = $CitizenEmail
    password = $CitizenPassword
}
Expect-Status -Name "POST /api/v1/auth/login (citizen)" -Response $citizenLogin -Expected 200

$citizenToken = $null
if ($citizenLogin.StatusCode -eq 200 -and $citizenLogin.Body.token) {
    $citizenToken = [string]$citizenLogin.Body.token
    Add-Pass "Citizen token received"
}
else {
    Add-Failure "Citizen login did not return token"
}

if ($citizenToken) {
    $citizenMe = Invoke-Api -Method "GET" -Url "$BaseUrl/api/v1/common-user/me" -Headers @{ Authorization = "Bearer $citizenToken" }
    Expect-Status -Name "GET /api/v1/common-user/me (citizen token)" -Response $citizenMe -Expected 200

    if ($citizenMe.StatusCode -eq 200 -and $citizenMe.Body.role -eq "citizen") {
        Add-Pass "Citizen /me role is citizen"
    }
    elseif ($citizenMe.StatusCode -eq 200) {
        Add-Failure "Citizen /me returned unexpected role"
    }

    $adminWithCitizen = Invoke-Api -Method "GET" -Url "$BaseUrl/api/v1/admin/me" -Headers @{ Authorization = "Bearer $citizenToken" }
    Expect-Status -Name "GET /api/v1/admin/me (citizen token)" -Response $adminWithCitizen -Expected 403
}

Write-Host ""
if ($script:Failures.Count -eq 0) {
    Write-Host "Smoke tests completed successfully." -ForegroundColor Green
    exit 0
}

Write-Host "Smoke tests completed with $($script:Failures.Count) failure(s):" -ForegroundColor Red
foreach ($failure in $script:Failures) {
    Write-Host " - $failure" -ForegroundColor Red
}
exit 1