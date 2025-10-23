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
        self.ollama_model = "llama2"
    def scrape_website(self, url: str) -> Dict:
        """
        Scrape website content with Selenium for JS-rendered pages (e.g., React-based sites like shpeuf.com).
        Falls back to requests if Selenium fails.
        """
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from bs4 import BeautifulSoup
        import re

        try:
            # --- Try normal requests first ---
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            html = response.text

            # Heuristic: if little visible text, fall back to Selenium render
            visible_chars = len(re.sub(r"\s+", "", BeautifulSoup(html, "html.parser").get_text()))
            if visible_chars < 800:
                logger.info(f"Low text count detected ({visible_chars}), using Selenium render for {url}")
                try:
                    chrome_options = Options()
                    chrome_options.add_argument("--headless=new")
                    chrome_options.add_argument("--disable-gpu")
                    chrome_options.add_argument("--no-sandbox")
                    chrome_options.add_argument("--disable-dev-shm-usage")

                    driver = webdriver.Chrome(options=chrome_options)
                    driver.set_page_load_timeout(15)
                    driver.get(url)
                    html = driver.page_source
                    driver.quit()
                except Exception as render_err:
                    logger.warning(f"Selenium fallback failed for {url}: {render_err}")

            # --- Parse HTML content ---
            soup = BeautifulSoup(html, "html.parser")

            for script in soup(["script", "style"]):
                script.extract()

            text = soup.get_text(" ", strip=True)
            title = soup.find("title").string if soup.find("title") else url

            return {
                "url": url,
                "title": title,
                "content": text[:15000],
                "scraped_at": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to scrape {url}: {e}")

    # def scrape_website(self, url: str) -> Dict:
        
    #     try:
    #         response = requests.get(url, timeout=10)
    #         response.raise_for_status()
            
    #         soup = BeautifulSoup(response.content, 'html.parser')
            
    #         # Remove script and style elements
    #         for script in soup(["script", "style"]):
    #             script.extract()
            
    #         # Get text
    #         text = soup.get_text()
    #         lines = (line.strip() for line in text.splitlines())
    #         chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    #         text = ' '.join(chunk for chunk in chunks if chunk)
            
    #         # Get title
    #         title = soup.find('title').string if soup.find('title') else url
            
    #         return {
    #             "url": url,
    #             "title": title,
    #             "content": text[:10000],  # Limit content length
    #             "scraped_at": datetime.now().isoformat()
    #         }
    #     except Exception as e:
    #         logger.error(f"Error scraping {url}: {str(e)}")
    #         raise HTTPException(status_code=400, detail=f"Failed to scrape {url}: {str(e)}")
    
    def chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """Split text into overlapping chunks"""
        # Backwards-compatible simple word-based behavior preserved under legacy signature
        words = text.split()
        chunks = []

        for i in range(0, len(words), chunk_size - overlap):
            chunk = ' '.join(words[i:i + chunk_size])
            if chunk:
                chunks.append(chunk)

        return chunks

    # --- New hierarchical / semantically-aware chunking helpers ---
    def _split_paragraphs(self, text: str) -> List[str]:
        """Split text into paragraphs using double-newline as delimiter, fallback to whole text."""
        paras = [p.strip() for p in text.split('\n\n') if p.strip()]
        if not paras:
            return [text.strip()]
        return paras

    def _split_sentences(self, paragraph: str) -> List[str]:
        """Lightweight sentence splitter using punctuation. Keeps punctuation on sentences."""
        import re
        sentences = [s.strip() for s in re.split(r'(?<=[\.\?\!])\s+', paragraph) if s.strip()]
        return sentences if sentences else [paragraph]

    def _estimate_tokens(self, text: str) -> int:
        """Estimate tokens using simple word count heuristic. Replace with tokenizer if available."""
        words = text.split()
        return max(1, len(words))

    def chunk_text_hierarchical(self,
                                text: str,
                                chunk_size_tokens: int = 400,
                                overlap_tokens: int = 50,
                                semantic_threshold: Optional[float] = None
                                ) -> List[str]:
        """
        Hierarchical chunking:
         - splits into paragraphs, then sentences
         - aggregates sentences into chunks up to chunk_size_tokens (estimated)
         - overlap defined in tokens (approx via sentence units)
         - if semantic_threshold set, performs simple semantic de-dup/merge using embeddings
        """
        chunks: List[str] = []

        paragraphs = self._split_paragraphs(text)
        last_chunk_embedding = None

        for para in paragraphs:
            sentences = self._split_sentences(para)
            cur_sentences: List[str] = []
            cur_tokens = 0

            for sent in sentences:
                sent_tokens = self._estimate_tokens(sent)

                # If a single sentence is huge, split by words
                if sent_tokens >= chunk_size_tokens:
                    words = sent.split()
                    for i in range(0, len(words), chunk_size_tokens - overlap_tokens):
                        big_chunk = ' '.join(words[i:i + chunk_size_tokens])
                        if not big_chunk:
                            continue
                        if semantic_threshold and chunks:
                            try:
                                from sentence_transformers import util
                                emb = self.embedding_model.encode([big_chunk])[0]
                                if last_chunk_embedding is not None:
                                    sim = float(util.cos_sim(emb, last_chunk_embedding))
                                else:
                                    sim = 0.0
                            except Exception:
                                sim = 0.0
                            if sim >= semantic_threshold:
                                chunks[-1] = chunks[-1] + "\n\n" + big_chunk
                                last_chunk_embedding = emb
                                continue
                            last_chunk_embedding = emb
                        chunks.append(big_chunk)
                    cur_sentences = []
                    cur_tokens = 0
                    continue

                cur_sentences.append(sent)
                cur_tokens += sent_tokens

                if cur_tokens >= chunk_size_tokens:
                    chunk_text = ' '.join(cur_sentences).strip()
                    if semantic_threshold and chunks:
                        try:
                            from sentence_transformers import util
                            emb = self.embedding_model.encode([chunk_text])[0]
                            sim = float(util.cos_sim(emb, last_chunk_embedding)) if last_chunk_embedding is not None else 0.0
                        except Exception:
                            sim = 0.0
                        if sim >= semantic_threshold:
                            chunks[-1] = chunks[-1] + "\n\n" + chunk_text
                            last_chunk_embedding = emb
                        else:
                            chunks.append(chunk_text)
                            last_chunk_embedding = emb
                    else:
                        chunks.append(chunk_text)
                        if semantic_threshold:
                            last_chunk_embedding = self.embedding_model.encode([chunk_text])[0]

                    # Prepare overlap by keeping last sentences approximating overlap_tokens
                    if overlap_tokens > 0 and cur_sentences:
                        avg_tokens_per_sentence = max(1, int(cur_tokens / max(1, len(cur_sentences))))
                        overlap_sent_count = max(1, int(overlap_tokens / avg_tokens_per_sentence))
                        cur_sentences = cur_sentences[-overlap_sent_count:]
                        cur_tokens = sum(self._estimate_tokens(s) for s in cur_sentences)
                    else:
                        cur_sentences = []
                        cur_tokens = 0

            # flush remaining sentences in paragraph
            if cur_sentences:
                chunk_text = ' '.join(cur_sentences).strip()
                if chunk_text:
                    if semantic_threshold and chunks:
                        try:
                            from sentence_transformers import util
                            emb = self.embedding_model.encode([chunk_text])[0]
                            sim = float(util.cos_sim(emb, last_chunk_embedding)) if last_chunk_embedding is not None else 0.0
                        except Exception:
                            sim = 0.0
                        if sim >= semantic_threshold:
                            chunks[-1] = chunks[-1] + "\n\n" + chunk_text
                            last_chunk_embedding = emb
                        else:
                            chunks.append(chunk_text)
                            last_chunk_embedding = emb
                    else:
                        chunks.append(chunk_text)
                        if semantic_threshold:
                            last_chunk_embedding = self.embedding_model.encode([chunk_text])[0]

        return chunks
    
    def index_website(self, url: str) -> Dict:
        """Scrape and index a website"""
        # Scrape website
        website_data = self.scrape_website(url)

        # ✅ Use hierarchical chunking instead of simple word split
        chunks = self.chunk_text_hierarchical(
            website_data['content'],
            chunk_size_tokens=400,     # typical sweet spot
            overlap_tokens=80,         # keeps context continuity
            semantic_threshold=0.85    # merge chunks that are semantically near-identical
        )

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

        logger.info(f"Indexed {len(chunks)} hierarchical chunks from {url}")
        return {
            "url": url,
            "chunks_indexed": len(chunks),
            "title": website_data['title']
        }

       
    
    def search_similar(self, query: str, k: int = 5) -> List[Dict]:
        # Generate embedding from the user query
        query_embedding = self.embedding_model.encode([query])[0].tolist()
        
        # Search in ChromaDB for verctors most similar to query
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=k
        )
        
        # Results
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
        prompt = f"""You are a helpful assistant. Use the following context to answer the question. 
        If you cannot answer based on the context, say so. Do not mention how you are a large language 
        model unless specifically asked. Keep your responses appropiatly short for a mobile device experience.
        
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

    # Main RAG query function
    def query(self, question: str) -> str:
        
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