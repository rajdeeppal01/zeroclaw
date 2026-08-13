# ZeroClaw: Problem Statement & Architectural Decisions

## The Problem
Enterprise threat intelligence sharing is broken. Organizations want to pool their knowledge (e.g., sharing malicious IPs and File Hashes caught by their WAFs) to create herd immunity. However, three critical bottlenecks prevent this:
1. **Data Privacy (HIPAA/SOC2):** Enterprises cannot legally send raw security logs to a third-party SaaS for analysis, as they contain PII and sensitive internal network structures.
2. **The "GIGO" Problem (Garbage In, Garbage Out):** If a compromised or hallucinating client submits bad intelligence (e.g., flagging `8.8.8.8` as malicious), it poisons the feed for every other enterprise, causing catastrophic self-inflicted Denial of Service across the entire syndicate.
3. **Identity & Authentication:** Threat feeds must be strictly authenticated so malicious actors cannot anonymously pump fake data into the syndicate.

## The ZeroClaw Solution
ZeroClaw is a pragmatic, production-ready enterprise threat intelligence syndicate that uses **OpenClaw (Autonomous AI)** for analysis at the edge, and **MISP/TAXII over mTLS** for secure distribution.

### 1. Edge Compute (Privacy Solved)
ZeroClaw solves the privacy bottleneck via a **Bring Your Own Compute (BYOC)** model. The OpenClaw agent and the LLM (e.g., Ollama/vLLM) run *locally* within the enterprise's isolated network. Raw logs are analyzed locally. Only the sanitized, structured threat metadata (STIX 2.1) ever leaves the boundary.

### 2. Pragmatic Trust (Identity Solved)
We abandoned complex ZK-SNARKs and Blockchains for proven enterprise standards. The Hub uses a strictly managed **Mutual TLS (mTLS)** architecture. Every client must authenticate via an X.509 certificate. A central Certificate Authority handles immediate revocation (CRL) if a client is compromised, acting as a real-time kill switch.

### 3. Human-in-the-Loop & Schema Validation (GIGO Solved)
ZeroClaw employs a defense-in-depth approach against semantic and structural prompt injection:
*   **Structural:** LLM outputs are piped through a strict Pydantic schema validator to ensure the agent outputs pristine STIX 2.1 Indicators, preventing code injection.
*   **Semantic:** The Hub enforces a **Network-Wide HITL (Human-in-the-Loop)**. The first time a novel threat is seen across the syndicate, a human analyst must approve it before it enters the automated blocking feed. Furthermore, client trust scores decay if their submissions are not corroborated by peers.
