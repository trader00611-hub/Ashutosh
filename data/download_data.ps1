# Windows version: downloads MovieLens "ml-latest-small" into data\raw\
# Usage (PowerShell, from the project folder):   powershell -ExecutionPolicy Bypass -File data\download_data.ps1
$dir = Join-Path $PSScriptRoot "raw"
New-Item -ItemType Directory -Force $dir | Out-Null
$zip = Join-Path $dir "ml-latest-small.zip"
Invoke-WebRequest -Uri "https://files.grouplens.org/datasets/movielens/ml-latest-small.zip" -OutFile $zip -UseBasicParsing
Expand-Archive $zip -DestinationPath $dir -Force
Get-ChildItem (Join-Path $dir "ml-latest-small")
