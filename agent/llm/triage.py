import json
from pydantic import ValidationError
from openai import OpenAI, APIConnectionError, APITimeoutError
from schemas.stix import StixIndicator

SYSTEM_PROMPT = """You are an expert SOC analyst. Your job is to extract indicators of compromise (IOCs) from raw logs.
You MUST output your result as a strictly formatted STIX 2.1 JSON object.

Rules:
1. "type" MUST be "indicator".
2. "spec_version" MUST be "2.1".
3. "id" MUST be a valid STIX UUIDv4 (e.g., indicator--12345678-1234-4234-8234-123456789012).
4. "created", "modified", and "valid_from" MUST be valid RFC3339 timestamps (e.g., 2026-08-13T20:00:00Z).
5. "indicator_types" MUST be a list of strings (e.g., ["malicious-activity"]).
6. "pattern" MUST be a valid STIX pattern (e.g., [ipv4-addr:value = '1.2.3.4']).
7. "pattern_type" MUST be "stix".
8. Do NOT add any extra fields or markdown formatting. Output ONLY raw JSON.
"""

def extract_threat(log_line: str, base_url: str = "http://localhost:11434/v1", api_key: str = "ollama", model: str = "llama3") -> StixIndicator:
    """
    Evaluates a raw log line and attempts to extract a STIX 2.1 Indicator.
    Uses bounded retries for validation errors and fast-fails for connection errors.
    """
    client = OpenAI(base_url=base_url, api_key=api_key, timeout=10.0)
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Analyze this log and extract the threat into STIX 2.1 JSON:\n{log_line}"}
    ]
    
    max_retries = 2
    for attempt in range(max_retries + 1):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.1
            )
            raw_output = response.choices[0].message.content
            
            # Attempt to parse and validate
            parsed_json = json.loads(raw_output)
            return StixIndicator(**parsed_json)
            
        except (APIConnectionError, APITimeoutError) as e:
            # Fast fail on connection errors, do not retry
            raise RuntimeError(f"LLM endpoint unreachable: {str(e)}")
            
        except (json.JSONDecodeError, ValidationError) as e:
            if attempt == max_retries:
                raise RuntimeError(f"LLM output failed validation {max_retries} times. Last error: {str(e)}\nRaw Output: {raw_output}")
            
            # Feed the error back to the model for the next attempt
            messages.append({"role": "assistant", "content": raw_output if 'raw_output' in locals() else "{}"})
            messages.append({
                "role": "user", 
                "content": f"Your previous output failed validation with the following error:\n{str(e)}\n\nPlease correct your output and provide ONLY valid STIX 2.1 JSON."
            })
