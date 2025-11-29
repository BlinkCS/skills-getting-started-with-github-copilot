import copy
import urllib.parse

import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


@pytest.fixture(autouse=True)
def reset_activities():
    # Keep tests isolated by restoring the in-memory activities dict
    backup = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(copy.deepcopy(backup))


@pytest.fixture
def client():
    return TestClient(app)


def test_get_activities(client):
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unsubscribe_flow(client):
    activity = "Chess Club"
    email = "pytest.user@example.com"

    # initially not signed up
    assert email not in activities[activity]["participants"]

    # sign up
    resp = client.post(f"/activities/{urllib.parse.quote(activity)}/signup", params={"email": email})
    assert resp.status_code == 200
    assert resp.json().get("message")
    assert email in activities[activity]["participants"]

    # duplicate sign-up fails
    resp = client.post(f"/activities/{urllib.parse.quote(activity)}/signup", params={"email": email})
    assert resp.status_code == 400
    assert "already signed up" in resp.json().get("detail", "").lower()

    # unregister
    resp = client.delete(f"/activities/{urllib.parse.quote(activity)}/participant", params={"email": email})
    assert resp.status_code == 200
    assert email not in activities[activity]["participants"]

    # unregistering again returns 404
    resp = client.delete(f"/activities/{urllib.parse.quote(activity)}/participant", params={"email": email})
    assert resp.status_code == 404


def test_errors_for_missing_activity(client):
    resp = client.post(f"/activities/{urllib.parse.quote('NoSuch')}/signup", params={"email": "a@b.com"})
    assert resp.status_code == 404

    resp = client.delete(f"/activities/{urllib.parse.quote('NoSuch')}/participant", params={"email": "a@b.com"})
    assert resp.status_code == 404
