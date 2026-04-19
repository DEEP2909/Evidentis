import pytest
from unittest.mock import patch, MagicMock
from routers.suggest import suggest_redlines, generate_template_suggestions
from types import SimpleNamespace

@pytest.mark.asyncio
async def test_suggest_redlines_route():
    """Test suggest_redlines route handler"""
    mock_request = MagicMock()
    mock_request.app.state.settings = SimpleNamespace(
        ollama_url="http://mock",
        ollama_timeout=10
    )
    
    body = MagicMock()
    body.clause_text = "Standard text"
    body.clause_id = "123"
    body.document_id = "doc1"
    body.clause_type = "indemnification"
    body.flag_message = None
    body.playbook_position = None
    body.jurisdiction = None
    
    with patch("routers.suggest.generate_suggestions_llm") as mock_llm:
        mock_llm.return_value = [{"type": "replacement", "original_text": "Standard", "suggested_text": "New", "rationale": "Better"}]
        from routers.suggest import suggest_redlines
        response = await suggest_redlines(mock_request, body)
        assert len(response.suggestions) > 0
        assert response.suggestions[0].suggested_text == "New"

def test_generate_template_suggestions():
    """Test template-based suggestions logic"""
    text = "The vendor shall indemnify the client."
    clause_type = "indemnification"
    
    # Mutual pattern check
    result = generate_template_suggestions(text, clause_type, None)
    assert isinstance(result, list)
    assert len(result) > 0
    assert result[0]["type"] == "replacement"

@pytest.mark.asyncio
async def test_generate_suggestions_llm_call():
    """Test generate_suggestions_llm function calls call_llm"""
    from routers.suggest import generate_suggestions_llm
    settings = SimpleNamespace(ollama_url="http://mock", ollama_timeout=10)
    
    with patch("routers.suggest.call_llm") as mock_call:
        mock_call.return_value = '[{"type": "insertion", "original_text": "", "suggested_text": "test", "rationale": "why"}]'
        result = await generate_suggestions_llm("text", "indemnity", None, None, None, settings)
        assert len(result) == 1
        assert result[0]["suggested_text"] == "test"
