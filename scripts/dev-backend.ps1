$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$venvPython = Join-Path $projectRoot "backend\.venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
  Write-Error "Backend virtual environment not found. Run 'npm run setup:backend' and 'npm run setup:playwright' first."
  exit 1
}

$backendHost = if ($env:SCRAPABLE_BACKEND_HOST) { $env:SCRAPABLE_BACKEND_HOST } else { "127.0.0.1" }
$backendPort = if ($env:SCRAPABLE_BACKEND_PORT) { $env:SCRAPABLE_BACKEND_PORT } else { "8000" }

Push-Location $projectRoot
try {
  & $venvPython -m uvicorn backend.app.main:app --reload --host $backendHost --port $backendPort
}
finally {
  Pop-Location
}
