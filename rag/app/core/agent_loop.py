"""
Agent loop for tool-calling with Ollama.

This module implements the core agent loop that:
1. Maintains a conversation history (messages)
2. Sends messages + tools to Ollama /api/chat
3. Parses tool_calls from the response
4. Dispatches tools and feeds results back
5. Repeats until the model returns a final answer (no tool calls)

**Person B (You) implements this module.**
"""

import requests
import json
import logging
from typing import List, Optional

from .tools import TOOLS, DISPATCH

logger = logging.getLogger(__name__)

OLLAMA_URL = "http://localhost:11434/api/chat"


def generate_answer_with_tools(
    ollama_model: str,
    question: str,
    context_snippets: Optional[List[str]] = None,
    max_hops: int = 4
) -> str:
    """
    Agent loop: iteratively call tools until the model responds with a final answer.
    
    Args:
        ollama_model: The Ollama model to use (e.g., "llama3.1")
        question: The user's question
        context_snippets: Optional RAG context to provide as background
        max_hops: Maximum number of tool-calling iterations
    
    Returns:
        Final answer from the model
    """
    messages = []

    # System prompt
    system_prompt = (
        "You are a helpful assistant for SHPE-UF (Society of Professional Engineers). "
        "Use tools to fetch up-to-date information about events, tasks, recruiting partners, "
        "resources, and alumni when needed to answer user questions. "
        "Be concise and friendly, suitable for mobile users. "
        "If you cannot answer with available tools, explain what information you need."
    )
    messages.append({"role": "system", "content": system_prompt})

    # Optional RAG context (background knowledge)
    if context_snippets:
        ctx = "\n\n".join(context_snippets[:3])
        messages.append({
            "role": "system",
            "content": f"Background context (static knowledge):\n{ctx}\n\nFor current info, use tools to query the API."
        })

    # User question
    messages.append({"role": "user", "content": question})

    # Agent loop
    for hop in range(max_hops):
        try:
            # Call Ollama /api/chat with tools enabled
            response = requests.post(
                OLLAMA_URL,
                json={
                    "model": ollama_model,
                    "messages": messages,
                    "tools": TOOLS,
                    "stream": False
                },
                timeout=60
            )
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            logger.error(f"Ollama request failed at hop {hop}: {e}")
            return f"Error communicating with LLM: {e}"

        # Parse response
        data = response.json()
        msg = data.get("message", {})
        tool_calls = msg.get("tool_calls", []) if msg else []

        # If no tool calls, we have a final answer
        if not tool_calls:
            content = (msg or {}).get("content", "").strip()
            if content:
                return content
            else:
                return "I couldn't produce an answer."

        # Execute each tool call
        for call in tool_calls:
            fn_name = call.get("function", {}).get("name")
            raw_args = call.get("function", {}).get("arguments") or "{}"

            # Parse arguments (may be JSON string or dict)
            try:
                args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
            except json.JSONDecodeError:
                args = {}

            # Dispatch the tool
            if fn_name not in DISPATCH:
                tool_result = f"Unknown tool: {fn_name}"
                logger.warning(f"Tool '{fn_name}' not found in DISPATCH")
            else:
                try:
                    logger.info(f"Executing tool: {fn_name} with args {args}")
                    result = DISPATCH[fn_name](**args) if isinstance(args, dict) else DISPATCH[fn_name]()
                    
                    # Convert result to JSON string
                    if isinstance(result, str):
                        tool_result = result
                    else:
                        tool_result = json.dumps(result)
                    
                    logger.info(f"Tool {fn_name} returned: {tool_result[:200]}...")
                except Exception as e:
                    tool_result = f"Tool {fn_name} failed: {str(e)}"
                    logger.error(f"Tool execution error: {tool_result}")

            # Append tool result to messages
            messages.append({
                "role": "tool",
                "name": fn_name,
                "content": tool_result
            })

    # If we exhausted max hops
    logger.warning(f"Agent loop reached max hops ({max_hops}) without final answer")
    return "I reached the maximum number of tool calls without producing a final answer. Please try rephrasing your question."
