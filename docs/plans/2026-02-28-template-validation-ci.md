# Template Validation CI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a CI workflow that validates changed templates on PRs — YAML syntax, metadata fields, and cross-references (agents/contracts/tools) — using a standalone Node.js script.

**Architecture:** A `scripts/validate-templates.mjs` script mirrors the logic from Studio's `validate.ts`, running without a server. A GitHub Actions workflow triggers it on PRs that touch `templates/**`. A root `package.json` provides the single `js-yaml` dependency.

**Tech Stack:** Node.js 22 ESM, `js-yaml`, GitHub Actions, `git diff` for change detection.

---

### Task 1: Add root package.json with js-yaml dependency

**Files:**
- Create: `package.json`

**Step 1: Create package.json**

```json
{
  "type": "module",
  "scripts": {
    "validate": "node scripts/validate-templates.mjs",
    "generate-index": "node scripts/generate-index.mjs"
  },
  "dependencies": {
    "js-yaml": "^4.1.0"
  }
}
```

**Step 2: Install dependencies**

```bash
npm install
```

Expected: Creates `node_modules/` and `package-lock.json`. Output ends with `added 4 packages`.

**Step 3: Add node_modules to .gitignore**

Check if `.gitignore` exists. If not, create it. Add:

```
node_modules/
```

**Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: add root package.json with js-yaml for validation scripts"
```

---

### Task 2: Create the validation script

**Files:**
- Create: `scripts/validate-templates.mjs`

**Step 1: Write the script**

```js
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import yaml from 'js-yaml';

const ROOT = dirname(fileURLToPath(import.meta.url)) + '/..';
const REQUIRED_META_FIELDS = ['name', 'version', 'description', 'author', 'license', 'type'];
const BUILTIN_PREFIXES = ['repo_manager-', 'shell-', 'search-', 'patch-', 'git-'];

async function ls(dir) {
  try { return await readdir(dir); } catch { return []; }
}

function getChangedTemplates() {
  try {
    const out = execSync('git diff --name-only origin/main...HEAD -- templates/', { encoding: 'utf-8' });
    const names = new Set();
    for (const line of out.trim().split('\n').filter(Boolean)) {
      const m = line.match(/^templates\/([^/]+)\//);
      if (m) names.add(m[1]);
    }
    return [...names];
  } catch {
    return [];
  }
}

function collectStageRefs(stage) {
  const agents = [], contracts = [];
  if (typeof stage.agent === 'string') agents.push(stage.agent);
  if (typeof stage.contract === 'string') contracts.push(stage.contract);
  if (Array.isArray(stage.stages)) {
    for (const s of stage.stages) {
      if (s && typeof s === 'object' && !Array.isArray(s)) {
        const inner = collectStageRefs(s);
        agents.push(...inner.agents);
        contracts.push(...inner.contracts);
      }
    }
  }
  return { agents, contracts };
}

async function validateTemplate(name) {
  const errors = [];
  const templateDir = join(ROOT, 'templates', name);
  const projectDir = join(templateDir, 'project');

  // --- metadata.json ---
  let meta;
  try {
    meta = JSON.parse(await readFile(join(templateDir, 'metadata.json'), 'utf-8'));
  } catch (e) {
    errors.push(`metadata.json: cannot read/parse — ${e.message}`);
    return errors;
  }
  for (const field of REQUIRED_META_FIELDS) {
    if (!meta[field]) errors.push(`metadata.json: missing required field "${field}"`);
  }

  // --- Collect cross-ref sets from the template's own project/ ---
  const agentFiles = await ls(join(projectDir, 'agents'));
  const contractFiles = await ls(join(projectDir, 'contracts'));
  const toolFiles = await ls(join(projectDir, 'tools'));
  const agentNames = new Set(agentFiles.filter(f => f.endsWith('.agent.yaml')).map(f => f.slice(0, -'.agent.yaml'.length)));
  const contractNames = new Set(contractFiles.filter(f => f.endsWith('.contract.yaml')).map(f => f.slice(0, -'.contract.yaml'.length)));
  const toolPlugins = new Set(toolFiles.filter(f => f.endsWith('.tool.yaml')).map(f => f.slice(0, -'.tool.yaml'.length)));

  // --- YAML files: one level of subdirectories in project/ ---
  const subdirs = await ls(projectDir);
  for (const sub of subdirs) {
    if (sub === 'skills') continue; // handled separately below
    const subPath = join(projectDir, sub);
    const files = await ls(subPath);
    for (const file of files) {
      if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;
      const filePath = join(subPath, file);
      const rel = `project/${sub}/${file}`;
      let content;
      try {
        content = await readFile(filePath, 'utf-8');
      } catch (e) {
        errors.push(`${rel}: cannot read — ${e.message}`);
        continue;
      }
      let obj;
      try {
        obj = yaml.load(content);
      } catch (e) {
        errors.push(`${rel}: YAML parse error — ${e.message}`);
        continue;
      }
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        errors.push(`${rel}: must be a YAML object`);
        continue;
      }

      // Pipeline
      if (file.endsWith('.pipeline.yaml')) {
        if (!Array.isArray(obj.stages)) {
          errors.push(`${rel}: pipeline must have a "stages" array`);
        } else {
          for (const stage of obj.stages) {
            if (!stage || typeof stage !== 'object' || Array.isArray(stage)) continue;
            const { agents, contracts } = collectStageRefs(stage);
            for (const a of agents) {
              if (!agentNames.has(a)) errors.push(`${rel}: agent "${a}" not found in project/agents/`);
            }
            for (const c of contracts) {
              if (!contractNames.has(c)) errors.push(`${rel}: contract "${c}" not found in project/contracts/`);
            }
          }
        }
      }

      // Agent
      if (file.endsWith('.agent.yaml') && Array.isArray(obj.tools)) {
        for (const tool of obj.tools) {
          if (typeof tool !== 'string') continue;
          const isBuiltin = BUILTIN_PREFIXES.some(p => tool.startsWith(p));
          const isCustom = [...toolPlugins].some(p => tool === p || tool.startsWith(p + '-'));
          if (!isBuiltin && !isCustom) {
            errors.push(`${rel}: tool "${tool}" is not a builtin and not in project/tools/`);
          }
        }
      }
    }
  }

  // --- Skills: *.skill.md must be non-empty ---
  const skillFiles = await ls(join(projectDir, 'skills'));
  for (const f of skillFiles) {
    if (!f.endsWith('.skill.md')) continue;
    const content = await readFile(join(projectDir, 'skills', f), 'utf-8');
    if (!content.trim()) errors.push(`project/skills/${f}: skill is empty`);
  }

  return errors;
}

