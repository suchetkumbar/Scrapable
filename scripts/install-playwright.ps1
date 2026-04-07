$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$venvPython = Join-Path $projectRoot "backend\.venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
  Write-Error "Backend virtual environment not found. Run 'npm run setup:backend' first."
  exit 1
}

& $venvPython -m playwright install chromium
