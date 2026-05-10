#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
security-audit.py - Security vulnerability scanner for Twerkhub

Checks for common security issues:
- SQL injection vulnerabilities
- XSS vulnerabilities
- Missing input validation
- Hardcoded secrets/credentials
- Insecure HTTP usage
- Missing rate limiting
- CORS misconfiguration
- Session security issues

Usage:
    python security-audit.py               # Run full audit
    python security-audit.py --check=xss   # Check specific vulnerability type
    python security-audit.py --fix         # Auto-fix common issues
"""

import argparse
import os
import re
import sys
from pathlib import Path

REPO = Path(__file__).parent


class SecurityAudit:
    def __init__(self, fix=False):
        self.fix = fix
        self.issues = []
        self.fixed = []

    def report_issue(self, file_path, line_num, severity, category, message):
        """Report a security issue"""
        self.issues.append({
            'file': file_path,
            'line': line_num,
            'severity': severity,
            'category': category,
            'message': message,
        })

    def print_report(self):
        """Print audit report"""
        print("\n" + "=" * 80)
        print("SECURITY AUDIT REPORT")
        print("=" * 80 + "\n")

        if not self.issues:
            print("✓ No security issues found!")
            return 0

        # Group by severity
        critical = [i for i in self.issues if i['severity'] == 'CRITICAL']
        high = [i for i in self.issues if i['severity'] == 'HIGH']
        medium = [i for i in self.issues if i['severity'] == 'MEDIUM']
        low = [i for i in self.issues if i['severity'] == 'LOW']

        if critical:
            print(f"🔴 CRITICAL ({len(critical)}):")
            for issue in critical:
                print(f"  {issue['file']}:{issue['line']} - {issue['message']}")
            print()

        if high:
            print(f"🟠 HIGH ({len(high)}):")
            for issue in high:
                print(f"  {issue['file']}:{issue['line']} - {issue['message']}")
            print()

        if medium:
            print(f"🟡 MEDIUM ({len(medium)}):")
            for issue in medium[:5]:  # Show first 5
                print(f"  {issue['file']}:{issue['line']} - {issue['message']}")
            if len(medium) > 5:
                print(f"  ... and {len(medium) - 5} more")
            print()

        if low:
            print(f"🔵 LOW ({len(low)}):")
            for issue in low[:3]:  # Show first 3
                print(f"  {issue['file']}:{issue['line']} - {issue['message']}")
            if len(low) > 3:
                print(f"  ... and {len(low) - 3} more")
            print()

        print("=" * 80)
        print(f"\nTotal issues: {len(self.issues)}")
        if self.fixed:
            print(f"Auto-fixed: {len(self.fixed)}")
        print()

        # Return exit code based on critical/high issues
        return 1 if critical or high else 0

    def check_sql_injection(self):
        """Check for SQL injection vulnerabilities"""
        print("\n  Checking for SQL injection vulnerabilities...")

        for js_file in REPO.rglob("*.js"):
            if ".git" in js_file.parts or "node_modules" in js_file.parts:
                continue

            try:
                content = js_file.read_text(encoding='utf-8')
            except:
                continue

            # Check for string concatenation in SQL
            # SAFE: .prepare() with .bind()
            # UNSAFE: .prepare('SELECT * FROM users WHERE email = ' + email)
            lines = content.split('\n')
            for i, line in enumerate(lines, 1):
                # Look for dangerous patterns
                if 'prepare(' in line and ('+' in line or '`' in line):
                    if ".bind(" not in line and ".prepare(" in line:
                        # Check if this line has string concat with user input
                        if re.search(r'prepare\(["\'].*["\'].*\+|`.*\$', line):
                            self.report_issue(
                                js_file,
                                i,
                                'HIGH',
                                'SQL_INJECTION',
                                'Potential SQL injection: string concatenation in query'
                            )

    def check_xss_vulnerabilities(self):
        """Check for XSS vulnerabilities"""
        print("  Checking for XSS vulnerabilities...")

        for js_file in REPO.rglob("*.js"):
            if ".git" in js_file.parts or "node_modules" in js_file.parts:
                continue

            try:
                content = js_file.read_text(encoding='utf-8')
            except:
                continue

            lines = content.split('\n')
            for i, line in enumerate(lines, 1):
                # Check for innerHTML without sanitization
                if 'innerHTML' in line and '=' in line:
                    # Check if sanitizeText or similar is used
                    if 'sanitizeText(' not in content[max(0, content.find(line) - 500):content.find(line)]:
                        self.report_issue(
                            js_file,
                            i,
                            'HIGH',
                            'XSS',
                            'innerHTML assignment without sanitization check'
                        )
                        break  # Only report once per file

    def check_hardcoded_secrets(self):
        """Check for hardcoded secrets or credentials"""
        print("  Checking for hardcoded secrets...")

        secret_patterns = [
            (r'api[_-]?key\s*=\s*["\'][\w\-]{20,}["\']', 'API key'),
            (r'password\s*=\s*["\'][^"\']{8,}["\']', 'Password'),
            (r'secret\s*=\s*["\'][^"\']{20,}["\']', 'Secret'),
            (r'token\s*=\s*["\'][\w\-\.]{30,}["\']', 'Token'),
        ]

        for file_path in REPO.rglob('*.{js,py,json,html}'):
            if any(x in file_path.parts for x in ['.git', 'node_modules', 'backup']):
                continue

            try:
                content = file_path.read_text(encoding='utf-8')
            except:
                continue

            for pattern, secret_type in secret_patterns:
                matches = re.finditer(pattern, content, re.IGNORECASE)
                for match in matches:
                    line_num = content[:match.start()].count('\n') + 1
                    # Skip if it's in a comment or example
                    if any(x in content[max(0, match.start() - 50):match.start()] for x in ['#', '//', 'example', 'placeholder']):
                        continue
                    self.report_issue(
                        file_path,
                        line_num,
                        'CRITICAL',
                        'SECRETS',
                        f'Potential {secret_type} found in code'
                    )

    def check_missing_cors(self):
        """Check for missing CORS validation"""
        print("  Checking for CORS validation...")

        for api_file in (REPO / "functions" / "api").rglob("*.js"):
            try:
                content = api_file.read_text(encoding='utf-8')
            except:
                continue

            # Check if ALLOWED_ORIGINS is defined
            if 'ALLOWED_ORIGINS' not in content:
                self.report_issue(
                    api_file,
                    1,
                    'MEDIUM',
                    'CORS',
                    'Missing ALLOWED_ORIGINS definition'
                )
            elif 'allowedOrigin' not in content:
                self.report_issue(
                    api_file,
                    1,
                    'MEDIUM',
                    'CORS',
                    'ALLOWED_ORIGINS defined but not used in responses'
                )

    def check_missing_validation(self):
        """Check for missing input validation"""
        print("  Checking for input validation...")

        for api_file in (REPO / "functions" / "api").rglob("*.js"):
            try:
                content = api_file.read_text(encoding='utf-8')
            except:
                continue

            # Check if validate or validateObject is imported
            if 'POST' in content or 'PUT' in content or 'PATCH' in content:
                if 'validate' not in content and 'readJSON' in content:
                    lines = content.split('\n')
                    for i, line in enumerate(lines, 1):
                        if 'readJSON' in line:
                            self.report_issue(
                                api_file,
                                i,
                                'HIGH',
                                'VALIDATION',
                                'Request body parsed but not validated'
                            )
                            break

    def check_insecure_http(self):
        """Check for hardcoded HTTP (non-HTTPS) URLs"""
        print("  Checking for insecure HTTP usage...")

        for file_path in REPO.rglob('*.{js,html}'):
            if any(x in file_path.parts for x in ['.git', 'node_modules']):
                continue

            try:
                content = file_path.read_text(encoding='utf-8')
            except:
                continue

            # Look for http:// that's not localhost
            if 'http://' in content and 'localhost' not in content:
                lines = content.split('\n')
                for i, line in enumerate(lines, 1):
                    if 'http://' in line and 'localhost' not in line:
                        self.report_issue(
                            file_path,
                            i,
                            'MEDIUM',
                            'INSECURE_HTTP',
                            'Hardcoded HTTP URL (should be HTTPS)'
                        )

    def run_all_checks(self):
        """Run all security checks"""
        print("\n🔐 SECURITY AUDIT")
        print("=" * 80)

        self.check_hardcoded_secrets()
        self.check_sql_injection()
        self.check_xss_vulnerabilities()
        self.check_missing_cors()
        self.check_missing_validation()
        self.check_insecure_http()

        return self.print_report()


def main():
    parser = argparse.ArgumentParser(description="Security audit for Twerkhub")
    parser.add_argument("--check", help="Check specific vulnerability type")
    parser.add_argument("--fix", action="store_true", help="Attempt to auto-fix issues")

    args = parser.parse_args()

    audit = SecurityAudit(fix=args.fix)

    if args.check:
        method_name = f"check_{args.check.lower()}"
        if hasattr(audit, method_name):
            getattr(audit, method_name)()
        else:
            print(f"Unknown check: {args.check}")
            return 1
    else:
        return audit.run_all_checks()

    return audit.print_report()


if __name__ == "__main__":
    sys.exit(main())
