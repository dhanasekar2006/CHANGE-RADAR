from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_liveness() -> None:
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readiness() -> None:
    response = client.get("/health/ready")
    assert response.status_code == 200


def test_unauthenticated_request_rejected() -> None:
    response = client.get(f"/workspaces")
    assert response.status_code == 401
