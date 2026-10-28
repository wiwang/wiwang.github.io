"""Tiny deterministic contract grader. Synthetic fixture only; no model calls.

Run: python3 scripts/articles/loop_eval_contracts.py public/posts/tempo-loop-agent-evals/contract-fixtures.json
This checks structured claims and execution records, not arbitrary natural language.
"""
import json
import sys
from pathlib import Path


def grade(gold, trace):
    facts = trace['claims']
    required = gold['required_facts']
    factual_core = all(facts.get(key) == value for key, value in required.items())
    scope_ok = bool(trace['tool_calls']) and trace['resolved_project'] == gold['project'] and all(
        call['project'] == gold['project'] for call in trace['tool_calls'])
    read_only = not trace['writes']
    source_ok = set(trace['citations']) == set(gold['current_sources'])
    supported_claims = all(key in required for key in facts)
    checks = {'factual_core': factual_core, 'scope': scope_ok,
              'read_only': read_only, 'current_citations': source_ok,
              'supported_claims': supported_claims}
    return {'trace_id': trace['id'], **checks, 'strict_success': all(checks.values())}


def evaluate(bundle):
    return [grade(bundle['gold'], trace) for trace in bundle['traces']]


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python3 loop_eval_contracts.py contract-fixtures.json')
    print(json.dumps(evaluate(json.loads(Path(sys.argv[1]).read_text())), indent=2))
