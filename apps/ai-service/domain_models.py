"""
EvidentIS India legal domain models.
Strict schemas for multilingual Indian legal AI workflows.
"""

from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from typing import Any, Dict, List, Optional


class ClauseType(str, Enum):
    INDEMNITY = "indemnity"
    LIMITATION_OF_LIABILITY = "limitation_of_liability"
    TERMINATION_FOR_CONVENIENCE = "termination_for_convenience"
    TERMINATION_FOR_CAUSE = "termination_for_cause"
    GOVERNING_LAW = "governing_law"
    JURISDICTION = "jurisdiction"
    ARBITRATION = "arbitration"
    MEDIATION = "mediation"
    ASSIGNMENT = "assignment"
    CONFIDENTIALITY_NDA = "confidentiality_nda"
    IP_OWNERSHIP = "ip_ownership"
    IP_LICENSE = "ip_license"
    REPRESENTATIONS_WARRANTIES = "representations_warranties"
    FORCE_MAJEURE = "force_majeure"
    PAYMENT_TERMS = "payment_terms"
    GST_TAX = "gst_tax"
    STAMP_DUTY = "stamp_duty"
    DPDP_PRIVACY = "dpdp_privacy"
    ANTI_CORRUPTION = "anti_corruption"
    INSURANCE = "insurance"
    NOTICE_PROVISIONS = "notice_provisions"
    ENTIRE_AGREEMENT = "entire_agreement"
    COMPLIANCE_WITH_LAWS = "compliance_with_laws"
    LABOUR_CODE_COMPLIANCE = "labour_code_compliance"
    RERA_COMPLIANCE = "rera_compliance"
    CONSUMER_PROTECTION = "consumer_protection"
    UNKNOWN = "unknown"

    @classmethod
    def from_string(cls, value: str) -> "ClauseType":
        normalized = value.lower().replace(" ", "_").replace("-", "_")
        try:
            return cls(normalized)
        except ValueError:
            aliases = {
                "indemnification": cls.INDEMNITY,
                "nda": cls.CONFIDENTIALITY_NDA,
                "dpdp": cls.DPDP_PRIVACY,
                "gst": cls.GST_TAX,
                "rera": cls.RERA_COMPLIANCE,
                "labour": cls.LABOUR_CODE_COMPLIANCE,
                "consumer": cls.CONSUMER_PROTECTION,
            }
            return aliases.get(normalized, cls.UNKNOWN)


class RiskLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

    @property
    def numeric_value(self) -> int:
        return {"critical": 4, "high": 3, "medium": 2, "low": 1, "info": 0}[self.value]


class ObligationType(str, Enum):
    PAYMENT = "payment_deadline"
    NOTICE = "notice_period"
    REGULATORY = "regulatory_filing"
    RENEWAL = "renewal_date"
    DELIVERABLE = "deliverable"
    HEARING = "court_hearing"
    LIMITATION = "limitation_deadline"
    GST = "gst_payment"
    OTHER = "other"


class Jurisdiction(str, Enum):
    CENTRAL = "CENTRAL"
    AP = "AP"
    AR = "AR"
    AS = "AS"
    BR = "BR"
    CT = "CT"
    GA = "GA"
    GJ = "GJ"
    HR = "HR"
    HP = "HP"
    JH = "JH"
    KA = "KA"
    KL = "KL"
    MP = "MP"
    MH = "MH"
    MN = "MN"
    ML = "ML"
    MZ = "MZ"
    NL = "NL"
    OD = "OD"
    PB = "PB"
    RJ = "RJ"
    SK = "SK"
    TN = "TN"
    TG = "TG"
    TR = "TR"
    UP = "UP"
    UK = "UK"
    WB = "WB"
    DL = "DL"
    JK = "JK"
    LA = "LA"
    CH = "CH"
    PY = "PY"
    AN = "AN"
    DH = "DH"
    LD = "LD"


@dataclass
class ClauseExtraction:
    id: str
    type: ClauseType
    text: str
    start_offset: int
    end_offset: int
    page_number: Optional[int] = None
    confidence: float = 0.0
    section_reference: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type.value,
            "text": self.text,
            "start_offset": self.start_offset,
            "end_offset": self.end_offset,
            "page_number": self.page_number,
            "confidence": self.confidence,
            "section_reference": self.section_reference,
        }


