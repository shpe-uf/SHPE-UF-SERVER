import uvicorn
from fastapi import FastAPI
from app.api import chat

# Initialize FastAPI app
app = FastAPI(
    title="SHPE UF AI Sidecar",
    description="Python microservice for RAG & LLM operations. Powered by UF NaviGator.",
    version="2.0.0"
)

# Register Routers
app.include_router(chat.router, prefix="/api/v1")

@app.get("/health")
def health_check():
    """
    Simple health check for the Node.js Mainframe to wait for.
    """
    return {"status": "online", "service": "rag-sidecar"}

if __name__ == "__main__":
    # Start the server (Development Mode)
    # Allows remote access via 0.0.0.0, running on port 8001
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
