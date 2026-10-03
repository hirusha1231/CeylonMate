import os
import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional, List
import httpx
from dotenv import load_dotenv

# Ensure robust loading of .env regardless of working directory
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_path.exists():
    load_dotenv(dotenv_path=_env_path, override=False)
load_dotenv(override=False)

logger = logging.getLogger("ceylonmate.llm")
logging.basicConfig(level=logging.INFO)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "").strip()
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-3.5-flash").strip()

CANDIDATE_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-3.5-flash"
]

_genai_client = None


def _get_client():
    global _genai_client
    api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        return None
    if _genai_client is None:
        try:
            from google import genai
            _genai_client = genai.Client(api_key=api_key)
            logger.info(f"[LLM CONFIG] Google GenAI Client initialized successfully.")
        except Exception as e:
            logger.info(f"[LLM CONFIG] GenAI SDK notice: {e}")
    return _genai_client


def get_llm():
    """Returns the configured Gemini client or model name."""
    client = _get_client()
    if client is not None:
        return client
    return MODEL_NAME


def _clean_json_text(text: str) -> str:
    """Strips markdown code fences and extraneous text from JSON response."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def generate_gemini_json_sync(prompt: str, system_instruction: str = "") -> Optional[Dict[str, Any]]:
    """Synchronous JSON generation prioritizing ultra-fast direct REST with SDK fallback."""
    api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        logger.warning("[LLM JSON] GOOGLE_API_KEY is not set or empty in environment.")
        return None

    env_model = os.getenv("MODEL_NAME", "gemini-2.5-flash").strip()
    fallback_pool = CANDIDATE_MODELS
    models_to_try = [env_model] if env_model and env_model not in fallback_pool else []
    for m in fallback_pool:
        if m not in models_to_try:
            if m == env_model:
                models_to_try.insert(0, m)
            else:
                models_to_try.append(m)

    json_system = (system_instruction + "\n\n" if system_instruction else "") + (
        "CRITICAL DIRECTIVE: You are an expert Sri Lanka luxury travel AI. Respond ONLY with a valid raw JSON object matching the requested schema. "
        "No conversational text, no markdown fences."
    )

    # 1. Fast Direct REST API (Primary for speed with automatic model failover)
    for model in models_to_try[:2]:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": f"{json_system}\n\nUSER PROMPT:\n{prompt}"}]}],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.2
                }
            }
            with httpx.Client(timeout=httpx.Timeout(2.5, connect=1.5)) as http_client:
                res = http_client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            raw_text = parts[0].get("text", "")
                            cleaned = _clean_json_text(raw_text)
                            parsed = json.loads(cleaned)
                            logger.info(f"[LLM JSON REST] Model {model} succeeded ({len(cleaned)} chars).")
                            return parsed
                else:
                    logger.warning(f"[LLM JSON REST] Model {model} returned HTTP {res.status_code}, trying next model...")
                    continue
        except Exception as ex:
            logger.warning(f"[LLM JSON REST] Model {model} err: {ex}, trying next model...")
            continue

    return None


async def generate_gemini_json(prompt: str, system_instruction: str = "") -> Optional[Dict[str, Any]]:
    """Async wrapper for generating and parsing structured JSON from Google Gemini."""
    import asyncio
    return await asyncio.to_thread(generate_gemini_json_sync, prompt, system_instruction)


def generate_gemini_text_sync(prompt: str, system_instruction: str = "") -> str:
    """Synchronous text generation prioritizing fast REST with SDK fallback."""
    api_key = os.getenv("GOOGLE_API_KEY", "").strip()
    if not api_key:
        return ""

    env_model = os.getenv("MODEL_NAME", "gemini-3.5-flash").strip()
    models_to_try = [env_model, "gemini-3.5-flash-lite", "gemini-3.8-flash"]
    full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt

    # 1. Fast REST
    for model in models_to_try:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {"temperature": 0.2}
            }
            with httpx.Client(timeout=2.5) as http_client:
                res = http_client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "").strip()
        except Exception as ex:
            logger.warning(f"[LLM TEXT REST] Model {model} err: {ex}")
            break

    return ""


async def generate_gemini_text(prompt: str, system_instruction: str = "") -> str:
    """Async wrapper for generating text from Google Gemini."""
    import asyncio
    return await asyncio.to_thread(generate_gemini_text_sync, prompt, system_instruction)
