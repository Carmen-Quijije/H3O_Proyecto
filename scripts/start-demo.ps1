$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$env:DB_MEMORY = 'true'
$env:PORT = '4317'
$env:JWT_SECRET = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
Write-Host 'Modo temporal: los datos se perderán al detener la aplicación.'
Write-Host 'Abre http://localhost:4317'
node backend/dist/main.js
