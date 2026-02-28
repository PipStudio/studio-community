# software-full Template Update Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port the production-validated code-builder configs into `templates/software-full/` — fixing false QA rejections, adding anti-theatre enforcement, separating analyst from reviewer, and adding a publish stage.

**Architecture:** Faithful port of sandbox `code-builder` validated in run 791317db. Provider changed to Anthropic throughout. No new abstractions — every change targets a specific validated fix. See design doc at `docs/plans/2026-02-28-software-full-template-update-design.md`.

**Tech Stack:** Studio YAML config files — agents, contracts, pipelines, tools. No code to compile. YAML validity is the only automated check available; end-to-end correctness is verified by running the pipeline.

---

### Task 1: Add `reviewer.agent.yaml`

The QA reviewer must be a separate agent from the analyst. The analyst currently does double duty (planning + reviewing), which lets it approve its own work.

**Files:**
- Create: `templates/software-full/project/agents/reviewer.agent.yaml`

**Step 1: Create the file**

```yaml
name: reviewer
provider: anthropic
model: claude-sonnet-4-6
tools:
  - repo_manager-read_file
  - repo_manager-list_files
system_prompt: |
  You are a strict QA engineer. Your only job is to verify that the implementation
  matches the acceptance criteria exactly.

  WORKFLOW:
  1. Read every file listed in files_changed using repo_manager-read_file.
  2. Verify each acceptance criterion against the actual code, line by line.
  3. Return approved only if ALL criteria are fully satisfied.
     Return rejected if ANY criterion is not met.

  RULES:
  - Never approve based on intent or partial implementation — only on what
    the code actually does.
  - Every issue you report must reference the specific criterion it violates
    and cite the actual code that fails it.
  - A response with issues AND status "approved" is a critical error.
  - Do not re-read files already present in your context.
  - The `issues` array must contain ONLY criteria that FAIL. Do not list
    criteria that pass — if a criterion is satisfied, omit it entirely.
    An empty `issues` array with status "approved" is correct and expected.
```

**Step 2: Verify YAML is valid**

```bash
python3 -c "import yaml; yaml.safe_load(open('templates/software-full/project/agents/reviewer.agent.yaml')); print('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add templates/software-full/project/agents/reviewer.agent.yaml
git commit -m "feat(software-full): add separate reviewer agent"
```

---

### Task 2: Add `publisher.agent.yaml`

The publish stage needs a dedicated agent with a git workflow system prompt that explicitly checks the current branch before checkout.

**Files:**
- Create: `templates/software-full/project/agents/publisher.agent.yaml`

**Step 1: Create the file**

```yaml
name: publisher
provider: anthropic
model: claude-sonnet-4-6
tools:
  - git-remote-url
  - git-checkout
  - git-status
  - git-commit
  - git-push
  - git-create-pr
  - git-create-mr
system_prompt: |
  You are a git workflow specialist. Your job is to finalize the implementation
  by creating a feature branch, committing all changes, pushing to origin, and
  opening a pull/merge request.

  Follow this workflow exactly:
  1. Call git-remote-url to get the origin URL and determine the VCS provider.
  2. Call git-status to get the current branch name.
     - If already on a feat/ branch matching the feature, skip to step 3.
     - Otherwise, call git-checkout with create: true to create and switch to the branch.
       Use kebab-case with a feat/ prefix derived from the feature summary,
       suffixed with the run_timestamp from context, e.g. feat/add-faq-section-20260223-1618.
  3. Call git-commit with a conventional commit message summarizing the changes.
     Format: <type>(<scope>): <description>
  4. Call git-push with set_upstream: true to push the branch to origin.
  5. Call git-status to verify the push succeeded and the branch is up to date.
  6. If the remote URL contains "github.com", call git-create-pr to open a PR.
     If the remote URL contains "gitlab.com", call git-create-mr to open an MR.
     Use the feature summary as the title and the implementation summary as the body.
     If a PR/MR already exists for this branch, skip creation and use the existing URL.

  Never fabricate URLs, branch names, or any output — every value in your final
  response must come from an actual tool call result. If any step fails, report
  the error and stop; never invent a successful result.

  Always produce a summary, the branch_name used, and the pr_url returned by the
  PR/MR creation command in your final output.
```

