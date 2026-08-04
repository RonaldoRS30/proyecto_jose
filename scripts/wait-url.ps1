param(
    [Parameter(Mandatory = $true)][string]$Url,
    [int]$TimeoutSec = 2
)

try {
    $response = Invoke-WebRequest -UseBasicParsing -TimeoutSec $TimeoutSec -Uri $Url
    if ($response.StatusCode -eq 200) { exit 0 }
    exit 1
} catch {
    exit 1
}
