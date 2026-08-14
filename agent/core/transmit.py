import requests
from schemas.stix import StixIndicator

def transmit_threat(indicator: StixIndicator, url: str, cert_path: str, key_path: str, ca_bundle: str = None):
    """
    Transmits a validated STIX Indicator to the Hub using mTLS authentication.
    Includes an explicit timeout to prevent hanging if the Hub is unreachable.
    """
    # For a production deployment, ca_bundle should point to the CA that signed the Hub's cert.
    verify_cert = ca_bundle if ca_bundle else False

    try:
        response = requests.post(
            url,
            json=indicator.model_dump(mode="json", exclude_none=True),
            cert=(cert_path, key_path),
            verify=verify_cert,
            timeout=5.0  # Explicit timeout as requested
        )
        
        # Explicit error mapping based on Hub API specs
        if response.status_code == 400:
            raise RuntimeError(f"Rejected — Schema Error: {response.text}")
        elif response.status_code in (403, 429):
            raise RuntimeError(f"Rejected — Quarantined: The Hub quarantined this client. {response.text}")
        elif response.status_code >= 500:
            raise RuntimeError(f"Hub Unreachable — Server Error: {response.text}")
            
        response.raise_for_status()
        return response.json()
        
    except requests.exceptions.Timeout:
        raise RuntimeError(f"Transmission timed out after 5.0 seconds (Hub unreachable at {url})")
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Failed to transmit to Hub: {str(e)}")

