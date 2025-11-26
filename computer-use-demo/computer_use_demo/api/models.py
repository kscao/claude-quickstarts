"""Pydantic models for API request/response schemas."""

from typing import Any, Literal

from pydantic import BaseModel


class ChatMessage(BaseModel):
    """A single message in the chat."""

    role: Literal["user", "assistant"]
    content: str | list[dict[str, Any]]


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""

    messages: list[ChatMessage]
    model: str = "claude-sonnet-4-5-20250929"
    provider: Literal["anthropic", "bedrock", "vertex"] = "anthropic"
    api_key: str | None = None
    system_prompt_suffix: str = ""
    only_n_most_recent_images: int = 3
    max_tokens: int = 16384
    tool_version: str = "computer_use_20250124"
    thinking_budget: int | None = None
    token_efficient_tools_beta: bool = False


class AuthValidateRequest(BaseModel):
    """Request body for auth validation."""

    provider: Literal["anthropic", "bedrock", "vertex"]
    api_key: str | None = None


class AuthValidateResponse(BaseModel):
    """Response for auth validation."""

    valid: bool
    error: str | None = None


class ConfigResponse(BaseModel):
    """Response containing available configuration options."""

    providers: list[str]
    default_models: dict[str, str]
    tool_versions: list[str]
    model_configs: dict[str, dict[str, Any]]


class SSEEvent(BaseModel):
    """Server-sent event data structure."""

    event: Literal[
        "message", "tool_use", "tool_result", "thinking", "error", "done", "http_log"
    ]
    data: dict[str, Any]
