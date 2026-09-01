# =====================================================================
#  Recruit CSV auto-fetch (Windows / PowerShell)
#  Logs into EntryPocket from THIS PC's network line, downloads the
#  applicant CSV, and sends it to the app (GAS).
#  EntryPocket blocks datacenter IPs (Google/GitHub) with 403, but a
#  normal home/office line works.
# =====================================================================

# vvv  EDIT THESE TWO LINES with your EntryPocket ID / password  vvv
$EPUSER = "REPLACE_ID"
$EPPASS = "REPLACE_PASS"
# ^^^  Only these two lines. Keep the double quotes, change inside.  ^^^

$ErrorActionPreference = "Stop"
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

$exec      = "https://script.google.com/macros/s/AKfycbz6i36c7UjbM3S44kl1kEcsI0CSjYo9jL-W-T4BJUAr9jmBlVXj-vnQTUwQbGoxcHYT/exec"
$loginUrl  = "https://manage.entrypocket.jp/web/-/login"
$applicant = "https://manage.entrypocket.jp/web/8sin-saiyo/applicant"
$csvUrl    = "https://manage.entrypocket.jp/web/8sin-saiyo/applicant?p_p_id=applycontrol_WAR_MYNApplyControlportlet&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_cacheability=cacheLevelPage&p_p_col_id=column-1&p_p_col_count=1&_applycontrol_WAR_MYNApplyControlportlet_part=downloadCSV"
$UA        = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

$logFile = Join-Path $PSScriptRoot "recruit_log.txt"
function Log($m){
  $line = ((Get-Date).ToString("yyyy-MM-dd HH:mm:ss") + "  " + $m)
  Write-Host $line
  try { Add-Content -Path $logFile -Value $line -Encoding UTF8 } catch {}
}

try {
  if ($EPUSER -eq "REPLACE_ID" -or $EPPASS -eq "REPLACE_PASS") {
    Log "[STOP] Open recruit_fetch.ps1 and set EPUSER / EPPASS to your EntryPocket ID / password."
    exit 1
  }
  Log "=== start ==="

  # 1) login page -> extract Liferay auth token (p_auth)
  $r1 = Invoke-WebRequest $loginUrl -SessionVariable ep -UseBasicParsing -UserAgent $UA
  $pauth = ""
  if ($r1.Content -match "Liferay\.authToken\s*=\s*'([^']+)'") { $pauth = $Matches[1] }
  Log ("login page HTTP=" + [int]$r1.StatusCode + " p_auth=" + $(if($pauth){"yes"}else{"no"}))

  # 2) login POST
  $body = @{ login = $EPUSER; password = $EPPASS; rememberMe = "false" }
  if ($pauth) { $body["p_auth"] = $pauth }
  try {
    Invoke-WebRequest "https://manage.entrypocket.jp/c/portal/login" -Method Post -WebSession $ep `
      -Body $body -Headers @{ Referer = $loginUrl } -UserAgent $UA -UseBasicParsing -MaximumRedirection 5 | Out-Null
  } catch { Log ("login POST (continue): " + $_.Exception.Message) }

  # 3) applicant page -> confirm login + fresh p_auth
  $rApp = Invoke-WebRequest $applicant -WebSession $ep -UseBasicParsing -UserAgent $UA
  if ($rApp.Content -match "403 Forbidden|don't have permission") { Log "[FAIL] applicant page 403 (this PC IP may be blocked)"; exit 1 }
  if ($rApp.Content -match "_58_password")                        { Log "[FAIL] not logged in (check ID/password)"; exit 1 }
  $pauth2 = $pauth
  if ($rApp.Content -match "Liferay\.authToken\s*=\s*'([^']+)'") { $pauth2 = $Matches[1] }

  # 4) download CSV
  $tmp = Join-Path $PSScriptRoot "applicant.csv"
  $cbody = @{}
  if ($pauth2) { $cbody["p_auth"] = $pauth2 }
  Invoke-WebRequest $csvUrl -Method Post -WebSession $ep `
    -Headers @{ Referer = $applicant; "X-Requested-With" = "XMLHttpRequest" } `
    -Body $cbody -UserAgent $UA -UseBasicParsing -OutFile $tmp
  $bytes = [IO.File]::ReadAllBytes($tmp)
  Log ("CSV downloaded " + $bytes.Length + " bytes")
  if ($bytes.Length -lt 500) { Log "[FAIL] CSV too small (login may have failed)"; exit 1 }
  $head = [Text.Encoding]::ASCII.GetString($bytes[0..([Math]::Min(200,$bytes.Length-1))])
  if ($head -match "<!DOCTYPE|<html|403 Forbidden") { Log "[FAIL] got HTML/403 instead of CSV"; exit 1 }

  # 5) send to the app (GAS) as Base64
  $b64 = [Convert]::ToBase64String($bytes)
  $payload = '{"api":"importcsv","b64":"' + $b64 + '"}'
  $rGas = Invoke-WebRequest $exec -Method Post -Body $payload -ContentType "text/plain; charset=utf-8" -UseBasicParsing
  Log ("app response: " + ($rGas.Content -replace "\s+"," ").Substring(0,[Math]::Min(200,$rGas.Content.Length)))
  Log "=== done (open the app and refresh to check) ==="
}
catch {
  Log ("[ERROR] " + $_.Exception.Message)
  exit 1
}
