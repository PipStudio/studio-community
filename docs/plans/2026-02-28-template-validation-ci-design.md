# Template Validation CI — Design

**Date:** 2026-02-28
**Status:** Approved

## Problem

Templates contain YAML files with cross-references (pipelines → agents/contracts, agents → tools). Currently no CI prevents broken templates from being merged.

## Solution

A standalone Node.js validation script run by a GitHub Actions workflow on PRs that touch `templates/**`.

## New Files

### `.github/workflows/validate-templates.yml`

- **Trigger:** `pull_request` targeting `main`, path filter `templates/**`
- **Runner:** `ubuntu-latest`, Node 22
- **Git depth:** `fetch-depth: 0` (required for `git diff origin/main...HEAD`)
- **Step:** `node scripts/validate-templates.mjs`
- **Outcome:** Fails the PR check on any validation error

### `scripts/validate-templates.mjs`

Self-contained script, no dependencies beyond `js-yaml` (already available via npm if needed, or use Node built-ins).

**Algorithm:**

1. `git diff --name-only origin/main...HEAD -- templates/` → collect changed files
2. Extract unique template names from paths (e.g. `templates/software-full/foo` → `software-full`)
3. For each changed template:
   - **Metadata** — `metadata.json` must exist and contain: `name`, `version`, `description`, `author`, `license`, `type`
   - **YAML syntax** — parse every `*.yaml` in `project/` recursively
   - **Pipeline cross-refs** (`*.pipeline.yaml`) — `stages` array required; each `agent`/`contract` ref must resolve to `project/agents/<name>.agent.yaml` or `project/contracts/<name>.contract.yaml`
   - **Agent cross-refs** (`*.agent.yaml`) — each tool in `tools:` must be a known builtin or have a corresponding `project/tools/<plugin>.tool.yaml`
   - **Skill non-empty** (`*.skill.md`) — non-empty content required
4. Print all errors grouped by file; exit 1 if any

**Builtin tool prefix detection** (mirrors `validate.ts` factory names):
Prefixes: `repo_manager-`, `shell-`, `search-`, `patch-`, `git-`

## CLAUDE.md Changes

Add to **Commandes** section:
```bash
node scripts/validate-templates.mjs   # validate templates (runs locally or in CI)
```

Add a **CI** section explaining that PRs touching `templates/**` trigger `validate-templates.yml`.

## Out of Scope

- Validating non-template package types (tools, pipelines, etc.)
- Integration/end-to-end validation
- Validating `inputs/` files
