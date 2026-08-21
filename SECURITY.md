# Security Policy

## Reporting a Vulnerability

Please do not publicly disclose a security vulnerability before it can be reviewed.

For now, use GitHub's private vulnerability reporting feature if it is enabled for the repository. Otherwise, open a minimal issue asking for a private contact method without including exploit details.

## Scope

Security-sensitive areas include:

- Content-script interaction with page DOM
- URL handling
- New-tab creation
- Extension settings storage
- Permission changes
- Injection or execution of page-controlled strings

Fuzzy Links intentionally avoids requesting broad permissions beyond those required for its core behavior.
