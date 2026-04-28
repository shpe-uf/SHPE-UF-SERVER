import sys
import os
import asyncio
import logging

# Add the rag/ directory (parent of scripts/) to sys.path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.agent_loop import generate_answer_with_tools
from app.core.rag import RAGSystem

# Configure logging to show tool usage but not be too verbose
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger("agent_runner")

def main():
    print("Initializing RAG System...")
    try:
        rag_system = RAGSystem()
        print(f"RAG System initialized with model: {rag_system.ollama_model}")
    except Exception as e:
        print(f"Error initializing RAG System: {e}")
        return

    print("\n=== SHPE UF Agent CLI ===")
    print("Type 'exit' or 'quit' to stop.")
    print("This agent can use tools to fetch real-time data (events, tasks, etc.)")
    print("=========================\n")

    while True:
        try:
            question = input("\nYou: ").strip()
            if question.lower() in ['exit', 'quit']:
                break
            if not question:
                continue

            print("\nAgent is thinking... (this may take a moment)")
            
            # Optionally fetch RAG context first
            context_snippets = None
            try:
                relevant_docs = rag_system.search_similar(question, k=3)
                if relevant_docs:
                    context_snippets = [doc['content'] for doc in relevant_docs]
                    print(f"[Debug] Found {len(context_snippets)} relevant RAG documents.")
            except Exception as e:
                print(f"[Warning] RAG search failed: {e}")

            # Run the agent loop
            answer = generate_answer_with_tools(
                ollama_model=rag_system.ollama_model,
                question=question,
                context_snippets=context_snippets,
                max_hops=5
            )

            print(f"\nAgent: {answer}")

        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"\nError: {e}")

if __name__ == "__main__":
    main()
