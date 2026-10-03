import logging
from typing import Dict, Any, Tuple
import httpx
from app.core.llm import generate_gemini_json

logger = logging.getLogger("ceylonmate.suitability_agent")

SRI_LANKA_COORDINATES = {
    "colombo": (6.9271, 79.8612),
    "kandy": (7.2906, 80.6337),
    "galle": (6.0535, 80.2210),
    "mirissa": (5.9466, 80.4583),
    "ella": (6.8667, 81.0466),
    "sigiriya": (7.9570, 80.7603),
    "nuwara eliya": (6.9497, 80.7891),
    "trincomalee": (8.5874, 81.2152),
    "yala": (6.3725, 81.5167),
    "jaffna": (9.6615, 80.0255),
    "bentota": (6.4259, 79.9959),
    "arugam bay": (6.8415, 81.8347),
    "dambulla": (7.8742, 80.6511),
    "polonnaruwa": (7.9403, 81.0188),
    "anuradhapura": (8.3114, 80.4037),
    "tangalle": (6.0244, 80.7941),
    "hikkaduwa": (6.1408, 80.1017),
    "negombo": (7.2008, 79.8736),
    "unawatuna": (6.0104, 80.2488),
    "weligama": (5.9736, 80.4287),
    "pasikudah": (7.9250, 81.5644),
    "horton plains": (6.8028, 80.8048),
    "sinharaja": (6.4167, 80.4167),
    "udawalawe": (6.4444, 80.8889),
    "wilpattu": (8.4500, 80.0167),
    "kalpitiya": (8.2294, 79.7644),
    "batticaloa": (7.7310, 81.6747),
    "matara": (5.9549, 80.5550),
    "hambantota": (6.1429, 81.1212),
    "badulla": (6.9934, 81.0550),
    "ratnapura": (6.6828, 80.4035),
    "kurunegala": (7.4863, 80.3623),
    "pinnawala": (7.3014, 80.3847),
    "nilaveli": (8.6833, 81.1833),
}

WMO_CODE_MAP = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    56: "Light Freezing Drizzle",
    57: "Dense Freezing Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    66: "Light Freezing Rain",
    67: "Heavy Freezing Rain",
    71: "Slight Snow Fall",
    73: "Moderate Snow Fall",
    75: "Heavy Snow Fall",
    77: "Snow Grains",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    85: "Slight Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Slight Hail",
    99: "Thunderstorm with Heavy Hail",
}


async def geocode_destination(destination: str) -> Tuple[float, float]:
    """Resolves coordinates for any Sri Lankan destination via local registry or Open-Meteo geocoding."""
    cleaned = destination.strip().lower()

    # Direct match or substring match in pre-mapped coordinates
    if cleaned in SRI_LANKA_COORDINATES:
        return SRI_LANKA_COORDINATES[cleaned]

    for key, coords in SRI_LANKA_COORDINATES.items():
        if key in cleaned or cleaned in key:
            return coords

    # Fallback to Open-Meteo Geocoding API
    try:
        url = f"https://geocoding-api.open-meteo.com/v1/search?name={destination}&count=1&language=en&format=json"
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(url)
            if res.status_code == 200:
                data = res.json()
                results = data.get("results", [])
                if results and len(results) > 0:
                    lat = float(results[0]["latitude"])
                    lon = float(results[0]["longitude"])
                    logger.info(f"[GEOCODE] Resolved '{destination}' via Open-Meteo to lat={lat}, lon={lon}")
                    return (lat, lon)
    except Exception as ex:
        logger.warning(f"[GEOCODE] Open-Meteo geocoding error for '{destination}': {ex}")

    # Fallback default: Central Sri Lanka (Sigiriya/Dambulla coordinates)
    return (7.8731, 80.7718)


async def fetch_real_weather_telemetry(lat: float, lon: float) -> Dict[str, Any]:
    """Fetches real 3-day meteorological telemetry (Yesterday, Today, Tomorrow) from Open-Meteo."""
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum"
        f"&past_days=1&forecast_days=2&timezone=Asia%2FColombo"
    )
    async with httpx.AsyncClient(timeout=8.0) as client:
        res = await client.get(url)
        res.raise_for_status()
        return res.json()


