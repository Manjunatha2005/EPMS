"""
AI Decision Agent using Anthropic Claude.
Generates recommendations based on current pollution data.
"""
import os
import anthropic
import logging

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are EcoSentinel AI, an expert environmental monitoring assistant.
You analyze real-time air pollution data and provide:
1. Health risk assessments
2. Actionable recommendations for government officials and the public
3. Predictions and trend analysis
4. Policy suggestions

Always be specific, cite the data values provided, and prioritize public safety.
Keep responses concise and structured. Use emojis sparingly for clarity."""


def get_ai_analysis(reading: dict, city: str) -> dict:
    """
    Generate AI analysis and recommendations for current pollution levels.
    Returns dict with analysis, immediate_actions, policy_recommendations.
    """
    try:
        client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

        user_msg = f"""Analyze this real-time pollution data for {city}:

PM2.5: {reading.get('pm25')} µg/m³
PM10:  {reading.get('pm10')} µg/m³
CO2:   {reading.get('co2')} ppm
NO2:   {reading.get('no2')} ppb
SO2:   {reading.get('so2')} ppb
VOC:   {reading.get('voc')} ppb
AQI:   {reading.get('aqi')}
Status: {reading.get('status', 'unknown')}

Provide:
1. A 2-sentence health risk summary
2. 3 immediate action items (for authorities)
3. 2 long-term policy recommendations
Format as JSON with keys: summary, immediate_actions (list), policy_recommendations (list)"""

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=800,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_msg}],
        )

        import json, re
        text = response.content[0].text
        # Extract JSON from response
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {"summary": text, "immediate_actions": [], "policy_recommendations": []}

    except Exception as e:
        logger.warning(f"AI agent error: {e}")
        aqi = reading.get("aqi", 0)
        return {
            "summary": (
                f"Current AQI of {aqi} in {city} indicates "
                f"{'hazardous' if aqi>150 else 'moderate'} air quality conditions. "
                f"PM2.5 at {reading.get('pm25')} µg/m³ is the primary concern."
            ),
            "immediate_actions": [
                "Issue public health advisory for sensitive groups",
                "Activate traffic restriction protocols in high-pollution zones",
                "Deploy mobile air quality monitoring units",
            ],
            "policy_recommendations": [
                "Implement stricter industrial emission standards",
                "Accelerate electric vehicle subsidy programs",
            ],
        }


async def chat_response(message: str, context: dict) -> str:
    """
    Handle chatbot queries with pollution context.
    Used by the /chat endpoint.
    """
    try:
        client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        city = context.get("city", "your city")
        reading = context.get("reading", {})

        system = f"""{SYSTEM_PROMPT}

Current sensor data for {city}:
- PM2.5: {reading.get('pm25', 'N/A')} µg/m³
- PM10: {reading.get('pm10', 'N/A')} µg/m³
- CO2: {reading.get('co2', 'N/A')} ppm
- NO2: {reading.get('no2', 'N/A')} ppb
- AQI: {reading.get('aqi', 'N/A')} ({reading.get('status', 'N/A')})

Answer the user's question using this real-time data. Be helpful and concise."""

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=400,
            system=system,
            messages=[{"role": "user", "content": message}],
        )
        return response.content[0].text

    except Exception as e:
        logger.warning(f"Chat AI error: {e}")
        return f"I'm analyzing current conditions in {context.get('city','your city')}. Based on live data, AQI is {context.get('reading',{}).get('aqi','unavailable')}. Please check the dashboard for detailed readings."
