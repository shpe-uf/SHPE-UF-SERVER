from openai import AsyncOpenAI
from app.core.config import get_settings

# Initialize settings
settings = get_settings()

class NaviGatorClient:
    """
    Client for interacting with the UF NaviGator LLM (Llama 3.1).
    Uses the OpenAI-compatible API endpoint provided by UF Research Computing.
    """
    
    def __init__(self):
        """
        Initializes the AsyncOpenAI client with UF-specific configuration.
        """
        self.client = AsyncOpenAI(
            api_key=settings.UF_API_KEY,
            base_url=settings.UF_API_BASE_URL
        )
        self.model = settings.UF_LLM_MODEL

    async def generate_response(self, prompt: str, system_prompt: str = "You are a helpful assistant.") -> str:
        """
        Generates a text response from the LLM.

        Args:
            prompt (str): The user's input or combined context query.
            system_prompt (str): Instructions for the system behavior.

        Returns:
            str: The generated response content.
        """
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2, # Low temperature for factual consistency
                max_tokens=512   # Limit output length
            )
            return response.choices[0].message.content
        except Exception as e:
            # simple error logging (replace with proper logger in production)
            print(f"Error calling UF NaviGator: {e}")
            return "I'm sorry, I'm having trouble connecting to my brain right now."

# Singleton instance
llm_client = NaviGatorClient()
