from datetime import datetime, timedelta, timezone

import pytest


def future_iso(days: int = 1) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).replace(microsecond=0).isoformat()


@pytest.mark.asyncio
async def test_public_booking_creates_appointment_and_client(api_client, auth_headers):
    payload = {
        "name": "Иван",
        "phone": "+996700123456",
        "email": "ivan@example.com",
        "gender": "male",
        "birth_date": "1990-01-01",
        "service": "Vision test",
        "starts_at": future_iso(1),
        "comment": "test booking",
    }

    res = await api_client.post("/public/booking", json=payload)
    assert res.status_code == 201, res.text
    appt = res.json()

    assert appt["status"] == "new"
    assert appt["service"] == payload["service"]
    assert appt["client_id"] > 0
    assert appt.get("source") == "landing"

    # Appointment should be visible in protected CRM endpoints.
    res_list = await api_client.get("/appointments", headers=auth_headers)
    assert res_list.status_code == 200
    appointments = res_list.json()
    assert any(a["id"] == appt["id"] for a in appointments)

    # Client should be created and accessible.
    res_client = await api_client.get(f"/clients/{appt['client_id']}", headers=auth_headers)
    assert res_client.status_code == 200
    client = res_client.json()
    assert client["phone"] == payload["phone"]
    assert client["name"] == payload["name"]


@pytest.mark.asyncio
async def test_public_booking_reuses_client_on_same_phone(api_client, auth_headers):
    phone = "+996700999888"
    payload1 = {
        "name": "Первый",
        "phone": phone,
        "email": "a@example.com",
        "gender": "male",
        "birth_date": "1990-01-01",
        "service": "Vision test",
        "starts_at": future_iso(2),
        "comment": "first",
    }
    res1 = await api_client.post("/public/booking", json=payload1)
    assert res1.status_code == 201, res1.text
    appt1 = res1.json()
    cid = appt1["client_id"]

    payload2 = {
        "name": "Другое имя",
        "phone": phone,
        "email": "b@example.com",
        "gender": "female",
        "birth_date": "1992-02-02",
        "service": "Contact lenses",
        "starts_at": future_iso(3),
        "comment": "second",
    }
    res2 = await api_client.post("/public/booking", json=payload2)
    assert res2.status_code == 201, res2.text
    appt2 = res2.json()
    assert appt2["client_id"] == cid
    assert appt2["id"] != appt1["id"]

    res_client = await api_client.get(f"/clients/{cid}", headers=auth_headers)
    assert res_client.status_code == 200
    assert res_client.json()["name"] == "Первый"


@pytest.mark.asyncio
async def test_public_booking_rejects_past_datetime(api_client):
    payload = {
        "name": "Иван",
        "phone": "+996700123456",
        "email": "ivan@example.com",
        "gender": "male",
        "birth_date": "1990-01-01",
        "service": "Vision test",
        "starts_at": future_iso(-1),
        "comment": "should fail",
    }

    res = await api_client.post("/public/booking", json=payload)
    assert res.status_code == 400
    body = res.json()
    assert body["detail"] == "starts_at must not be in the past"

