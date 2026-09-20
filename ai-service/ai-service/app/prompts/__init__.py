"""
===============================================================================
MODULE: app/prompts/__init__.py
===============================================================================
PURPOSE:
    Package initializer for LLM prompt templates used in Phase 2 & Phase 3.
===============================================================================
"""

from app.prompts.requirement_extraction_prompt import (
    REQUIREMENT_EXTRACTION_SYSTEM_PROMPT,
    build_requirement_extraction_prompt,
)
from app.prompts.bidder_document_prompt import (
    BIDDER_DOCUMENT_ANALYSIS_SYSTEM_PROMPT,
    build_bidder_document_prompt,
)

__all__ = [
    "REQUIREMENT_EXTRACTION_SYSTEM_PROMPT",
    "build_requirement_extraction_prompt",
    "BIDDER_DOCUMENT_ANALYSIS_SYSTEM_PROMPT",
    "build_bidder_document_prompt",
]
