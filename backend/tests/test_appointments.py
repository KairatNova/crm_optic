from datetime import datetime, timedelta, timezone

import pytest

from app.models.client import Client


def future_iso(days: int = 1) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).replace(microsecond=0).isoformat()


@pytest.mark.asyncio
async def test_create_list_and_patch_appointments(api_client, auth_headers):
    client_payload = {
        "name": "Клиент 1",
        "phone": "+996555111222",
        "email": "c1@example.com",
        "gender": "female",
        "birth_date": "1991-02-03",
    }
    res_client = await api_client.post("/clients", json=client_payload, headers=auth_headers)
    assert res_client.status_code == 201, res_client.text
    created_client = res_client.json()

    appt_payload = {
        "client_id": created_client["id"],
        "service": "Vision test",
        "starts_at": future_iso(2),
        "status": None,
        "comment": "appointment test",
    }

    res_create = await api_client.post("/appointments", json=appt_payload, headers=auth_headers)
    assert res_create.status_code == 201, res_create.text
    appt = res_create.json()
    assert appt["client_id"] == created_client["id"]
    assert appt["status"] == "new"

    res_list = await api_client.get("/appointments", headers=auth_headers)
    assert res_list.status_code == 200
    appointments = res_list.json()
    assert any(a["id"] == appt["id"] for a in appointments)

    res_patch = await api_client.patch(
        f"/appointments/{appt['id']}",
        json={"status": "done"},
        headers=auth_headers,
    )
    assert res_patch.status_code == 200, res_patch.text
    patched = res_patch.json()
    assert patched["status"] == "done"

    res_patch2 = await api_client.patch(
        f"/appointments/{appt['id']}",
        json={"status": "in_progress"},
        headers=auth_headers,
    )
    assert res_patch2.status_code == 200, res_patch2.text
    assert res_patch2.json()["status"] == "in_progress"

    res_bad = await api_client.patch(
        f"/appointments/{appt['id']}",
        json={"status": "invalid_status"},
        headers=auth_headers,
    )
    assert res_bad.status_code == 400

    res_create_bad = await api_client.post(
        "/appointments",
        json={
            "client_id": created_client["id"],
            "service": "X",
            "starts_at": future_iso(3),
            "status": "not_a_status",
        },
        headers=auth_headers,
    )
    assert res_create_bad.status_code == 400

