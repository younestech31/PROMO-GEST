#!/usr/bin/env python3
"""Surface failed .NET test results as GitHub Actions annotations.

GitHub stores job logs on a storage host that some review environments cannot
reach, and a failing assertion buried in a long TRX run is expensive to
diagnose from an exit code alone. Every failed ``UnitTestResult`` in the given
TRX file is re-emitted as an ``::error`` workflow command, which GitHub exposes
as a check-run annotation that is readable through the public API.

Usage: ``report-failed-tests.py <file.trx> [more.trx ...]``

The script never fails the build: the test step that produced the TRX has
already reported the failure. Unreadable files are reported, not raised.
"""

from __future__ import annotations

import sys
import xml.etree.ElementTree as ET
from pathlib import Path

NS = "{http://microsoft.com/schemas/VisualStudio/TeamTest/2010}"
MAX_MESSAGE = 1200


def _one_line(text: str) -> str:
    collapsed = " ".join((text or "").split())
    return collapsed[:MAX_MESSAGE] + ("…" if len(collapsed) > MAX_MESSAGE else "")


def report(path: Path) -> int:
    try:
        root = ET.parse(path).getroot()
    except (OSError, ET.ParseError) as error:
        print(f"::warning::could not read {path}: {error}")
        return 0

    definitions = {}
    for unit_test in root.iter(f"{NS}UnitTest"):
        test_id = unit_test.get("id")
        name = unit_test.get("name")
        method = unit_test.find(f"{NS}TestMethod")
        class_name = method.get("className") if method is not None else None
        if test_id and name:
            definitions[test_id] = (class_name or "", name)

    failures = 0
    for result in root.iter(f"{NS}UnitTestResult"):
        if (result.get("outcome") or "").lower() != "failed":
            continue
        failures += 1
        class_name, name = definitions.get(result.get("testId") or "", ("", result.get("testName") or "unknown"))
        message = ""
        output = result.find(f"{NS}Output")
        if output is not None:
            error_info = output.find(f"{NS}ErrorInfo")
            if error_info is not None:
                message_node = error_info.find(f"{NS}Message")
                stack_node = error_info.find(f"{NS}StackTrace")
                message = message_node.text if message_node is not None and message_node.text else ""
                if not message and stack_node is not None and stack_node.text:
                    message = stack_node.text
        print(f"::error title={name}::{class_name} — {_one_line(message)}")

    if failures == 0:
        print(f"no failed tests recorded in {path}")
    return failures


def main(argv: list[str]) -> int:
    paths = [Path(arg) for arg in argv[1:]]
    if not paths:
        print("usage: report-failed-tests.py <file.trx> [more.trx ...]", file=sys.stderr)
        return 2
    for path in paths:
        if path.is_file():
            report(path)
        else:
            print(f"::warning::TRX file missing: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