// --- Main ---
let templates = getChangedTemplates();
if (templates.length === 0) {
  // Local run or no changes detected: validate all templates
  templates = await ls(join(ROOT, 'templates'));
  if (templates.length > 0) console.log('No git diff detected — validating all templates.\n');
}

if (templates.length === 0) {
  console.log('No templates to validate.');
  process.exit(0);
}

let totalErrors = 0;
for (const name of templates) {
  const errors = await validateTemplate(name);
  if (errors.length > 0) {
    console.error(`\nFAIL  templates/${name}:`);
    for (const e of errors) console.error(`      ${e}`);
    totalErrors += errors.length;
  } else {
    console.log(`PASS  templates/${name}`);
  }
}

if (totalErrors > 0) {
  console.error(`\n${totalErrors} error(s) found.`);
  process.exit(1);
}
console.log('\nAll templates valid.');
```

**Step 2: Commit**

```bash
git add scripts/validate-templates.mjs
git commit -m "feat(scripts): add validate-templates.mjs for template validation"
```

---

### Task 3: Verify the script passes on existing templates

**Step 1: Run against all templates**

```bash
node scripts/validate-templates.mjs
```

Expected output (all pass):
```
No git diff detected — validating all templates.

PASS  templates/content
PASS  templates/document-analysis
PASS  templates/software
PASS  templates/software-full

All templates valid.
```

If any template fails, fix the error in the template YAML or adjust the validation logic before continuing.

**Step 2: Verify it catches a real error (smoke test)**

Temporarily break a file and verify exit code 1:

```bash
# Break a pipeline reference temporarily
echo "stages: [{agent: nonexistent}]" > /tmp/test.pipeline.yaml
cp templates/software-full/project/pipelines/feature-builder.pipeline.yaml /tmp/backup.yaml
cp /tmp/test.pipeline.yaml templates/software-full/project/pipelines/feature-builder.pipeline.yaml

node scripts/validate-templates.mjs 2>&1; echo "Exit: $?"
```

Expected: output contains `agent "nonexistent" not found` and `Exit: 1`.

```bash
# Restore
cp /tmp/backup.yaml templates/software-full/project/pipelines/feature-builder.pipeline.yaml
```

---

### Task 4: Create the GitHub Actions workflow

**Files:**
- Create: `.github/workflows/validate-templates.yml`

**Step 1: Write the workflow**

```yaml
name: Validate templates

on:
  pull_request:
    branches: [main]
    paths:
      - 'templates/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Validate changed templates
        run: node scripts/validate-templates.mjs
```

Note: `fetch-depth: 0` is required so `git diff origin/main...HEAD` works correctly.

**Step 2: Commit**

```bash
git add .github/workflows/validate-templates.yml
git commit -m "ci: add validate-templates workflow for PRs"
```

---

### Task 5: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add the validate command to the Commandes section**

In the `## Commandes` section, after the existing `node scripts/generate-index.mjs` line, add:

```bash
# Valider les templates modifiés (ou tous si pas de diff git)
node scripts/validate-templates.mjs
```

**Step 2: Update the scripts/ tree entry and add validate-templates.yml to the .github/workflows/ tree**

In `## Structure du repo`, update the tree:

```
├── scripts/
│   ├── generate-index.mjs  ← régénère index.json depuis tous les metadata.json
│   └── validate-templates.mjs  ← valide les templates (syntaxe YAML, metadata, refs croisées)
└── .github/workflows/
    ├── generate-index.yml  ← CI : régénère index.json sur merge si metadata.json changé
    └── validate-templates.yml  ← CI : valide les templates modifiés sur les PRs
```

**Step 3: Add a CI section at the end of CLAUDE.md**

```markdown
## CI

| Workflow | Déclencheur | Rôle |
|----------|-------------|------|
| `generate-index.yml` | push sur `main` si `metadata.json` changé | Régénère `index.json` |
| `validate-templates.yml` | PR vers `main` si `templates/**` changé | Valide metadata, syntaxe YAML, et refs croisées des templates modifiés |

La validation de template couvre :
- **metadata.json** — champs requis (`name`, `version`, `description`, `author`, `license`, `type`)
- **Syntaxe YAML** — tous les fichiers `.yaml` dans `project/`
- **Pipelines** — `stages` array requis ; agents et contracts référencés doivent exister dans `project/`
- **Agents** — tools référencés doivent être des builtins (`repo_manager-*`, `shell-*`, `search-*`, `patch-*`, `git-*`) ou définis dans `project/tools/`
- **Skills** — contenu non vide
```

**Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(CLAUDE.md): document validate-templates script and CI workflow"
```
