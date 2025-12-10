from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .core.rag import RAGSystem
from .models.api import QueryRequest, TextIndexRequest
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this based on your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG system
rag_system = RAGSystem()

@app.get("/")
async def root():
    return {"status": "online", "message": "SHPE UF RAG API is running. Go to /docs for API documentation."}

@app.post("/query")
async def query_endpoint(request: QueryRequest):
    """Query the RAG system"""
    try:
        answer = rag_system.query(request.question)
        return {"answer": answer}
    except Exception as e:
        logger.error(f"Query error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/index_text")
async def index_text_endpoint(request: TextIndexRequest):
    """Index raw text chunks directly (no scraping)"""
    try:
        result = rag_system.index_text(request.chunks, request.source_name)
        return result
    except Exception as e:
        logger.error(f"Text indexing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def stats_endpoint():
    """Get system statistics"""
    try:
        count = rag_system.collection.count()
        return {
            "total_chunks": count,
            "model": rag_system.ollama_model,
            "embedding_model": "all-MiniLM-L6-v2"
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
