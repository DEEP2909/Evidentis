"""
EvidentIS AI Service - Clause Extraction Router
Extract legal clauses from document text using NLP and LLM.
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from explainability import explain_clause_extraction
from llm_caller import call_llm, clean_json
from prompts import CLAUSE_EXTRACTION, validate_response

logger = logging.getLogger(__name__)

router = APIRouter()

# India-first clause types with compatibility aliases for inherited workflows
CLAUSE_TYPES = [
    "indemnification",
    "indemnity",
    "limitation_of_liability",
    "termination_for_convenience",
    "termination_for_cause",
    "confidentiality",
    "confidentiality_nda",
    "non_compete",
    "non_solicitation",
    "intellectual_property",
    "ip_ownership",
    "ip_license",
    "governing_law",
    "jurisdiction",
    "arbitration",
    "mediation",
    "jury_waiver",
    "class_action_waiver",
    "force_majeure",
    "assignment",
    "notice_requirements",
    "notice_provisions",
    "amendment",
    "severability",
    "entire_agreement",
    "warranty_disclaimer",
    "data_privacy",
    "dpdp_privacy",
    "gst_tax",
    "stamp_duty",
    "insurance_requirements",
    "insurance",
    "compliance_with_laws",
    "labour_code_compliance",
    "rera_compliance",
    "consumer_protection",
    "audit_rights",
    "most_favored_nation",
]


class ClauseExtractRequest(BaseModel):
    """Clause extraction request."""
    text: str = Field(..., description="Document text to analyze", max_length=500000)
    document_id: str = Field(..., description="Document ID for reference")
    extract_types: Optional[List[str]] = Field(
        default=None,
        description="Specific clause types to extract. If None, extracts all."
    )


class ExtractedClause(BaseModel):
    """Extracted clause with metadata."""
    clause_type: str
    text: str
    start_offset: int
    end_offset: int
    confidence: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ClauseExtractResponse(BaseModel):
    """Clause extraction response."""
    document_id: str
    clauses: List[ExtractedClause]
    total_found: int
    extraction_method: str
    explanation: Optional[Dict[str, Any]] = Field(default=None, description="Explainability data for the extraction")


# Clause detection patterns (regex-based initial detection)
CLAUSE_PATTERNS = {
    "indemnification": [
        r"(?i)indemn\w*",
        r"(?i)hold\s+harmless",
        r"(?i)defend\s+and\s+indemnify",
    ],
    "limitation_of_liability": [
        r"(?i)limit\w*\s+of\s+liab\w*",
        r"(?i)in\s+no\s+event\s+shall.*liable",
        r"(?i)maximum\s+liability",
        r"(?i)cap\s+on\s+damages",
    ],
    "termination_for_convenience": [
        r"(?i)terminat\w*\s+for\s+convenience",
        r"(?i)terminat\w*\s+without\s+cause",
        r"(?i)may\s+terminate\s+at\s+any\s+time",
    ],
    "termination_for_cause": [
        r"(?i)terminat\w*\s+for\s+cause",
        r"(?i)material\s+breach",
        r"(?i)cure\s+period",
    ],
    "confidentiality": [
        r"(?i)confidential\w*",
        r"(?i)proprietary\s+information",
        r"(?i)non-?disclosure",
        r"(?i)trade\s+secret",
    ],
    "non_compete": [
        r"(?i)non-?compet\w*",
        r"(?i)covenant\s+not\s+to\s+compete",
        r"(?i)restrictive\s+covenant",
    ],
    "non_solicitation": [
        r"(?i)non-?solicit\w*",
        r"(?i)shall\s+not\s+solicit",
        r"(?i)employee\s+solicitation",
    ],
    "intellectual_property": [
        r"(?i)intellectual\s+property",
        r"(?i)patent\w*",
        r"(?i)copyright\w*",
        r"(?i)trademark\w*",
        r"(?i)work\s+for\s+hire",
    ],
    "governing_law": [
        r"(?i)govern\w*\s+law",
        r"(?i)laws\s+of\s+the\s+state\s+of",
        r"(?i)jurisdiction",
        r"(?i)choice\s+of\s+law",
    ],
    "arbitration": [
        r"(?i)arbitrat\w*",
        r"(?i)AAA\s+rules",
        r"(?i)binding\s+arbitration",
        r"(?i)JAMS",
    ],
    "jury_waiver": [
        r"(?i)jury\s+waiver",
        r"(?i)waiv\w*\s+jury",
        r"(?i)right\s+to\s+a\s+jury\s+trial",
    ],
    "class_action_waiver": [
        r"(?i)class\s+action\s+waiver",
        r"(?i)waiv\w*\s+class\s+action",
        r"(?i)individual\s+basis\s+only",
    ],
    "force_majeure": [
        r"(?i)force\s+majeure",
        r"(?i)act\s+of\s+god",
        r"(?i)circumstances\s+beyond.*control",
    ],
    "assignment": [
        r"(?i)assignment\s+(?:of|and)",
        r"(?i)shall\s+not\s+assign",
        r"(?i)without\s+prior\s+written\s+consent",
    ],
    "notice_requirements": [
        r"(?i)notice\w*\s+(?:shall|must|should)",
        r"(?i)written\s+notice",
        r"(?i)deemed\s+given",
    ],
    "amendment": [
        r"(?i)amend\w*",
        r"(?i)modif\w*.*(?:writing|written)",
        r"(?i)no\s+oral\s+modification",
    ],
    "severability": [
        r"(?i)severab\w*",
        r"(?i)if\s+any\s+provision.*invalid",
        r"(?i)remaining\s+provisions",
    ],
    "entire_agreement": [
        r"(?i)entire\s+agreement",
        r"(?i)supersed\w*.*prior",
        r"(?i)merger\s+clause",
    ],
    "warranty_disclaimer": [
        r"(?i)warranty\s+disclaim\w*",
        r"(?i)as[\s-]is",
        r"(?i)without\s+warranty",
        r"(?i)no\s+warrant\w*",
    ],
    "data_privacy": [
        r"(?i)data\s+(?:privacy|protection)",
        r"(?i)digital\s+personal\s+data",
        r"(?i)DPDP",
        r"(?i)GDPR",
        r"(?i)CCPA",
        r"(?i)personal\s+information",
    ],
    "dpdp_privacy": [
        r"(?i)DPDP",
        r"(?i)data\s+principal",
        r"(?i)digital\s+personal\s+data",
        r"(?i)consent\s+manager",
    ],
    "gst_tax": [
        r"(?i)\bGST\b",
        r"(?i)CGST",
        r"(?i)SGST",
        r"(?i)IGST",
        r"(?i)tax\s+invoice",
    ],
    "stamp_duty": [
        r"(?i)stamp\s+duty",
        r"(?i)frank\w*",
        r"(?i)e-?stamp",
        r"(?i)adjudicat\w*",
    ],
    "rera_compliance": [
        r"(?i)\bRERA\b",
        r"(?i)real\s+estate\s+regulatory",
        r"(?i)allottee",
        r"(?i)promoter",
    ],
    "labour_code_compliance": [
        r"(?i)wages\s+code",
        r"(?i)social\s+security",
        r"(?i)industrial\s+relations",
        r"(?i)occupational\s+safety",
    ],
    "consumer_protection": [
        r"(?i)consumer\s+protection",
        r"(?i)product\s+liability",
        r"(?i)unfair\s+trade\s+practice",
    ],
    "insurance_requirements": [
        r"(?i)insurance\s+(?:requirement|coverage|policy)",
        r"(?i)shall\s+maintain\s+insurance",
        r"(?i)certificate\s+of\s+insurance",
    ],
    "compliance_with_laws": [
        r"(?i)compli\w*\s+with.*law",
        r"(?i)applicable\s+law",
        r"(?i)regulatory\s+compliance",
    ],
    "audit_rights": [
        r"(?i)audit\s+right",
        r"(?i)right\s+to\s+audit",
        r"(?i)inspect.*record",
    ],
    "most_favored_nation": [
        r"(?i)most\s+favored\s+(?:nation|customer)",
        r"(?i)MFN",
        r"(?i)best\s+price",
    ],
}


def find_sentence_boundaries(text: str, match_start: int, match_end: int) -> tuple[int, int]:
    """
    Expand a match to full sentence boundaries.
    """
    # Find start of sentence (look for period, newline, or start)
    start = match_start
    while start > 0:
        if text[start - 1] in ".!?\n":
            break
        start -= 1
    
    # Find end of sentence
    end = match_end
    while end < len(text):
        if text[end] in ".!?\n":
            end += 1
            break
        end += 1
    
    # Expand to paragraph for better context
    # Look back for paragraph start
    para_start = start
    newline_count = 0
    while para_start > 0 and newline_count < 2:
        para_start -= 1
        if text[para_start] == "\n":
            newline_count += 1
    
    # Look forward for paragraph end
    para_end = end
    newline_count = 0
    while para_end < len(text) and newline_count < 2:
        if text[para_end] == "\n":
            newline_count += 1
        para_end += 1
    
    return para_start, para_end


def extract_clauses_regex(text: str, clause_types: List[str]) -> List[ExtractedClause]:
    """
    First-pass extraction using regex patterns.
    Fast but less accurate.
    """
    clauses = []
    seen_ranges = set()
    
    for clause_type in clause_types:
        patterns = CLAUSE_PATTERNS.get(clause_type, [])
        
        for pattern in patterns:
            for match in re.finditer(pattern, text):
                # Find full clause text (expand to paragraph)
                start, end = find_sentence_boundaries(text, match.start(), match.end())
                
                # Skip if overlapping with existing clause
                range_key = (start // 100, end // 100)  # Coarse deduplication
                if range_key in seen_ranges:
                    continue
                seen_ranges.add(range_key)
                
                clause_text = text[start:end].strip()
                
                # Skip if too short or too long
                if len(clause_text) < 50 or len(clause_text) > 5000:
                    continue
                
                clauses.append(ExtractedClause(
                    clause_type=clause_type,
                    text=clause_text,
                    start_offset=start,
                    end_offset=end,
                    confidence=0.7,  # Regex match has lower confidence
                    metadata={"method": "regex", "pattern": pattern}
                ))
    
    return clauses


async def extract_clauses_llm(
    text: str,
    clause_types: List[str],
    settings: Any,
) -> List[ExtractedClause]:
    """
    LLM-based clause extraction for higher accuracy.
    """
    max_chars = 6000  # Chunk size for long documents
    overlap = 500
    if len(text) > max_chars:
        # Split into overlapping chunks
        chunks = []
        start = 0
        while start < len(text):
            end = min(start + max_chars, len(text))
            chunk = text[start:end]
            chunks.append(chunk)
            if end == len(text):
                break
            start += max_chars - overlap
    else:
        chunks = [text]

    all_clauses = []
    for chunk in chunks:
        prompt = CLAUSE_EXTRACTION.format(
            document_text=chunk,
            jurisdiction="India",
        )
        if clause_types:
            prompt += f"\n\nOnly include clause_type values in this allowlist: {json.dumps(clause_types)}."

        # Split prompt into system and user messages
        system_prompt = "You are a legal document analyzer specializing in Indian commercial and legal drafting."
        user_prompt = prompt.replace(system_prompt, "").strip()

        try:
            response_text = await call_llm(
                task="extract",
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                settings=settings,
                temperature=CLAUSE_EXTRACTION.temperature,
                max_tokens=1500,
                json_mode=True,
            )
            response_text = clean_json(response_text)

            # Parse JSON from response
            if validate_response(response_text, "json"):
                clauses_data = json.loads(response_text)
                if isinstance(clauses_data, dict) and "clauses" in clauses_data:
                    clauses_data = clauses_data["clauses"]

                for item in clauses_data:
                    if item.get("clause_type") in clause_types:
                        clause_text = item.get("text", "")
                        # Find position in original text (approximate for chunks)
                        start = text.find(clause_text[:100]) if clause_text else -1
                        end = start + len(clause_text) if start >= 0 else -1

                        all_clauses.append(ExtractedClause(
                            clause_type=item["clause_type"],
                            text=clause_text,
                            start_offset=max(0, start),
                            end_offset=max(0, end),
                            confidence=float(item.get("confidence", 0.8)),
metadata={"method": "llm", "model": "gpt-4"}
                        ))

        except Exception as e:
            logger.error(f"LLM extraction failed for chunk: {e}")
            continue

    # Deduplicate clauses by type + first 80 chars
    seen = set()
    deduped_clauses = []
    for clause in all_clauses:
        key = (clause.clause_type, clause.text[:80])
        if key not in seen:
            seen.add(key)
            deduped_clauses.append(clause)

    return deduped_clauses


def merge_clauses(regex_clauses: List[ExtractedClause], llm_clauses: List[ExtractedClause]) -> List[ExtractedClause]:
    """
    Merge and deduplicate clauses from regex and LLM extraction.
    Prefer LLM results when overlapping.
    """
    result = []
    used_ranges = set()
    
    # Add LLM clauses first (higher priority)
    for clause in llm_clauses:
        range_key = (clause.start_offset // 200, clause.end_offset // 200)
        if range_key not in used_ranges:
            result.append(clause)
            used_ranges.add(range_key)
    
    # Add regex clauses that don't overlap
    for clause in regex_clauses:
        range_key = (clause.start_offset // 200, clause.end_offset // 200)
        if range_key not in used_ranges:
            result.append(clause)
            used_ranges.add(range_key)
    
    # Sort by position
    result.sort(key=lambda c: c.start_offset)
    
    return result


@router.post("", response_model=ClauseExtractResponse)
async def extract_clauses(
    request: Request,
    body: ClauseExtractRequest
) -> ClauseExtractResponse:
    """
    Extract legal clauses from document text.
    
    Uses a hybrid approach:
    1. Fast regex-based detection for initial matches
    2. LLM refinement for higher accuracy (if Ollama available)
    
    Returns all supported India clause types plus compatibility aliases for inherited clients.
    """
    settings = request.app.state.settings
    
    if not body.text:
        raise HTTPException(status_code=400, detail="No text provided")
    
    # Determine which clause types to extract
    clause_types = body.extract_types or CLAUSE_TYPES
    invalid_types = [t for t in clause_types if t not in CLAUSE_TYPES]
    if invalid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid clause types: {invalid_types}"
        )
    
    # First pass: regex extraction
    regex_clauses = extract_clauses_regex(body.text, clause_types)
    logger.info(f"Regex extraction found {len(regex_clauses)} clauses")
    
    # Second pass: LLM extraction (if available and text is reasonable size)
    llm_clauses = []
    if len(body.text) < 100000:  # Only for documents under 100k chars
        try:
            llm_clauses = await extract_clauses_llm(
                body.text,
                clause_types,
                settings,
            )
            logger.info(f"LLM extraction found {len(llm_clauses)} clauses")
        except Exception as e:
            logger.warning(f"LLM extraction skipped: {e}")
    
    # Merge results
    if llm_clauses:
        final_clauses = merge_clauses(regex_clauses, llm_clauses)
        method = "hybrid"
    else:
        final_clauses = regex_clauses
        method = "regex"
    
    # Build explanation for transparency
    explanation = explain_clause_extraction(
        clauses=[
            {
                "id": c.metadata.get("clause_id", f"clause-{i}"),
                "type": c.clause_type,
                "excerpt": c.text[:200] + "..." if len(c.text) > 200 else c.text,
                "page": c.metadata.get("page_number"),
                "relevance": c.confidence,
            }
            for i, c in enumerate(final_clauses)
        ],
        document_type="legal_contract",
    )

    return ClauseExtractResponse(
        document_id=body.document_id,
        clauses=final_clauses,
        total_found=len(final_clauses),
        extraction_method=method,
        explanation=explanation,
    )
