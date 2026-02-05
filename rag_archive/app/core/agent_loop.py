"""
Agent loop for tool-calling with Ollama.

This module implements the core agent loop that:
1. Maintains a conversation history (messages)
2. Sends messages + tools to Ollama /api/chat
3. Parses tool_calls from the response
4. Dispatches tools and feeds results back
5. Repeats until the model returns a final answer (no tool calls)
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
    The agent can 'hop' (think -> tool -> think) multiple times to gather info.
    
    Args:
        ollama_model: The Ollama model to use (e.g., "llama3.1")
        question: The user's question
        context_snippets: Optional RAG context to provide as background
        max_hops: Maximum number of tool-calling iterations
    
    Returns:
        Final answer from the model
    """
    messages = []

    # System prompt: Defines the persona and rules for the agent.
    # Critical for ensuring the agent uses tools correctly and formats output nicely.
    system_prompt = (
        "You are a helpful assistant for SHPE-UF (Society of Hispanic Professional Engineers). "
        "Your goal is to answer user questions about events, tasks, recruiting partners, resources, and alumni. "
        "You have access to tools that retrieve real-time data. "
        "When you receive data from a tool, interpret it and synthesize a natural language response. "
        "Do not simply list the data or describe the data structure. "
        "Never mention technical terms like 'JSON', 'object', 'keys', 'values', or 'array' to the user. "
        "Never mention 'tools', 'functions', 'static knowledge', or 'API' in your final answer. "
        "Act as if you simply know the information. Do not explain how you found the answer. "
        "Present the information in a friendly, conversational manner suitable for mobile users. "
        "If the tool returns a list of items, summarize them or list them naturally. "
        "Only provide the information requested by the user, even if the tool returns more details. "
        "CRITICAL: If a tool returns an empty list (e.g., no upcoming events), state clearly that there are no such items currently scheduled. "
        "Do NOT use the 'Background context' to invent upcoming events or current status. Only use the tool output for time-sensitive info. "
        "Do not output JSON or tool definitions in your final answer. If you cannot answer, simply state that you don't have that information."
    )
    messages.append({"role": "system", "content": system_prompt})

    # Optional RAG context (background knowledge) possibly used later on
    if context_snippets:
        ctx = "\n\n".join(context_snippets[:3])
        messages.append({
            "role": "system",
            "content": f"Here is some relevant information that might help answer the user's question:\n{ctx}"
        })

    # User question
    messages.append({"role": "user", "content": question})

    # Agent loop: Keep asking Ollama until it stops calling tools or we hit max_hops
    for hop in range(max_hops):
        try:
            # Debug: Print messages to see what's being sent
            print(f"\n--- Messages at hop {hop} ---")
            print(json.dumps(messages, indent=2))
            print("---------------------------\n")

            # Call Ollama /api/chat with tools enabled
            # 'tools' param allows the model to request function execution
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
        messages.append({"role": "assistant", "content": msg.get("content", ""), "tool_calls": tool_calls})

        # If no tool calls, we have a final answer
        if not tool_calls:
            content = (msg or {}).get("content", "").strip()
            if content:
                return content
            else:
                return "I couldn't produce an answer."

        # Execute each tool call requested by the LLM
        for call in tool_calls:
            fn_name = call.get("function", {}).get("name")
            raw_args = call.get("function", {}).get("arguments") or "{}"

            # Parse arguments (may be JSON string or dict)
            try:
                args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
            except json.JSONDecodeError:
                args = {}

            # Dispatch the tool - find the actual function code
            if fn_name not in DISPATCH:
                tool_result = f"Unknown tool: {fn_name}"
                logger.warning(f"Tool '{fn_name}' not found in DISPATCH")
            else:
                try:
                    logger.info(f"Executing tool: {fn_name} with args {args}")
                    
                    # RUN THE TOOL (e.g., fetch events from GraphQL)
                    result = DISPATCH[fn_name](**args) if isinstance(args, dict) else DISPATCH[fn_name]()
                    
                    # Convert result to JSON string to feed back to LLM
                    if isinstance(result, str):
                        tool_result = result
                    else:
                        tool_result = json.dumps(result)
                    
                    logger.info(f"Tool {fn_name} returned: {tool_result[:200]}...")
                except Exception as e:
                    tool_result = f"Tool {fn_name} failed: {str(e)}"
                    logger.error(f"Tool execution error: {tool_result}")

            # Append tool result to messages so the LLM knows what happened
            messages.append({
                "role": "tool",
                "name": fn_name,
                "content": tool_result
            })

    # If we exhausted max hops
    logger.warning(f"Agent loop reached max hops ({max_hops}) without final answer")
    return "I reached the maximum number of tool calls without producing a final answer. Please try rephrasing your question."
