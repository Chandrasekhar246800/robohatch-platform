# RoboHatch Security Case Study — From Vulnerable API to Production-Grade Platform

## 1. Introduction

RoboHatch is an e-commerce and custom manufacturing platform that combines a Next.js frontend with an Express/Node.js API, a MySQL database through Prisma, AWS S3 for file storage, and webhook-driven payment processing. The platform supports both traditional catalog purchases and custom 3D print workflows, including STL, OBJ, 3MF, and GCODE uploads.

As the platform expanded, its threat model changed materially. Early engineering decisions were optimized for product velocity, not adversarial resilience. This is typical in startup systems: routes are added quickly, file upload paths grow organically, and authentication starts simple before session management complexity increases. Over time, this created meaningful security debt across request validation, runtime safety, storage access patterns, and operational controls.

The hardening initiative described in this case study focused on moving from a functionally correct API to a production-safe service that can tolerate malformed input, abuse traffic, replay attempts, and operational drift. The objective was not just patching defects, but redesigning security controls as architecture-level guarantees.

## 2. Initial Risk Profile

The initial risk profile reflected common early-stage API weaknesses rather than a single catastrophic flaw. The major concern areas were:

- Command execution risk in backend utility flows.
- Upload acceptance logic that depended heavily on extension or MIME metadata.
- Session and token handling patterns that needed stronger lifecycle control.
- Dependency exposure and inconsistent auditing rigor.
- Incomplete abuse controls around sensitive and high-cost endpoints.

### Command injection and runtime safety risks

Certain backend workflows, especially around slicer orchestration, touched process execution and filesystem paths. These areas are inherently high-risk because they interact with the host runtime. Even without confirmed exploitation, the design risk was clear: command invocations and path handling needed to be treated as attack surfaces, not utility plumbing.

### Insecure file upload and content trust assumptions

The upload pipeline accepted complex file types and image assets. Early controls centered on expected extensions and MIME types. For untrusted uploads, this is insufficient: metadata can be spoofed, double-extension tricks are common, and payloads can carry unexpected content. Uploads needed layered validation with post-upload signature checks and strict rejection/cleanup behavior.

### Weak session lifecycle guarantees

The authentication model required stronger controls for compromised-token scenarios. Long-lived bearer sessions without robust revocation logic increase blast radius after credential theft or cookie exfiltration. A modern API handling authenticated browser traffic needed short access token lifetimes, rotated refresh tokens, and server-side revocation state.

### Dependency and supply-chain exposure

The project had normal ecosystem churn: transitive vulnerabilities, version drift, and inconsistent audit discipline between local and CI. The risk was not only known CVEs, but regression risk when teams moved quickly. Security checks needed to move from ad-hoc developer behavior into enforcement gates.

### Limited abuse controls

General rate limiting existed, but endpoint-specific protections were incomplete for auth, uploads, and webhook paths. As volume increases, this becomes both a security and reliability issue. Abuse controls had to become workload-aware and risk-aware, not globally uniform.

## 3. Security Hardening Strategy

The team used a layered strategy based on two principles:

- Prioritize exploitability and blast radius first.
- Convert one-off fixes into reusable platform controls.

The sequence was:

1. Eliminate high-risk runtime and input trust issues.
2. Strengthen identity/session architecture.
3. Harden upload and storage boundaries.
4. Add anti-abuse and replay protections.
5. Improve observability and response readiness.
6. Enforce security hygiene in CI/CD.

Rather than pursuing a single “security sprint” patch set, the work was staged so each layer reduced both immediate risk and future regression probability. For example, implementing structured logging was not treated as cosmetic refactoring; it was framed as incident response infrastructure. Similarly, adding presigned S3 URL flows was not just about access control correctness, but about eliminating long-lived object exposure patterns.

## 4. Key Security Improvements

### Command injection prevention

Runtime operations that could invoke system binaries were hardened by removing shell interpolation paths and constraining input-derived file handling. The architecture shifted toward argument-safe execution patterns and path validation guarantees. This reduced the risk of attacker-controlled input crossing trust boundaries into command execution semantics.

### Hardened upload pipeline

Upload hardening moved to defense in depth:

- strict field expectations,
- controlled extension policy,
- MIME checks,
- suspicious naming rejection,
- signature-level content validation after upload,
- automatic invalid-object cleanup.

For 3D files and images, object content trust is now established by file signature checks, not client-declared metadata. This addressed spoofing and reduced persistence of malicious payloads.

### Secure authentication and refresh token architecture

Authentication moved to short-lived access tokens and rotated refresh tokens with server-backed revocation state. Access tokens were reduced to 15 minutes. Refresh tokens are hashed at rest, persisted, rotated on use, and revocable. Logout and sensitive flows can invalidate refresh state directly.

This architecture materially improves post-compromise containment. A stolen access token has limited lifetime, and refresh token replay becomes detectable and containable through DB-backed token state transitions.

### CSRF protection for cookie-authenticated sessions

Because the platform supports browser cookie authentication, CSRF had to be addressed explicitly. A double-submit token model was implemented so state-changing requests must present a valid token correlation between cookie and request header. Exemptions were narrowly scoped for known non-browser integration paths.

This closed a major class of cross-site request forgery risk while preserving API usability for intended flows.

### Presigned object storage access

S3 access patterns were hardened by shifting to presigned URL delivery for object reads. Instead of exposing durable object references, the API now provides time-bounded signed access links. This limits unauthorized reuse windows and reduces impact of URL leakage.

