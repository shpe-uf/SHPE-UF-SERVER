from pydantic import BaseModel
from typing import List

class QueryRequest(BaseModel):
    question: str

class TextIndexRequest(BaseModel):
    chunks: List[str]
    source_name: str

class AgentQueryRequest(BaseModel):
    """Request for agent-based querying with tool calling"""
    question: str
    use_rag_context: bool = True  # Include RAG background context
