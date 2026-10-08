import os
import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional, List, Tuple, Union
import httpx

try:
    from dotenv import load_dotenv
    # Ensure robust loading of .env regardless of working directory
    _env_path = Path(__file__).resolve().parent.parent.parent / ".env"
    if _env_path.exists():
        load_dotenv(dotenv_path=_env_path, override=False)
    load_dotenv(override=False)
except ImportError:
    pass

logger = logging.getLogger("ceylonmate.llm")
logging.basicConfig(level=logging.INFO)

GROQ_CANDIDATE_MODELS = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "allam-2-7b",
]

GEMINI_CANDIDATE_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
]

_genai_client = None


def _resolve_provider_and_key() -> Tuple[str, str]:
    """Detects whether Groq or Google Gemini is configured."""
    explicit_provider = os.getenv("LLM_PROVIDER", "").strip().lower()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    google_key = os.getenv("GOOGLE_API_KEY", "").strip() or os.getenv("GEMINI_API_KEY", "").strip()

    # If key starts with 'gsk_', it's definitely a Groq key (even if stored under GOOGLE_API_KEY)
    if groq_key:
        return "groq", groq_key
    if google_key.startswith("gsk_"):
        return "groq", google_key

    if explicit_provider in ("groq", "openai") and (groq_key or google_key):
        return "groq", groq_key or google_key

    if google_key:
        return "gemini", google_key

    return "none", ""


def _get_active_models(provider: str) -> List[str]:
    """Resolves model pool according to provider and configured MODEL_NAME."""
    raw_model = os.getenv("MODEL_NAME", "").strip()

    if provider == "groq":
        # If user left a Gemini model name in .env while using Groq, switch to Groq default
        if not raw_model or raw_model.startswith("gemini-"):
            primary = "qwen/qwen3.8-27b"
        else:
            primary = raw_model
        pool = [primary]
        for m in GROQ_CANDIDATE_MODELS:
            if m not in pool:
                pool.append(m)
        return pool
    elif provider == "gemini":
        if not raw_model or "/" in raw_model:
            primary = "gemini-3.8-flash"
        else:
            primary = raw_model
        pool = [primary]
        for m in GEMINI_CANDIDATE_MODELS:
            if m not in pool:
                pool.append(m)
        return pool
    return []


def get_llm():
    """Returns the configured client or model identifier."""
    provider, key = _resolve_provider_and_key()
    models = _get_active_models(provider)
    current_model = models[0] if models else "unknown"

    if provider == "gemini" and key:
        global _genai_client
        if _genai_client is None:
            try:
                from google import genai
                _genai_client = genai.Client(api_key=key)
            except Exception as e:
                logger.debug(f"[LLM CONFIG] GenAI SDK notice: {e}")
        if _genai_client is not None:
            return _genai_client

    return f"{provider}:{current_model}"


