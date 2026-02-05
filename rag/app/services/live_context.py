import httpx
import logging
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class LiveContextService:
    """
    Service to fetch live data from the Node.js GraphQL API.
    Used to inject real-time context (Events, Tasks) into the RAG pipeline.
    """

    def __init__(self):
        self.graphql_url = settings.NODE_GRAPHQL_URL
        self.timeout = httpx.Timeout(5.0) # 5 second timeout for internal calls

    async def get_upcoming_events(self) -> str:
        """
        Fetches the next 5 upcoming events from the Mainframe.

        Returns:
            str: A natural language summary of upcoming events, or an empty string if failed.
        """
        query = """
        query {
            getEvents {
                name
                category
                points
                createdAt
            }
        }
        """
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    self.graphql_url,
                    json={"query": query},
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code != 200:
                    logger.warning(f"GraphQL Error: Status {response.status_code}")
                    return ""

                data = response.json()
                if "errors" in data:
                    logger.warning(f"GraphQL query returned errors: {data['errors']}")
                    return ""

                # Transform JSON to Text for the LLM
                events = data.get("data", {}).get("getEvents", [])
                if not events:
                    return "No upcoming events found."

                # Simple formatting logic (Take recent 5)
                # In a real scenario, you might filter by date here if the API doesn't.
                headlines = []
                for event in events[:5]:
                    name = event.get("name", "Unknown Event")
                    pts = event.get("points", 0)
                    headlines.append(f"- {name} ({pts} points)")
                
                return "Latest Live Events:\n" + "\n".join(headlines)

        except httpx.RequestError as e:
            logger.error(f"Failed to connect to Node.js Mainframe: {e}")
            return ""
        except Exception as e:
            logger.error(f"Error parsing live context: {e}")
            return ""

# Singleton
live_context = LiveContextService()
