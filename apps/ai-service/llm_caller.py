"""
Unified LLM routing for EvidentIS AI service.

Provider order:
- Research: Groq -> Azure OpenAI -> Ollama fallback
- All other tasks: Azure OpenAI -> Ollama fallback
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, AsyncGenerator, Literal

import httpx

logger = logging.getLogger(__name__)

LLMTask = Literal["research", "extract", "assess", "obligations", "suggest"]


def clean_json(text: str) -> str:
    """Strip common Markdown wrappers around JSON responses."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _setting_str(settings: Any, name: str, default: str = "") -> str:
    value = getattr(settings, name, default)
    return value.strip() if isinstance(value, str) else default


def _setting_float(settings: Any, name: str, default: float) -> float:
    value = getattr(settings, name, default)
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return default
    return default


def _extract_message_text(payload: dict[str, Any]) -> str:
    choices = payload.get("choices") or []
    if choices:
        message = choices[0].get("message") or {}
        content = message.get("content")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text":
                    text = item.get("text")
                    if isinstance(text, str):
                        parts.append(text)
            return "".join(parts)

    for key in ("response", "content", "text", "output"):
        value = payload.get(key)
        if isinstance(value, str):
            return value

    message = payload.get("message")
    if isinstance(message, dict):
        content = message.get("content")
        if isinstance(content, str):
            return content

    return ""


def _chat_payload(
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int,
    json_mode: bool,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    return payload


async def _call_azure_openai(
    settings: Any,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int,
    json_mode: bool,
) -> str:
    endpoint = _setting_str(settings, "azure_openai_endpoint").rstrip("/")
    api_key = _setting_str(settings, "azure_openai_api_key")
    deployment = _setting_str(settings, "azure_openai_deployment")
    api_version = _setting_str(settings, "azure_openai_api_version", "2024-02-01")
    timeout = _setting_float(settings, "azure_openai_timeout", _setting_float(settings, "ollama_timeout", 120))

    if not endpoint or not api_key or not deployment:
        raise RuntimeError("Azure OpenAI is not configured")

    url = f"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={api_version}"
    payload = _chat_payload(system_prompt, user_prompt, temperature, max_tokens, json_mode)

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            url,
            headers={
                "Content-Type": "application/json",
                "api-key": api_key,
            },
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

    content = _extract_message_text(data)
    if not content:
        raise RuntimeError("Azure OpenAI returned an empty response")
    return content


async def _call_groq(
    settings: Any,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int,
) -> str:
    api_key = _setting_str(settings, "groq_api_key")
    model = _setting_str(settings, "groq_research_model", "llama-3.1-8b-instant")
    timeout = _setting_float(settings, "groq_timeout", _setting_float(settings, "ollama_timeout", 120))

    if not api_key:
        raise RuntimeError("Groq is not configured")

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                **_chat_payload(system_prompt, user_prompt, temperature, max_tokens, False),
                "model": model,
            },
        )
        response.raise_for_status()
        data = response.json()

    content = _extract_message_text(data)
    if not content:
        raise RuntimeError("Groq returned an empty response")
    return content


async def _call_ollama(
    settings: Any,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int,
    json_mode: bool,
) -> str:
    base_url = _setting_str(settings, "ollama_base_url", "http://localhost:11434").rstrip("/")
    model = _setting_str(
        settings,
        "ollama_model_fallback",
        _setting_str(settings, "ollama_model_extract", "qwen2.5:3b-instruct-q3_K_M"),
    ) or "qwen2.5:3b-instruct-q3_K_M"
    timeout = _setting_float(settings, "ollama_timeout", 120)

    payload: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }
    if json_mode:
        payload["format"] = "json"

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(f"{base_url}/api/chat", json=payload)
        response.raise_for_status()
        data = response.json()

    content = _extract_message_text(data)
    if not content:
        raise RuntimeError("Ollama returned an empty response")
    return content


async def call_llm(
    *,
    task: LLMTask,
    system_prompt: str,
    user_prompt: str,
    settings: Any,
    temperature: float = 0.2,
    max_tokens: int = 2048,
    json_mode: bool = False,
) -> str:
    """Route an LLM request through the configured provider priority."""
    providers = ["groq", "azure", "ollama"] if task == "research" else ["azure", "ollama"]
    last_error: Exception | None = None

    for provider in providers:
        try:
            if provider == "groq":
                return await _call_groq(settings, system_prompt, user_prompt, temperature, max_tokens)
            if provider == "azure":
                return await _call_azure_openai(settings, system_prompt, user_prompt, temperature, max_tokens, json_mode)
            return await _call_ollama(settings, system_prompt, user_prompt, temperature, max_tokens, json_mode)
        except Exception as exc:  # pragma: no cover - exercised via fallback behavior
            last_error = exc
            if provider == "groq":
                logger.warning("Groq failed for %s, falling back: %s", task, exc)
            elif provider == "azure":
                logger.warning("Azure OpenAI failed for %s, falling back: %s", task, exc)
            else:
                logger.error("Ollama fallback also failed for %s: %s", task, exc)

    raise RuntimeError(f"All LLM providers failed for task={task}: {last_error}")


async def _stream_groq(
    settings: Any,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int,
) -> AsyncGenerator[str, None]:
    api_key = _setting_str(settings, "groq_api_key")
    model = _setting_str(settings, "groq_research_model", "llama-3.1-8b-instant")
    timeout = _setting_float(settings, "groq_timeout", _setting_float(settings, "ollama_timeout", 120))

    if not api_key:
        raise RuntimeError("Groq is not configured")

    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream(
            "POST",
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                **_chat_payload(system_prompt, user_prompt, temperature, max_tokens, False),
                "model": model,
                "stream": True,
            },
        ) as response:
            response.raise_for_status()

            async for line in response.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue

                payload = line[len("data:"):].strip()
                if payload == "[DONE]":
                    return

                try:
                    event = json.loads(payload)
                except json.JSONDecodeError:
                    continue

                choices = event.get("choices") or []
                if not choices:
                    continue

                delta = choices[0].get("delta") or {}
                content = delta.get("content")
                if isinstance(content, str) and content:
                    yield content
                elif isinstance(content, list):
                    for item in content:
                        if isinstance(item, dict) and item.get("type") == "text":
                            text = item.get("text")
                            if isinstance(text, str) and text:
                                yield text


async def stream_llm(
    *,
    task: LLMTask,
    system_prompt: str,
    user_prompt: str,
    settings: Any,
    temperature: float = 0.2,
    max_tokens: int = 2048,
) -> AsyncGenerator[str, None]:
    """Stream tokens for research. Falls back to chunked non-streaming output."""
    if task != "research":
        full_text = await call_llm(
            task=task,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            settings=settings,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        for token in re.findall(r"\S+\s*", full_text):
            yield token
        return

    try:
        async for token in _stream_groq(settings, system_prompt, user_prompt, temperature, max_tokens):
            yield token
        return
    except Exception as exc:  # pragma: no cover - exercised via fallback behavior
        logger.warning("Groq streaming failed for research, falling back: %s", exc)

    fallback_text = await call_llm(
        task=task,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        settings=settings,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    for token in re.findall(r"\S+\s*", fallback_text):
        yield token
