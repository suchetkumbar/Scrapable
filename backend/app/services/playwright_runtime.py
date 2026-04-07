import os
import platform
from pathlib import Path

from backend.app.schemas.system import PlaywrightRuntime


def inspect_playwright(browser_name: str) -> PlaywrightRuntime:
    executable_path = find_browser_executable(browser_name)

    return PlaywrightRuntime(
        browser=browser_name,
        executable_path=str(executable_path) if executable_path else None,
        installed=bool(executable_path),
        error=None if executable_path else "Browser executable not found. Run 'npm run setup:playwright'.",
    )


def find_browser_executable(browser_name: str) -> Path | None:
    cache_root = get_playwright_cache_root()

    if not cache_root.exists():
        return None

    executable_suffix = get_executable_suffix(browser_name)
    if executable_suffix is None:
        return None

    candidates = sorted(cache_root.glob(f"{browser_name}-*"), reverse=True)

    for candidate in candidates:
        executable_path = candidate / executable_suffix
        if executable_path.exists():
            return executable_path

    return None


def get_playwright_cache_root() -> Path:
    custom_path = os.getenv("PLAYWRIGHT_BROWSERS_PATH")
    if custom_path:
        return Path(custom_path).expanduser()

    system_name = platform.system()
    home = Path.home()

    if system_name == "Windows":
        return home / "AppData" / "Local" / "ms-playwright"
    if system_name == "Darwin":
        return home / "Library" / "Caches" / "ms-playwright"

    return home / ".cache" / "ms-playwright"


def get_executable_suffix(browser_name: str) -> Path | None:
    system_name = platform.system()

    if browser_name == "chromium":
        if system_name == "Windows":
            return Path("chrome-win") / "chrome.exe"
        if system_name == "Darwin":
            return Path("chrome-mac") / "Chromium.app" / "Contents" / "MacOS" / "Chromium"
        return Path("chrome-linux") / "chrome"

    if browser_name == "firefox":
        if system_name == "Windows":
            return Path("firefox") / "firefox.exe"
        if system_name == "Darwin":
            return Path("firefox") / "Nightly.app" / "Contents" / "MacOS" / "firefox"
        return Path("firefox") / "firefox"

    if browser_name == "webkit":
        if system_name == "Windows":
            return Path("Playwright.exe")
        if system_name == "Darwin":
            return Path("Playwright.app") / "Contents" / "MacOS" / "Playwright"
        return Path("pw_run.sh")

    return None