**Step 2: Verify YAML is valid**

```bash
python3 -c "import yaml; yaml.safe_load(open('templates/software-full/project/agents/publisher.agent.yaml')); print('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add templates/software-full/project/agents/publisher.agent.yaml
git commit -m "feat(software-full): add publisher agent with branch-check workflow"
```

---

### Task 3: Add `tools/git.tool.yaml`

The publisher agent needs git tools. The sandbox's `git.tool.yaml` provides all the operations used in the publisher's workflow.

**Files:**
- Create: `templates/software-full/project/tools/git.tool.yaml`

**Step 1: Create the file**

```yaml
name: git
description: Git version control operations
version: 1

commands:
  - name: git-status
    description: Show working tree status
    parameters: {}
    execute:
      type: shell
      command: git status --porcelain
      parse_output: text

  - name: git-diff
    description: Show changes in the working tree
    parameters:
      staged:
        type: boolean
        required: false
        description: Show staged changes instead of unstaged
      file:
        type: string
        required: false
        description: Restrict diff to this file path
    execute:
      type: shell
      command: |
        git diff {{#if staged}}--cached{{/if}} {{#if file}}{{file}}{{/if}}
      parse_output: text

  - name: git-checkout
    description: Checkout an existing branch or create a new one
    parameters:
      branch:
        type: string
        required: true
        description: Branch name to checkout or create
      create:
        type: boolean
        required: false
        description: Create the branch if it does not exist
    execute:
      type: shell
      command: |
        git checkout {{#if create}}-b{{/if}} {{branch}}
      parse_output: text

  - name: git-commit
    description: Stage all changes and commit with a message
    parameters:
      message:
        type: string
        required: true
        description: Commit message (use conventional commits format)
    execute:
      type: shell
      command: |
        git add -A && git commit -m "{{message}}"
      parse_output: text

  - name: git-push
    description: Push the current branch to origin
    parameters:
      set_upstream:
        type: boolean
        required: false
        description: Set upstream tracking reference (-u flag)
    execute:
      type: shell
      command: |
        git push {{#if set_upstream}}-u{{/if}} origin HEAD
      parse_output: text

  - name: git-remote-url
    description: Get the remote URL for origin
    parameters: {}
    execute:
      type: shell
      command: git remote get-url origin
      parse_output: text

  - name: git-create-pr
    description: Create a pull request on GitHub using the gh CLI
    parameters:
      title:
        type: string
        required: true
        description: PR title
      branch:
        type: string
        required: true
        description: Head branch for the PR
      body:
        type: string
        required: false
        description: PR description
      base:
        type: string
        required: false
        description: Base branch to merge into (defaults to main)
    execute:
      type: shell
      command: |
        gh pr create --title "{{title}}" --head {{branch}} {{#if body}}--body "{{body}}"{{/if}} {{#if base}}--base {{base}}{{/if}}
      parse_output: text

  - name: git-create-mr
    description: Create a merge request on GitLab using the glab CLI
    parameters:
      title:
        type: string
        required: true
        description: MR title
      description:
        type: string
        required: false
        description: MR description
      target_branch:
        type: string
        required: false
        description: Target branch to merge into (defaults to main)
    execute:
      type: shell
      command: |
        glab mr create --title "{{title}}" {{#if description}}--description "{{description}}"{{/if}} {{#if target_branch}}--target-branch {{target_branch}}{{/if}} --yes
      parse_output: text

prompt_snippet: |
  You have access to git tools. Always create a feature branch before making changes.
  Never commit directly to main or master.
  Use conventional commit messages: <type>(<scope>): <description>
  To open a PR/MR: first call git-remote-url to detect the provider, then use
  git-create-pr for GitHub remotes or git-create-mr for GitLab remotes.

constraints:
  requires_binaries: [git]
  optional_binaries: [gh, glab]
```

