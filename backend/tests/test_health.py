import pytest


@pytest.mark.asyncio
async def test_health_ok(api_client):
    res = await api_client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}

