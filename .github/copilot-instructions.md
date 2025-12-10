# SHPE-UF-SERVER Copilot Instructions

## Project Overview
This is the backend for the SHPE UF web application. It is a hybrid architecture combining a Node.js/Express/Apollo GraphQL server with a Python/FastAPI RAG (Retrieval-Augmented Generation) service.

## Architecture & Data Flow
- **Core Backend (Node.js)**: Handles GraphQL requests, authentication, and database interactions (MongoDB/Mongoose).
- **RAG Service (Python)**: Handles document indexing, embedding, and LLM querying.
- **Communication**: The Node.js server communicates with the Python RAG service via HTTP requests.
- **LLM Provider**: The Python service relies on a local **Ollama** instance running `llama2`.

### Data Flow (Chatbot)
1.  **Client** sends GraphQL mutation `chatBot(question: "...")`.
2.  **Node.js** (`graphql/resolvers/chatbot.js`) calls `queryRAG` in `graphql/chatbot/ragService.js`.
3.  **ragService.js** sends POST request to Python API (`http://localhost:8001/query`).
4.  **Python API** (`rag/rag_api.py`):
    - Embeds query using `sentence-transformers`.
    - Retrieves context from `chromadb`.
    - Generates answer using local Ollama instance.
5.  **Response** flows back up the chain.

## Critical Developer Workflows

### Prerequisites
- **Node.js** (v20+)
- **Python** (v3.9+)
- **Ollama**: Must be installed and running locally (`ollama serve`) with `llama2` model pulled (`ollama pull llama2`).

### Startup Commands
- **Full Stack**: `npm start` (Runs both Node and Python servers concurrently).
- **RAG Service Only**: `npm run serve:rag` (Runs Python/FastAPI on port 8001).
- **Node Server Only**: `npm run wait-and-serve:node` (Waits for RAG service, then starts Node).

### RAG Development
- **Python Environment**: The `rag` folder contains the Python service. Ensure virtual environment is active if running manually.
- **Vector DB**: `rag/chroma_db` contains the persistent vector store.
- **Scraping**: The system uses `requests` with a fallback to `selenium` for JS-heavy sites. See `scrape_website` in `rag/rag_api.py`.

## Project Conventions

### Node.js
- **GraphQL**: Schema in `graphql/typeDefs.js`, Resolvers in `graphql/resolvers/`.
- **Models**: Mongoose models in `models/`.
- **Formatting**: Prettier is enforced via `lint-staged`.

### Python (RAG)
- **Framework**: FastAPI.
- **Logging**: Use `logging` module, configured in `rag_api.py`.
- **Error Handling**: Return `HTTPException` for API errors.

## Key Files & Directories
- `index.js`: Main Node.js server entry point.
- `rag/rag_api.py`: Main Python RAG service entry point.
- `graphql/chatbot/ragService.js`: Node.js client for the RAG service.
- `graphql/resolvers/chatbot.js`: GraphQL resolver for chatbot interactions.
- `rag/index_websites.js`: Script to trigger indexing of websites.

## Common Issues
- **RAG Connection Refused**: Ensure the Python service is running on port 8001.
- **Ollama Connection Error**: Ensure Ollama is running on port 11434.
- **Selenium Errors**: Ensure Chrome/Chromium is installed for the scraping fallback.