**Step 2: Verify YAML is valid**

```bash
python3 -c "import yaml; yaml.safe_load(open('templates/software-full/project/tools/git.tool.yaml')); print('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add templates/software-full/project/tools/git.tool.yaml
git commit -m "feat(software-full): add git tool for publisher agent"
```

---

### Task 4: Add `contracts/publish-changes.contract.yaml`

The publish stage needs a contract that enforces the publisher actually calls git tools and outputs the PR URL.

**Files:**
- Create: `templates/software-full/project/contracts/publish-changes.contract.yaml`

**Step 1: Create the file**

```yaml
name: publish-changes
version: 1
schema:
  required_fields:
    - summary
    - branch_name
    - pr_url
tool_calls:
  minimum: 4
  required_tools:
    - git-checkout
    - git-commit
    - git-push
```

**Step 2: Verify YAML is valid**

```bash
python3 -c "import yaml; yaml.safe_load(open('templates/software-full/project/contracts/publish-changes.contract.yaml')); print('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add templates/software-full/project/contracts/publish-changes.contract.yaml
git commit -m "feat(software-full): add publish-changes contract"
```

---

### Task 5: Fix `contracts/qa-review.contract.yaml`

**Problem:** `issues` is in `required_fields`, so the agent always emits an `issues` array. Even when code is correct, an empty `issues` array triggers the `array_not_empty` constraint → false rejection.

**Fix:** Remove `issues` from `required_fields`. Add it only as a constraint target. Also expand `rejected_values` to cover all the ways the model might signal failure.

**Files:**
- Modify: `templates/software-full/project/contracts/qa-review.contract.yaml`

**Step 1: Replace file content**

```yaml
name: qa-review
version: 1
schema:
  required_fields:
    - status
    - summary
tool_calls:
  minimum: 1
  required_tools:
    - repo_manager-read_file
post_validation:
  rejection_detection:
    field: status
    approved_values:
      - approved
    rejected_values:
      - rejected
      - needs_revision
      - failed
      - implementation_incomplete
      - approved_with_notes
    details_field: issues
    summary_field: summary
  constraints:
    - if_field: issues
      operator: array_not_empty
      then: rejected
```

**Step 2: Verify YAML is valid**

```bash
python3 -c "import yaml; yaml.safe_load(open('templates/software-full/project/contracts/qa-review.contract.yaml')); print('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add templates/software-full/project/contracts/qa-review.contract.yaml
git commit -m "fix(software-full): remove issues from qa-review required_fields, add constraint"
```

---

### Task 6: Fix `contracts/code-generation.contract.yaml`

**Problem:** `required_tools: [repo_manager-write_file]` only allows `write_file`. The validated approach uses `required_tool_groups` so the agent can satisfy the requirement with either `write_file` (full rewrites) or `apply_patch` (targeted edits).

**Files:**
- Modify: `templates/software-full/project/contracts/code-generation.contract.yaml`

**Step 1: Replace file content**

```yaml
name: code-generation
version: 1
schema:
  required_fields:
    - summary
    - files_changed
tool_calls:
  minimum: 1
  required_tool_groups:
    - [repo_manager-write_file, repo_manager-apply_patch]
```

**Step 2: Verify YAML is valid**

```bash
python3 -c "import yaml; yaml.safe_load(open('templates/software-full/project/contracts/code-generation.contract.yaml')); print('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add templates/software-full/project/contracts/code-generation.contract.yaml
git commit -m "fix(software-full): use required_tool_groups for anti-theatre enforcement"
```

---

### Task 7: Update `agents/analyst.agent.yaml`

**Problems:**
1. Uses sonnet — haiku is sufficient for analysis/planning and cheaper
2. System prompt includes QA review responsibilities — analyst should only plan
3. Missing `repo_manager-list_files` tool

**Files:**
- Modify: `templates/software-full/project/agents/analyst.agent.yaml`

