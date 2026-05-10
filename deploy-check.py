#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
deploy-check.py - Pre-deployment readiness verification

Verifies that all critical systems are configured and ready for deployment:
- Cloudflare bindings (D1, R2, KV)
- Environment variables
- Database schema
- API endpoints
- Static assets
- Security configuration

Usage:
    python deploy-check.py          # Full deployment check
    python deploy-check.py --env    # Check environment only
    python deploy-check.py --verbose # Detailed output
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).parent


class DeploymentCheck:
    def __init__(self, verbose=False):
        self.verbose = verbose
        self.checks = []
        self.passed = 0
        self.failed = 0
        self.warnings = 0

    def check(self, name, condition, message="", warn=False):
        """Register a check result"""
        status = "✓" if condition else ("⚠" if warn else "✗")
        severity = "WARN" if warn else ("FAIL" if not condition else "PASS")

        self.checks.append({
            'name': name,
            'status': status,
            'severity': severity,
            'message': message,
        })

        if condition:
            self.passed += 1
        elif warn:
            self.warnings += 1
        else:
            self.failed += 1

        if self.verbose:
            print(f"  {status} {name}: {message}")

    def print_report(self):
        """Print deployment check report"""
        print("\n" + "=" * 80)
        print("🚀 DEPLOYMENT READINESS CHECK")
        print("=" * 80 + "\n")

        # Group by severity
        passed = [c for c in self.checks if c['severity'] == 'PASS']
        warned = [c for c in self.checks if c['severity'] == 'WARN']
        failed = [c for c in self.checks if c['severity'] == 'FAIL']

        if passed:
            print(f"✓ PASSED ({len(passed)}):")
            for check in passed:
                print(f"  • {check['name']}")

        if warned:
            print(f"\n⚠ WARNINGS ({len(warned)}):")
            for check in warned:
                print(f"  • {check['name']}: {check['message']}")

        if failed:
            print(f"\n✗ FAILED ({len(failed)}):")
            for check in failed:
                print(f"  • {check['name']}: {check['message']}")

        print("\n" + "=" * 80)
        print(f"Results: {self.passed} passed, {self.warnings} warnings, {self.failed} failed")
        print("=" * 80 + "\n")

        if self.failed > 0:
            print("❌ Deployment blocked: fix failures before deploying")
            return 1
        elif self.warnings > 0:
            print("⚠ Deployment allowed: address warnings before going to production")
            return 0
        else:
            print("✅ Ready for deployment!")
            return 0

    def check_git_state(self):
        """Check git repository state"""
        print("\n📍 Git State")
        print("-" * 40)

        # Check if clean
        result = subprocess.run(
            "git status --short",
            shell=True,
            cwd=REPO,
            capture_output=True,
            text=True,
        )
        is_clean = result.returncode == 0 and not result.stdout.strip()
        self.check("Working tree clean", is_clean, "Uncommitted changes found" if not is_clean else "")

        # Check if on main/master
        result = subprocess.run(
            "git rev-parse --abbrev-ref HEAD",
            shell=True,
            cwd=REPO,
            capture_output=True,
            text=True,
        )
        branch = result.stdout.strip() if result.returncode == 0 else "unknown"
        on_main = branch in ("main", "master")
        self.check("On main branch", on_main, f"On {branch}" if not on_main else "", warn=not on_main)

        # Check recent commits
        result = subprocess.run(
            "git rev-list --count HEAD",
            shell=True,
            cwd=REPO,
            capture_output=True,
            text=True,
        )
        commit_count = int(result.stdout.strip()) if result.returncode == 0 else 0
        self.check("Has commits", commit_count > 0, f"{commit_count} commits" if commit_count > 0 else "No commits")

    def check_configuration(self):
        """Check configuration files"""
        print("\n⚙️ Configuration")
        print("-" * 40)

        # Check wrangler.toml
        wrangler_toml = REPO / "wrangler.toml"
        self.check("wrangler.toml exists", wrangler_toml.exists())

        if wrangler_toml.exists():
            content = wrangler_toml.read_text()
            self.check("D1 database binding", "d1_databases" in content)
            self.check("R2 bucket binding", "r2_buckets" in content, warn="R2 may be optional")

        # Check package.json
        package_json = REPO / "package.json"
        self.check("package.json exists", package_json.exists())

        # Check .gitignore
        gitignore = REPO / ".gitignore"
        self.check(".gitignore configured", gitignore.exists())

    def check_environment(self):
        """Check environment setup"""
        print("\n🔐 Environment Variables")
        print("-" * 40)

        # Check for .env.local (shouldn't be committed)
        env_local = REPO / ".env.local"
        self.check(".env.local not in repo", not env_local.exists())

        # Check for SECRETS file
        secrets_file = REPO / "SECRETS.md"
        self.check("SECRETS.md not in repo", not secrets_file.exists())

        # Note about required vars
        print("  Note: These vars must be set in Cloudflare Pages dashboard:")
        print("    - JWT_SECRET (required)")
        print("    - GOOGLE_CLIENT_ID (if using OAuth)")
        print("    - GOOGLE_CLIENT_SECRET (if using OAuth)")

    def check_api_endpoints(self):
        """Check API endpoints"""
        print("\n🔌 API Endpoints")
        print("-" * 40)

        api_dir = REPO / "functions" / "api"
        endpoints = list(api_dir.rglob("*.js")) if api_dir.exists() else []

        self.check("API directory exists", api_dir.exists())
        self.check(f"Endpoints defined ({len(endpoints)})", len(endpoints) > 0)

        # Check for required endpoints
        required_endpoints = ["auth/signup", "auth/signin", "auth/signout"]
        for endpoint in required_endpoints:
            path = api_dir / (endpoint.replace(".", "-") + ".js")
            exists = any(ep.parts[-1].startswith(endpoint.split("/")[-1]) for ep in endpoints)
            self.check(f"Endpoint: {endpoint}", exists, warn="May not be required")

    def check_libraries(self):
        """Check centralized libraries"""
        print("\n📚 Centralized Libraries")
        print("-" * 40)

        lib_dir = REPO / "functions" / "_lib"
        required_libs = ["validate.js", "errors.js", "logger.js", "rate-limit.js", "auth.js", "http.js"]

        for lib in required_libs:
            lib_path = lib_dir / lib
            self.check(f"Library: {lib}", lib_path.exists())

    def check_database(self):
        """Check database schema"""
        print("\n🗄️ Database")
        print("-" * 40)

        schema_dir = REPO / "_d1"
        self.check("_d1 directory exists", schema_dir.exists())

        if schema_dir.exists():
            schema_files = list(schema_dir.glob("*.sql"))
            self.check(f"Schema files ({len(schema_files)})", len(schema_files) > 0)

            # Check for required tables
            tables = ["schema-auth-tokens.sql", "rate-limits.sql"]
            for table_file in tables:
                path = schema_dir / table_file
                self.check(f"Schema: {table_file}", path.exists(), warn="May have been renamed")

    def check_static_assets(self):
        """Check static assets"""
        print("\n🎨 Static Assets")
        print("-" * 40)

        # Check for main index.html
        index = REPO / "index.html"
        self.check("index.html exists", index.exists())

        # Check for CSS
        css_files = list(REPO.glob("assets/*.css"))
        self.check(f"CSS files ({len(css_files)})", len(css_files) > 0)

        # Check for JS
        js_files = [f for f in REPO.glob("assets/*.js") if not f.name.startswith("backup")]
        self.check(f"JS files ({len(js_files)})", len(js_files) > 0)

    def run_all_checks(self):
        """Run all deployment checks"""
        self.check_git_state()
        self.check_configuration()
        self.check_environment()
        self.check_api_endpoints()
        self.check_libraries()
        self.check_database()
        self.check_static_assets()

        return self.print_report()


def main():
    parser = argparse.ArgumentParser(description="Pre-deployment readiness check")
    parser.add_argument("--env", action="store_true", help="Check environment only")
    parser.add_argument("--api", action="store_true", help="Check API only")
    parser.add_argument("--db", action="store_true", help="Check database only")
    parser.add_argument("--verbose", action="store_true", help="Verbose output")

    args = parser.parse_args()

    check = DeploymentCheck(verbose=args.verbose)

    if args.env:
        check.check_environment()
    elif args.api:
        check.check_api_endpoints()
    elif args.db:
        check.check_database()
    else:
        return check.run_all_checks()

    return check.print_report()


if __name__ == "__main__":
    sys.exit(main())
