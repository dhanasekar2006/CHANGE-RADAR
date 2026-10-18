from __future__ import annotations

from packages.shared.constants import WorkspaceRole
from packages.shared.errors import AuthorizationError

_ROLE_RANK = {
    WorkspaceRole.VIEWER: 0,
    WorkspaceRole.MEMBER: 1,
    WorkspaceRole.ADMIN: 2,
    WorkspaceRole.OWNER: 3,
}


def require_role(actual: WorkspaceRole, minimum: WorkspaceRole) -> None:
    """Raise AuthorizationError unless `actual` is at least as privileged as `minimum`.

    Role ordering: viewer < member < admin < owner. Routers call this after
    resolving the caller's WorkspaceMember row for the workspace being acted on.
    """
    if _ROLE_RANK[actual] < _ROLE_RANK[minimum]:
        raise AuthorizationError(f"requires {minimum.value} role or higher")
