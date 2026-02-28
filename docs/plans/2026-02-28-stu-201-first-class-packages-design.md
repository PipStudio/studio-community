# STU-201 — First-Class Tools, Agents & Skills Packages

**Date:** 2026-02-28
**Linear:** [STU-201](https://linear.app/studioag/issue/STU-201)
**Status:** Approved

## Problem

Templates (`software`, `software-full`, `content`, `document-analysis`) bundle their tools, agents, and skills directly inside `project/tools/`, `project/agents/`, `project/skills/`. This causes:

- **Duplication** — `search.tool.yaml` is copied verbatim into all 4 templates
- **No reuse** — improving a tool requires updating every template that embeds it
- **No composability** — you can't install just the `coder` agent without installing a full template

## Solution

Extract all tools, agents, and skills as first-class registry packages with their own `metadata.json`. Templates declare what they need via a `dependencies` field — they no longer ship the files themselves.

## Approach: Two PRs

### PR 1 — Create first-class packages + update generator

Create 11 packages:

```
tools/
  repo-manager/      ← read/write/list/patch files (builtin)
  shell/             ← run shell commands (builtin)
  search/            ← search codebase by content (builtin)
  git/               ← git operations: status/diff/checkout/commit/push/pr (shell)

agents/
  coder/             ← software developer (software-full richer version)
  analyst/           ← software analyst (software-full richer version)
  publisher/         ← git workflow specialist, opens PR/MR
  reviewer/          ← strict QA engineer
  writer/            ← content writer

skills/
  code-conventions/  ← coding standards skill
  git-workflow/      ← git branching and commit conventions
```

**Canonical version selection:**
- `coder`: software-full version (includes apply_patch, QA feedback loop awareness)
- `analyst`: software-full version (3 tools: search + read_file + list_files vs. search-only)

Update `generate-index.mjs` to pass `dependencies` through to `index.json`:

```js
packages.push({
  // ...existing fields...
  dependencies: meta.dependencies ?? {},
});
```

### PR 2 — Update templates + remove embedded files

Add `dependencies` to each template's `metadata.json` and bump version. Remove `project/tools/`, `project/agents/`, `project/skills/` from all templates.

#### Dependency map

| Template | Required tools | Required agents | Recommended skills |
|---|---|---|---|
| `software` v1.1.0 | repo-manager, shell, search | coder | — |
| `software-full` v2.1.0 | repo-manager, shell, search, git | coder, analyst, publisher, reviewer | code-conventions, git-workflow |
| `content` v1.1.0 | search | writer | — |
| `document-analysis` v1.1.0 | search | analyst | — |

Skills are `recommended` (not `required`) in `software-full` because they improve quality but aren't runtime requirements.

#### Files to remove from templates

```
templates/software/project/tools/         (repo-manager, shell, search)
templates/software/project/agents/        (coder)
templates/software-full/project/tools/    (repo-manager, shell, search, git)
templates/software-full/project/agents/   (coder, analyst, publisher, reviewer)
templates/software-full/project/skills/   (code-conventions, git-workflow)
templates/content/project/tools/          (search)
templates/content/project/agents/         (writer)
templates/document-analysis/project/tools/ (search)
templates/document-analysis/project/agents/ (analyst)
```

## metadata.json format for packages

```json
{
  "name": "repo-manager",
  "version": "1.0.0",
  "description": "Read and write files in the workspace",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["files", "workspace"],
  "type": "tool",
  "studio_version": ">=0.2.0"
}
```

Note: `git.tool.yaml` has `execute.type: shell` commands → Studio will auto-flag it per governance rules (same as existing behavior).

## Out of scope

- `studio registry install` dependency resolution (Studio core, not this repo)
- `registry.lock.json` (Studio core)
- Version conflict resolution
- Circular dependency detection
