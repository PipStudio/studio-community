# STU-201 — First-Class Packages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract all embedded tools, agents, and skills from templates into first-class registry packages, and update templates to declare dependencies instead of bundling files.

**Architecture:** Two PRs. PR 1 creates the new packages in `tools/`, `agents/`, `skills/` and updates the index generator. PR 2 updates each template's `metadata.json` to declare `dependencies` and removes the now-redundant embedded files.

**Tech Stack:** JSON (metadata), YAML (tool/agent/skill payloads), Node.js (generate-index.mjs)

**Design doc:** `docs/plans/2026-02-28-stu-201-first-class-packages-design.md`

---

## PR 1 — Create first-class packages + update index generator

Branch: `arianedguay/stu-201-registry-extraire-les-tools-et-agents-des-templates-comme`

### Task 1: Create `tools/repo-manager` package

**Files:**
- Create: `tools/repo-manager/metadata.json`
- Create: `tools/repo-manager/repo-manager.tool.yaml`

**Step 1: Create the directory and metadata**

```bash
mkdir -p tools/repo-manager
```

Create `tools/repo-manager/metadata.json`:
```json
{
  "name": "repo-manager",
  "version": "1.0.0",
  "description": "Read, write, list, and patch files in the workspace",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["files", "workspace", "builtin"],
  "type": "tool",
  "studio_version": ">=0.2.0"
}
```

**Step 2: Copy payload from software-full template**

Copy `templates/software-full/project/tools/repo-manager.tool.yaml` → `tools/repo-manager/repo-manager.tool.yaml` (content is identical between templates).

**Step 3: Verify with generator**

```bash
node scripts/generate-index.mjs
```
Expected: `Generated index.json with N packages` (N increases by 1)

**Step 4: Commit**

```bash
git add tools/repo-manager/
git commit -m "feat(tools): add repo-manager as first-class registry package"
```

---

### Task 2: Create `tools/shell` package

**Files:**
- Create: `tools/shell/metadata.json`
- Create: `tools/shell/shell.tool.yaml`

**Step 1: Create the directory and metadata**

```bash
mkdir -p tools/shell
```

Create `tools/shell/metadata.json`:
```json
{
  "name": "shell",
  "version": "1.0.0",
  "description": "Execute shell commands in the workspace",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["shell", "commands", "builtin"],
  "type": "tool",
  "studio_version": ">=0.2.0"
}
```

**Step 2: Copy payload**

Copy `templates/software-full/project/tools/shell.tool.yaml` → `tools/shell/shell.tool.yaml`.

**Step 3: Commit**

```bash
git add tools/shell/
git commit -m "feat(tools): add shell as first-class registry package"
```

---

### Task 3: Create `tools/search` package

**Files:**
- Create: `tools/search/metadata.json`
- Create: `tools/search/search.tool.yaml`

**Step 1: Create the directory and metadata**

```bash
mkdir -p tools/search
```

Create `tools/search/metadata.json`:
```json
{
  "name": "search",
  "version": "1.0.0",
  "description": "Search the codebase by content pattern or file name",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["search", "codebase", "builtin"],
  "type": "tool",
  "studio_version": ">=0.2.0"
}
```

**Step 2: Copy payload**

Copy `templates/software-full/project/tools/search.tool.yaml` → `tools/search/search.tool.yaml` (file is identical across all templates).

**Step 3: Commit**

```bash
git add tools/search/
git commit -m "feat(tools): add search as first-class registry package"
```

---

### Task 4: Create `tools/git` package

**Files:**
- Create: `tools/git/metadata.json`
- Create: `tools/git/git.tool.yaml`

**Step 1: Create the directory and metadata**

Note: `git.tool.yaml` uses `execute.type: shell` — Studio will auto-flag this per governance rules (expected behavior).

```bash
mkdir -p tools/git
```

Create `tools/git/metadata.json`:
```json
{
  "name": "git",
  "version": "1.0.0",
  "description": "Git version control operations: status, diff, checkout, commit, push, PR/MR creation",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["git", "vcs", "github", "gitlab"],
  "type": "tool",
  "studio_version": ">=0.2.0",
  "requires_binaries": ["git"],
  "optional_binaries": ["gh", "glab"]
}
```

**Step 2: Copy payload**

