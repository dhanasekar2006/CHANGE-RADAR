from __future__ import annotations

from urllib.parse import parse_qsl, urlencode, urlsplit

# Hosts that all mean "this machine" to someone running the demo: the browser sees
# localhost, a Docker worker reaches the same server as host.docker.internal.
_LOCAL_HOSTS = {"localhost", "127.0.0.1", "host.docker.internal"}
_TRACKING_PARAMS = {"gclid", "fbclid", "msclkid", "ref", "ref_", "tag", "igshid", "mc_cid", "mc_eid"}


def _is_tracking(name: str) -> bool:
    return name.lower().startswith("utm_") or name.lower() in _TRACKING_PARAMS


def url_key(url: str) -> str:
    """A key that is equal for URLs that point at the same product page.

    Ignores scheme (http vs https), fragment, trailing slash, default port,
    letter case of the host, query-parameter order, and tracking parameters
    (utm_*, gclid, fbclid, ...). Parameters that identify the product (`?id=42`)
    are kept. Local-machine host names are treated as one host.
    """
    parts = urlsplit(url.strip())
    host = (parts.hostname or "").lower()
    host = "local" if host in _LOCAL_HOSTS else host.removeprefix("www.")

    default_port = {"http": 80, "https": 443}.get(parts.scheme.lower())
    port = f":{parts.port}" if parts.port and parts.port != default_port else ""

    path = parts.path.rstrip("/") or "/"
    query = urlencode(sorted((k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if not _is_tracking(k)))
    return f"{host}{port}{path}" + (f"?{query}" if query else "")


def path_needle(url: str) -> str:
    """The last path segment, used to narrow the SQL scan before comparing url_key()s."""
    segments = [s for s in urlsplit(url.strip()).path.split("/") if s]
    return segments[-1] if segments else ""