### Rate limiting and abuse prevention

Rate limiting was redesigned as endpoint-aware policy:

- general API throttles,
- stricter auth limits,
- upload-specific limits,
- webhook-specific controls,
- bounded request sizes and pagination constraints,
- runtime timeout protections.

This reduced brute-force feasibility, flood amplification, and resource exhaustion vectors without over-throttling normal user behavior.

### Webhook replay protection

Webhook processing was hardened beyond signature verification by introducing replay-aware behavior and deduplication logic. Signature checks remain necessary but are not sufficient alone. Replay-aware controls reduce the risk of duplicate state transitions and payment lifecycle abuse.

### Structured logging and observability

Logging was migrated to structured pino-based events with redaction for sensitive fields. The key improvement was consistency: security-relevant events now produce machine-queryable context across auth, upload, and payment paths.

This improves incident triage speed, forensic confidence, and alerting quality.

### CI security gates

Security checks were elevated into CI enforcement through GitHub Actions gates that run on pull requests and protected branch pushes. Build validation and dependency audit thresholds now act as release blockers for unacceptable risk.

This changed security from “best effort” to a merge-time quality requirement.

## 5. Defense-in-Depth Architecture

The hardened design treats each trust boundary as independently defensible.

### Browser to API boundary

Controls include JWT cookie/session hardening, CSRF token enforcement for state-changing operations, origin-aware request handling, and route-level throttles. The goal is to prevent cross-site state manipulation and reduce credential abuse impact.

### API to storage boundary

Uploads are validated as untrusted input, and object retrieval is constrained through presigned URLs. Signature checks and invalid-file cleanup ensure storage cannot become a passive malware retention surface.

### API to payment webhook boundary

Webhook inputs are validated with signature checks, bounded by rate limits, and protected against replay/duplicate processing behavior. This boundary is designed to tolerate adversarial retries and forged traffic attempts.

### API to database boundary

The service enforces explicit query bounds, typed schema validation, and transactional session token state changes for refresh rotation/revocation. This reduces both data-layer abuse and logic inconsistencies under load.

### API to runtime environment

Runtime-facing operations are treated with high scrutiny: constrained command invocation patterns, path restrictions, and operational timeouts. This boundary aims to prevent untrusted request data from influencing host execution semantics.

## 6. Operational Security and Monitoring

Technical hardening alone is insufficient without operational readiness. RoboHatch now includes a security operations runbook that defines incident tiers, immediate response actions, evidence preservation expectations, and recovery validation steps.

Operational readiness improvements include:

- structured event streams for security-relevant actions,
- log redaction for secrets and sensitive attributes,
- clearer separation of high-severity and routine operational logs,
- repeatable incident handling steps for auth abuse, upload attacks, and webhook anomalies.

This lowers mean time to detect and mean time to contain by making response workflows explicit rather than tribal.

## 7. CI/CD Security Automation

Security automation is enforced through GitHub Actions as a first-line regression barrier. The workflow validates core build integrity and fails on dependency risk thresholds for high/critical findings.

This delivers three concrete benefits:

- Prevents known vulnerable dependency states from silently shipping.
- Ensures security-sensitive refactors still compile and integrate correctly.
- Moves security checks to PR-time, where fixes are cheaper and safer.

Most importantly, CI gates normalize secure delivery behavior across contributors. Security no longer depends on individual discipline at release time.

## 8. Results and Security Maturity

The hardening program reduced attack surface and improved resilience across identity, storage, webhook, and runtime boundaries. The platform now demonstrates characteristics of a production-grade API service:

- short-lived access sessions with revocable refresh lifecycle,
- CSRF controls aligned with cookie-authenticated browser traffic,
- hardened upload acceptance and retrieval model,
- replay-aware payment webhook processing,
- endpoint-aware anti-abuse controls,
- structured security telemetry,
- CI-level security quality gates.

From a maturity perspective, the biggest shift was architectural: security controls moved from isolated patches to coherent boundary protections backed by operational and automation guardrails.

## 9. Lessons Learned

Several engineering lessons emerged from the transformation:

- Security debt accumulates fastest at trust boundaries.
  Paths involving runtime execution, file ingestion, and external callbacks should be threat-modeled early.

- Metadata is not trust.
  Extension and MIME checks are useful, but signature validation and post-upload policy enforcement are essential for untrusted content.

- Token lifetime and revocation are inseparable.
  Short-lived access tokens without refresh-state control still leave containment gaps.

- Security controls must be workload-specific.
  Generic global throttles are insufficient for auth, upload, and webhook traffic classes.

- Observability is part of security architecture.
  Without structured, queryable logs, incident response degrades into guesswork.

- CI enforcement outperforms policy documents.
  Teams maintain security posture more reliably when gates block unsafe merges.

## 10. Future Improvements

The platform is materially stronger, but security maturity is iterative. Recommended next steps:

- Expand security monitoring into proactive anomaly detection for auth abuse and webhook patterns.
- Add scheduled penetration testing for upload, payment, and session flows.
- Introduce deeper static and dependency policy automation (for example, SARIF reporting and trend tracking).
- Add security-focused regression tests for CSRF, refresh rotation, and replay behavior.
- Continue reducing residual operational risk through periodic threat model refreshes tied to feature changes.

RoboHatch’s trajectory demonstrates a practical security engineering model: identify boundary risks, implement layered controls, operationalize detection and response, and enforce quality through automation. The result is not “perfect security,” but a platform with significantly improved resistance, containment, and recoverability under real production conditions.
