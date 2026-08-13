from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Literal, Optional

# Strict regex for STIX UUIDv4 (indicator--<uuid>)
STIX_ID_REGEX = r"^indicator--[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"

class StixIndicator(BaseModel):
    """
    A strict Pydantic model enforcing STIX 2.1 structural integrity.
    Configured to drop the payload (raise ValidationError) if the LLM hallucinates additional fields
    or fails to provide the exact expected data format.
    """
    type: Literal["indicator"] = "indicator"
    spec_version: Literal["2.1"] = "2.1"
    id: str = Field(..., pattern=STIX_ID_REGEX, description="Must be format indicator--<uuidv4>")
    created: datetime = Field(..., description="Creation time in RFC3339 format")
    modified: datetime = Field(..., description="Modification time in RFC3339 format")
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    indicator_types: List[str] = Field(..., min_length=1)
    pattern: str = Field(..., description="The STIX pattern, e.g., [ipv4-addr:value = '198.51.100.1']")
    pattern_type: Literal["stix"] = "stix"
    valid_from: datetime = Field(..., description="Valid from time in RFC3339 format")

    class Config:
        # Crash violently if structural prompt injection tries to add unexpected keys
        extra = "forbid" 
