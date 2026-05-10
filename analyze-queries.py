#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
analyze-queries.py - Database query analyzer and optimizer recommendations

Scans API endpoints for database queries and provides optimization recommendations.
Identifies N+1 queries, missing indexes, and inefficient patterns.

Usage:
    python analyze-queries.py                    # Full analysis
    python analyze-queries.py --endpoint=comments # Analyze specific endpoint
    python analyze-queries.py --fix              # Generate optimization SQL
"""

import argparse
import re
import sys
from pathlib import Path

REPO = Path(__file__).parent


class QueryAnalyzer:
    def __init__(self):
        self.findings = []
        self.queries = {}

    def analyze_file(self, file_path):
        """Analyze a single endpoint for database queries"""
        try:
            content = file_path.read_text(encoding='utf-8')
        except:
            return

        endpoint_name = file_path.relative_to(REPO)

        # Find all .prepare() calls
        prepare_pattern = r'\.prepare\(["\']([^"\']+)["\']\)'
        queries = re.findall(prepare_pattern, content)

        if not queries:
            return

        self.queries[str(endpoint_name)] = queries

        # Check for N+1 query patterns
        self._check_n_plus_1(endpoint_name, content, queries)

        # Check for missing indexes
        self._check_indexes(endpoint_name, queries)

        # Check for inefficient patterns
        self._check_inefficient_patterns(endpoint_name, content, queries)

    def _check_n_plus_1(self, endpoint_name, content, queries):
        """Check for N+1 query patterns"""
        # Look for loops with DB queries
        loop_with_query = re.search(
            r'for\s*\([^)]*\)\s*{[^}]*\.prepare\(',
            content,
            re.DOTALL
        )

        if loop_with_query:
            self.findings.append({
                'file': endpoint_name,
                'severity': 'HIGH',
                'type': 'N+1_QUERY',
                'message': 'Possible N+1 query: DB query inside loop',
                'recommendation': 'Fetch all data at once using JOIN or IN clause',
            })

        # Look for sequential queries without batching
        if len(queries) > 2:
            all_sequential = True
            for i, query in enumerate(queries):
                if i > 0 and 'WHERE' not in query:
                    all_sequential = False
            if all_sequential:
                self.findings.append({
                    'file': endpoint_name,
                    'severity': 'MEDIUM',
                    'type': 'SEQUENTIAL_QUERIES',
                    'message': f'Multiple sequential queries ({len(queries)})',
                    'recommendation': 'Consider batching with JOINs or use transactions',
                })

    def _check_indexes(self, endpoint_name, queries):
        """Check for queries that might benefit from indexes"""
        common_indexed_fields = {
            'email': 'idx_users_email',
            'user_id': 'idx_*_user_id',
            'video_id': 'idx_*_video_id',
            'window_start': 'idx_rate_limits_window',
            'status': 'idx_*_status',
        }

        for query in queries:
            for field, index_name in common_indexed_fields.items():
                if f'WHERE {field}' in query or f'WHERE\n' in query:
                    if field not in str(endpoint_name):
                        self.findings.append({
                            'file': endpoint_name,
                            'severity': 'LOW',
                            'type': 'POSSIBLE_INDEX',
                            'message': f'Query filters on {field}',
                            'recommendation': f'Verify {index_name} index exists',
                        })

    def _check_inefficient_patterns(self, endpoint_name, content, queries):
        """Check for inefficient query patterns"""
        # Check for SELECT * without LIMIT
        for query in queries:
            if 'SELECT *' in query and 'LIMIT' not in query:
                self.findings.append({
                    'file': endpoint_name,
                    'severity': 'MEDIUM',
                    'type': 'UNBOUNDED_SELECT',
                    'message': 'SELECT * without LIMIT could return too much data',
                    'recommendation': 'Add LIMIT clause or select specific columns',
                })

            # Check for OR conditions that bypass indexes
            if ' OR ' in query:
                self.findings.append({
                    'file': endpoint_name,
                    'severity': 'MEDIUM',
                    'type': 'OR_CONDITION',
                    'message': 'OR condition may not use indexes efficiently',
                    'recommendation': 'Consider using UNION of indexed queries',
                })

    def print_report(self):
        """Print analysis report"""
        print("\n" + "=" * 80)
        print("📊 DATABASE QUERY ANALYSIS")
        print("=" * 80)

        if not self.findings:
            print("\n✓ No issues found!")
            return 0

        # Group by severity
        critical = [f for f in self.findings if f['severity'] == 'CRITICAL']
        high = [f for f in self.findings if f['severity'] == 'HIGH']
        medium = [f for f in self.findings if f['severity'] == 'MEDIUM']
        low = [f for f in self.findings if f['severity'] == 'LOW']

        if critical:
            print(f"\n🔴 CRITICAL ({len(critical)}):")
            for finding in critical:
                print(f"  {finding['file']}")
                print(f"    Issue: {finding['message']}")
                print(f"    Fix: {finding['recommendation']}\n")

        if high:
            print(f"\n🟠 HIGH ({len(high)}):")
            for finding in high:
                print(f"  {finding['file']}")
                print(f"    Issue: {finding['message']}")
                print(f"    Fix: {finding['recommendation']}\n")

        if medium:
            print(f"\n🟡 MEDIUM ({len(medium)}):")
            for finding in medium[:5]:
                print(f"  {finding['file']}: {finding['message']}")
            if len(medium) > 5:
                print(f"  ... and {len(medium) - 5} more")

        if low:
            print(f"\n🔵 LOW ({len(low)}):")
            print(f"  {len(low)} minor recommendations")

        print("\n" + "=" * 80)
        print(f"\nTotal issues: {len(self.findings)}")
        print(f"Endpoints analyzed: {len(self.queries)}")
        print("=" * 80 + "\n")

        return 1 if high or critical else 0

    def print_queries(self):
        """Print all discovered queries"""
        print("\n" + "=" * 80)
        print("🔍 DISCOVERED QUERIES")
        print("=" * 80 + "\n")

        for endpoint, queries in sorted(self.queries.items()):
            print(f"{endpoint}:")
            for i, query in enumerate(queries, 1):
                print(f"  {i}. {query[:80]}{'...' if len(query) > 80 else ''}")
            print()

    def run_analysis(self):
        """Run full analysis on all endpoints"""
        api_dir = REPO / "functions" / "api"

        for endpoint_file in api_dir.rglob("*.js"):
            self.analyze_file(endpoint_file)

        return self.print_report()


def main():
    parser = argparse.ArgumentParser(description="Database query analyzer")
    parser.add_argument("--endpoint", help="Analyze specific endpoint")
    parser.add_argument("--verbose", action="store_true", help="Show all queries")
    parser.add_argument("--fix", action="store_true", help="Generate optimization SQL")

    args = parser.parse_args()

    analyzer = QueryAnalyzer()

    if args.endpoint:
        api_dir = REPO / "functions" / "api"
        for file in api_dir.rglob("*.js"):
            if args.endpoint in str(file):
                analyzer.analyze_file(file)
    else:
        analyzer.run_analysis()

    if args.verbose:
        analyzer.print_queries()

    return analyzer.print_report()


if __name__ == "__main__":
    sys.exit(main())
