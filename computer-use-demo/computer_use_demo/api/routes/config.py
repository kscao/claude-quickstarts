"""Configuration and authentication routes."""

import asyncio
import os
from typing import get_args

from fastapi import APIRouter

from computer_use_demo.loop import APIProvider
from computer_use_demo.tools import ToolVersion

from ..models import AuthValidateRequest, AuthValidateResponse, ConfigResponse

router = APIRouter(prefix="/api", tags=["config"])

PROVIDER_TO_DEFAULT_MODEL_NAME: dict[str, str] = {
    "anthropic": "claude-sonnet-4-5-20250929",
    "bedrock": "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "vertex": "claude-3-5-sonnet-v2@20241022",
}

MODEL_CONFIGS = {
    "claude-opus-4-1-20250805": {
        "tool_version": "computer_use_20250429",
        "max_output_tokens": 64000,
        "default_output_tokens": 16384,
        "has_thinking": True,
    },
    "claude-sonnet-4-20250514": {
        "tool_version": "computer_use_20250429",
        "max_output_tokens": 64000,
        "default_output_tokens": 16384,
        "has_thinking": True,
    },
    "claude-opus-4-20250514": {
        "tool_version": "computer_use_20250429",
        "max_output_tokens": 64000,
        "default_output_tokens": 16384,
        "has_thinking": True,
    },
    "claude-sonnet-4-5-20250929": {
        "tool_version": "computer_use_20250124",
        "max_output_tokens": 128000,
        "default_output_tokens": 16384,
        "has_thinking": True,
    },
    "claude-haiku-4-5-20251001": {
        "tool_version": "computer_use_20250124",
        "max_output_tokens": 8192,
        "default_output_tokens": 4096,
        "has_thinking": False,
    },
    "claude-opus-4-5-20251101": {
        "tool_version": "computer_use_20251124",
        "max_output_tokens": 64000,
        "default_output_tokens": 16384,
        "has_thinking": True,
    },
}


def get_api_key(provider: str, provided_key: str | None) -> str | None:
    """Get API key from provided value or environment variable."""
    if provided_key:
        return provided_key
    if provider == "anthropic":
        return os.environ.get("ANTHROPIC_API_KEY")
    return None


@router.get("/config", response_model=ConfigResponse)
async def get_config() -> ConfigResponse:
    """Get available configuration options."""
    return ConfigResponse(
        providers=[p.value for p in APIProvider],
        default_models=PROVIDER_TO_DEFAULT_MODEL_NAME,
        tool_versions=list(get_args(ToolVersion)),
        model_configs=MODEL_CONFIGS,
    )


@router.get("/api-key")
async def get_api_key_status():
    """Check if API key is configured via environment variable."""
    env_key = os.environ.get("ANTHROPIC_API_KEY")
    if env_key:
        # Mask the key for display
        masked = f"{env_key[:10]}...{env_key[-4:]}" if len(env_key) > 14 else "***"
        return {"has_key": True, "masked_key": masked}
    return {"has_key": False, "masked_key": None}


@router.post("/auth/validate", response_model=AuthValidateResponse)
async def validate_auth(request: AuthValidateRequest) -> AuthValidateResponse:
    """Validate authentication credentials."""
    provider = request.provider
    api_key = get_api_key(provider, request.api_key)

    if provider == "anthropic":
        if not api_key:
            return AuthValidateResponse(
                valid=False,
                error="Enter your API key or set ANTHROPIC_API_KEY in .env file",
            )
        return AuthValidateResponse(valid=True)

    if provider == "bedrock":
        try:
            import boto3

            if not boto3.Session().get_credentials():
                return AuthValidateResponse(
                    valid=False,
                    error="You must have AWS credentials set up to use the Bedrock API.",
                )
        except ImportError:
            return AuthValidateResponse(
                valid=False,
                error="boto3 is not installed. Install it to use Bedrock.",
            )
        return AuthValidateResponse(valid=True)

    if provider == "vertex":
        try:
            import google.auth
            from google.auth.exceptions import DefaultCredentialsError

            if not os.environ.get("CLOUD_ML_REGION"):
                return AuthValidateResponse(
                    valid=False,
                    error="Set the CLOUD_ML_REGION environment variable to use the Vertex API.",
                )
            try:
                google.auth.default(
                    scopes=["https://www.googleapis.com/auth/cloud-platform"],
                )
            except DefaultCredentialsError:
                return AuthValidateResponse(
                    valid=False,
                    error="Your google cloud credentials are not set up correctly.",
                )
        except ImportError:
            return AuthValidateResponse(
                valid=False,
                error="google-auth is not installed. Install it to use Vertex.",
            )
        return AuthValidateResponse(valid=True)

    return AuthValidateResponse(valid=False, error="Unknown provider")


@router.post("/reset")
async def reset_environment():
    """Reset the desktop environment."""
    proc = await asyncio.create_subprocess_shell("pkill Xvfb; pkill tint2")
    await proc.wait()
    await asyncio.sleep(1)
    proc = await asyncio.create_subprocess_shell("./start_all.sh")
    await proc.wait()
    return {"status": "ok", "message": "Environment reset successfully"}
