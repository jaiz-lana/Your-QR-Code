<#
.SYNOPSIS
  Script satu-klik untuk Commit, Tag Release, Push ke GitHub, dan Deploy ke Firebase.
.EXAMPLE
  .\scripts\release.ps1 -Version "v1.0.1" -Message "Update tampilan About"
#>
param(
  [string]$Version = "",
  [string]$Message = "Update Your QR Code"
)

$ErrorActionPreference = "Stop"
$git = "C:\Program Files\Git\cmd\git.exe"

Write-Host "==> 1. Git Add & Commit..." -ForegroundColor Cyan
& $git add .
& $git commit -m $Message

if ($Version) {
  Write-Host "==> 2. Membuat Tag Release $Version..." -ForegroundColor Cyan
  & $git tag -a $Version -m "Release $Version - $Message"
}

Write-Host "==> 3. Push ke GitHub..." -ForegroundColor Cyan
& $git push origin main --tags

Write-Host "==> 4. Deploy ke Firebase Hosting..." -ForegroundColor Cyan
firebase deploy --only hosting

Write-Host "Selesai! GitHub & Firebase sudah terbarui." -ForegroundColor Green
