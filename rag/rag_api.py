from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import requests
from bs4 import BeautifulSoup
import os
import json
import hashlib
from typing import List, Dict, Optional
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this based on your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize models and database
class RAGSystem:
    def __init__(self):
        # Initialize embedding model
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Initialize ChromaDB
        self.chroma_client = chromadb.PersistentClient(path="./rag/chroma_db")
        
        # Get or create collection
        try:
            self.collection = self.chroma_client.get_collection("website_docs")
        except:
            self.collection = self.chroma_client.create_collection(
                name="website_docs",
                metadata={"hnsw:space": "cosine"}
            )
        
        # Ollama configuration
        self.ollama_url = "http://localhost:11434/api/generate"
        self.ollama_model = "llama2"  # Change model
        
    def scrape_website(self, url: str) -> Dict:
        """Scrape content from a website"""
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.extract()
            
            # Get text
            text = soup.get_text()
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)
            
            # Get title
            title = soup.find('title').string if soup.find('title') else url
            
            return {
                "url": url,
                "title": title,
                "content": text[:10000],  # Limit content length
                "scraped_at": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error scraping {url}: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to scrape {url}: {str(e)}")
    
    def chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """Split text into overlapping chunks"""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk = ' '.join(words[i:i + chunk_size])
            if chunk:
                chunks.append(chunk)
        
        return chunks
    
    def index_website(self, url: str) -> Dict:
        """Scrape and index a website"""
        # Scrape website
        website_data = self.scrape_website(url)
        
        # Chunk the content
        chunks = self.chunk_text(website_data['content'])
        
        # Generate embeddings
        embeddings = self.embedding_model.encode(chunks).tolist()
        
        # Create unique IDs for chunks
        ids = [f"{hashlib.md5(f'{url}_{i}'.encode()).hexdigest()}" for i in range(len(chunks))]
        
        # Prepare metadata
        metadatas = [{
            "url": url,
            "title": website_data['title'],
            "chunk_index": i,
            "scraped_at": website_data['scraped_at']
        } for i in range(len(chunks))]
        
        # Add to ChromaDB
        self.collection.add(
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas,
            ids=ids
        )
        
        return {
            "url": url,
            "chunks_indexed": len(chunks),
            "title": website_data['title']
        }
    
    def search_similar(self, query: str, k: int = 5) -> List[Dict]:
        # Generate embedding for query
        query_embedding = self.embedding_model.encode([query])[0].tolist()
        
        # Search in ChromaDB
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=k
        )
        
        # Format results
        formatted_results = []
        if results['documents'] and results['documents'][0]:
            for i in range(len(results['documents'][0])):
                formatted_results.append({
                    "content": results['documents'][0][i],
                    "metadata": results['metadatas'][0][i] if results['metadatas'] else {},
                    "distance": results['distances'][0][i] if results['distances'] else 0
                })
        
        return formatted_results
    
    def generate_answer(self, question: str, context: str) -> str:
        """Generate answer using Ollama"""
        prompt = f"""You are a helpful assistant. Use the following context to answer the question. 
If you cannot answer based on the context, say so. Do not mention how you are a large language model unless specifically asked.

Context:
{context}

Question: {question}

Answer:"""
        
        try:
            response = requests.post(
                self.ollama_url,
                json={
                    "model": self.ollama_model,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            return result.get('response', 'Failed to generate answer')
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Ollama request failed: {str(e)}")
            return f"Error generating answer: {str(e)}"
    
    def query(self, question: str) -> str:
        """Main RAG query function"""
        # Search for relevant documents
        relevant_docs = self.search_similar(question, k=5)
        
        if not relevant_docs:
            return "I don't have enough information to answer your question."
        
        # Combine context from relevant documents
        context = "\n\n".join([doc['content'] for doc in relevant_docs[:3]])
        
        # Generate answer
        answer = self.generate_answer(question, context)
        
        # Add sources
        sources = list(set([doc['metadata'].get('url', 'Unknown') for doc in relevant_docs[:3]]))
        if sources:
            answer += f"\n\nSources: {', '.join(sources)}"
        
        return answer

# Initialize RAG system
rag_system = RAGSystem()

# Request models
class QueryRequest(BaseModel):
    question: str

class IndexRequest(BaseModel):
    url: str

class BulkIndexRequest(BaseModel):
    urls: List[str]

# API endpoints
@app.post("/query")
async def query_endpoint(request: QueryRequest):
    """Query the RAG system"""
    try:
        answer = rag_system.query(request.question)
        return {"answer": answer}
    except Exception as e:
        logger.error(f"Query error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/index")
async def index_endpoint(request: IndexRequest):
    """Index a single website"""
    try:
        result = rag_system.index_website(request.url)
        return {"status": "success", "result": result}
    except Exception as e:
        logger.error(f"Indexing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/bulk_index")
async def bulk_index_endpoint(request: BulkIndexRequest):
    """Index multiple websites"""
    results = []
    errors = []
    
    for url in request.urls:
        try:
            result = rag_system.index_website(url)
            results.append(result)
        except Exception as e:
            errors.append({"url": url, "error": str(e)})
    
    return {
        "status": "completed",
        "indexed": results,
        "errors": errors
    }

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)