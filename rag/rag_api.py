"""
Entry point for the RAG FastAPI service.
This script starts the Uvicorn server on port 8001.
"""
from app.main import app

if __name__ == "__main__":
    import uvicorn
    # run the server on port 8001, accessible from any IP
    uvicorn.run(app, host="0.0.0.0", port=8001)
