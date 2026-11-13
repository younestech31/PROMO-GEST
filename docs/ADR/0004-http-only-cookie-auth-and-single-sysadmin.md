# ADR-0004: HTTP-Only Session Cookies & Single System Administrator

## Status
Accepted

## Context
Storing bearer tokens in browser `localStorage` exposes credentials to XSS, and allowing multiple unrestricted super-admins weakens accountability.

## Decision
Authentication uses opaque 256-bit tokens stored as `SHA-256` hashes in PostgreSQL `user_sessions` and delivered via `HttpOnly; SameSite=Strict` cookies. Exactly one System Administrator account is permitted per installation, enforced at both domain/application layers and PostgreSQL partial unique index level, created solely through the one-time First-Run Installation Wizard.

## Consequences
- Immediate session revocation when an employee is deactivated or password-reset.
- Zero default hard-coded credentials in the codebase or seed scripts.