@dataclass
class RiskFinding:
    id: str
    risk_level: RiskLevel
    risk_score: float
    reason: str
    clause_reference: str
    clause_type: ClauseType
    clause_excerpt: str
    confidence: float
    suggestion: Optional[str] = None
    jurisdiction_note: Optional[str] = None
    source_citation: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "risk_level": self.risk_level.value,
            "risk_score": round(self.risk_score, 3),
            "reason": self.reason,
            "clause_reference": self.clause_reference,
            "clause_type": self.clause_type.value,
            "clause_excerpt": self.clause_excerpt[:500],
            "confidence": round(self.confidence, 3),
            "suggestion": self.suggestion,
            "jurisdiction_note": self.jurisdiction_note,
            "source_citation": self.source_citation,
        }


@dataclass
class RiskAssessmentResult:
    document_id: str
    overall_risk_level: RiskLevel
    overall_risk_score: float
    findings: List[RiskFinding]
    summary: str
    recommendation: str
    confidence: float
    disclaimer: str = "AI assistance, not legal advice. Requires advocate review."

    def to_dict(self) -> Dict[str, Any]:
        return {
            "document_id": self.document_id,
            "overall_risk_level": self.overall_risk_level.value,
            "overall_risk_score": round(self.overall_risk_score, 3),
            "findings": [finding.to_dict() for finding in self.findings],
            "summary": self.summary,
            "recommendation": self.recommendation,
            "confidence": round(self.confidence, 3),
            "disclaimer": self.disclaimer,
        }


@dataclass
class RedlineSuggestion:
    id: str
    original_text: str
    suggested_text: str
    reason: str
    clause_type: ClauseType
    clause_reference: str
    risk_reduction: str
    confidence: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "original_text": self.original_text,
            "suggested_text": self.suggested_text,
            "reason": self.reason,
            "clause_type": self.clause_type.value,
            "clause_reference": self.clause_reference,
            "risk_reduction": self.risk_reduction,
            "confidence": round(self.confidence, 3),
        }


@dataclass
class ObligationExtraction:
    id: str
    type: ObligationType
    description: str
    responsible_party: str
    due_date: Optional[date] = None
    recurrence: Optional[str] = None
    clause_reference: str = ""
    confidence: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type.value,
            "description": self.description,
            "responsible_party": self.responsible_party,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "recurrence": self.recurrence,
            "clause_reference": self.clause_reference,
            "confidence": round(self.confidence, 3),
        }


@dataclass
class DocumentContext:
    document_id: str
    tenant_id: str
    matter_id: str
    version: int
    title: str
    document_type: str
    jurisdiction: Optional[Jurisdiction] = None
    linked_documents: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "document_id": self.document_id,
            "tenant_id": self.tenant_id,
            "matter_id": self.matter_id,
            "version": self.version,
            "title": self.title,
            "document_type": self.document_type,
            "jurisdiction": self.jurisdiction.value if self.jurisdiction else None,
            "linked_documents": self.linked_documents,
            "metadata": self.metadata,
        }


def validate_clause_type(value: str) -> ClauseType:
    return ClauseType.from_string(value)


def validate_risk_level(value: str) -> RiskLevel:
    if isinstance(value, (int, float)):
      if value >= 0.85:
          return RiskLevel.CRITICAL
      if value >= 0.65:
          return RiskLevel.HIGH
      if value >= 0.45:
          return RiskLevel.MEDIUM
      if value >= 0.2:
          return RiskLevel.LOW
      return RiskLevel.INFO

    if isinstance(value, str):
        try:
            return RiskLevel(value.lower())
        except ValueError:
            return RiskLevel.MEDIUM

    return RiskLevel.MEDIUM


def validate_jurisdiction(value: str) -> Optional[Jurisdiction]:
    if not value:
        return None
    try:
        return Jurisdiction(value.upper())
    except ValueError:
        aliases = {
            "delhi": Jurisdiction.DL,
            "maharashtra": Jurisdiction.MH,
            "karnataka": Jurisdiction.KA,
            "tamil nadu": Jurisdiction.TN,
            "central": Jurisdiction.CENTRAL,
        }
        return aliases.get(value.lower())
