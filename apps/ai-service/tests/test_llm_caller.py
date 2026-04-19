import pytest
import json
from unittest.mock import patch, MagicMock, AsyncMock
from llm_caller import call_llm, stream_llm, clean_json, _extract_message_text
from types import SimpleNamespace

def test_clean_json():
    """Test JSON cleaning utility"""
    assert clean_json('{"key": "value"}') == '{"key": "value"}'
    assert clean_json('```json\n{"key": "value"}\n```') == '{"key": "value"}'
    assert clean_json('```\n{"key": "value"}\n```') == '{"key": "value"}'

def test_extract_message_text():
    """Test extracting text from various LLM response formats"""
    # OpenAI format
    openai_data = {"choices": [{"message": {"content": "Hello"}}]}
    assert _extract_message_text(openai_data) == "Hello"
    
    # List content format
    list_data = {"choices": [{"message": {"content": [{"type": "text", "text": "Part 1"}]}}]}
    assert _extract_message_text(list_data) == "Part 1"
    
    # Simple content format
    simple_data = {"content": "Simple"}
    assert _extract_message_text(simple_data) == "Simple"
    
    # Message dict format
    msg_data = {"message": {"content": "Msg"}}
    assert _extract_message_text(msg_data) == "Msg"
    
    # Empty
    assert _extract_message_text({}) == ""

@pytest.mark.asyncio
async def test_call_llm_groq_success():
    """Test successful Groq call for research"""
    settings = SimpleNamespace(
        groq_api_key="sk-groq",
        groq_research_model="llama3",
        groq_timeout=10
    )
    
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"choices": [{"message": {"content": "Groq Result"}}]}
    mock_resp.raise_for_status = MagicMock()
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        
        result = await call_llm(
            task="research",
            system_prompt="sys",
            user_prompt="user",
            settings=settings
        )
        assert result == "Groq Result"
        assert "api.groq.com" in str(mock_post.call_args)

@pytest.mark.asyncio
async def test_call_llm_azure_fallback():
    """Test fallback from Groq to Azure"""
    settings = SimpleNamespace(
        groq_api_key="sk-groq",
        azure_openai_endpoint="https://test.openai.azure.com",
        azure_openai_api_key="sk-azure",
        azure_openai_deployment="gpt4",
        ollama_timeout=10
    )
    
    # Mock Groq failure
    mock_groq_resp = MagicMock()
    mock_groq_resp.raise_for_status.side_effect = Exception("Groq down")
    
    # Mock Azure success
    mock_azure_resp = MagicMock()
    mock_azure_resp.json.return_value = {"choices": [{"message": {"content": "Azure Result"}}]}
    mock_azure_resp.raise_for_status = MagicMock()
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = [Exception("Groq error"), mock_azure_resp]
        
        result = await call_llm(
            task="research",
            system_prompt="sys",
            user_prompt="user",
            settings=settings
        )
        assert result == "Azure Result"
        assert mock_post.call_count == 2

@pytest.mark.asyncio
async def test_call_llm_ollama_fallback():
    """Test fallback to Ollama"""
    settings = SimpleNamespace(
        azure_openai_endpoint="https://test.openai.azure.com",
        azure_openai_api_key="sk-azure",
        azure_openai_deployment="gpt4",
        ollama_base_url="http://localhost:11434",
        ollama_timeout=10
    )
    
    # Mock Azure failure and Ollama success
    mock_ollama_resp = MagicMock()
    mock_ollama_resp.json.return_value = {"message": {"content": "Ollama Result"}}
    mock_ollama_resp.raise_for_status = MagicMock()
    
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = [Exception("Azure error"), mock_ollama_resp]
        
        result = await call_llm(
            task="extract", # "extract" doesn't use Groq
            system_prompt="sys",
            user_prompt="user",
            settings=settings
        )
        assert result == "Ollama Result"
        assert mock_post.call_count == 2

@pytest.mark.asyncio
async def test_stream_llm_non_research():
    """Test that stream_llm for non-research tasks uses call_llm"""
    settings = SimpleNamespace(ollama_base_url="http://localhost:11434", ollama_timeout=10)
    
    with patch("llm_caller.call_llm", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = "Word1 Word2"
        
        tokens = []
        async for token in stream_llm(task="extract", system_prompt="s", user_prompt="u", settings=settings):
            tokens.append(token)
            
        assert "".join(tokens).strip() == "Word1 Word2"

@pytest.mark.asyncio
async def test_stream_llm_research_success():
    """Test streaming for research via Groq"""
    settings = SimpleNamespace(
        groq_api_key="sk-groq",
        groq_research_model="llama3",
        groq_timeout=10
    )
    
    async def mock_aiter():
        yield "data: " + json.dumps({"choices": [{"delta": {"content": "Stream"}}]})
        yield "data: [DONE]"

    mock_resp = MagicMock()
    mock_resp.aiter_lines.return_value = mock_aiter()
    mock_resp.raise_for_status = MagicMock()
    
    with patch("httpx.AsyncClient.stream") as mock_stream:
        mock_stream.return_value.__aenter__.return_value = mock_resp
        
        tokens = []
        async for token in stream_llm(task="research", system_prompt="s", user_prompt="u", settings=settings):
            tokens.append(token)
            
        assert tokens == ["Stream"]
