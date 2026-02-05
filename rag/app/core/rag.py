import chromadb
from app.core.config import get_settings
from typing import List

settings = get_settings()

class RAGEngine:
    """
    Manages interactions with the local Vector Database (ChromaDB).
    Handles document retrieval ("step A" of the pipeline).
    """

    def __init__(self):
        """
        Initializes the persistent ChromaDB client and gets the collection.
        If the collection doesn't exist, it creates it.
        """
        self.client = chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)
        
        # future-proofing: logic to swap embedding function
        embedding_fn = None
        if settings.EMBEDDING_PROVIDER == "api":
            # TODO: Implement UF API embedding function here (nomic-embed-text-v1.5)
            pass 
        
        # Determine strict or default collection retrieval depending on setup
        # For now, we use get_or_create to avoid errors on fresh start
        # If embedding_function is None, Chroma uses default all-MiniLM-L6-v2 (Local)
        self.collection = self.client.get_or_create_collection(
            name="shpe_uf_knowledge_base",
            embedding_function=embedding_fn,
            metadata={"hnsw:space": "cosine"} # Cosine similarity for text
        )

    def search(self, query: str, limit: int = 3) -> List[str]:
        """
        Searches the knowledge base for documents relevant to the query.
        
        Args:
            query (str): The user's search text.
            limit (int): Max number of snippets to return.

        Returns:
            List[str]: A list of text snippets (documents) found.
        """
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=limit
            )
            
            # ChromaDB returns a list of lists (batch format), so access [0]
            if results and results['documents']:
                return results['documents'][0]
            return []
        except Exception as e:
            print(f"Error searching ChromaDB: {e}")
            return []

    def add_documents(self, documents: List[str], metadatas: List[dict] = None, ids: List[str] = None):
        """
        Adds documents to the vector store. 
        Useful for the ETL script or manual updates.
        """
        if not ids:
            # Generate simple IDs if none provided
            ids = [str(hash(doc)) for doc in documents]
            
        self.collection.upsert(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )

# Singleton instance
rag_engine = RAGEngine()