Copy `templates/software-full/project/tools/git.tool.yaml` → `tools/git/git.tool.yaml`.

**Step 3: Commit**

```bash
git add tools/git/
git commit -m "feat(tools): add git as first-class registry package"
```

---

### Task 5: Create `agents/coder` package

**Files:**
- Create: `agents/coder/metadata.json`
- Create: `agents/coder/coder.agent.yaml`

**Step 1: Create the directory and metadata**

Use the `software-full` version (richer: includes apply_patch, QA feedback loop awareness).

```bash
mkdir -p agents/coder
```

Create `agents/coder/metadata.json`:
```json
{
  "name": "coder",
  "version": "1.0.0",
  "description": "Expert software developer agent — implements changes using repo-manager, shell, and search tools",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["software", "code", "development"],
  "type": "agent",
  "studio_version": ">=0.2.0"
}
```

**Step 2: Copy payload**

Copy `templates/software-full/project/agents/coder.agent.yaml` → `agents/coder/coder.agent.yaml`.

**Step 3: Commit**

```bash
git add agents/coder/
git commit -m "feat(agents): add coder as first-class registry package"
```

---

### Task 6: Create `agents/analyst` package

**Files:**
- Create: `agents/analyst/metadata.json`
- Create: `agents/analyst/analyst.agent.yaml`

**Step 1: Create the directory and metadata**

Use the `software-full` version (richer: 3 tools — search, read_file, list_files vs. search-only).

```bash
mkdir -p agents/analyst
```

Create `agents/analyst/metadata.json`:
```json
{
  "name": "analyst",
  "version": "1.0.0",
  "description": "Senior software analyst — reads code, analyzes requests, produces implementation plans",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["software", "analysis", "planning"],
  "type": "agent",
  "studio_version": ">=0.2.0"
}
```

**Step 2: Copy payload**

Copy `templates/software-full/project/agents/analyst.agent.yaml` → `agents/analyst/analyst.agent.yaml`.

**Step 3: Commit**

```bash
git add agents/analyst/
git commit -m "feat(agents): add analyst as first-class registry package"
```

---

### Task 7: Create `agents/publisher` package

**Files:**
- Create: `agents/publisher/metadata.json`
- Create: `agents/publisher/publisher.agent.yaml`

**Step 1: Create the directory and metadata**

```bash
mkdir -p agents/publisher
```

Create `agents/publisher/metadata.json`:
```json
{
  "name": "publisher",
  "version": "1.0.0",
  "description": "Git workflow specialist — creates branch, commits, pushes, and opens PR/MR",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["git", "github", "gitlab", "publish"],
  "type": "agent",
  "studio_version": ">=0.2.0"
}
```

**Step 2: Copy payload**

Copy `templates/software-full/project/agents/publisher.agent.yaml` → `agents/publisher/publisher.agent.yaml`.

**Step 3: Commit**

```bash
git add agents/publisher/
git commit -m "feat(agents): add publisher as first-class registry package"
```

---

### Task 8: Create `agents/reviewer` package

**Files:**
- Create: `agents/reviewer/metadata.json`
- Create: `agents/reviewer/reviewer.agent.yaml`

**Step 1: Create the directory and metadata**

```bash
mkdir -p agents/reviewer
```

Create `agents/reviewer/metadata.json`:
```json
{
  "name": "reviewer",
  "version": "1.0.0",
  "description": "Strict QA engineer — verifies implementation against acceptance criteria, returns approved or rejected",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["qa", "review", "testing"],
  "type": "agent",
  "studio_version": ">=0.2.0"
}
```

**Step 2: Copy payload**

Copy `templates/software-full/project/agents/reviewer.agent.yaml` → `agents/reviewer/reviewer.agent.yaml`.

**Step 3: Commit**

```bash
git add agents/reviewer/
git commit -m "feat(agents): add reviewer as first-class registry package"
```

---

### Task 9: Create `agents/writer` package

**Files:**
- Create: `agents/writer/metadata.json`
- Create: `agents/writer/writer.agent.yaml`

**Step 1: Create the directory and metadata**

```bash
mkdir -p agents/writer
```

Create `agents/writer/metadata.json`:
```json
{
  "name": "writer",
  "version": "1.0.0",
  "description": "Expert content writer — researches topics and creates high-quality structured content",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["content", "writing", "research"],
  "type": "agent",
  "studio_version": ">=0.2.0"
}
```

