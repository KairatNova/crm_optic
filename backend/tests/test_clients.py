from datetime import date

import pytest


@pytest.mark.asyncio
async def test_clients_create_and_read(api_client, auth_headers):
    payload = {
        "name": "Пётр",
        "phone": "+996777888999",
        "email": "petr@example.com",
        "gender": "male",
        "birth_date": str(date(1985, 5, 1)),
    }

    res_create = await api_client.post("/clients", json=payload, headers=auth_headers)
    assert res_create.status_code == 201, res_create.text
    created = res_create.json()
    assert created["id"] > 0
    assert created["phone"] == payload["phone"]

    res_list = await api_client.get("/clients", headers=auth_headers)
    assert res_list.status_code == 200
    clients = res_list.json()
    assert any(c["id"] == created["id"] for c in clients)

    res_get = await api_client.get(f"/clients/{created['id']}", headers=auth_headers)
    assert res_get.status_code == 200
    got = res_get.json()
    assert got["id"] == created["id"]
    assert got["email"] == payload["email"]


@pytest.mark.asyncio
async def test_clients_lookup_by_phone(api_client, auth_headers):
    payload = {
        "name": "Лукап",
        "phone": "+996700123456",
        "email": None,
        "gender": None,
        "birth_date": None,
    }
    res_create = await api_client.post("/clients", json=payload, headers=auth_headers)
    assert res_create.status_code == 201, res_create.text

    res_ok = await api_client.get("/clients/lookup", params={"phone": "0700123456"}, headers=auth_headers)
    assert res_ok.status_code == 200, res_ok.text
    assert res_ok.json()["phone"] == payload["phone"]

    res_miss = await api_client.get("/clients/lookup", params={"phone": "+19999999999"}, headers=auth_headers)
    assert res_miss.status_code == 404

