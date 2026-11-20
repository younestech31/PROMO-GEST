#!/usr/bin/env python3
"""Keep the server-enforced security settings documented and consistent.

A security control that nobody can find in the configuration templates is, in
practice, not deployed. This check ties the runtime defaults in
src/PromoGest.Api/appsettings.json to the production templates and to the
documented environment variable names.

Exit codes: 0 = consistent, 1 = drift found.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

BASE_SETTINGS = REPO_ROOT / "src" / "PromoGest.Api" / "appsettings.json"
TEMPLATES = (
    REPO_ROOT / "deploy" / "linux" / "appsettings.Production.template.json",
    REPO_ROOT / "deploy" / "windows" / "appsettings.Production.template.json",
)
ENV_EXAMPLE = REPO_ROOT / ".env.example"
LINUX_ENV_TEMPLATE = REPO_ROOT / "deploy" / "linux" / "promogest.env.template"

# Settings that must exist with the same default everywhere.
REQUIRED_SECURITY_SETTINGS = {
    "RequireHttpsCookies": True,
    "SessionAbsoluteLifetimeHours": 12,
    "SessionIdleTimeoutMinutes": 30,
    "SessionTouchIntervalMinutes": 1,
    "TemporaryPasswordLifetimeHours": 24,
    "LoginRateLimitPermitLimit": 10,
}

# Bounds enforced by the application code, documented next to the key.
BOUNDS_NOTES = {
    "Security__LoginRateLimitPermitLimit": "1-100",
    "Security__SessionIdleTimeoutMinutes": "5-480",
}


def load_security(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    security = data.get("Security")
    if not isinstance(security, dict):
        raise SystemExit(f"{path.relative_to(REPO_ROOT)} has no Security section")
    return security


def main() -> int:
    problems: list[str] = []

    base = load_security(BASE_SETTINGS)
    for key, expected in REQUIRED_SECURITY_SETTINGS.items():
        if base.get(key) != expected:
            problems.append(
                f"{BASE_SETTINGS.relative_to(REPO_ROOT)}: Security:{key} is {base.get(key)!r}, expected {expected!r}"
            )

    documents = {"base": base}
    for template in TEMPLATES:
        security = load_security(template)
        documents[template.name] = security
        for key, expected in REQUIRED_SECURITY_SETTINGS.items():
            if security.get(key) != expected:
                problems.append(
                    f"{template.relative_to(REPO_ROOT)}: Security:{key} is {security.get(key)!r}, expected {expected!r}"
                )

    env_example = ENV_EXAMPLE.read_text(encoding="utf-8")
    linux_env = LINUX_ENV_TEMPLATE.read_text(encoding="utf-8")
    for name, bound in BOUNDS_NOTES.items():
        for document, label in ((env_example, ".env.example"), (linux_env, "deploy/linux/promogest.env.template")):
            if name not in document:
                problems.append(f"{label}: {name} is not documented")
            elif bound not in document.split(name, 1)[1][:400]:
                problems.append(f"{label}: {name} does not state its {bound} bound")

    for key in REQUIRED_SECURITY_SETTINGS:
        env_name = f"Security__{key}"
        if env_name not in env_example:
            problems.append(f".env.example: {env_name} is not documented")

    if problems:
        print("Security configuration drift:")
        for problem in problems:
            print(f"  - {problem}")
        return 1

    print(
        "Security configuration consistent: "
        f"{len(REQUIRED_SECURITY_SETTINGS)} settings across {len(documents)} JSON documents "
        "and 2 environment templates."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