**Step 2: Copy payload**

Copy `templates/content/project/agents/writer.agent.yaml` → `agents/writer/writer.agent.yaml`.

**Step 3: Commit**

```bash
git add agents/writer/
git commit -m "feat(agents): add writer as first-class registry package"
```

---

### Task 10: Create `skills/code-conventions` package

**Files:**
- Create: `skills/code-conventions/metadata.json`
- Create: `skills/code-conventions/code-conventions.skill.md`

**Step 1: Create the directory and metadata**

```bash
mkdir -p skills/code-conventions
```

Create `skills/code-conventions/metadata.json`:
```json
{
  "name": "code-conventions",
  "version": "1.0.0",
  "description": "Coding conventions: file organization, TypeScript patterns, testing, error handling",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["conventions", "typescript", "testing"],
  "type": "skill",
  "studio_version": ">=0.2.0"
}
```

**Step 2: Copy payload**

Copy `templates/software-full/project/skills/code-conventions.skill.md` → `skills/code-conventions/code-conventions.skill.md`.

**Step 3: Commit**

```bash
git add skills/code-conventions/
git commit -m "feat(skills): add code-conventions as first-class registry package"
```

---

### Task 11: Create `skills/git-workflow` package

**Files:**
- Create: `skills/git-workflow/metadata.json`
- Create: `skills/git-workflow/git-workflow.skill.md`

**Step 1: Create the directory and metadata**

```bash
mkdir -p skills/git-workflow
```

Create `skills/git-workflow/metadata.json`:
```json
{
  "name": "git-workflow",
  "version": "1.0.0",
  "description": "Git branching, conventional commits, and PR conventions",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["git", "commits", "workflow"],
  "type": "skill",
  "studio_version": ">=0.2.0"
}
```

**Step 2: Copy payload**

Copy `templates/software-full/project/skills/git-workflow.skill.md` → `skills/git-workflow/git-workflow.skill.md`.

**Step 3: Commit**

```bash
git add skills/git-workflow/
git commit -m "feat(skills): add git-workflow as first-class registry package"
```

---

### Task 12: Update `generate-index.mjs` to include dependencies

**Files:**
- Modify: `scripts/generate-index.mjs`

**Step 1: Add `dependencies` to the package push**

In `scripts/generate-index.mjs`, find the `packages.push({...})` block and add `dependencies`:

Current (line 26-36):
```js
packages.push({
  name: meta.name,
  type: meta.type,
  version: meta.version,
  description: meta.description,
  author: meta.author,
  license: meta.license,
  tags: meta.tags ?? [],
  studio_version: meta.studio_version ?? null,
  downloads: meta.downloads ?? 0,
});
```

Updated:
```js
packages.push({
  name: meta.name,
  type: meta.type,
  version: meta.version,
  description: meta.description,
  author: meta.author,
  license: meta.license,
  tags: meta.tags ?? [],
  studio_version: meta.studio_version ?? null,
  downloads: meta.downloads ?? 0,
  dependencies: meta.dependencies ?? {},
});
```

**Step 2: Regenerate index.json**

```bash
node scripts/generate-index.mjs
```

Expected: `Generated index.json with 14 packages` (4 integrations + 4 templates + 4 tools + 5 agents - wait, count: 3 integrations + 4 templates + 4 tools + 5 agents + 2 skills = 18 packages)

