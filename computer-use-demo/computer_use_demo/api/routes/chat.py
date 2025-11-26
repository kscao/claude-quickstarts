"""Chat streaming routes using Server-Sent Events."""

import asyncio
import json
from typing import Any, AsyncGenerator

import httpx
from anthropic.types.beta import (
    BetaContentBlockParam,
    BetaTextBlockParam,
)
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from computer_use_demo.loop import APIProvider, sampling_loop
from computer_use_demo.tools import ToolResult

from ..models import ChatRequest
from .config import get_api_key

router = APIRouter(prefix="/api", tags=["chat"])


def _serialize_tool_result(result: ToolResult) -> dict[str, Any]:
    """Serialize a ToolResult to a JSON-serializable dict."""
    return {
        "output": result.output,
        "error": result.error,
        "base64_image": result.base64_image,
        "system": result.system,
    }


def _serialize_content_block(block: BetaContentBlockParam) -> dict[str, Any]:
    """Serialize a content block to JSON-serializable dict."""
    if isinstance(block, dict):
        return dict(block)
    # For TypedDict-like objects, convert to plain dict
    return dict(block)  # type: ignore[arg-type]


async def _stream_chat(request: ChatRequest) -> AsyncGenerator[dict[str, Any], None]:
    """
    Stream chat responses using SSE.
    Wraps the sampling_loop and yields events for each response.
    """
    # Convert messages to the format expected by sampling_loop
    messages = []
    for msg in request.messages:
        if isinstance(msg.content, str):
            messages.append(
                {
                    "role": msg.role,
                    "content": [BetaTextBlockParam(type="text", text=msg.content)],
                }
            )
        else:
            messages.append(
                {
                    "role": msg.role,
                    "content": msg.content,
                }
            )

    # Track events to yield - use a thread-safe queue
    events_queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()

    # IMPORTANT: These callbacks are called SYNCHRONOUSLY by sampling_loop
    # (without await), so they must be regular functions, not async.
    # Use put_nowait() which is thread-safe.

    def output_callback(block: BetaContentBlockParam):
        """Called when Claude produces output."""
        serialized = _serialize_content_block(block)
        block_type = serialized.get("type", "unknown")

        if block_type == "text":
            events_queue.put_nowait(
                {
                    "event": "message",
                    "data": {"type": "text", "text": serialized.get("text", "")},
                }
            )
        elif block_type == "thinking":
            events_queue.put_nowait(
                {
                    "event": "thinking",
                    "data": {"thinking": serialized.get("thinking", "")},
                }
            )
        elif block_type == "tool_use":
            events_queue.put_nowait(
                {
                    "event": "tool_use",
                    "data": {
                        "id": serialized.get("id"),
                        "name": serialized.get("name"),
                        "input": serialized.get("input"),
                    },
                }
            )

    def tool_output_callback(result: ToolResult, tool_id: str):
        """Called when a tool produces output."""
        events_queue.put_nowait(
            {
                "event": "tool_result",
                "data": {
                    "tool_id": tool_id,
                    **_serialize_tool_result(result),
                },
            }
        )

    def api_response_callback(
        request_obj: httpx.Request,
        response: httpx.Response | object | None,
        error: Exception | None,
    ):
        """Called for each API request/response."""
        log_data: dict[str, Any] = {
            "request": {
                "method": str(request_obj.method),
                "url": str(request_obj.url),
            },
        }

        if isinstance(response, httpx.Response):
            log_data["response"] = {
                "status_code": response.status_code,
            }

        if error:
            log_data["error"] = str(error)

        events_queue.put_nowait(
            {
                "event": "http_log",
                "data": log_data,
            }
        )

    # Run the sampling loop in a task
    async def run_sampling():
        try:
            # Get API key from request or environment (.env loaded at startup)
            api_key = get_api_key(request.provider, request.api_key) or ""

            await sampling_loop(
                model=request.model,
                provider=APIProvider(request.provider),
                system_prompt_suffix=request.system_prompt_suffix,
                messages=messages,
                output_callback=output_callback,
                tool_output_callback=tool_output_callback,
                api_response_callback=api_response_callback,
                api_key=api_key,
                only_n_most_recent_images=request.only_n_most_recent_images,
                max_tokens=request.max_tokens,
                tool_version=request.tool_version,  # type: ignore
                thinking_budget=request.thinking_budget,
                token_efficient_tools_beta=request.token_efficient_tools_beta,
            )
            # Signal completion with final messages
            events_queue.put_nowait(
                {
                    "event": "done",
                    "data": {
                        "messages": [
                            {"role": m["role"], "content": m["content"]}
                            for m in messages
                        ]
                    },
                }
            )
        except Exception as e:
            events_queue.put_nowait(
                {
                    "event": "error",
                    "data": {"error": str(e), "type": type(e).__name__},
                }
            )
        finally:
            # Signal end of stream
            events_queue.put_nowait(None)

    # Start the sampling loop
    task = asyncio.create_task(run_sampling())

    # Yield events as they come in
    try:
        while True:
            event = await events_queue.get()
            if event is None:
                break
            yield event
    finally:
        if not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass


@router.post("/chat/stream")
async def stream_chat(request: ChatRequest):
    """
    Stream chat responses using Server-Sent Events.

    Events:
    - message: Text message from Claude
    - thinking: Thinking block from Claude
    - tool_use: Tool use request from Claude
    - tool_result: Result from tool execution
    - http_log: HTTP request/response log
    - error: Error occurred
    - done: Stream complete, includes final messages
    """

    async def event_generator():
        async for event in _stream_chat(request):
            yield {
                "event": event["event"],
                "data": json.dumps(event["data"]),
            }

    return EventSourceResponse(
        event_generator(),
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering if present
        },
    )
