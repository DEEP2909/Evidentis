from explainability import (
    ConfidenceLevel,
    ExplainabilityBuilder,
    explain_clause_extraction,
    explain_research_result,
    explain_risk_assessment,
)


def test_builder_builds_high_confidence_with_india_defaults():
    builder = ExplainabilityBuilder("risk_assessment")
    builder.add_step(
        action="Step one",
        observation="Observed contract structure",
        conclusion="Structure is complete",
        confidence=0.9,
    )
    builder.add_step(
        action="Step two",
        observation="Observed DPDP clause gap",
        conclusion="Privacy coverage is incomplete",
        confidence=0.86,
    )
    builder.add_limitation("Custom reviewer note")

    explanation = builder.build("Overall summary")
    payload = explanation.to_dict()

    assert payload["confidence_level"] == ConfidenceLevel.HIGH.value
    assert "licensed advocate" in " ".join(payload["limitations"]).lower()
    assert "Custom reviewer note" in payload["limitations"]
    assert "advocate review" in payload["disclaimer"].lower()


def test_clause_reference_excerpt_is_truncated():
    builder = ExplainabilityBuilder("clause_extraction")
    builder.add_clause_reference(
        clause_id="c1",
        clause_type="dpdp_privacy",
        excerpt="x" * 700,
        page_number=4,
        relevance_score=0.95,
    )

    explanation = builder.build("Clause summary")
    reference = explanation.clause_references[0]

    assert reference.excerpt.endswith("...")
    assert len(reference.excerpt) == 503
    assert reference.page_number == 4


def test_explain_risk_assessment_payload_contains_expected_structure():
    result = explain_risk_assessment(
        risk_level="high",
        risk_score=0.82,
        factors=[
            {
                "category": "privacy",
                "observation": "No grievance redressal clause",
                "impact": "Raises DPDP compliance exposure",
                "confidence": 0.88,
                "evidence": ["Clause 12.4"],
            }
        ],
        clauses=[
            {
                "id": "cl-1",
                "type": "dpdp_privacy",
                "excerpt": "The processor may use personal data for business operations.",
                "page": 2,
                "relevance": 0.93,
            }
        ],
    )

    assert "high risk level" in result["summary"]
    assert result["confidence_level"] in {level.value for level in ConfidenceLevel}
    assert len(result["reasoning_chain"]) >= 2
    assert result["clause_references"][0]["clause_id"] == "cl-1"


def test_explain_clause_extraction_tracks_type_counts():
    result = explain_clause_extraction(
        clauses=[
            {"id": "c1", "type": "confidentiality_nda", "excerpt": "Keep data confidential."},
            {"id": "c2", "type": "dpdp_privacy", "excerpt": "Obtain consent before processing."},
            {"id": "c3", "type": "governing_law", "excerpt": "Delhi law governs."},
        ],
        document_type="msa",
    )

    assert result["summary"].startswith("Extracted 3 clauses")
    assert len(result["reasoning_chain"]) >= 3


def test_explain_research_result_adds_citations_and_jurisdiction_note():
    result = explain_research_result(
        query="What is the limitation period for cheque bounce cases?",
        answer="Section 138 complaints under the NI Act have strict statutory timelines.",
        sources=[
            {
                "citation": "Negotiable Instruments Act, Section 138",
                "type": "statute",
                "jurisdiction": "India",
                "relevance_note": "Primary authority",
                "url": "https://indiankanoon.org/",
            }
        ],
        jurisdiction="DL",
    )

    assert len(result["legal_citations"]) == 1
    assert any("focused on DL jurisdiction" in limitation for limitation in result["limitations"])
    assert result["reasoning_chain"][0]["action"] == "Analyzed research query"
