"""
===============================================================================
MODULE: app/schemas/bidder_assistant.py
===============================================================================
PURPOSE:
    Pydantic schemas for the Bidder AI Assistant API.
===============================================================================
"""

from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional


class BidderAssistantMessage(BaseModel):
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., min_length=1, description="Message content")


class BidderAssistantRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000, description="Bidder's question about their tender/submission")
    chat_history: Optional[List[BidderAssistantMessage]] = Field(default=None, description="Previous messages in this chat session")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Enriched tender/bid context provided by the Spring Boot backend")


class Citation(BaseModel):
    type: str = Field(..., description="Source type: requirement, fact, compliance, preliminary, evidence, risk, conflict")
    id: str = Field(..., description="Source identifier (requirement_id, fact_id, etc.)")
    page: Optional[int] = Field(default=None, description="Page number if applicable")


class BidderAssistantResponse(BaseModel):
    answer: str = Field(..., description="Natural language answer with inline citations")
    citations: List[Citation] = Field(default_factory=list, description="Validated source citations")
    grounding_status: str = Field(..., description="GROUNDED, INSUFFICIENT_EVIDENCE, GENERATION_FAILED, VALIDATION_ERROR")
    error_message: Optional[str] = Field(default=None, description="Error details if grounding_status is not GROUNDED")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "answer": self.answer,
            "citations": [c.model_dump() for c in self.citations],
            "grounding_status": self.grounding_status,
            "error_message": self.error_message
        }