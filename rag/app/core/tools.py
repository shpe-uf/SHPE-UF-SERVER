"""
Tool definitions and dispatch functions for agent tool calling.

This module defines the tools available to the LLM agent and implements
the functions that call your GraphQL backend to fetch live data.

**Person A's responsibility**: Fill in all the GraphQL queries below.
"""

import requests
import json
import logging
from typing import Dict

logger = logging.getLogger(__name__)

# Configuration
GRAPHQL_URL = "http://localhost:4000"

# ============================================================================
# TOOL DEFINITIONS (Ollama schema for function calling)
# ============================================================================

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_upcoming_events",
            "description": "Fetch all upcoming SHPE UF events with names, categories, points, and semesters.",
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


# ============================================================================
# DISPATCH FUNCTIONS (Your colleague implements these)
# ============================================================================

def get_upcoming_events() -> Dict:
    """
    Fetch all upcoming events from GraphQL.
    
    Returns:
        Dict with event data or error info
    """
    try:
        # TODO: Implement GraphQL query for getEvents
        # Query should fetch: name, category, points, semester
        query = """
        {
            getEvents {
                name
                category
                points
                semester
            }
        }
        """
        
        response = requests.post(
            GRAPHQL_URL,
            json={"query": query},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        if "errors" in data:
            return {"error": str(data["errors"])}
        
        return data.get("data", {})
    
    except Exception as e:
        logger.error(f"Error fetching events: {e}")
        return {"error": str(e)}


def get_available_tasks() -> Dict:
    """
    Fetch all available tasks from GraphQL.
    
    Returns:
        Dict with task data or error info
    """
    try:
        # TODO: Implement GraphQL query for getTasks
        # Query should fetch: name, description, startDate, endDate, points, semester
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
        
        response = requests.post(
            GRAPHQL_URL,
            json={"query": query},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        if "errors" in data:
            return {"error": str(data["errors"])}
        
        return data.get("data", {})
    
    except Exception as e:
        logger.error(f"Error fetching tasks: {e}")
        return {"error": str(e)}


def get_recruiting_partners() -> Dict:
    """
    Fetch all recruiting corporation partners from GraphQL.
    
    Returns:
        Dict with corporation data or error info
    """
    try:
        # TODO: Implement GraphQL query for getCorporations
        # Query should fetch: name, industries, majors, overview, applyLink, signUpLink
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
        
        response = requests.post(
            GRAPHQL_URL,
            json={"query": query},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        if "errors" in data:
            return {"error": str(data["errors"])}
        
        return data.get("data", {})
    
    except Exception as e:
        logger.error(f"Error fetching corporations: {e}")
        return {"error": str(e)}


def get_learning_resources() -> Dict:
    """
    Fetch all learning resources from GraphQL.
    
    Returns:
        Dict with resource data or error info
    """
    try:
        # TODO: Implement GraphQL query for getResources
        # Query should fetch: title, description, link, podcast
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
        
        response = requests.post(
            GRAPHQL_URL,
            json={"query": query},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        if "errors" in data:
            return {"error": str(data["errors"])}
        
        return data.get("data", {})
    
    except Exception as e:
        logger.error(f"Error fetching resources: {e}")
        return {"error": str(e)}


def search_alumni_network() -> Dict:
    """
    Fetch all alumni profiles from GraphQL.
    
    Returns:
        Dict with alumni data or error info
    """
    try:
        # TODO: Implement GraphQL query for getAlumnis
        # Query should fetch: firstName, lastName, employer, position, linkedin, undergrad, grad, location
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
        
        response = requests.post(
            GRAPHQL_URL,
            json={"query": query},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        if "errors" in data:
            return {"error": str(data["errors"])}
        
        return data.get("data", {})
    
    except Exception as e:
        logger.error(f"Error fetching alumni: {e}")
        return {"error": str(e)}


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