class SuitabilityAgent:
    async def inspect_destination(self, destination: str) -> Dict[str, Any]:
        destination_clean = destination.strip() if destination else "Mirissa"

        # 1. Geocode Destination
        lat, lon = await geocode_destination(destination_clean)

        # 2. Fetch Real Weather Data from Open-Meteo API
        weather_raw = await fetch_real_weather_telemetry(lat, lon)
        daily = weather_raw.get("daily", {})

        times = daily.get("time", ["Yesterday", "Today", "Tomorrow"])
        weather_codes = daily.get("weathercode", [0, 0, 0])
        max_temps = daily.get("temperature_2m_max", [30.0, 30.0, 30.0])
        min_temps = daily.get("temperature_2m_min", [24.0, 24.0, 24.0])
        precips = daily.get("precipitation_sum", [0.0, 0.0, 0.0])

        # Indices: 0 = Yesterday, 1 = Today, 2 = Tomorrow
        yesterday_rain = precips[0] if len(precips) > 0 else 0.0
        yesterday_temp = max_temps[0] if len(max_temps) > 0 else 30.0
        yesterday_min = min_temps[0] if len(min_temps) > 0 else 24.0
        yesterday_code = weather_codes[0] if len(weather_codes) > 0 else 0
        yesterday_desc = WMO_CODE_MAP.get(yesterday_code, "Partly Cloudy")

        today_rain = precips[1] if len(precips) > 1 else 0.0
        today_temp = max_temps[1] if len(max_temps) > 1 else 30.0
        today_min = min_temps[1] if len(min_temps) > 1 else 24.0
        today_code = weather_codes[1] if len(weather_codes) > 1 else 0
        today_desc = WMO_CODE_MAP.get(today_code, "Mainly Clear")

        tomorrow_rain = precips[2] if len(precips) > 2 else 0.0
        tomorrow_temp = max_temps[2] if len(max_temps) > 2 else 30.0
        tomorrow_min = min_temps[2] if len(min_temps) > 2 else 24.0
        tomorrow_code = weather_codes[2] if len(weather_codes) > 2 else 0
        tomorrow_desc = WMO_CODE_MAP.get(tomorrow_code, "Mainly Clear")

        # 3. Prompt Gemini (gemini-2.5-flash) with strictly real metrics
        llm_prompt = f"""
Analyze this real meteorological telemetry for destination '{destination_clean}':
Yesterday rain: {yesterday_rain}mm, temp: {yesterday_temp}°C (min: {yesterday_min}°C, max: {yesterday_temp}°C, condition: {yesterday_desc})
Today rain: {today_rain}mm, temp: {today_temp}°C (min: {today_min}°C, max: {today_temp}°C, condition: {today_desc})
Tomorrow rain: {tomorrow_rain}mm, temp: {tomorrow_temp}°C (min: {tomorrow_min}°C, max: {tomorrow_temp}°C, condition: {tomorrow_desc})

Return a strict JSON:
{{
  "destination": "{destination_clean}",
  "weatherTimeline": {{
    "yesterday": {{ "condition": "{yesterday_desc}", "tempMax": "{yesterday_temp}°C", "tempMin": "{yesterday_min}°C", "rainMm": "{yesterday_rain}mm" }},
    "today": {{ "condition": "{today_desc}", "tempMax": "{today_temp}°C", "tempMin": "{today_min}°C", "rainMm": "{today_rain}mm" }},
    "tomorrow": {{ "condition": "{tomorrow_desc}", "tempMax": "{tomorrow_temp}°C", "tempMin": "{tomorrow_min}°C", "rainMm": "{tomorrow_rain}mm" }}
  }},
  "suitability": {{
    "status": "SUITABLE",
    "score": 92,
    "verdict": "<Concise dynamic verdict based on real rain and conditions>",
    "reasoning": "<Dynamic explanation regarding mud, sea state, visibility, road conditions, or outdoor suitability>",
    "safetyTips": ["<Tip 1>", "<Tip 2>"]
  }}
}}

Note: "status" MUST be one of "SUITABLE", "CAUTION", or "NOT_RECOMMENDED". "score" must be an integer between 0 and 100.
"""

        gemini_res = await generate_gemini_json(
            prompt=llm_prompt,
            system_instruction="You are CeylonMate's Agent 2: Destination Suitability & Sri Lanka Meteorological / Safety Intelligence Agent. Analyze real weather telemetry dynamically."
        )

        res_dict = gemini_res if (gemini_res and isinstance(gemini_res, dict) and "weatherTimeline" in gemini_res and "suitability" in gemini_res) else None

        if res_dict:
            # Ensure dates and aliases are present
            wt = res_dict.get("weatherTimeline", {})
            if "yesterday" in wt and "date" not in wt["yesterday"]:
                wt["yesterday"]["date"] = times[0] if len(times) > 0 else "Yesterday"
            if "today" in wt and "date" not in wt["today"]:
                wt["today"]["date"] = times[1] if len(times) > 1 else "Today"
            if "tomorrow" in wt and "date" not in wt["tomorrow"]:
                wt["tomorrow"]["date"] = times[2] if len(times) > 2 else "Tomorrow"

            st = res_dict.get("suitability", {})
            status_val = st.get("status") or st.get("suitabilityStatus") or "SUITABLE"
            score_val = st.get("score") if st.get("score") is not None else (st.get("suitabilityScore") or 90)
            st["status"] = status_val
            st["suitabilityStatus"] = status_val
            st["score"] = score_val
            st["suitabilityScore"] = score_val

            return res_dict

        # If LLM didn't return complete structure, assemble directly from real weather telemetry
        suitability_score = 90
        status = "SUITABLE"
        max_rain = max(yesterday_rain, today_rain, tomorrow_rain)
        if max_rain > 25.0:
            status = "NOT_RECOMMENDED"
            suitability_score = 45
            verdict = f"Heavy rainfall detected ({max_rain}mm). High risk of waterlogging and poor visibility."
            reasoning = f"Continuous heavy precipitation across the 3-day window poses elevated risks for mountain roads, sea swells, or muddy trails around {destination_clean}."
            safety_tips = ["Avoid coastal swimming and high-altitude hiking", "Check with local authorities on road access"]
        elif max_rain > 8.0:
            status = "CAUTION"
            suitability_score = 72
            verdict = f"Moderate rain showers ({max_rain}mm). Outdoor activities may experience intermittent wet spells."
            reasoning = f"Scattered rain showers observed in {destination_clean}. Travelers should carry waterproof gear and plan for damp terrain."
            safety_tips = ["Keep waterproof ponchos and slip-resistant footwear handy", "Schedule outdoor excursions during morning dry windows"]
        else:
            status = "SUITABLE"
            suitability_score = 95
            verdict = f"Optimal weather conditions with minimal rain ({max_rain}mm) and pleasant temperatures."
            reasoning = f"Clear to mild atmospheric conditions across {destination_clean}. Ideal for sightseeing, hiking, and ocean excursions."
            safety_tips = ["Stay hydrated and use sun protection during midday peak UV", "Ideal window for morning and sunset outdoor activities"]

        return {
            "destination": destination_clean,
            "weatherTimeline": {
                "yesterday": {
                    "date": times[0] if len(times) > 0 else "Yesterday",
                    "condition": yesterday_desc,
                    "tempMax": f"{yesterday_temp}°C",
                    "tempMin": f"{yesterday_min}°C",
                    "rainMm": f"{yesterday_rain}mm"
                },
                "today": {
                    "date": times[1] if len(times) > 1 else "Today",
                    "condition": today_desc,
                    "tempMax": f"{today_temp}°C",
                    "tempMin": f"{today_min}°C",
                    "rainMm": f"{today_rain}mm"
                },
                "tomorrow": {
                    "date": times[2] if len(times) > 2 else "Tomorrow",
                    "condition": tomorrow_desc,
                    "tempMax": f"{tomorrow_temp}°C",
                    "tempMin": f"{tomorrow_min}°C",
                    "rainMm": f"{tomorrow_rain}mm"
                }
            },
            "suitability": {
                "status": status,
                "suitabilityStatus": status,
                "score": suitability_score,
                "suitabilityScore": suitability_score,
                "verdict": verdict,
                "reasoning": reasoning,
                "safetyTips": safety_tips
            }
        }


suitability_agent = SuitabilityAgent()
