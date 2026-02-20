$ErrorActionPreference = "Stop"
$Url = "https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip"
$Zip = "maven.zip"
$Dest = "."

Write-Host "Downloading Maven from $Url..."
Invoke-WebRequest -Uri $Url -OutFile $Zip

Write-Host "Extracting..."
Expand-Archive -Path $Zip -DestinationPath $Dest -Force

Write-Host "Renaming..."
if (Test-Path "maven") { Remove-Item "maven" -Recurse -Force }
Rename-Item "apache-maven-3.9.6" "maven"

Write-Host "Cleaning up..."
Remove-Item $Zip

Write-Host "Maven installed to $(Get-Location)\maven"
& ".\maven\bin\mvn" -version
