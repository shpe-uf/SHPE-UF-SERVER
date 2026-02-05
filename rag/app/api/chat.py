from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core.rag import rag_engine
from app.core.llm import llm_client
from app.services.live_context import live_context

import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class ChatRequest(BaseModel):
    """
    Request model for the /chat endpoint.
    """
    message: str                # The user's question
    user_id: Optional[str] = None # For tracking history (future feature)

class ChatResponse(BaseModel):
    """
    Response model for the /chat endpoint.
    """
    answer: str
    sources: list[str] = []

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Main Chatbot Entrypoint (The "Sidecar" Pattern).
    
    Orchestrates the RAG pipeline:
    1. Retrieval (Static): Fetches relevant docs from ChromaDB.
    2. Retrieval (Live): Fetches real-time events from Node.js.
    3. Generation: Sends everything to UF NaviGator (Llama 3).
    """
    try:
        user_query = request.message
        
        # --- Step A: Static RAG Retrieval ---
        # Search for relevant documents in our local vector store
        static_docs = rag_engine.search(user_query, limit=3)
        static_context = "\n\n".join(static_docs) if static_docs else "No static context found."

        # --- Step B: Live Context Retrieval ---
        # Fetch upcoming events directly from the main API
        try:
            live_data = await live_context.get_upcoming_events()
        except Exception:
            live_data = "Could not fetch live events."

        # --- Step C: Prompt Engineering ---
        # Combine all the knowledge for the LLM
        system_prompt = (
            "You are the AI Assistant for SHPE UF (Society of Hispanic Professional Engineers at "
            "the University of Florida). Your goal is to help members navigate the club.\n"
            "Use the provided context to answer the user's question accurately.\n"
            "If you don't know the answer, say so. Be friendly, professional, and concise."
        )

        full_prompt = (
            f"User Question: {user_query}\n\n"
            f"--- LIVE DATA (Real-time Events) ---\n{live_data}\n\n"
            f"--- STATIC KNOWLEDGE BASE (FAQs/History) ---\n{static_context}\n"
        )

        # --- Step D: Generation ---
        answer = await llm_client.generate_response(
            prompt=full_prompt,
            system_prompt=system_prompt
        )

        return ChatResponse(
            answer=answer,
            sources=static_docs 
        )

    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal AI Server Error")
