from pydantic import BaseModel
from typing import List

class QueryRequest(BaseModel):
    question: str

class TextIndexRequest(BaseModel):
    chunks: List[str]
    source_name: str