def _clean_json_text(text: str) -> str:
    """Strips markdown code fences and extracts raw JSON object or array."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    # Extract balanced object {...} or array [...] if wrapped in conversational prose
    if not (text.startswith("{") or text.startswith("[")):
        first_brace = text.find("{")
        first_bracket = text.find("[")
        if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
            last_brace = text.rfind("}")
            if last_brace != -1:
                text = text[first_brace:last_brace + 1]
        elif first_bracket != -1:
            last_bracket = text.rfind("]")
            if last_bracket != -1:
                text = text[first_bracket:last_bracket + 1]
    return text.strip()


def _call_groq_json_sync(prompt: str, system_instruction: str, api_key: str, models: List[str]) -> Optional[Any]:
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    json_system = (system_instruction + "\n\n" if system_instruction else "") + (
        "CRITICAL DIRECTIVE: You are an expert Sri Lanka travel AI. Respond ONLY with a valid raw JSON object matching the requested schema. "
        "No conversational text, no markdown fences."
    )

    for model in models:
        try:
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": json_system},
                    {"role": "user", "content": prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2
            }
            with httpx.Client(timeout=httpx.Timeout(20.0, connect=5.0)) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices:
                        raw_text = choices[0].get("message", {}).get("content", "")
                        cleaned = _clean_json_text(raw_text)
                        parsed = json.loads(cleaned)
                        logger.info(f"[LLM JSON GROQ] Model {model} succeeded ({len(cleaned)} chars).")
                        return parsed
                else:
                    logger.warning(f"[LLM JSON GROQ] Model {model} returned HTTP {res.status_code}: {res.text[:150]}")
                    continue
        except Exception as ex:
            logger.warning(f"[LLM JSON GROQ] Model {model} error: {ex}")
            continue
    return None


def _call_groq_text_sync(prompt: str, system_instruction: str, api_key: str, models: List[str]) -> str:
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    for model in models:
        try:
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": prompt})
            payload = {
                "model": model,
                "messages": messages,
                "temperature": 0.2
            }
            with httpx.Client(timeout=httpx.Timeout(15.0, connect=5.0)) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices:
                        return choices[0].get("message", {}).get("content", "").strip()
                else:
                    logger.warning(f"[LLM TEXT GROQ] Model {model} returned HTTP {res.status_code}: {res.text[:150]}")
                    continue
        except Exception as ex:
            logger.warning(f"[LLM TEXT GROQ] Model {model} error: {ex}")
            continue
    return ""


def _call_gemini_json_sync(prompt: str, system_instruction: str, api_key: str, models: List[str]) -> Optional[Any]:
    json_system = (system_instruction + "\n\n" if system_instruction else "") + (
        "CRITICAL DIRECTIVE: You are an expert Sri Lanka luxury travel AI. Respond ONLY with a valid raw JSON object matching the requested schema. "
        "No conversational text, no markdown fences."
    )

    for model in models:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": f"{json_system}\n\nUSER PROMPT:\n{prompt}"}]}],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.2
                }
            }
            with httpx.Client(timeout=httpx.Timeout(15.0, connect=5.0)) as http_client:
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
                            logger.info(f"[LLM JSON GEMINI] Model {model} succeeded ({len(cleaned)} chars).")
                            return parsed
                else:
                    logger.warning(f"[LLM JSON GEMINI] Model {model} returned HTTP {res.status_code}: {res.text[:150]}")
                    continue
        except Exception as ex:
            logger.warning(f"[LLM JSON GEMINI] Model {model} err: {ex}")
            continue
    return None


def _call_gemini_text_sync(prompt: str, system_instruction: str, api_key: str, models: List[str]) -> str:
    full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt

    for model in models:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {"temperature": 0.2}
            }
            with httpx.Client(timeout=httpx.Timeout(15.0, connect=5.0)) as http_client:
                res = http_client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "").strip()
                else:
                    logger.warning(f"[LLM TEXT GEMINI] Model {model} returned HTTP {res.status_code}")
                    continue
        except Exception as ex:
            logger.warning(f"[LLM TEXT GEMINI] Model {model} err: {ex}")
            continue
    return ""


def generate_gemini_json_sync(prompt: str, system_instruction: str = "") -> Optional[Any]:
    """Synchronous JSON generation supporting both Groq and Gemini with failover."""
    provider, api_key = _resolve_provider_and_key()
    if provider == "none" or not api_key:
        logger.warning("[LLM JSON] Neither Groq nor Google Gemini API key detected.")
        return None

    models = _get_active_models(provider)

    if provider == "groq":
        return _call_groq_json_sync(prompt, system_instruction, api_key, models)
    else:
        return _call_gemini_json_sync(prompt, system_instruction, api_key, models)


async def generate_gemini_json(prompt: str, system_instruction: str = "") -> Optional[Any]:
    """Async wrapper for generating and parsing structured JSON."""
    import asyncio
    return await asyncio.to_thread(generate_gemini_json_sync, prompt, system_instruction)


def generate_gemini_text_sync(prompt: str, system_instruction: str = "") -> str:
    """Synchronous text generation supporting both Groq and Gemini with failover."""
    provider, api_key = _resolve_provider_and_key()
    if provider == "none" or not api_key:
        logger.warning("[LLM TEXT] Neither Groq nor Google Gemini API key detected.")
        return ""

    models = _get_active_models(provider)

    if provider == "groq":
        return _call_groq_text_sync(prompt, system_instruction, api_key, models)
    else:
        return _call_gemini_text_sync(prompt, system_instruction, api_key, models)


async def generate_gemini_text(prompt: str, system_instruction: str = "") -> str:
    """Async wrapper for generating text."""
    import asyncio
    return await asyncio.to_thread(generate_gemini_text_sync, prompt, system_instruction)


# Agnostic aliases for forward compatibility
generate_llm_json_sync = generate_gemini_json_sync
generate_llm_json = generate_gemini_json
generate_llm_text_sync = generate_gemini_text_sync
generate_llm_text = generate_gemini_text
