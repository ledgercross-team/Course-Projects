import os
from dotenv import load_dotenv
import requests

load_dotenv()

backend_url = os.getenv("backend_url", "http://localhost:3030").rstrip("/")
sentiment_analyzer_url = os.getenv("sentiment_analyzer_url", "http://localhost:5050/").rstrip("/") + "/"

def get_request(endpoint, **kwargs):
    """
    Makes a GET request to backend_url + endpoint, passing kwargs as query params.
    Always returns JSON (list/dict). If it fails, returns [].
    """
    url = backend_url + endpoint
    print(f"GET from {url} params={kwargs}")

    try:
        resp = requests.get(url, params=kwargs, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as err:
        print(f"GET failed: {err}")
        return []

def analyze_review_sentiments(text):
    """
    Calls sentiment_analyzer_url/analyze/<encoded_text>.
    Always returns dict with at least {'sentiment': 'neutral'} if anything fails.
    """
    try:
        safe_text = requests.utils.quote(text or "")
        url = sentiment_analyzer_url + "analyze/" + safe_text
        print(f"Sentiment GET from {url}")

        resp = requests.get(url, timeout=10)
        resp.raise_for_status()

        data = resp.json()
        if isinstance(data, dict) and "sentiment" in data:
            return data
        return {"sentiment": "neutral"}

    except Exception as err:
        print(f"Sentiment failed: {err}")
        return {"sentiment": "neutral"}

def post_review(data_dict):
    """
    POST review data to backend /insert_review.
    Returns response JSON, or {'error': ...} if fails.
    """
    url = backend_url + "/insert_review"
    print(f"POST to {url}")

    try:
        resp = requests.post(url, json=data_dict, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as err:
        print(f"POST failed: {err}")
        return {"error": "Network exception occurred"}
