import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from types import SimpleNamespace
from main import app

# We need to ensure the middleware uses our mocked settings
# In main.py, it does: settings = get_settings() at module level
# But inside the middleware it uses: current_settings = getattr(request.app.state, "settings", settings)

@pytest.fixture
def mock_app():
    # Setup app state with mock settings
    settings = SimpleNamespace(
        ai_service_internal_key="secret-key",
        rate_limit_requests_per_minute=10,
        redis_url="redis://localhost"
    )
    app.state.settings = settings
    app.state.rate_limit_redis = None # Degraded mode
    return app

def test_middleware_unauthorized(mock_app):
    """Test 401 when internal key is required but missing/wrong"""
    client = TestClient(mock_app)
    # Use a real endpoint like /ocr (POST)
    response = client.post("/ocr", headers={"X-Internal-Key": "wrong-key"})
    assert response.status_code == 401

def test_middleware_authorized(mock_app):
    """Test bypass/auth when key is correct"""
    client = TestClient(mock_app)
    # Health should bypass
    response = client.get("/health/live")
    assert response.status_code == 200
    
    # Authorized request
    with patch("routers.ocr.perform_ocr") as mock_ocr:
        mock_ocr.return_value = MagicMock()
        response = client.post("/ocr", headers={"X-Internal-Key": "secret-key"}, files={"file": ("t.txt", b"t", "text/plain")})
        assert response.status_code != 401

def test_middleware_degraded_rate_limit(mock_app):
    """Test local rate limiting when Redis is missing"""
    mock_app.state.rate_limit_redis = None
    client = TestClient(mock_app)
    
    with patch("main.DEGRADED_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW", 2):
        from main import degraded_rate_limit_counters
        degraded_rate_limit_counters.clear()
        
        # We need a path that's NOT in bypass
        # /ocr is not in bypass
        client.post("/ocr", headers={"X-Internal-Key": "secret-key"}) # 1
        client.post("/ocr", headers={"X-Internal-Key": "secret-key"}) # 2
        response = client.post("/ocr", headers={"X-Internal-Key": "secret-key"}) # 3 -> 429
        assert response.status_code == 429