Verify `index.json` now contains:
- packages of type `tool`, `agent`, `skill`
- each with an empty `dependencies: {}` (packages themselves don't have deps in this PR)

**Step 3: Commit**

```bash
git add scripts/generate-index.mjs index.json
git commit -m "feat(registry): include dependencies field in index.json"
```

---

### Task 13: Open PR 1

**Step 1: Push branch**

```bash
git push -u origin arianedguay/stu-201-registry-extraire-les-tools-et-agents-des-templates-comme
```

**Step 2: Create PR**

```bash
gh pr create \
  --title "[tools/agents/skills] extract as first-class registry packages v1.0.0" \
  --body "$(cat <<'EOF'
## Summary

- Adds 4 tool packages: `repo-manager`, `shell`, `search`, `git`
- Adds 5 agent packages: `coder`, `analyst`, `publisher`, `reviewer`, `writer`
- Adds 2 skill packages: `code-conventions`, `git-workflow`
- Updates `generate-index.mjs` to pass `dependencies` through to `index.json`

Part of STU-201. PR 2 will update templates to declare dependencies and remove embedded files.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## PR 2 — Update templates + remove embedded files

Create a new branch after PR 1 merges (or branch from PR 1 branch):

```bash
git checkout -b feat/stu-201-update-templates
```

### Task 14: Update `validate-templates.mjs` to accept dependency-declared agents

**Context:** The validator currently checks that agents referenced in pipelines exist in `project/agents/`. After PR 2 removes those directories, pipelines will still reference agents (e.g., `coder`, `analyst`) that are now declared as dependencies. The validator must accept them.

**Files:**
- Modify: `scripts/validate-templates.mjs`

**Step 1: Load dependency agents from metadata**

In `validateTemplate(name)`, after the `meta` parse block (around line 62), add:

```js
const dependencyAgents = new Set([
  ...(meta.dependencies?.agents?.required ?? []),
  ...(meta.dependencies?.agents?.recommended ?? []),
]);
```

**Step 2: Update pipeline agent check**

Find the pipeline check (around line 114):
```js
for (const a of agents) {
  if (!agentNames.has(a)) errors.push(`${rel}: agent "${a}" not found in project/agents/`);
}
```

Replace with:
```js
for (const a of agents) {
  if (!agentNames.has(a) && !dependencyAgents.has(a)) {
    errors.push(`${rel}: agent "${a}" not found in project/agents/ or declared in dependencies`);
  }
}
```

**Step 3: Run validator to confirm baseline still passes**

```bash
node scripts/validate-templates.mjs
```
Expected: `All templates valid.` (templates still have embedded files at this point)

**Step 4: Commit**

```bash
git add scripts/validate-templates.mjs
git commit -m "fix(validate): accept dependency-declared agents in pipeline checks"
```

---

### Task 15: Update `templates/software` metadata + remove embedded files

**Files:**
- Modify: `templates/software/metadata.json`
- Delete: `templates/software/project/tools/repo-manager.tool.yaml`
- Delete: `templates/software/project/tools/shell.tool.yaml`
- Delete: `templates/software/project/tools/search.tool.yaml`
- Delete: `templates/software/project/agents/coder.agent.yaml`

**Step 1: Update metadata.json**

Replace content of `templates/software/metadata.json`:
```json
{
  "name": "software",
  "version": "1.1.0",
  "description": "Code generation with repo, shell and search tools",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["software", "code", "development"],
  "type": "template",
  "studio_version": ">=0.2.0",
  "dependencies": {
    "tools": {
      "required": ["repo-manager", "shell", "search"]
    },
    "agents": {
      "required": ["coder"]
    }
  }
}
```

**Step 2: Remove embedded files**

```bash
rm templates/software/project/tools/repo-manager.tool.yaml
rm templates/software/project/tools/shell.tool.yaml
rm templates/software/project/tools/search.tool.yaml
rm templates/software/project/agents/coder.agent.yaml
rmdir templates/software/project/tools
rmdir templates/software/project/agents
```

**Step 3: Commit**

```bash
git add templates/software/
git commit -m "feat(templates): software declares dependencies, removes embedded files (v1.1.0)"
```

---

### Task 16: Update `templates/software-full` metadata + remove embedded files

**Files:**
- Modify: `templates/software-full/metadata.json`
- Delete: all files in `templates/software-full/project/tools/`
- Delete: all files in `templates/software-full/project/agents/`
- Delete: all files in `templates/software-full/project/skills/`

**Step 1: Update metadata.json**

Replace content of `templates/software-full/metadata.json`:
```json
{
  "name": "software-full",
  "version": "2.1.0",
  "description": "Software development (full pipeline with QA review)",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["software", "code", "development", "qa"],
  "type": "template",
  "studio_version": ">=0.2.0",
  "dependencies": {
    "tools": {
      "required": ["repo-manager", "shell", "search", "git"]
    },
    "agents": {
      "required": ["coder", "analyst", "publisher", "reviewer"]
    },
    "skills": {
      "recommended": ["code-conventions", "git-workflow"]
    }
  }
}
```

**Step 2: Remove embedded files**

```bash
rm templates/software-full/project/tools/repo-manager.tool.yaml
rm templates/software-full/project/tools/shell.tool.yaml
rm templates/software-full/project/tools/search.tool.yaml
rm templates/software-full/project/tools/git.tool.yaml
rm templates/software-full/project/agents/coder.agent.yaml
rm templates/software-full/project/agents/analyst.agent.yaml
rm templates/software-full/project/agents/publisher.agent.yaml
rm templates/software-full/project/agents/reviewer.agent.yaml
rm templates/software-full/project/skills/code-conventions.skill.md
rm templates/software-full/project/skills/git-workflow.skill.md
rmdir templates/software-full/project/tools
rmdir templates/software-full/project/agents
rmdir templates/software-full/project/skills
```

**Step 3: Commit**

```bash
git add templates/software-full/
git commit -m "feat(templates): software-full declares dependencies, removes embedded files (v2.1.0)"
```

---

### Task 17: Update `templates/content` metadata + remove embedded files

**Files:**
- Modify: `templates/content/metadata.json`
- Delete: `templates/content/project/tools/search.tool.yaml`
- Delete: `templates/content/project/agents/writer.agent.yaml`

**Step 1: Update metadata.json**

Replace content of `templates/content/metadata.json`:
```json
{
  "name": "content",
  "version": "1.1.0",
  "description": "Content creation and editing with search",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["content", "writing", "research"],
  "type": "template",
  "studio_version": ">=0.2.0",
  "dependencies": {
    "tools": {
      "required": ["search"]
    },
    "agents": {
      "required": ["writer"]
    }
  }
}
```

**Step 2: Remove embedded files**

```bash
rm templates/content/project/tools/search.tool.yaml
rm templates/content/project/agents/writer.agent.yaml
rmdir templates/content/project/tools
rmdir templates/content/project/agents
```

**Step 3: Commit**

```bash
git add templates/content/
git commit -m "feat(templates): content declares dependencies, removes embedded files (v1.1.0)"
```

---

### Task 18: Update `templates/document-analysis` metadata + remove embedded files

**Files:**
- Modify: `templates/document-analysis/metadata.json`
- Delete: `templates/document-analysis/project/tools/search.tool.yaml`
- Delete: `templates/document-analysis/project/agents/analyst.agent.yaml`

**Step 1: Update metadata.json**

Replace content of `templates/document-analysis/metadata.json`:
```json
{
  "name": "document-analysis",
  "version": "1.1.0",
  "description": "Document extraction and structured analysis",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["analysis", "documents", "extraction"],
  "type": "template",
  "studio_version": ">=0.2.0",
  "dependencies": {
    "tools": {
      "required": ["search"]
    },
    "agents": {
      "required": ["analyst"]
    }
  }
}
```

**Step 2: Remove embedded files**

```bash
rm templates/document-analysis/project/tools/search.tool.yaml
rm templates/document-analysis/project/agents/analyst.agent.yaml
rmdir templates/document-analysis/project/tools
rmdir templates/document-analysis/project/agents
```

**Step 3: Commit**

```bash
git add templates/document-analysis/
git commit -m "feat(templates): document-analysis declares dependencies, removes embedded files (v1.1.0)"
```

---

### Task 19: Regenerate index.json and open PR 2

**Step 1: Regenerate**

```bash
node scripts/generate-index.mjs
```

Verify in `index.json`:
- All 4 templates now have `dependencies` populated
- Template `project/` entries no longer reference embedded tools/agents/skills
- Total package count unchanged (packages moved, not removed)

**Step 2: Commit index**

```bash
git add index.json
git commit -m "chore: regenerate index with template dependencies"
```

**Step 3: Push and create PR 2**

```bash
git push -u origin feat/stu-201-update-templates

gh pr create \
  --title "[templates] declare dependencies, remove embedded tools/agents/skills" \
  --body "$(cat <<'EOF'
## Summary

- Updates all 4 templates to declare `dependencies` in `metadata.json`
- Removes embedded `project/tools/`, `project/agents/`, `project/skills/` from all templates
- Bumps template versions: software v1.1.0, software-full v2.1.0, content v1.1.0, document-analysis v1.1.0

Requires PR 1 (first-class packages) to be merged first.
Closes STU-201.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
