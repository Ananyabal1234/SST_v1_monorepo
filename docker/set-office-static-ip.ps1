# Run elevated (Right-click PowerShell → Run as administrator), then:
#   powershell -ExecutionPolicy Bypass -File docker\set-office-static-ip.ps1
#
# Locks Wi-Fi to a fixed office LAN address so colleagues can keep using the same URL.

$ErrorActionPreference = 'Stop'
$Interface = 'Wi-Fi'
$IP = '172.16.1.73'
$Mask = '255.255.255.0'
$Gateway = '172.16.1.1'
$Dns1 = '8.8.8.8'
$Dns2 = '8.8.4.4'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]$identity
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Error 'Run this script from an elevated PowerShell (Run as administrator).'
}

Write-Host "Setting $Interface to static $IP ..."
netsh interface ip set address name="$Interface" static $IP $Mask $Gateway
netsh interface ip set dns name="$Interface" static $Dns1
netsh interface ip add dns name="$Interface" $Dns2 index=2

netsh advfirewall firewall delete rule name="SST Web HTTP-In" >$null 2>&1
netsh advfirewall firewall delete rule name="SST API HTTP-In" >$null 2>&1
netsh advfirewall firewall add rule name="SST Web HTTP-In" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="SST API HTTP-In" dir=in action=allow protocol=TCP localport=3000

Write-Host ''
Write-Host 'Done. Verify with: netsh interface ip show config name="Wi-Fi"'
netsh interface ip show config name="$Interface"
Write-Host ''
Write-Host "Office URL: http://$IP"
