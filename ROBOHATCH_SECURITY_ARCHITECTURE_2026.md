# RoboHatch Security Architecture (2026)

Date: 2026-03-15
System: Web frontend + API backend + MySQL + S3 + payment gateway webhooks

## 1. Security Architecture Goals

Primary goals:
- Prevent account/session compromise
- Prevent command injection and remote code execution
- Prevent upload abuse and malicious file persistence
- Prevent payment replay and duplicate processing
- Minimize sensitive data exposure
- Improve observability and incident response readiness

## 2. Trust Boundaries

Boundary A: Browser client to API
- Risks: CSRF, token misuse, input tampering
- Controls: short access token life, refresh rotation, origin checks, rate limits

Boundary B: API to storage (S3)
- Risks: object exposure, unsafe upload content
- Controls: signed URL delivery, post-upload signature checks, invalid object deletion

Boundary C: API to payment webhook source
- Risks: replay, flood, duplicate transaction state changes
- Controls: signature verification, rate limiting, event ID replay suppression

Boundary D: API to DB
- Risks: abuse via unbounded queries, authz mismatch
- Controls: pagination caps, strict route guards, consistent auth identity handling

Boundary E: API to host runtime
- Risks: shell command injection
- Controls: argument-safe process invocation and strict path validation

## 3. Authentication and Session Model

Model:
- Access token: short TTL (15m)
- Refresh token: longer TTL, rotated on use
- Refresh persistence: hashed refresh tokens stored in DB
- Revocation: logout and security flows invalidate refresh entries

Security properties:
- Reduced stolen-token usefulness window
- Stateful invalidation available
- Rotation limits replay longevity

## 4. Authorization Model

Route-level controls:
- Authenticated endpoints guarded with auth middleware
- Sensitive/admin operations guarded with admin middleware
- High-risk routes isolated from public access

Design principle:
- Deny-by-default for operational endpoints (slicing, admin actions, protected order updates)

## 5. Upload Security Model

Layered controls:
- Field name constraints
- Allowed extension list
- MIME validation
- Double-extension rejection for dangerous names
- Signature/magic-byte checks on object bytes from storage
- Invalid object cleanup
- Upload rate limiting

Rationale:
- No single check is reliable; layered checks reduce bypass probability

## 6. Data Exposure Controls

Controls:
- Presigned object URLs for asset access
- Reduced sensitive error payload leakage
- Secret requirements enforced at startup for auth cryptography

Outcome:
- Less direct object enumeration risk
- Safer client-visible failure surfaces

## 7. Abuse and Availability Protections

Controls:
- General and endpoint-specific rate limits
- Auth throttling
- Upload throttling
- Webhook burst limiting
- Request/body limits
- Pagination caps
- Server request/header/keepalive timeouts

Outcome:
- Better resilience against brute-force, flood, slow-client, and over-fetch patterns

## 8. Logging and Security Telemetry

Current state:
- Structured logging introduced with sensitive-field redaction
- Security-relevant events partially migrated to structured format

Recommended completion:
- Migrate remaining console logs to structured events
- Standardize event names, context keys, and severity usage

## 9. Residual Risks and Next Security Milestones

Residual risks:
- CSRF protection is currently intermediate (origin/referer gate)
- Structured logging migration incomplete in some modules
- Dev dependency advisory cleanup pending

Next milestones:
- Implement full double-submit CSRF token
- Complete structured logging migration
- Add CI security gates and policy thresholds
- Finalize migration-chain consistency in privileged environment

## 10. Verification Practices

Current verification:
- Build/type checks after security edits
- Production dependency audit focused on runtime risk

Recommended expansion:
- Security regression tests for auth/refresh/logout/CSRF
- Automated abuse tests for upload/webhook throttling
- Periodic adversarial reviews of route protection matrix
