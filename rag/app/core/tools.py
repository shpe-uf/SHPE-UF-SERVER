"""
Tool definitions and dispatch functions for agent tool calling.

This module defines the tools available to the LLM agent and implements
the functions that call your GraphQL backend to fetch live data.

**Person A's responsibility**: Fill in all the GraphQL queries below.
"""

import requests
import logging
import os
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Configuration
GRAPHQL_URL = os.getenv("GRAPHQL_API_URL", "http://localhost:5000")

# TOOL DEFINITIONS (Ollama schema for function calling)
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_upcoming_events",
            "description": "Fetch upcoming SHPE UF events (non-expired). Defaults to current semester; optionally filter by semester (e.g., 'Fall Semester').",
            "parameters": {
                "type": "object",
                "properties": {
                    "semester": {
                        "type": "string",
                        "description": "Optional semester filter. Examples: 'Fall Semester', 'Spring Semester', 'Summer Semester'."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_available_tasks",
            "description": "Fetch all available tasks that members can complete with descriptions, deadlines, and point values.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_recruiting_partners",
            "description": "Fetch all recruiting corporation partners with industries, majors they recruit from, and sponsorship info.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_learning_resources",
            "description": "Fetch all available learning resources and podcasts for SHPE UF members.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_alumni_network",
            "description": "Fetch SHPE UF alumni profiles for mentorship, networking, and career guidance.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
]

# DISPATCH FUNCTIONS
def get_upcoming_events(semester: Optional[str] = None) -> Dict:
    """Fetch non-expired events, defaulting to the current semester."""
    if semester:
        normalized = _normalized_semester(semester)
        target_semester = normalized or semester.strip()
    else:
        target_semester = _current_semester()

    query = """
    {
        getEvents {
            name
            category
            points
            expiration
            semester
            attendance
            request
        }
    }
    """

    data = _execute_graphql(query)
    if "error" in data:
        return data

    events = data.get("getEvents", [])
    now = datetime.now(timezone.utc)
    filtered = []

    for event in events:
        expiry = _parse_datetime(event.get("expiration"))
        if not expiry:
            continue
        if expiry <= now:
            continue
        if target_semester and event.get("Semester") != target_semester:
            continue
        filtered.append(event)

    filtered.sort(key=lambda e: _parse_datetime(e.get("expiration")) or now)
    return {"getEvents": filtered}


def get_available_tasks() -> Dict:
    """Fetch all tasks with key details."""
    query = """
    {
        getTasks {
            name
            description
            startDate
            endDate
            points
            semester
        }
    }
    """

    return _execute_graphql(query)


def get_recruiting_partners() -> Dict:
    """Fetch recruiting corporation partners."""
    query = """
    {
        getCorporations {
            name
            industries
            majors
            overview
            applyLink
            signUpLink
        }
    }
    """

    return _execute_graphql(query)


def get_learning_resources() -> Dict:
    """Fetch available learning resources."""
    query = """
    {
        getResources {
            title
            description
            link
            podcast
        }
    }
    """

    return _execute_graphql(query)


def search_alumni_network() -> Dict:
    """Fetch alumni profiles for networking."""
    query = """
    {
        getAlumnis {
            firstName
            lastName
            employer
            position
            linkedin
            undergrad {
                university
                year
                major
            }
            grad {
                university
                year
                major
            }
            location {
                city
                state
                country
            }
        }
    }
    """

    return _execute_graphql(query)


# ============================================================================
# DISPATCH MAPPING (Do not modify)
# ============================================================================

DISPATCH = {
    "get_upcoming_events": get_upcoming_events,
    "get_available_tasks": get_available_tasks,
    "get_recruiting_partners": get_recruiting_partners,
    "get_learning_resources": get_learning_resources,
    "search_alumni_network": search_alumni_network,
}


# ============================================================================
# HELPERS
# ============================================================================

SEMESTER_ALIASES = {
    "fall": "Fall Semester",
    "fall semester": "Fall Semester",
    "spring": "Spring Semester",
    "spring semester": "Spring Semester",
    "summer": "Summer Semester",
    "summer semester": "Summer Semester",
}

MONTH_TO_SEMESTER = {
    1: "Spring Semester",
    2: "Spring Semester",
    3: "Spring Semester",
    4: "Spring Semester",
    5: "Summer Semester",
    6: "Summer Semester",
    7: "Summer Semester",
    8: "Fall Semester",
    9: "Fall Semester",
    10: "Fall Semester",
    11: "Fall Semester",
    12: "Fall Semester",
}


def _execute_graphql(query: str) -> Dict:
    """Execute a GraphQL query against the Node API."""
    try:
        response = requests.post(
            GRAPHQL_URL,
            json={"query": query},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        response.raise_for_status()
        payload = response.json()
    except Exception as exc:  # requests errors or JSON decoding
        logger.error(f"GraphQL request failed: {exc}")
        return {"error": str(exc)}

    if "errors" in payload:
        logger.error(f"GraphQL responded with errors: {payload['errors']}")
        return {"error": str(payload["errors"])}

    return payload.get("data", {})


def _parse_datetime(value: Optional[str]) -> Optional[datetime]:
    """Best-effort parsing for ISO and JS Date string formats."""
    if not value:
        return None

    # Common ISO format with Z timezone
    try:
        cleaned = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(cleaned)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        pass

    # JS Date string: "Wed Dec 04 2024 17:52:03 GMT-0500 (Eastern Standard Time)"
    try:
        cleaned = value.split("(")[0].strip()
        dt = datetime.strptime(cleaned, "%a %b %d %Y %H:%M:%S GMT%z")
        return dt.astimezone(timezone.utc)
    except Exception:
        pass

    # Fallback to email-style parser
    try:
        dt = parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        logger.debug(f"Could not parse datetime string: {value}")
        return None


def _normalized_semester(semester: Optional[str]) -> Optional[str]:
    if not semester:
        return None
    normalized = semester.strip().lower()
    return SEMESTER_ALIASES.get(normalized, None)


def _current_semester() -> str:
    month = datetime.now(timezone.utc).month
    return MONTH_TO_SEMESTER.get(month, "Fall Semester")
