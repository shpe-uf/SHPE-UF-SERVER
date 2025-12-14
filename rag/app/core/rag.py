import chromadb
from sentence_transformers import SentenceTransformer
import requests
import logging
import hashlib
from typing import List, Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

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
        self.ollama_url = "http://localhost:11434/api/chat"
        self.ollama_model = "llama3.1"

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

    def index_text(self, chunks: List[str], source_name: str) -> Dict:
        """Index raw text chunks directly"""
        # Generate embeddings from chunks
        embeddings = self.embedding_model.encode(chunks).tolist()

        # Create unique IDs for each chunk
        ids = [f"{hashlib.md5(f'{source_name}_{i}'.encode()).hexdigest()}"
               for i in range(len(chunks))]

        # Prepare metadata
        metadatas = [{
            "source": source_name,
            "chunk_index": i,
            "indexed_at": datetime.now().isoformat()
        } for i in range(len(chunks))]

        # Add to ChromaDB
        self.collection.add(
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas,
            ids=ids
        )

        return {
            "status": "success",
            "chunks_indexed": len(chunks),
            "source": source_name
        }
