from datetime import datetime, timedelta, timezone

import pytest


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def future_iso(days: int = 1) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).replace(microsecond=0).isoformat()


@pytest.mark.asyncio
async def test_visits_and_vision_tests(api_client, auth_headers):
    client_payload = {
        "name": "Клиент VT",
        "phone": "+996444333222",
        "email": "vt@example.com",
        "gender": "male",
        "birth_date": "1988-08-08",
    }
    res_client = await api_client.post("/clients", json=client_payload, headers=auth_headers)
    assert res_client.status_code == 201, res_client.text
    client_id = res_client.json()["id"]

    # Visits
    visit_payload = {"visited_at": now_iso(), "comment": "first visit"}
    res_visit = await api_client.post(
        f"/clients/{client_id}/visits",
        json=visit_payload,
        headers=auth_headers,
    )
    assert res_visit.status_code == 201, res_visit.text
    visit = res_visit.json()
    assert visit["client_id"] == client_id
    assert visit["comment"] == "first visit"

    res_visits = await api_client.get(f"/clients/{client_id}/visits", headers=auth_headers)
    assert res_visits.status_code == 200, res_visits.text
    visits = res_visits.json()
    assert any(v["id"] == visit["id"] for v in visits)

    # Vision tests
    vision_payload = {
        "tested_at": future_iso(3),
        "od_sph": "-1.25",
        "od_cyl": "-0.50",
        "od_axis": "180",
        "os_sph": "-1.00",
        "os_cyl": "-0.25",
        "os_axis": "175",
        "pd": "62",
        "lens_type": "single vision",
        "frame_model": "model x",
        "comment": "vision test note",
    }
    res_vt = await api_client.post(
        f"/clients/{client_id}/vision-tests",
        json=vision_payload,
        headers=auth_headers,
    )
    assert res_vt.status_code == 201, res_vt.text
    vt = res_vt.json()
    assert vt["client_id"] == client_id
    assert vt["pd"] == vision_payload["pd"]

    res_vts = await api_client.get(f"/clients/{client_id}/vision-tests", headers=auth_headers)
    assert res_vts.status_code == 200, res_vts.text
    vts = res_vts.json()
    assert any(x["id"] == vt["id"] for x in vts)