**Step 1: Replace file content**

```yaml
name: analyst
provider: anthropic
model: claude-haiku-4-5-20251001
tools:
  - search-search_codebase
  - repo_manager-read_file
  - repo_manager-list_files
system_prompt: |
  You are a senior software analyst. Your job is to analyze requests and
  produce clear, actionable implementation plans.

  When analyzing a request:
  - Read the target file(s) to understand the existing code structure and conventions.
  - If file content is already available in your context via previous stage tool
    results, do NOT call read_file again — use the content already provided.
  - Identify exactly what needs to change and why.
  - Produce requirements and implementation steps that are specific enough for
    a developer to execute without ambiguity.
```

**Step 2: Verify YAML is valid**

```bash
python3 -c "import yaml; yaml.safe_load(open('templates/software-full/project/agents/analyst.agent.yaml')); print('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add templates/software-full/project/agents/analyst.agent.yaml
git commit -m "fix(software-full): analyst uses haiku, remove QA responsibility from prompt"
```

---

### Task 8: Update `agents/coder.agent.yaml`

**Problems:**
1. Missing `repo_manager-apply_patch` tool (preferred for targeted edits)
2. System prompt doesn't instruct the agent to skip re-reading files already in context
3. No guidance on handling `group_feedback` from QA rejections

**Files:**
- Modify: `templates/software-full/project/agents/coder.agent.yaml`

**Step 1: Replace file content**

```yaml
name: coder
provider: anthropic
model: claude-sonnet-4-6
tools:
  - repo_manager-read_file
  - repo_manager-apply_patch
  - repo_manager-write_file
  - repo_manager-list_files
  - shell-run_command
  - search-search_codebase
skills:
  - git-workflow
  - code-conventions
system_prompt: |
  You are an expert software developer. Your job is to implement the requested
  changes using the available tools.

  CONTEXT USAGE:
  - Your context already contains the outputs and tool results from previous stages,
    including any files that were already read. Do NOT re-read a file if its content
    is already present in your context — use it directly.
  - If group_feedback is present in your context, it contains QA rejection reasons
    from previous iterations. You MUST address every issue listed before writing code.

  IMPLEMENTATION WORKFLOW:
  1. Check your context for existing file content before calling read_file.
  2. If you need files not already in context, call read_file or list_files first.
  3. Implement the changes. Prefer repo_manager-apply_patch for targeted edits,
     repo_manager-write_file for full rewrites.
  4. Never leave placeholder comments like "// TODO" or "// existing code here" —
     always write complete, working code.

  OUTPUT:
  - Your final response must include a summary and the list of files changed.
  - Every file path and change description must reflect actual tool call results.
```

**Step 2: Verify YAML is valid**

```bash
python3 -c "import yaml; yaml.safe_load(open('templates/software-full/project/agents/coder.agent.yaml')); print('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add templates/software-full/project/agents/coder.agent.yaml
git commit -m "fix(software-full): add apply_patch tool and context-awareness to coder"
```

---

### Task 9: Update `pipelines/feature-builder.pipeline.yaml`

This is the central change. Multiple fixes land here:
- Add `on_pipeline_start` for npm install + timestamp
- Fix `implementation-plan` context (use `all_stage_tool_results`)
- Point `qa-review` stage at `reviewer` agent instead of `analyst`
- Add `publish-changes` stage with `all_stage_outputs` context only

**Files:**
- Modify: `templates/software-full/project/pipelines/feature-builder.pipeline.yaml`

**Step 1: Replace file content**

