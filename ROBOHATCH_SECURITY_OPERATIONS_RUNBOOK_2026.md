# RoboHatch Security Operations Runbook (2026)

Date: 2026-03-15
Purpose: Operational response playbook for common security events

## 1. Severity Tiers

SEV-1 (Critical)
- Active compromise suspected
- Unauthorized admin action detected
- Payment processing integrity at risk

SEV-2 (High)
- Sustained brute-force/auth abuse
- Repeated webhook replay attempts
- Malicious upload campaign detected

SEV-3 (Medium)
- Elevated 4xx/5xx rates without confirmed compromise
- Single suspicious event requiring triage

## 2. Immediate Incident Checklist

Within first 15 minutes:
- Confirm incident scope and blast radius
- Preserve logs and request IDs
- Identify affected endpoints and user segments
- Escalate to engineering owner and decision maker

Within first 30 minutes:
- Apply temporary containment controls (rate limit hardening, route disable where needed)
- Revoke suspect sessions/tokens if account compromise suspected
- Enable heightened logging if disabled

## 3. Event-Specific Playbooks

### A. Brute Force / Login Abuse

Signals:
- Spike in login failures by IP/user
- Repeated auth limiter triggers

Actions:
- Increase auth throttle strictness temporarily
- Block high-abuse IP ranges at edge/firewall
- Force password reset for targeted accounts if takeover suspected
- Review successful logins around abuse window

### B. Webhook Replay / Payment Fraud Attempt

Signals:
- Repeated webhook event IDs
- Signature-valid duplicates in short interval

Actions:
- Confirm deduplication behavior and no duplicate state transitions
- Raise temporary webhook limiter strictness
- Verify recent payment state transitions for anomalies
- Coordinate with payment provider support if signature anomalies persist

### C. Malicious Upload Burst

Signals:
- Upload limiter spikes
- Repeated signature validation failures

Actions:
- Tighten upload rate limiter and reduce max upload size if needed
- Flag and block abusive accounts/IPs
- Verify invalid-object deletion jobs/paths succeeded
- Audit recent uploaded object keys and access patterns

### D. Suspected Token Theft / Session Hijack

Signals:
- Impossible-travel login pattern
- Repeated refresh token failures followed by success from new IP

Actions:
- Revoke active refresh tokens for affected user(s)
- Force re-authentication
- Rotate secrets if large-scale compromise suspected
- Notify impacted users and track remediation confirmation

## 4. Logging and Evidence Collection

Capture:
- Event timestamps (UTC)
- Request IDs and endpoint paths
- User IDs (if authenticated)
- Source IP/user-agent where available
- Token/session lifecycle events

Rules:
- Do not expose secrets in logs
- Preserve raw evidence for post-incident review
- Keep an auditable timeline of actions taken

## 5. Containment Controls (Quick Toggles)

Potential temporary controls:
- Lower auth and upload rate limits
- Temporarily disable high-risk route(s)
- Require additional admin approval for sensitive state changes
- Increase timeout strictness for abusive traffic windows

## 6. Recovery and Validation

Before incident closure:
- Confirm abuse vector blocked
- Confirm no unauthorized data integrity changes remain
- Validate payment/order consistency
- Validate auth/session controls are stable
- Run focused build and runtime checks

## 7. Post-Incident Review Template

Capture:
- Root cause
- Exploit path
- Detection gap
- Time to detect and contain
- Customer impact summary
- Permanent corrective actions and owner
- Deadline and verification criteria

## 8. Security Automation Recommendations

CI pipeline checks:
- Runtime dependency audit gate
- Static policy checks for risky patterns
- Build/type checks for every PR
- Optional scheduled dynamic scan for critical endpoints

Alerting recommendations:
- Repeated auth failures
- Upload signature validation bursts
- Webhook replay/duplicate detections
- Sensitive admin action anomalies
