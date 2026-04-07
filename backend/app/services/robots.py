from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser


@dataclass
class RobotsCheckResult:
    url: str
    allowed: bool
    status: str


def check_robots_allowed(target_url: str, user_agent: str = "*") -> RobotsCheckResult:
    parts = urlsplit(target_url)
    robots_url = f"{parts.scheme}://{parts.netloc}/robots.txt"
    parser = RobotFileParser()

    try:
        request = Request(
            robots_url,
            headers={"User-Agent": "ScrapableBot/0.1 (+local workspace)"},
        )
        with urlopen(request, timeout=10) as response:
            content = response.read().decode("utf-8", "ignore")

        parser.parse(content.splitlines())
        allowed = parser.can_fetch(user_agent, target_url)
        return RobotsCheckResult(
            url=robots_url,
            allowed=allowed,
            status="allowed" if allowed else "blocked",
        )
    except HTTPError as exc:
        if exc.code == 404:
            return RobotsCheckResult(url=robots_url, allowed=True, status="not_found")

        return RobotsCheckResult(
            url=robots_url,
            allowed=True,
            status=f"http_error_{exc.code}",
        )
    except URLError:
        return RobotsCheckResult(url=robots_url, allowed=True, status="unreachable")
    except Exception:
        return RobotsCheckResult(url=robots_url, allowed=True, status="unknown")
