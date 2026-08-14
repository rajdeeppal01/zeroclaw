Write-Host "Checking if Docker is running..."
$dockerStatus = (docker info 2>&1)

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker is not running. Starting Docker Desktop..."
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    Write-Host "Waiting for Docker to start..."
    while ($true) {
        docker info > $null 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Docker is now running."
            break
        }
        Start-Sleep -Seconds 2
    }
} else {
    Write-Host "Docker is already running."
}

Write-Host "Starting ZeroClaw infrastructure..."
docker-compose up -d
Write-Host "ZeroClaw is up and running!"
