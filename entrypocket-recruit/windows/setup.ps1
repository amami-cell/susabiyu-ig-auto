# Register daily auto-run (no admin needed), then run one test fetch.
$here   = $PSScriptRoot
$script = Join-Path $here "recruit_fetch.ps1"

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument ('-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $script + '"')
$trigDaily = New-ScheduledTaskTrigger -Daily -At 9:00am
$trigLogon = New-ScheduledTaskTrigger -AtLogOn
$settings  = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask -TaskName "RecruitCSVAuto" -Description "Recruit CSV auto fetch" `
  -Action $action -Trigger $trigDaily,$trigLogon -Settings $settings -Force | Out-Null

Write-Host ""
Write-Host "[OK] Auto-run registered (daily 9:00 AND at logon)."
Write-Host "     Even if the PC is off at 9:00, it runs at the next startup/logon."
Write-Host ""
Write-Host "Running a test fetch now..."
Write-Host "-------------------------------------------"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script
Write-Host "-------------------------------------------"
Write-Host ("Log file: " + (Join-Path $here "recruit_log.txt"))
