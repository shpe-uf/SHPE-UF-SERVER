# SHPE-UF-SERVER Copilot Instructions

## Project Overview
This is the backend for the SHPE UF web application. It is a hybrid architecture combining a Node.js/Express/Apollo GraphQL server with a Python/FastAPI RAG (Retrieval-Augmented Generation) service.

## Architecture & Data Flow
- **Core Backend (Node.js)**: Handles GraphQL requests, authentication, and database interactions (MongoDB/Mongoose).
- **RAG Service (Python)**: Handles document indexing, embedding, and LLM querying.
- **Communication**: The Node.js server communicates with the Python RAG service via HTTP requests.
- **LLM Provider**: The Python service relies on a local **Ollama** instance running `llama3.1`.

### Data Flow (Chatbot)
1.  **Client** sends GraphQL mutation `chatBot(question: "...")`.
2.  **Node.js** (`graphql/resolvers/chatbot.js`) calls `queryRAG` in `graphql/chatbot/ragService.js`.
3.  **ragService.js** sends POST request to Python API (`http://localhost:8001/query`).
4.  **Python API** (`rag/app/main.py`):
    - **Standard RAG**: Embeds query, retrieves context from `chromadb`, generates answer.
    - **Agent RAG** (`/query_agent`): Uses `rag/app/core/agent_loop.py` to iteratively call tools and generate answers.

## Critical Developer Workflows

### Prerequisites
- **Node.js** (v20+)
- **Python** (v3.9+)
- **Ollama**: Must be installed and running locally (`ollama serve`) with `llama3.1` model pulled (`ollama pull llama3.1`).

### Startup Commands
- **Full Stack**: `npm start` (Runs both Node and Python servers concurrently).
- **RAG Service Only**: `npm run serve:rag` (Runs Python/FastAPI on port 8001).
- **Node Server Only**: `npm run wait-and-serve:node` (Waits for RAG service, then starts Node).

### RAG Development
- **Python Structure**: The RAG service is a Python package located in `rag/app/`.
- **Entry Point**: `rag/rag_api.py` is the Uvicorn entry point that imports the FastAPI app from `rag/app/main.py`.
- **Vector DB**: `rag/chroma_db` contains the persistent vector store.
- **Agent Tools**: Tools for the agent are defined in `rag/app/core/tools.py`.

## Project Conventions

### Node.js
- **GraphQL**: Schema in `graphql/typeDefs.js`, Resolvers in `graphql/resolvers/`.
- **Models**: Mongoose models in `models/`.
- **Formatting**: Prettier is enforced via `lint-staged`.

### Python (RAG)
- **Framework**: FastAPI.
- **Logging**: Use `logging` module, configured in `rag/app/main.py`.
- **Error Handling**: Return `HTTPException` for API errors.
- **Agent Loop**: The agent logic resides in `rag/app/core/agent_loop.py` and uses a tool-calling loop with Ollama.

## Key Files & Directories
- `index.js`: Main Node.js server entry point.
- `rag/rag_api.py`: Python service entry point script.
- `rag/app/main.py`: FastAPI application definition.
- `rag/app/core/rag.py`: RAG system implementation (embeddings, ChromaDB).
- `rag/app/core/agent_loop.py`: Agentic RAG logic.
- `graphql/chatbot/ragService.js`: Node.js client for the RAG service.
- `graphql/resolvers/chatbot.js`: GraphQL resolver for chatbot interactions.

## Common Issues
- **RAG Connection Refused**: Ensure the Python service is running on port 8001.
- **Ollama Connection Error**: Ensure Ollama is running on port 11434.
- **Model Mismatch**: Ensure `llama3.1` is pulled in Ollama, as hardcoded in `rag/app/core/rag.py`.
