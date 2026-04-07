$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$venvPath = Join-Path $projectRoot "backend\.venv"
$venvPython = Join-Path $venvPath "Scripts\python.exe"
$requirementsPath = Join-Path $projectRoot "backend\requirements.txt"

if (-not (Test-Path $venvPython)) {
  if (Get-Command py -ErrorAction SilentlyContinue) {
    & py -3 -m venv $venvPath
  } else {
    & python -m venv $venvPath
  }
}

& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r $requirementsPath
