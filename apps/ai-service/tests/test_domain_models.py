from datetime import date

from domain_models import (
    ClauseExtraction,
    ClauseType,
    DocumentContext,
    Jurisdiction,
    ObligationExtraction,
    ObligationType,
    RedlineSuggestion,
    RiskAssessmentResult,
    RiskFinding,
    RiskLevel,
    validate_clause_type,
    validate_jurisdiction,
    validate_risk_level,
)


def test_clause_type_parser_handles_india_specific_aliases():
    assert ClauseType.from_string("dpdp") == ClauseType.DPDP_PRIVACY
    assert ClauseType.from_string("rera") == ClauseType.RERA_COMPLIANCE
    assert ClauseType.from_string("gst") == ClauseType.GST_TAX
    assert ClauseType.from_string("not-a-real-clause") == ClauseType.UNKNOWN


def test_validate_risk_level_supports_numeric_thresholds():
    assert validate_risk_level("high") == RiskLevel.HIGH
    assert validate_risk_level(0.91) == RiskLevel.CRITICAL
    assert validate_risk_level(0.7) == RiskLevel.HIGH
    assert validate_risk_level(0.5) == RiskLevel.MEDIUM
    assert validate_risk_level(0.21) == RiskLevel.LOW


def test_validate_jurisdiction_supports_indian_codes_and_aliases():
    assert validate_jurisdiction("dl") == Jurisdiction.DL
    assert validate_jurisdiction("Delhi") == Jurisdiction.DL
    assert validate_jurisdiction("Maharashtra") == Jurisdiction.MH
    assert validate_jurisdiction("unknown-place") is None


def test_clause_extraction_to_dict_serializes_expected_shape():
    clause = ClauseExtraction(
        id="c1",
        type=ClauseType.DPDP_PRIVACY,
        text="Data principal consent is mandatory before processing.",
        start_offset=10,
        end_offset=48,
        page_number=2,
        confidence=0.93,
        section_reference="Clause 5.1",
    )

    payload = clause.to_dict()
    assert payload["type"] == "dpdp_privacy"
    assert payload["page_number"] == 2
    assert payload["confidence"] == 0.93


def test_risk_finding_to_dict_rounds_and_truncates():
    finding = RiskFinding(
        id="r1",
        risk_level=RiskLevel.HIGH,
        risk_score=0.81234,
        reason="Privacy clause omits grievance redressal.",
        clause_reference="Clause 12.4",
        clause_type=ClauseType.DPDP_PRIVACY,
        clause_excerpt="x" * 700,
        confidence=0.98765,
        suggestion="Add grievance redressal contact and erasure rights.",
        jurisdiction_note="DPDP obligations apply across India.",
    )

    payload = finding.to_dict()
    assert payload["risk_level"] == "high"
    assert payload["risk_score"] == 0.812
    assert payload["confidence"] == 0.988
    assert len(payload["clause_excerpt"]) == 500


def test_risk_assessment_result_to_dict_uses_india_disclaimer():
    finding = RiskFinding(
        id="r2",
        risk_level=RiskLevel.MEDIUM,
        risk_score=0.55,
        reason="Arbitration seat is missing.",
        clause_reference="Clause 3.2",
        clause_type=ClauseType.ARBITRATION,
        clause_excerpt="Disputes shall be referred to arbitration.",
        confidence=0.75,
    )
    result = RiskAssessmentResult(
        document_id="doc-123",
        overall_risk_level=RiskLevel.MEDIUM,
        overall_risk_score=0.55321,
        findings=[finding],
        summary="One moderate issue identified.",
        recommendation="Specify seat, language, and institution.",
        confidence=0.80456,
    )

    payload = result.to_dict()
    assert payload["overall_risk_level"] == "medium"
    assert "not legal advice" in payload["disclaimer"].lower()
    assert "advocate review" in payload["disclaimer"].lower()


def test_redline_and_obligation_serialization():
    redline = RedlineSuggestion(
        id="s1",
        original_text="Vendor shall charge taxes as applicable.",
        suggested_text="Vendor shall issue GST-compliant invoices and separately disclose CGST, SGST or IGST.",
        reason="Add Indian indirect tax precision.",
        clause_type=ClauseType.GST_TAX,
        clause_reference="Clause 9.1",
        risk_reduction="high_to_low",
        confidence=0.9177,
    )
    obligation = ObligationExtraction(
        id="o1",
        type=ObligationType.HEARING,
        description="Appear before Delhi High Court for admission hearing.",
        responsible_party="Lead advocate",
        due_date=date(2026, 12, 31),
        recurrence=None,
        clause_reference="Matter Calendar",
        confidence=0.8321,
    )

    redline_payload = redline.to_dict()
    obligation_payload = obligation.to_dict()
    assert redline_payload["clause_type"] == "gst_tax"
    assert obligation_payload["type"] == "court_hearing"
    assert obligation_payload["due_date"] == "2026-12-31"


def test_document_context_serialization_includes_optional_jurisdiction():
    context = DocumentContext(
        document_id="doc-abc",
        tenant_id="tenant-1",
        matter_id="matter-2",
        version=3,
        title="RERA Sale Agreement",
        document_type="sale_agreement",
        jurisdiction=Jurisdiction.DL,
        linked_documents=["doc-a", "doc-b"],
        metadata={"source": "upload"},
    )

    payload = context.to_dict()
    assert payload["jurisdiction"] == "DL"
    assert payload["linked_documents"] == ["doc-a", "doc-b"]
    assert validate_clause_type("indemnification") == ClauseType.INDEMNITY
