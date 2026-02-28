# Design: Update software-full template from validated code-builder

**Linear:** STU-130
**Date:** 2026-02-28
**Approach:** Faithful port of sandbox `code-builder` configs validated in production (run 791317db), targeting `templates/software-full/project/`.

---

## Context

The `software-full` template was created before the production validation sessions. The sandbox at `/home/arianeguay/dev/src/studio-sandbox/code-builder/.studio/` contains configs that ran end-to-end in production and fixed several failure modes. This work ports those fixes into the template.

---

## Architecture

The `feature-builder` pipeline remains a 4-stage flow:

```
on_pipeline_start: npm install + capture run_timestamp
  │
  ▼
brief-analysis (analyst / haiku)
  │
  ▼
implementation-plan (analyst / haiku)
  │
  ▼
[implementation-review group, max 3 iterations]
  ├── code-generation (coder / sonnet)
  └── qa-review (reviewer / sonnet)  ← separate agent, not analyst
  │
  ▼
publish-changes (publisher / sonnet)
```

Key invariants from validation:
- **Analyst and reviewer are distinct agents.** The analyst produces plans; the reviewer verifies code. Combining them caused the analyst to approve its own output.
- **`qa-review` never lists passing criteria.** The `issues` array contains only failing criteria. An empty array with `approved` is correct.
- **Coder must make at least one write tool call.** `required_tool_groups` enforces this, preventing theatrical responses that describe changes without making them.
- **Publisher checks current branch before checkout.** Avoids accidentally re-creating a branch that already exists.
- **`publish-changes` context includes `all_stage_outputs` only**, not `all_stage_tool_results`. Tool results from coding stages are large and cause token overflow in the publish context.

---

## Changes

### New files

| File | Description |
|---|---|
| `agents/reviewer.agent.yaml` | Strict QA agent (sonnet). Only reads files and verifies criteria. |
| `agents/publisher.agent.yaml` | Git workflow agent (sonnet). Branch → commit → push → PR/MR. |
| `contracts/publish-changes.contract.yaml` | Requires `summary`, `branch_name`, `pr_url`. Enforces git tool calls. |
| `tools/git.tool.yaml` | Git operations: status, checkout, commit, push, remote-url, create-pr, create-mr. |

### Modified files

**`agents/analyst.agent.yaml`**
- Model: sonnet → haiku (analysis doesn't need heavy reasoning)
- Remove QA responsibility from system prompt (analyst only plans, never reviews code)
- Add `repo_manager-list_files` tool
- System prompt aligned with sandbox version

**`agents/coder.agent.yaml`**
- Add `repo_manager-apply_patch` tool (preferred for targeted edits)
- System prompt: explicit instruction to not re-read files already in context; explicit group_feedback handling

**`contracts/code-generation.contract.yaml`**
- `required_tool_groups: [[repo_manager-write_file, repo_manager-apply_patch]]`
  (agent must call at least one; prevents theatrical non-edits)

**`contracts/qa-review.contract.yaml`**
- Remove `issues` from `required_fields` (was causing false rejections on correct code)
- Add `constraints` rule: if `issues` array is non-empty → rejected
- Add `failed`, `implementation_incomplete`, `approved_with_notes` to rejected_values

**`pipelines/feature-builder.pipeline.yaml`**
- Add `on_pipeline_start`: `npm install --silent` + `date` for `run_timestamp`
- `implementation-plan` context: `previous_stage_tool_results` → `all_stage_tool_results`
- `qa-review` stage: `agent: analyst` → `agent: reviewer`
- Add `publish-changes` stage at the end, context: `all_stage_outputs` only (no tool results)

---

## Out of scope

- `software` template (simple single-stage, stays as-is)
- `quick-edit` and `quick-fix` pipelines
- Linear-specific agents (`closer`, `fetcher`) and pipelines (`feature-builder-from-linear`)
- The `-cc` (claude-code) variants

---

## Acceptance criteria

- [ ] Analyst and reviewer are separate agents
- [ ] `qa-review` contract no longer triggers false rejections on correct code
- [ ] `code-generation` contract enforces at least one write tool call
- [ ] `publish-changes` stage exists with correct context (no tool results)
- [ ] Coder system prompt instructs against re-reading files already in context
- [ ] Publisher system prompt checks current branch before checkout
- [ ] `studio init --template software-full` generates a functional project