```yaml
name: feature-builder
description: Analyze a request, plan the implementation, generate code, and QA review
version: 2
on_pipeline_start:
  - command: npm install --silent 2>&1 | tail -5
    inject_as: install_output
  - command: date +%Y%m%d-%H%M
    inject_as: run_timestamp
input_schema:
  type: structured
  fields:
    - name: brief_summary
      type: text
      required: true
      prompt: Brief summary
    - name: target_page
      type: text
      required: false
      prompt: Target file or page (optional)
    - name: acceptance_criteria
      type: array
      items: text
      prompt: Acceptance criteria
stages:
  - name: brief-analysis
    kind: analysis
    agent: analyst
    contract: brief-analysis
    ralph:
      max_attempts: 3
    context:
      include:
        - input
  - name: implementation-plan
    kind: planning
    agent: analyst
    contract: implementation-plan
    ralph:
      max_attempts: 3
    context:
      include:
        - input
        - previous_stage_output
        - all_stage_tool_results
  - group: implementation-review
    max_iterations: 3
    stages:
      - name: code-generation
        kind: code
        agent: coder
        contract: code-generation
        ralph:
          max_attempts: 3
        context:
          include:
            - input
            - all_stage_outputs
            - all_stage_tool_results
            - group_feedback
      - name: qa-review
        kind: qa
        agent: reviewer
        contract: qa-review
        ralph:
          max_attempts: 3
        context:
          include:
            - input
            - all_stage_outputs
            - group_feedback
  - name: publish-changes
    kind: publish
    agent: publisher
    contract: publish-changes
    ralph:
      max_attempts: 3
    context:
      include:
        - input
        - all_stage_outputs
```

**Step 2: Verify YAML is valid**

```bash
python3 -c "import yaml; yaml.safe_load(open('templates/software-full/project/pipelines/feature-builder.pipeline.yaml')); print('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add templates/software-full/project/pipelines/feature-builder.pipeline.yaml
git commit -m "feat(software-full): update feature-builder pipeline with publish stage and fixes"
```

---

### Task 10: Regenerate `index.json`

The root `index.json` is auto-generated from template metadata. Since files were added to `software-full`, it needs to be regenerated.

**Files:**
- Modify: `index.json` (auto-generated)

**Step 1: Check how index.json is generated**

```bash
cat package.json | grep -A5 '"scripts"'
```

Look for a `generate` or `index` script. If none, check:

```bash
ls scripts/
```

**Step 2: Run the generation script**

If there's a script:
```bash
npm run generate  # or whatever the script is named
```

If the CI does it automatically (see `.github/workflows/`), skip this step — it will run on push.

**Step 3: Verify index.json includes software-full with all new files**

```bash
python3 -c "
import json
idx = json.load(open('index.json'))
sf = next(t for t in idx['templates'] if t['name'] == 'software-full')
files = [f['path'] for f in sf.get('files', [])]
print('reviewer:', any('reviewer' in f for f in files))
print('publisher:', any('publisher' in f for f in files))
print('git.tool:', any('git.tool' in f for f in files))
print('publish-changes:', any('publish-changes' in f for f in files))
"
```

Expected: all four print `True`

**Step 4: Commit if index.json changed**

```bash
git add index.json
git commit -m "chore: regenerate index.json for software-full template update"
```

---

## Verification

After all tasks are committed, do a final structure check:

```bash
find templates/software-full/project -type f | sort
```

Expected output includes:
```
templates/software-full/project/agents/analyst.agent.yaml
templates/software-full/project/agents/coder.agent.yaml
templates/software-full/project/agents/publisher.agent.yaml
templates/software-full/project/agents/reviewer.agent.yaml
templates/software-full/project/contracts/brief-analysis.contract.yaml
templates/software-full/project/contracts/code-generation.contract.yaml
templates/software-full/project/contracts/implementation-plan.contract.yaml
templates/software-full/project/contracts/publish-changes.contract.yaml
templates/software-full/project/contracts/qa-review.contract.yaml
templates/software-full/project/pipelines/feature-builder.pipeline.yaml
templates/software-full/project/skills/code-conventions.skill.md
templates/software-full/project/skills/git-workflow.skill.md
templates/software-full/project/tools/git.tool.yaml
templates/software-full/project/tools/repo-manager.tool.yaml
templates/software-full/project/tools/search.tool.yaml
templates/software-full/project/tools/shell.tool.yaml
```
