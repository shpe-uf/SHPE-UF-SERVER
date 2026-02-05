from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import os

class Settings(BaseSettings):
    """
    Application Configuration.
    Reads from environment variables or .env file.
    """
    
    # --- UF NaviGator LLM Settings ---
    UF_API_KEY: str
    UF_API_BASE_URL: str = "https://api.ai.it.ufl.edu/v1"
    UF_LLM_MODEL: str = "llama-3.1-70b-instruct"
    
    # --- Embedding Settings ---
    EMBEDDING_PROVIDER: str = "local" # Options: 'local', 'api'
    
    # --- Integration Settings ---
    NODE_GRAPHQL_URL: str = "http://localhost:4000/graphql"
    
    # --- Vector DB Settings ---
    # Path where ChromaDB will persist data locally
    # We construct an absolute path relative to this file to ensure consistency 
    # regardless of where the app is run from (root vs rag/ directory)
    CHROMA_DB_PATH: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "chroma_db_data")

    model_config = SettingsConfigDict(
        env_file=("rag/.env", ".env"), 
        env_ignore_empty=True,
        extra="ignore"
    )

@lru_cache()
def get_settings():
    """
    Returns a cached instance of the Settings class.
    Use this dependency to inject settings into functions.
    """
    return Settings()
