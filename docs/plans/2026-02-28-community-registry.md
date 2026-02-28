# Community Registry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Studio community registry — populate `studio-community` with existing packages and implement `studio registry *` CLI commands in the Studio repo, then refactor `studio init` to use the registry instead of bundled templates.

**Architecture:** Git-based Phase 1. The registry is a GitHub repo (`studio-community/registry`) with an auto-generated `index.json`. The CLI caches `index.json` locally with 24h TTL. Install downloads files via GitHub raw/API. Publish creates a GitHub PR.

**Tech Stack:** TypeScript, Commander.js, Vitest, native `fetch()`, `js-yaml`, `chalk`, `ora`, `@inquirer/prompts`. Node.js `fs/promises`, `crypto` (SHA256), `os` (home dir).

**Two repos involved:**
- `~/dev/src/studio-community` — the registry repo (packages + index.json + GitHub Action)
- `~/dev/src/Studio` — the CLI repo (commands + refactored init)

---

## Phase 1: Populate the Registry Repo

---

### Task 1: Migrate templates to `studio-community`

**Files:**
- Create: `templates/software/metadata.json`
- Create: `templates/software/project/` (copy from Studio)
- Create: `templates/software-full/metadata.json`
- Create: `templates/software-full/project/`
- Create: `templates/content/metadata.json`
- Create: `templates/content/project/`
- Create: `templates/document-analysis/metadata.json`
- Create: `templates/document-analysis/project/`

**Step 1: Create the directory structure**

```bash
cd ~/dev/src/studio-community
mkdir -p templates/software/project
mkdir -p templates/software-full/project
mkdir -p templates/content/project
mkdir -p templates/document-analysis/project
```

**Step 2: Copy each template's files into `project/`**

For each template (`software`, `software-full`, `content`, `document-analysis`), copy all contents EXCEPT `metadata.json`, `package.json`, `README.md`, `prisma/`, `src/` into `project/`. Those top-level app scaffold files stay — they're part of the template package and install alongside `.studio/` files.

Actually, copy the ENTIRE template directory contents to `project/`:
```bash
# software
cp -r ~/dev/src/Studio/cli/templates/projects/software/. templates/software/project/
# software-full
cp -r ~/dev/src/Studio/cli/templates/projects/software-full/. templates/software-full/project/
# content
cp -r ~/dev/src/Studio/cli/templates/projects/content/. templates/content/project/
# document-analysis
cp -r ~/dev/src/Studio/cli/templates/projects/document-analysis/. templates/document-analysis/project/
```

**Step 3: Write registry-format `metadata.json` for each template**

Remove `metadata.json` from `project/` (it's now at the package root). Add `license: "MIT"`. Remove `pipelines` and `tools_included` (Studio-internal fields).

`templates/software/metadata.json`:
```json
{
  "name": "software",
  "version": "1.0.0",
  "description": "Code generation with repo, shell and search tools",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["software", "code", "development"],
  "type": "template",
  "studio_version": ">=7.0.0"
}
```

`templates/software-full/metadata.json`:
```json
{
  "name": "software-full",
  "version": "1.0.0",
  "description": "Software development (full pipeline with QA review)",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["software", "code", "development", "qa"],
  "type": "template",
  "studio_version": ">=7.0.0"
}
```

`templates/content/metadata.json`:
```json
{
  "name": "content",
  "version": "1.0.0",
  "description": "Content creation and editing with search",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["content", "writing", "research"],
  "type": "template",
  "studio_version": ">=7.0.0"
}
```

`templates/document-analysis/metadata.json`:
```json
{
  "name": "document-analysis",
  "version": "1.0.0",
  "description": "Document extraction and structured analysis",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["analysis", "documents", "extraction"],
  "type": "template",
  "studio_version": ">=7.0.0"
}
```

**Step 4: Remove `metadata.json` from inside `project/` subdirectories**

```bash
rm templates/software/project/metadata.json
rm templates/software-full/project/metadata.json
rm templates/content/project/metadata.json
rm templates/document-analysis/project/metadata.json
```

**Step 5: Verify structure looks correct**

```bash
find templates/ -name "metadata.json" | sort
```
Expected output:
```
templates/content/metadata.json
templates/document-analysis/metadata.json
templates/software-full/metadata.json
templates/software/metadata.json
```

**Step 6: Commit**

```bash
cd ~/dev/src/studio-community
git add templates/
git commit -m "feat: add software, software-full, content, document-analysis templates"
```

---

### Task 2: Create placeholder `integrations/` directories for STU-184

We plan for integrations (STU-184 is in-progress). Create the directory structure now so the structure is ready when STU-184 merges.

**Files:**
- Create: `integrations/linear/metadata.json`
- Create: `integrations/slack/metadata.json`
- Create: `integrations/webhook/metadata.json`

**Step 1: Read the integration files from the STU-184 worktree**

```bash
cat ~/dev/src/Studio/.worktrees/stu-184-integration-plugins/runner/templates/integrations/linear.integration.yaml
cat ~/dev/src/Studio/.worktrees/stu-184-integration-plugins/runner/templates/integrations/slack.integration.yaml
cat ~/dev/src/Studio/.worktrees/stu-184-integration-plugins/runner/templates/integrations/webhook.integration.yaml
```

**Step 2: Create integration package directories**

```bash
mkdir -p integrations/linear integrations/slack integrations/webhook
```

**Step 3: Copy integration files**

```bash
cp ~/dev/src/Studio/.worktrees/stu-184-integration-plugins/runner/templates/integrations/linear.integration.yaml integrations/linear/
cp ~/dev/src/Studio/.worktrees/stu-184-integration-plugins/runner/templates/integrations/slack.integration.yaml integrations/slack/
cp ~/dev/src/Studio/.worktrees/stu-184-integration-plugins/runner/templates/integrations/webhook.integration.yaml integrations/webhook/
```

**Step 4: Write `metadata.json` for each integration**

`integrations/linear/metadata.json`:
```json
{
  "name": "linear",
  "version": "1.0.0",
  "description": "Linear issue tracker integration",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["linear", "issues", "project-management"],
  "type": "integration",
  "studio_version": ">=7.0.0"
}
```

`integrations/slack/metadata.json`:
```json
{
  "name": "slack",
  "version": "1.0.0",
  "description": "Slack messaging integration",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["slack", "messaging", "notifications"],
  "type": "integration",
  "studio_version": ">=7.0.0"
}
```

`integrations/webhook/metadata.json`:
```json
{
  "name": "webhook",
  "version": "1.0.0",
  "description": "Generic HTTP webhook integration",
  "author": "studio-core",
  "license": "MIT",
  "tags": ["webhook", "http", "events"],
  "type": "integration",
  "studio_version": ">=7.0.0"
}
```

**Step 5: Commit**

```bash
cd ~/dev/src/studio-community
git add integrations/
git commit -m "feat: add linear, slack, webhook integrations (from STU-184)"
```

---

### Task 3: Generate `index.json`

Write a Node.js script that walks all `*/*/metadata.json` files and produces `index.json`. Run it once manually, then wire it into GitHub Actions.

**Files:**
- Create: `scripts/generate-index.mjs`
- Create: `index.json`

**Step 1: Write the generator script**

`scripts/generate-index.mjs`:
```javascript
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url)) + '/..';
const TYPES = ['tools', 'templates', 'pipelines', 'integrations', 'agents', 'plugins', 'skills'];

const packages = [];

for (const type of TYPES) {
  let names;
  try {
    names = await readdir(join(ROOT, type));
  } catch {
    continue; // directory doesn't exist yet
  }

  for (const name of names) {
    const metaPath = join(ROOT, type, name, 'metadata.json');
    let meta;
    try {
      meta = JSON.parse(await readFile(metaPath, 'utf8'));
    } catch {
      continue; // skip if no metadata.json
    }
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
  }
}

const index = {
  generated_at: new Date().toISOString(),
  version: '1',
  packages,
};

await writeFile(join(ROOT, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log(`Generated index.json with ${packages.length} packages`);
```

**Step 2: Run it**

```bash
cd ~/dev/src/studio-community
node scripts/generate-index.mjs
```

Expected output:
```
Generated index.json with 7 packages
```

**Step 3: Verify `index.json`**

```bash
cat index.json | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const j=JSON.parse(d); console.log('packages:', j.packages.length); j.packages.forEach(p => console.log('-', p.name, p.type));"
```

Expected:
```
packages: 7
- software template
- software-full template
- content template
- document-analysis template
- linear integration
- slack integration
- webhook integration
```

**Step 4: Commit**

```bash
cd ~/dev/src/studio-community
git add scripts/ index.json
git commit -m "feat: add index.json generator and initial index"
```

---

### Task 4: GitHub Action to auto-regenerate `index.json`

**Files:**
- Create: `.github/workflows/generate-index.yml`

**Step 1: Write the workflow**

`.github/workflows/generate-index.yml`:
```yaml
name: Generate index.json

on:
  push:
    branches: [main]
    paths:
      - '*/*/metadata.json'

jobs:
  generate:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Generate index.json
        run: node scripts/generate-index.mjs

      - name: Commit if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add index.json
          git diff --cached --quiet || git commit -m "chore: regenerate index.json"
          git push
```

**Step 2: Commit**

```bash
cd ~/dev/src/studio-community
mkdir -p .github/workflows
git add .github/workflows/generate-index.yml
git commit -m "ci: add GitHub Action to regenerate index.json on metadata changes"
```

---

## Phase 2: Registry Shared Types & Infrastructure (Studio CLI)

All tasks from here are in `~/dev/src/Studio/cli/`.

---

### Task 5: Registry types

**Files:**
- Create: `src/registry/types.ts`
- Create: `src/registry/index.ts` (barrel)

**Step 1: Write `types.ts`**

`src/registry/types.ts`:
```typescript
export type PackageType =
  | 'tool'
  | 'template'
  | 'pipeline'
  | 'integration'
  | 'agent'
  | 'plugin'
  | 'skill';

export interface PackageEntry {
  name: string;
  type: PackageType;
  version: string;
  description: string;
  author: string;
  license: string;
  tags: string[];
  studio_version: string | null;
  downloads: number;
}

export interface RegistryIndex {
  generated_at: string;
  version: string;
  packages: PackageEntry[];
}

export interface PackageMetadata extends PackageEntry {
  requires_binaries?: string[];
}

export interface LockfileEntry {
  version: string;
  type: PackageType;
  installed_at: string;
  sha256: string;
}

export interface Lockfile {
  installed: Record<string, LockfileEntry>;
}

/** Where packages get installed relative to the project's .studio/ dir */
export const INSTALL_DIRS: Record<PackageType, string> = {
  tool: 'tools',
  template: 'projects',  // template name becomes the project name
  pipeline: 'pipelines',
  integration: 'integrations',
  agent: 'agents',
  plugin: 'plugins',
  skill: 'skills',
};

export const REGISTRY_REPO = 'studio-community/registry';
export const REGISTRY_RAW_BASE = `https://raw.githubusercontent.com/${REGISTRY_REPO}/main`;
export const REGISTRY_API_BASE = `https://api.github.com/repos/${REGISTRY_REPO}`;
```

**Step 2: Write `src/registry/index.ts`**

```typescript
export * from './types.js';
export { RegistryCache } from './cache.js';
export { RegistryLockfile } from './lockfile.js';
export { RegistryClient } from './client.js';
```

**Step 3: Commit**

```bash
cd ~/dev/src/Studio/cli
git add src/registry/types.ts src/registry/index.ts
git commit -m "feat(registry): add shared types"
```

---

### Task 6: Registry cache

**Files:**
- Create: `src/registry/cache.ts`
- Create: `tests/registry/cache.test.ts`

**Step 1: Write the failing test**

`tests/registry/cache.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { RegistryCache } from '../../src/registry/cache.js';
import type { RegistryIndex } from '../../src/registry/types.js';

const TMP = resolve(import.meta.dirname, '.tmp-registry-cache');

const MOCK_INDEX: RegistryIndex = {
  generated_at: '2026-02-28T00:00:00Z',
  version: '1',
  packages: [
    {
      name: 'software',
      type: 'template',
      version: '1.0.0',
      description: 'Test template',
      author: 'studio-core',
      license: 'MIT',
      tags: ['software'],
      studio_version: '>=7.0.0',
      downloads: 0,
    },
  ],
};

beforeEach(async () => { await mkdir(TMP, { recursive: true }); });
afterEach(async () => { await rm(TMP, { recursive: true, force: true }); });

describe('RegistryCache', () => {
  it('returns null when cache does not exist', async () => {
    const cache = new RegistryCache(TMP);
    expect(await cache.read()).toBeNull();
  });

  it('writes and reads back correctly', async () => {
    const cache = new RegistryCache(TMP);
    await cache.write(MOCK_INDEX);
    const result = await cache.read();
    expect(result).not.toBeNull();
    expect(result!.packages).toHaveLength(1);
    expect(result!.packages[0].name).toBe('software');
  });

  it('returns null when cache is expired', async () => {
    const cache = new RegistryCache(TMP);
    await cache.write(MOCK_INDEX);
    // Force expire by writing with old timestamp
    const cachePath = resolve(TMP, 'index.json');
    const data = JSON.parse(await readFile(cachePath, 'utf8'));
    data._cached_at = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    await (await import('node:fs/promises')).writeFile(cachePath, JSON.stringify(data));
    expect(await cache.read()).toBeNull();
  });

  it('isFresh returns false when no cache', async () => {
    const cache = new RegistryCache(TMP);
    expect(await cache.isFresh()).toBe(false);
  });

  it('isFresh returns true right after write', async () => {
    const cache = new RegistryCache(TMP);
    await cache.write(MOCK_INDEX);
    expect(await cache.isFresh()).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd ~/dev/src/Studio/cli
npm test -- tests/registry/cache.test.ts
```
Expected: FAIL with import error (file doesn't exist)

**Step 3: Implement `src/registry/cache.ts`**

```typescript
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import type { RegistryIndex } from './types.js';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedIndex extends RegistryIndex {
  _cached_at: string;
}

export class RegistryCache {
  private cacheDir: string;
  private cachePath: string;

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir ?? resolve(homedir(), '.studio', 'registry');
    this.cachePath = resolve(this.cacheDir, 'index.json');
  }

  async read(): Promise<RegistryIndex | null> {
    let raw: string;
    try {
      raw = await readFile(this.cachePath, 'utf8');
    } catch {
      return null;
    }

    const data = JSON.parse(raw) as CachedIndex;
    const age = Date.now() - new Date(data._cached_at).getTime();
    if (age > CACHE_TTL_MS) return null;

    const { _cached_at: _, ...index } = data;
    return index as RegistryIndex;
  }

  async write(index: RegistryIndex): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true });
    const data: CachedIndex = { ...index, _cached_at: new Date().toISOString() };
    await writeFile(this.cachePath, JSON.stringify(data, null, 2) + '\n');
  }

  async isFresh(): Promise<boolean> {
    return (await this.read()) !== null;
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/registry/cache.test.ts
```
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add src/registry/cache.ts tests/registry/cache.test.ts
git commit -m "feat(registry): add RegistryCache with 24h TTL"
```

---

### Task 7: Registry lockfile

**Files:**
- Create: `src/registry/lockfile.ts`
- Create: `tests/registry/lockfile.test.ts`

**Step 1: Write the failing test**

`tests/registry/lockfile.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { RegistryLockfile } from '../../src/registry/lockfile.js';

const TMP = resolve(import.meta.dirname, '.tmp-lockfile');

beforeEach(async () => { await mkdir(TMP, { recursive: true }); });
afterEach(async () => { await rm(TMP, { recursive: true, force: true }); });

describe('RegistryLockfile', () => {
  it('returns empty lockfile when file does not exist', async () => {
    const lf = new RegistryLockfile(TMP);
    const data = await lf.read();
    expect(data.installed).toEqual({});
  });

  it('adds a package entry', async () => {
    const lf = new RegistryLockfile(TMP);
    await lf.add('software', {
      version: '1.0.0',
      type: 'template',
      installed_at: '2026-02-28',
      sha256: 'abc123',
    });
    const data = await lf.read();
    expect(data.installed['software']).toMatchObject({
      version: '1.0.0',
      type: 'template',
      sha256: 'abc123',
    });
  });

  it('removes a package entry', async () => {
    const lf = new RegistryLockfile(TMP);
    await lf.add('software', { version: '1.0.0', type: 'template', installed_at: '2026-02-28', sha256: 'abc' });
    await lf.remove('software');
    const data = await lf.read();
    expect(data.installed['software']).toBeUndefined();
  });

  it('lists installed packages', async () => {
    const lf = new RegistryLockfile(TMP);
    await lf.add('software', { version: '1.0.0', type: 'template', installed_at: '2026-02-28', sha256: 'abc' });
    await lf.add('linear', { version: '1.0.0', type: 'integration', installed_at: '2026-02-28', sha256: 'def' });
    const list = await lf.list();
    expect(list).toHaveLength(2);
    expect(list.map(e => e.name)).toContain('software');
    expect(list.map(e => e.name)).toContain('linear');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/registry/lockfile.test.ts
```
Expected: FAIL

**Step 3: Implement `src/registry/lockfile.ts`**

```typescript
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Lockfile, LockfileEntry, PackageType } from './types.js';

export class RegistryLockfile {
  private lockPath: string;
  private studioDir: string;

  constructor(studioDir: string) {
    this.studioDir = studioDir;
    this.lockPath = resolve(studioDir, 'registry.lock.json');
  }

  async read(): Promise<Lockfile> {
    try {
      const raw = await readFile(this.lockPath, 'utf8');
      return JSON.parse(raw) as Lockfile;
    } catch {
      return { installed: {} };
    }
  }

  private async write(data: Lockfile): Promise<void> {
    await mkdir(this.studioDir, { recursive: true });
    await writeFile(this.lockPath, JSON.stringify(data, null, 2) + '\n');
  }

  async add(name: string, entry: LockfileEntry): Promise<void> {
    const data = await this.read();
    data.installed[name] = entry;
    await this.write(data);
  }

  async remove(name: string): Promise<void> {
    const data = await this.read();
    delete data.installed[name];
    await this.write(data);
  }

  async get(name: string): Promise<LockfileEntry | null> {
    const data = await this.read();
    return data.installed[name] ?? null;
  }

  async list(): Promise<Array<{ name: string } & LockfileEntry>> {
    const data = await this.read();
    return Object.entries(data.installed).map(([name, entry]) => ({ name, ...entry }));
  }
}
```

**Step 4: Run tests**

```bash
npm test -- tests/registry/lockfile.test.ts
```
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/registry/lockfile.ts tests/registry/lockfile.test.ts
git commit -m "feat(registry): add RegistryLockfile"
```

---

### Task 8: Registry client (fetch & download)

**Files:**
- Create: `src/registry/client.ts`
- Create: `tests/registry/client.test.ts`

**Step 1: Write the failing test**

`tests/registry/client.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rm, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const TMP = resolve(import.meta.dirname, '.tmp-client');

const MOCK_INDEX = {
  generated_at: '2026-02-28T00:00:00Z',
  version: '1',
  packages: [
    { name: 'software', type: 'template', version: '1.0.0', description: 'Test', author: 'studio-core', license: 'MIT', tags: [], studio_version: null, downloads: 0 },
  ],
};

const MOCK_METADATA = {
  name: 'software',
  version: '1.0.0',
  description: 'Code generation',
  author: 'studio-core',
  license: 'MIT',
  tags: ['software'],
  type: 'template',
  studio_version: '>=7.0.0',
};

beforeEach(async () => {
  await mkdir(TMP, { recursive: true });
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(async () => {
  await rm(TMP, { recursive: true, force: true });
  vi.unstubAllGlobals();
});

describe('RegistryClient.fetchIndex', () => {
  it('fetches and returns the registry index', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_INDEX,
    } as Response);

    const { RegistryClient } = await import('../../src/registry/client.js');
    const client = new RegistryClient();
    const index = await client.fetchIndex();
    expect(index.packages).toHaveLength(1);
    expect(index.packages[0].name).toBe('software');
  });

  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 404 } as Response);
    const { RegistryClient } = await import('../../src/registry/client.js');
    const client = new RegistryClient();
    await expect(client.fetchIndex()).rejects.toThrow('Failed to fetch registry index');
  });
});

describe('RegistryClient.fetchMetadata', () => {
  it('fetches package metadata', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_METADATA,
    } as Response);
    const { RegistryClient } = await import('../../src/registry/client.js');
    const client = new RegistryClient();
    const meta = await client.fetchMetadata('template', 'software');
    expect(meta.name).toBe('software');
    expect(meta.type).toBe('template');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/registry/client.test.ts
```
Expected: FAIL

**Step 3: Implement `src/registry/client.ts`**

```typescript
import { createWriteStream, createReadStream } from 'node:fs';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import type { RegistryIndex, PackageMetadata, PackageType } from './types.js';
import { REGISTRY_RAW_BASE, REGISTRY_API_BASE } from './types.js';

interface GitHubContentItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
}

export class RegistryClient {
  async fetchIndex(): Promise<RegistryIndex> {
    const res = await fetch(`${REGISTRY_RAW_BASE}/index.json`);
    if (!res.ok) throw new Error(`Failed to fetch registry index: HTTP ${res.status}`);
    return res.json() as Promise<RegistryIndex>;
  }

  async fetchMetadata(type: PackageType, name: string): Promise<PackageMetadata> {
    const res = await fetch(`${REGISTRY_RAW_BASE}/${type}s/${name}/metadata.json`);
    if (!res.ok) throw new Error(`Package '${name}' not found in registry`);
    return res.json() as Promise<PackageMetadata>;
  }

  /**
   * Download a single-file package (tool, pipeline, integration, agent, skill).
   * Returns { destPath, sha256 }.
   */
  async downloadFile(
    type: PackageType,
    name: string,
    filename: string,
    destDir: string,
  ): Promise<{ destPath: string; sha256: string }> {
    const url = `${REGISTRY_RAW_BASE}/${type}s/${name}/${filename}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download ${filename}: HTTP ${res.status}`);
    const content = await res.text();
    const destPath = resolve(destDir, filename);
    await mkdir(destDir, { recursive: true });
    await writeFile(destPath, content);
    const sha256 = createHash('sha256').update(content).digest('hex');
    return { destPath, sha256 };
  }

  /**
   * Download a directory package (template, plugin) by recursively fetching via GitHub API.
   * Returns SHA256 of all concatenated file contents (sorted by path).
   */
  async downloadDirectory(
    type: PackageType,
    name: string,
    remotePath: string,
    localDestDir: string,
  ): Promise<string> {
    const res = await fetch(
      `${REGISTRY_API_BASE}/contents/${type}s/${name}/${remotePath}`,
      { headers: { Accept: 'application/vnd.github+json' } },
    );
    if (!res.ok) throw new Error(`Failed to list directory: HTTP ${res.status}`);
    const items = (await res.json()) as GitHubContentItem[];

    const hash = createHash('sha256');
    const sortedItems = [...items].sort((a, b) => a.path.localeCompare(b.path));

    for (const item of sortedItems) {
      const localPath = resolve(localDestDir, item.name);
      if (item.type === 'dir') {
        await this.downloadDirectory(type, name, `${remotePath}/${item.name}`, localPath);
      } else if (item.download_url) {
        const fileRes = await fetch(item.download_url);
        if (!fileRes.ok) throw new Error(`Failed to download ${item.path}`);
        const content = await fileRes.text();
        await mkdir(dirname(localPath), { recursive: true });
        await writeFile(localPath, content);
        hash.update(item.path + content);
      }
    }

    return hash.digest('hex');
  }
}
```

**Step 4: Run tests**

```bash
npm test -- tests/registry/client.test.ts
```
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/registry/client.ts tests/registry/client.test.ts
git commit -m "feat(registry): add RegistryClient (fetch index + download)"
```

---

## Phase 3: Registry CLI Commands

---

### Task 9: `studio registry sync`

**Files:**
- Create: `src/commands/registry/sync.ts`
- Create: `tests/commands/registry/sync.test.ts`

**Step 1: Write test**

`tests/commands/registry/sync.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rm, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const TMP = resolve(import.meta.dirname, '.tmp-sync');
const MOCK_INDEX = { generated_at: '2026-02-28T00:00:00Z', version: '1', packages: [] };

beforeEach(async () => {
  await mkdir(TMP, { recursive: true });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_INDEX }));
});
afterEach(async () => {
  await rm(TMP, { recursive: true, force: true });
  vi.unstubAllGlobals();
});

describe('syncRegistry', () => {
  it('writes index.json to cache dir', async () => {
    const { syncRegistry } = await import('../../../src/commands/registry/sync.js');
    await syncRegistry({ cacheDir: TMP, force: true });
    const raw = await readFile(resolve(TMP, 'index.json'), 'utf8');
    const data = JSON.parse(raw);
    expect(data.version).toBe('1');
  });

  it('skips sync if cache is fresh and force=false', async () => {
    const { RegistryCache } = await import('../../../src/registry/cache.js');
    const cache = new RegistryCache(TMP);
    await cache.write(MOCK_INDEX);
    vi.mocked(fetch).mockClear();

    const { syncRegistry } = await import('../../../src/commands/registry/sync.js');
    await syncRegistry({ cacheDir: TMP, force: false });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/commands/registry/sync.test.ts
```

**Step 3: Implement `src/commands/registry/sync.ts`**

```typescript
import chalk from 'chalk';
import { RegistryCache } from '../../registry/cache.js';
import { RegistryClient } from '../../registry/client.js';

interface SyncOptions {
  cacheDir?: string;
  force?: boolean;
  silent?: boolean;
}

export async function syncRegistry(options: SyncOptions = {}): Promise<void> {
  const cache = new RegistryCache(options.cacheDir);

  if (!options.force && await cache.isFresh()) {
    if (!options.silent) console.log(chalk.gray('Registry index is up to date.'));
    return;
  }

  if (!options.silent) process.stdout.write('Syncing registry... ');
  const client = new RegistryClient();
  const index = await client.fetchIndex();
  await cache.write(index);
  if (!options.silent) console.log(chalk.green(`✓ ${index.packages.length} packages`));
}
```

**Step 4: Run tests**

```bash
npm test -- tests/commands/registry/sync.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/commands/registry/sync.ts tests/commands/registry/sync.test.ts
git commit -m "feat(registry): add syncRegistry command"
```

---

### Task 10: `studio registry search` and `browse`

**Files:**
- Create: `src/commands/registry/search.ts`
- Create: `tests/commands/registry/search.test.ts`

**Step 1: Write test**

`tests/commands/registry/search.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rm, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { RegistryIndex } from '../../../src/registry/types.js';

const TMP = resolve(import.meta.dirname, '.tmp-search');
const MOCK_INDEX: RegistryIndex = {
  generated_at: '2026-02-28T00:00:00Z',
  version: '1',
  packages: [
    { name: 'software', type: 'template', version: '1.0.0', description: 'Code generation', author: 'studio-core', license: 'MIT', tags: ['software', 'code'], studio_version: null, downloads: 10 },
    { name: 'content', type: 'template', version: '1.0.0', description: 'Content creation', author: 'studio-core', license: 'MIT', tags: ['content', 'writing'], studio_version: null, downloads: 5 },
    { name: 'linear', type: 'integration', version: '1.0.0', description: 'Linear integration', author: 'studio-core', license: 'MIT', tags: ['linear'], studio_version: null, downloads: 3 },
  ],
};

beforeEach(async () => { await mkdir(TMP, { recursive: true }); });
afterEach(async () => { await rm(TMP, { recursive: true, force: true }); });

describe('searchPackages', () => {
  it('filters by query string (name match)', () => {
    const { searchPackages } = require('../../../src/commands/registry/search.js');
    const results = searchPackages(MOCK_INDEX.packages, 'software');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('software');
  });

  it('filters by query string (description match)', () => {
    const { searchPackages } = require('../../../src/commands/registry/search.js');
    const results = searchPackages(MOCK_INDEX.packages, 'creation');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('content');
  });

  it('filters by type', () => {
    const { searchPackages } = require('../../../src/commands/registry/search.js');
    const results = searchPackages(MOCK_INDEX.packages, undefined, 'integration');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('linear');
  });

  it('returns all packages when no query and no type', () => {
    const { searchPackages } = require('../../../src/commands/registry/search.js');
    const results = searchPackages(MOCK_INDEX.packages);
    expect(results).toHaveLength(3);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/commands/registry/search.test.ts
```

**Step 3: Implement `src/commands/registry/search.ts`**

```typescript
import chalk from 'chalk';
import { RegistryCache } from '../../registry/cache.js';
import { syncRegistry } from './sync.js';
import type { PackageEntry, PackageType } from '../../registry/types.js';

export function searchPackages(
  packages: PackageEntry[],
  query?: string,
  type?: PackageType | string,
): PackageEntry[] {
  let results = packages;

  if (type) {
    results = results.filter(p => p.type === type);
  }

  if (query) {
    const q = query.toLowerCase();
    results = results.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q)),
    );
  }

  return results;
}

function renderPackage(pkg: PackageEntry): void {
  console.log(
    `  ${chalk.bold(pkg.name)} ${chalk.gray(`v${pkg.version}`)} ${chalk.cyan(`[${pkg.type}]`)}`,
  );
  console.log(`    ${pkg.description}`);
  if (pkg.tags.length > 0) {
    console.log(`    ${chalk.gray(pkg.tags.join(', '))}`);
  }
}

interface SearchOptions {
  type?: string;
}

export async function searchCommand(query: string, options: SearchOptions = {}): Promise<void> {
  await syncRegistry({ force: false, silent: true });
  const cache = new RegistryCache();
  const index = await cache.read();
  if (!index) {
    console.error(chalk.red('Failed to load registry. Run: studio registry sync'));
    process.exit(1);
  }

  const results = searchPackages(index.packages, query, options.type as PackageType | undefined);

  if (results.length === 0) {
    console.log(chalk.yellow(`No packages found for "${query}"`));
    return;
  }

  console.log(chalk.bold(`\n${results.length} package${results.length > 1 ? 's' : ''} found:\n`));
  for (const pkg of results) {
    renderPackage(pkg);
    console.log();
  }
  console.log(chalk.gray(`Install: studio registry install <name>`));
}

export async function browseCommand(): Promise<void> {
  await syncRegistry({ force: false, silent: true });
  const cache = new RegistryCache();
  const index = await cache.read();
  if (!index) {
    console.error(chalk.red('Failed to load registry. Run: studio registry sync'));
    process.exit(1);
  }

  const sorted = [...index.packages].sort((a, b) => b.downloads - a.downloads);

  console.log(chalk.bold(`\nStudio Community Registry — ${sorted.length} packages\n`));

  const byType: Record<string, PackageEntry[]> = {};
  for (const pkg of sorted) {
    if (!byType[pkg.type]) byType[pkg.type] = [];
    byType[pkg.type].push(pkg);
  }

  for (const [type, pkgs] of Object.entries(byType)) {
    console.log(chalk.bold.underline(`${type}s`));
    for (const pkg of pkgs) {
      renderPackage(pkg);
      console.log();
    }
  }
}
```

**Step 4: Run tests**

```bash
npm test -- tests/commands/registry/search.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/commands/registry/search.ts tests/commands/registry/search.test.ts
git commit -m "feat(registry): add search and browse commands"
```

---

### Task 11: `studio registry install`

This is the most complex command. It downloads the package and places it in the right directory.

**Files:**
- Create: `src/commands/registry/install.ts`
- Create: `tests/commands/registry/install.test.ts`

**Step 1: Write tests**

`tests/commands/registry/install.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rm, mkdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const TMP = resolve(import.meta.dirname, '.tmp-install');
const STUDIO_DIR = join(TMP, '.studio');

const MOCK_METADATA = {
  name: 'linear',
  type: 'integration',
  version: '1.0.0',
  description: 'Linear integration',
  author: 'studio-core',
  license: 'MIT',
  tags: ['linear'],
  studio_version: '>=7.0.0',
};

const MOCK_INDEX = {
  generated_at: '2026-02-28T00:00:00Z',
  version: '1',
  packages: [
    { ...MOCK_METADATA, downloads: 0 },
  ],
};

const FAKE_INTEGRATION_CONTENT = 'name: linear\ntype: integration\n';

beforeEach(async () => {
  await mkdir(STUDIO_DIR, { recursive: true });
  // Mock fetch: index.json, metadata.json, linear.integration.yaml
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => MOCK_INDEX })     // sync
    .mockResolvedValueOnce({ ok: true, json: async () => MOCK_METADATA }) // fetchMetadata
    .mockResolvedValueOnce({ ok: true, text: async () => FAKE_INTEGRATION_CONTENT }) // download
  );
});
afterEach(async () => {
  await rm(TMP, { recursive: true, force: true });
  vi.unstubAllGlobals();
});

describe('installPackage', () => {
  it('installs an integration to .studio/integrations/', async () => {
    const { installPackage } = await import('../../../src/commands/registry/install.js');
    await installPackage('linear', { studioDir: STUDIO_DIR, force: true });

    const dest = resolve(STUDIO_DIR, 'integrations', 'linear.integration.yaml');
    const content = await readFile(dest, 'utf8');
    expect(content).toBe(FAKE_INTEGRATION_CONTENT);
  });

  it('writes lockfile entry after install', async () => {
    const { installPackage } = await import('../../../src/commands/registry/install.js');
    await installPackage('linear', { studioDir: STUDIO_DIR, force: true });

    const lf = JSON.parse(await readFile(resolve(STUDIO_DIR, 'registry.lock.json'), 'utf8'));
    expect(lf.installed['linear']).toMatchObject({
      version: '1.0.0',
      type: 'integration',
    });
    expect(lf.installed['linear'].sha256).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/commands/registry/install.test.ts
```

**Step 3: Implement `src/commands/registry/install.ts`**

```typescript
import chalk from 'chalk';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { RegistryClient } from '../../registry/client.js';
import { RegistryLockfile } from '../../registry/lockfile.js';
import { RegistryCache } from '../../registry/cache.js';
import { syncRegistry } from './sync.js';
import { findStudioDir } from '../../studio-dir.js';
import type { PackageMetadata, PackageType } from '../../registry/types.js';
import { INSTALL_DIRS } from '../../registry/types.js';

const SINGLE_FILE_EXTENSIONS: Record<PackageType, string> = {
  tool: '.tool.yaml',
  pipeline: '.pipeline.yaml',
  integration: '.integration.yaml',
  agent: '.agent.yaml',
  skill: '.skill.md',
  template: '',  // directory
  plugin: '',    // directory
};

const SHELL_EXEC_PATTERN = /execute:\s*\n\s+type:\s*shell/;

interface InstallOptions {
  studioDir?: string;
  force?: boolean;
  cwd?: string;
}

export async function installPackage(nameAtVersion: string, options: InstallOptions = {}): Promise<void> {
  const [name, requestedVersion] = nameAtVersion.split('@');

  // Resolve .studio/ dir
  const studioDir = options.studioDir ?? (findStudioDir(options.cwd ?? process.cwd()) ?? resolve(process.cwd(), '.studio'));
  const lockfile = new RegistryLockfile(studioDir);

  // Check already installed
  const existing = await lockfile.get(name);
  if (existing && !options.force) {
    console.log(chalk.yellow(`${name} v${existing.version} is already installed. Use --force to reinstall.`));
    return;
  }

  // Sync + resolve metadata
  await syncRegistry({ force: false, silent: true });
  const client = new RegistryClient();
  const meta = await client.fetchMetadata('template' as PackageType, name).catch(async () => {
    // Try all types
    const cache = new RegistryCache();
    const index = await cache.read();
    const entry = index?.packages.find(p => p.name === name);
    if (!entry) throw new Error(`Package '${name}' not found in registry`);
    return client.fetchMetadata(entry.type, name) as Promise<PackageMetadata>;
  });

  const type = meta.type as PackageType;
  const version = requestedVersion ?? meta.version;

  // Security check for shell-executing packages
  // (check done at download time after fetching content - see below)

  console.log(`Installing ${chalk.bold(name)} v${version} [${type}]...`);

  let sha256: string;
  const destBaseDir = resolve(studioDir, INSTALL_DIRS[type]);

  if (type === 'template' || type === 'plugin') {
    // Directory download
    const destDir = resolve(destBaseDir, name);
    await mkdir(destDir, { recursive: true });
    sha256 = await client.downloadDirectory(type, name, 'project', destDir);
  } else {
    // Single file download
    const ext = SINGLE_FILE_EXTENSIONS[type];
    const filename = `${name}${ext}`;
    await mkdir(destBaseDir, { recursive: true });
    const result = await client.downloadFile(type, name, filename, destBaseDir);
    sha256 = result.sha256;

    // Security check for shell commands
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(result.destPath, 'utf8');
    if (SHELL_EXEC_PATTERN.test(content)) {
      const { confirm } = await import('@inquirer/prompts');
      const proceed = await confirm({
        message: chalk.yellow(`⚠ This package executes shell commands. Review ${result.destPath} before use. Install anyway?`),
        default: false,
      });
      if (!proceed) {
        await import('node:fs/promises').then(fs => fs.unlink(result.destPath));
        console.log('Installation cancelled.');
        return;
      }
    }
  }

  // Check requires_binaries
  if (meta.requires_binaries?.length) {
    const { spawnSync } = await import('node:child_process');
    for (const bin of meta.requires_binaries) {
      const check = spawnSync('which', [bin], { encoding: 'utf8' });
      if (check.status !== 0) {
        console.log(chalk.yellow(`⚠ Warning: required binary '${bin}' not found in PATH`));
      }
    }
  }

  await lockfile.add(name, {
    version,
    type,
    installed_at: new Date().toISOString().split('T')[0],
    sha256,
  });

  console.log(chalk.green(`✓ Installed ${name} v${version}`));
}

export async function installCommand(nameAtVersion: string, options: { force?: boolean } = {}): Promise<void> {
  try {
    await installPackage(nameAtVersion, options);
  } catch (err) {
    console.error(chalk.red(`Install failed: ${err instanceof Error ? err.message : err}`));
    process.exit(1);
  }
}
```

**Step 4: Run tests**

```bash
npm test -- tests/commands/registry/install.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/commands/registry/install.ts tests/commands/registry/install.test.ts
git commit -m "feat(registry): add install command"
```

---

### Task 12: `studio registry remove`, `update`, `outdated`

**Files:**
- Create: `src/commands/registry/remove.ts`
- Create: `src/commands/registry/update.ts`
- Create: `tests/commands/registry/remove.test.ts`
- Create: `tests/commands/registry/update.test.ts`

**Step 1: Write tests for remove**

`tests/commands/registry/remove.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const TMP = resolve(import.meta.dirname, '.tmp-remove');
const STUDIO = join(TMP, '.studio');

beforeEach(async () => {
  await mkdir(resolve(STUDIO, 'tools'), { recursive: true });
  // plant a fake installed tool
  await writeFile(resolve(STUDIO, 'tools', 'my-tool.tool.yaml'), 'name: my-tool\n');
  await writeFile(resolve(STUDIO, 'registry.lock.json'), JSON.stringify({
    installed: {
      'my-tool': { version: '1.0.0', type: 'tool', installed_at: '2026-02-28', sha256: 'abc' },
    },
  }));
});
afterEach(async () => { await rm(TMP, { recursive: true, force: true }); });

describe('removePackage', () => {
  it('removes the file and lockfile entry', async () => {
    const { removePackage } = await import('../../../src/commands/registry/remove.js');
    await removePackage('my-tool', { studioDir: STUDIO });

    const lf = JSON.parse(await readFile(resolve(STUDIO, 'registry.lock.json'), 'utf8'));
    expect(lf.installed['my-tool']).toBeUndefined();
  });

  it('errors if package not installed', async () => {
    const { removePackage } = await import('../../../src/commands/registry/remove.js');
    await expect(removePackage('nonexistent', { studioDir: STUDIO })).rejects.toThrow('not installed');
  });
});
```

**Step 2: Implement `src/commands/registry/remove.ts`**

```typescript
import chalk from 'chalk';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { RegistryLockfile } from '../../registry/lockfile.js';
import { findStudioDir } from '../../studio-dir.js';
import { INSTALL_DIRS } from '../../registry/types.js';

interface RemoveOptions {
  studioDir?: string;
  cwd?: string;
}

export async function removePackage(name: string, options: RemoveOptions = {}): Promise<void> {
  const studioDir = options.studioDir ?? (findStudioDir(options.cwd ?? process.cwd()) ?? resolve(process.cwd(), '.studio'));
  const lockfile = new RegistryLockfile(studioDir);
  const entry = await lockfile.get(name);
  if (!entry) throw new Error(`'${name}' is not installed`);

  const destDir = resolve(studioDir, INSTALL_DIRS[entry.type]);
  const singleFile = resolve(destDir, `${name}.${entry.type === 'skill' ? 'skill.md' : `${entry.type}.yaml`}`);
  const dirPath = resolve(destDir, name);

  if (entry.type === 'template' || entry.type === 'plugin') {
    if (existsSync(dirPath)) await rm(dirPath, { recursive: true });
  } else {
    // Try common extensions
    const exts: Record<string, string> = { tool: '.tool.yaml', pipeline: '.pipeline.yaml', integration: '.integration.yaml', agent: '.agent.yaml', skill: '.skill.md' };
    const filePath = resolve(destDir, `${name}${exts[entry.type] ?? '.yaml'}`);
    if (existsSync(filePath)) await rm(filePath);
  }

  await lockfile.remove(name);
  console.log(chalk.green(`✓ Removed ${name}`));
}

export async function removeCommand(name: string): Promise<void> {
  try {
    await removePackage(name);
  } catch (err) {
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
```

**Step 3: Write and implement `src/commands/registry/update.ts`**

`tests/commands/registry/update.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const TMP = resolve(import.meta.dirname, '.tmp-update');
const STUDIO = join(TMP, '.studio');

const MOCK_INDEX = {
  generated_at: '2026-02-28T00:00:00Z', version: '1',
  packages: [{ name: 'linear', type: 'integration', version: '2.0.0', description: '', author: '', license: 'MIT', tags: [], studio_version: null, downloads: 0 }],
};

beforeEach(async () => {
  await mkdir(STUDIO, { recursive: true });
  await writeFile(resolve(STUDIO, 'registry.lock.json'), JSON.stringify({
    installed: { 'linear': { version: '1.0.0', type: 'integration', installed_at: '2026-02-28', sha256: 'old' } },
  }));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_INDEX }));
});
afterEach(async () => {
  await rm(TMP, { recursive: true, force: true });
  vi.unstubAllGlobals();
});

describe('outdatedPackages', () => {
  it('returns packages with newer versions in registry', async () => {
    const { outdatedPackages } = await import('../../../src/commands/registry/update.js');
    const result = await outdatedPackages({ studioDir: STUDIO });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: 'linear', installed: '1.0.0', latest: '2.0.0' });
  });
});
```

`src/commands/registry/update.ts`:
```typescript
import chalk from 'chalk';
import { RegistryLockfile } from '../../registry/lockfile.js';
import { RegistryCache } from '../../registry/cache.js';
import { syncRegistry } from './sync.js';
import { installPackage } from './install.js';
import { findStudioDir } from '../../studio-dir.js';
import { resolve } from 'node:path';

interface OutdatedEntry {
  name: string;
  installed: string;
  latest: string;
  type: string;
}

interface UpdateOptions {
  studioDir?: string;
  cwd?: string;
}

export async function outdatedPackages(options: UpdateOptions = {}): Promise<OutdatedEntry[]> {
  const studioDir = options.studioDir ?? (findStudioDir(options.cwd ?? process.cwd()) ?? resolve(process.cwd(), '.studio'));
  await syncRegistry({ force: false, silent: true });
  const cache = new RegistryCache();
  const index = await cache.read();
  if (!index) return [];

  const lockfile = new RegistryLockfile(studioDir);
  const installed = await lockfile.list();
  const results: OutdatedEntry[] = [];

  for (const entry of installed) {
    const latest = index.packages.find(p => p.name === entry.name);
    if (latest && latest.version !== entry.version) {
      results.push({ name: entry.name, installed: entry.version, latest: latest.version, type: entry.type });
    }
  }

  return results;
}

export async function outdatedCommand(): Promise<void> {
  const outdated = await outdatedPackages();
  if (outdated.length === 0) {
    console.log(chalk.green('All packages are up to date.'));
    return;
  }
  console.log(chalk.bold('\nOutdated packages:\n'));
  for (const pkg of outdated) {
    console.log(`  ${chalk.bold(pkg.name)} ${chalk.red(pkg.installed)} → ${chalk.green(pkg.latest)} [${pkg.type}]`);
  }
  console.log(`\nRun: studio registry update <name>`);
}

export async function updateCommand(name: string): Promise<void> {
  try {
    await installPackage(name, { force: true });
  } catch (err) {
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
```

**Step 4: Run tests**

```bash
npm test -- tests/commands/registry/remove.test.ts tests/commands/registry/update.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/commands/registry/remove.ts src/commands/registry/update.ts \
        tests/commands/registry/remove.test.ts tests/commands/registry/update.test.ts
git commit -m "feat(registry): add remove, update, outdated commands"
```

---

### Task 13: `studio registry audit`

**Files:**
- Create: `src/commands/registry/audit.ts`
- Create: `tests/commands/registry/audit.test.ts`

**Step 1: Write test**

`tests/commands/registry/audit.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const TMP = resolve(import.meta.dirname, '.tmp-audit');
const STUDIO = join(TMP, '.studio');
const TOOLS = join(STUDIO, 'tools');

beforeEach(async () => {
  await mkdir(TOOLS, { recursive: true });
});
afterEach(async () => { await rm(TMP, { recursive: true, force: true }); });

describe('auditPackages', () => {
  it('returns ok for intact file', async () => {
    const content = 'name: my-tool\n';
    const sha256 = createHash('sha256').update(content).digest('hex');
    await writeFile(join(TOOLS, 'my-tool.tool.yaml'), content);
    await writeFile(join(STUDIO, 'registry.lock.json'), JSON.stringify({
      installed: { 'my-tool': { version: '1.0.0', type: 'tool', installed_at: '2026-02-28', sha256 } },
    }));

    const { auditPackages } = await import('../../../src/commands/registry/audit.js');
    const results = await auditPackages({ studioDir: STUDIO });
    expect(results[0].ok).toBe(true);
  });

  it('returns tampered for modified file', async () => {
    const original = 'name: my-tool\n';
    const sha256 = createHash('sha256').update(original).digest('hex');
    await writeFile(join(TOOLS, 'my-tool.tool.yaml'), 'name: evil-tool\n');  // tampered!
    await writeFile(join(STUDIO, 'registry.lock.json'), JSON.stringify({
      installed: { 'my-tool': { version: '1.0.0', type: 'tool', installed_at: '2026-02-28', sha256 } },
    }));

    const { auditPackages } = await import('../../../src/commands/registry/audit.js');
    const results = await auditPackages({ studioDir: STUDIO });
    expect(results[0].ok).toBe(false);
    expect(results[0].status).toBe('tampered');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/commands/registry/audit.test.ts
```

**Step 3: Implement `src/commands/registry/audit.ts`**

```typescript
import chalk from 'chalk';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { RegistryLockfile } from '../../registry/lockfile.js';
import { findStudioDir } from '../../studio-dir.js';
import { INSTALL_DIRS } from '../../registry/types.js';
import type { PackageType } from '../../registry/types.js';

interface AuditResult {
  name: string;
  ok: boolean;
  status: 'ok' | 'tampered' | 'missing';
}

const FILE_EXTENSIONS: Partial<Record<PackageType, string>> = {
  tool: '.tool.yaml',
  pipeline: '.pipeline.yaml',
  integration: '.integration.yaml',
  agent: '.agent.yaml',
  skill: '.skill.md',
};

interface AuditOptions {
  studioDir?: string;
  cwd?: string;
}

export async function auditPackages(options: AuditOptions = {}): Promise<AuditResult[]> {
  const studioDir = options.studioDir ?? (findStudioDir(options.cwd ?? process.cwd()) ?? resolve(process.cwd(), '.studio'));
  const lockfile = new RegistryLockfile(studioDir);
  const installed = await lockfile.list();
  const results: AuditResult[] = [];

  for (const entry of installed) {
    const type = entry.type as PackageType;
    const destDir = resolve(studioDir, INSTALL_DIRS[type]);
    const ext = FILE_EXTENSIONS[type];

    let filePath: string;
    if (type === 'template' || type === 'plugin') {
      // For directories, skip SHA check for now (would need to hash the whole tree)
      results.push({ name: entry.name, ok: true, status: 'ok' });
      continue;
    } else {
      filePath = resolve(destDir, `${entry.name}${ext ?? '.yaml'}`);
    }

    if (!existsSync(filePath)) {
      results.push({ name: entry.name, ok: false, status: 'missing' });
      continue;
    }

    const content = await readFile(filePath, 'utf8');
    const actual = createHash('sha256').update(content).digest('hex');
    const ok = actual === entry.sha256;
    results.push({ name: entry.name, ok, status: ok ? 'ok' : 'tampered' });
  }

  return results;
}

export async function auditCommand(): Promise<void> {
  const results = await auditPackages();

  if (results.length === 0) {
    console.log(chalk.gray('No packages installed.'));
    return;
  }

  let hasIssues = false;
  for (const r of results) {
    if (r.ok) {
      console.log(chalk.green(`  ✓ ${r.name}`));
    } else {
      hasIssues = true;
      const label = r.status === 'missing' ? chalk.red('MISSING') : chalk.red('TAMPERED');
      console.log(`  ✗ ${r.name} — ${label}`);
    }
  }

  if (hasIssues) {
    console.log(chalk.yellow('\nRun: studio registry update <name> to reinstall affected packages'));
    process.exit(1);
  }
}
```

**Step 4: Run tests**

```bash
npm test -- tests/commands/registry/audit.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/commands/registry/audit.ts tests/commands/registry/audit.test.ts
git commit -m "feat(registry): add audit command (SHA256 integrity check)"
```

---

### Task 14: `studio registry publish`

**Files:**
- Create: `src/commands/registry/publish.ts`
- Create: `tests/commands/registry/publish.test.ts`

**Step 1: Write test**

`tests/commands/registry/publish.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const TMP = resolve(import.meta.dirname, '.tmp-publish');

const VALID_METADATA = JSON.stringify({
  name: 'my-tool',
  version: '1.0.0',
  description: 'My custom tool',
  author: 'test-user',
  license: 'MIT',
  type: 'tool',
  tags: ['test'],
  studio_version: '>=7.0.0',
});

beforeEach(async () => {
  await mkdir(TMP, { recursive: true });
});
afterEach(async () => { await rm(TMP, { recursive: true, force: true }); });

describe('validatePublishPayload', () => {
  it('accepts valid single-file package', async () => {
    const toolPath = join(TMP, 'my-tool.tool.yaml');
    await writeFile(toolPath, 'name: my-tool\n');
    await writeFile(join(TMP, 'metadata.json'), VALID_METADATA);

    const { validatePublishPayload } = await import('../../../src/commands/registry/publish.js');
    const result = await validatePublishPayload(toolPath);
    expect(result.name).toBe('my-tool');
    expect(result.type).toBe('tool');
  });

  it('rejects missing metadata.json', async () => {
    const toolPath = join(TMP, 'sub', 'my-tool.tool.yaml');
    await mkdir(join(TMP, 'sub'), { recursive: true });
    await writeFile(toolPath, 'name: my-tool\n');

    const { validatePublishPayload } = await import('../../../src/commands/registry/publish.js');
    await expect(validatePublishPayload(toolPath)).rejects.toThrow('metadata.json');
  });

  it('rejects metadata missing required fields', async () => {
    const toolPath = join(TMP, 'my-tool.tool.yaml');
    await writeFile(toolPath, 'name: my-tool\n');
    await writeFile(join(TMP, 'metadata.json'), JSON.stringify({ name: 'my-tool' })); // missing fields

    const { validatePublishPayload } = await import('../../../src/commands/registry/publish.js');
    await expect(validatePublishPayload(toolPath)).rejects.toThrow('Missing required');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/commands/registry/publish.test.ts
```

**Step 3: Implement `src/commands/registry/publish.ts`**

```typescript
import chalk from 'chalk';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import type { PackageMetadata } from '../../registry/types.js';

const REQUIRED_METADATA_FIELDS = ['name', 'version', 'description', 'author', 'license', 'type'];

export async function validatePublishPayload(packagePath: string): Promise<PackageMetadata> {
  if (!existsSync(packagePath)) {
    throw new Error(`Path does not exist: ${packagePath}`);
  }

  const packageDir = dirname(resolve(packagePath));
  const metadataPath = resolve(packageDir, 'metadata.json');

  if (!existsSync(metadataPath)) {
    throw new Error(`metadata.json not found in ${packageDir}`);
  }

  const meta = JSON.parse(await readFile(metadataPath, 'utf8')) as Partial<PackageMetadata>;
  const missing = REQUIRED_METADATA_FIELDS.filter(f => !(f in meta));
  if (missing.length > 0) {
    throw new Error(`Missing required metadata fields: ${missing.join(', ')}`);
  }

  return meta as PackageMetadata;
}

interface PublishOptions {
  dryRun?: boolean;
}

export async function publishCommand(packagePath: string, options: PublishOptions = {}): Promise<void> {
  try {
    console.log('Validating package...');
    const meta = await validatePublishPayload(packagePath);
    console.log(chalk.green(`✓ ${meta.name} v${meta.version} [${meta.type}]`));

    if (options.dryRun) {
      console.log(chalk.gray('Dry run — skipping GitHub PR'));
      return;
    }

    // Check gh CLI is available
    const ghCheck = spawnSync('gh', ['auth', 'status'], { encoding: 'utf8' });
    if (ghCheck.status !== 0) {
      throw new Error('GitHub CLI not authenticated. Run: gh auth login');
    }

    const branchName = `[${meta.type}]/${meta.name}-v${meta.version}`;
    const registryPath = `${meta.type}s/${meta.name}`;
    const packageDir = dirname(resolve(packagePath));

    console.log('Creating GitHub PR...');

    // Fork the registry (idempotent — gh will skip if already forked)
    spawnSync('gh', ['repo', 'fork', 'studio-community/registry', '--clone=false'], { encoding: 'utf8' });

    // Clone fork to temp dir, add files, push, open PR
    const tmp = `/tmp/studio-registry-publish-${Date.now()}`;
    spawnSync('gh', ['repo', 'clone', `$(gh api user --jq .login)/registry`, tmp], { encoding: 'utf8', shell: true });
    spawnSync('git', ['-C', tmp, 'checkout', '-b', branchName.replace(/[\[\]]/g, '').replace(/\//g, '-')], { encoding: 'utf8' });
    spawnSync('cp', ['-r', packageDir, resolve(tmp, registryPath)], { encoding: 'utf8' });
    spawnSync('git', ['-C', tmp, 'add', registryPath], { encoding: 'utf8' });
    spawnSync('git', ['-C', tmp, 'commit', '-m', `[${meta.type}] ${meta.name} v${meta.version}`], { encoding: 'utf8' });
    spawnSync('git', ['-C', tmp, 'push', '-u', 'origin', 'HEAD'], { encoding: 'utf8' });

    const prResult = spawnSync('gh', [
      'pr', 'create',
      '--repo', 'studio-community/registry',
      '--title', `[${meta.type}] ${meta.name} v${meta.version}`,
      '--body', `## ${meta.name}\n\n${meta.description}\n\n**Author:** ${meta.author}\n**License:** ${meta.license}\n**Version:** ${meta.version}`,
    ], { encoding: 'utf8', cwd: tmp });

    if (prResult.status === 0) {
      const prUrl = prResult.stdout.trim();
      console.log(chalk.green(`✓ PR opened: ${prUrl}`));
    } else {
      throw new Error(`Failed to create PR: ${prResult.stderr}`);
    }

    spawnSync('rm', ['-rf', tmp]);
  } catch (err) {
    console.error(chalk.red(`Publish failed: ${err instanceof Error ? err.message : err}`));
    process.exit(1);
  }
}
```

**Step 4: Run tests**

```bash
npm test -- tests/commands/registry/publish.test.ts
```
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/commands/registry/publish.ts tests/commands/registry/publish.test.ts
git commit -m "feat(registry): add publish command (GitHub PR flow)"
```

---

### Task 15: Wire up `studio registry` command in `index.ts`

**Files:**
- Modify: `src/index.ts`
- Create: `src/commands/registry/index.ts`

**Step 1: Read `src/index.ts`**

```bash
cat ~/dev/src/Studio/cli/src/index.ts
```
Note the exact pattern used for existing commands.

**Step 2: Create `src/commands/registry/index.ts`** — Commander subcommand

```typescript
import { Command } from 'commander';
import { searchCommand, browseCommand } from './search.js';
import { installCommand } from './install.js';
import { removeCommand } from './remove.js';
import { updateCommand, outdatedCommand } from './update.js';
import { publishCommand } from './publish.js';
import { auditCommand } from './audit.js';
import { syncRegistry } from './sync.js';

export function createRegistryCommand(): Command {
  const registry = new Command('registry')
    .description('Manage community registry packages');

  registry
    .command('search <query>')
    .description('Search packages in the registry')
    .option('--type <type>', 'Filter by type: tool, template, pipeline, integration, agent, plugin, skill')
    .action((query, options) => searchCommand(query, options));

  registry
    .command('browse')
    .description('Browse most popular packages')
    .action(() => browseCommand());

  registry
    .command('install <name>')
    .description('Install a package (use name@version for specific version)')
    .option('--force', 'Reinstall even if already installed')
    .action((name, options) => installCommand(name, options));

  registry
    .command('remove <name>')
    .description('Uninstall a package')
    .action((name) => removeCommand(name));

  registry
    .command('update <name>')
    .description('Update an installed package to latest')
    .action((name) => updateCommand(name));

  registry
    .command('outdated')
    .description('List packages with available updates')
    .action(() => outdatedCommand());

  registry
    .command('publish <path>')
    .description('Publish a package to the community registry')
    .option('--dry-run', 'Validate only, do not create PR')
    .action((path, options) => publishCommand(path, options));

  registry
    .command('audit')
    .description('Verify integrity of installed packages')
    .action(() => auditCommand());

  registry
    .command('sync')
    .description('Force refresh the registry index cache')
    .action(() => syncRegistry({ force: true }));

  return registry;
}
```

**Step 3: Register in `src/index.ts`**

Add these two lines to `src/index.ts` — import and register the registry command:

```typescript
// Add to imports at top of file:
import { createRegistryCommand } from './commands/registry/index.js';

// Add after other program.addCommand() or program.command() calls:
program.addCommand(createRegistryCommand());
```

**Step 4: Build and test**

```bash
cd ~/dev/src/Studio/cli
npm run build
./dist/index.js registry --help
```

Expected output:
```
Usage: studio registry [command]

Manage community registry packages

Commands:
  search <query>  Search packages in the registry
  browse          Browse most popular packages
  install <name>  Install a package
  ...
```

**Step 5: Commit**

```bash
git add src/commands/registry/index.ts src/index.ts
git commit -m "feat(registry): wire up studio registry command group"
```

---

## Phase 4: Refactor `studio init`

---

### Task 16: Refactor `studio init` to use registry

**Files:**
- Modify: `src/commands/init.ts`
- Modify: `tests/commands/init.test.ts`

**Step 1: Read the current `src/commands/init.ts`**

```bash
cat ~/dev/src/Studio/cli/src/commands/init.ts
```
Understand `generateFullApp`, `createStudioStructure`, and how `templateName` is used to locate files.

**Step 2: Write a failing test for the new registry-backed init**

Add to `tests/commands/init.test.ts`:
```typescript
describe('initCommand (registry-backed)', () => {
  it('calls installPackage when --template is given', async () => {
    vi.mock('../../src/commands/registry/install.js', () => ({
      installPackage: vi.fn().mockResolvedValue(undefined),
    }));

    const { initCommand } = await import('../../src/commands/init.js');
    await initCommand('my-project', { template: 'software', provider: 'anthropic', apiKey: 'sk-ant-test', yes: true });

    const { installPackage } = await import('../../src/commands/registry/install.js');
    expect(vi.mocked(installPackage)).toHaveBeenCalledWith('software', expect.objectContaining({ force: false }));
  });
});
```

**Step 3: Modify `src/commands/init.ts`**

In `generateFullApp` (called when `templateName` is set), replace the local file copy with a call to `installPackage`:

```typescript
// Before (local file copy):
const templateDir = resolve(fileURLToPath(import.meta.url), '../../..', 'templates/projects', templateName);
await generateAppFiles(templateDir, cwd, { PROJECT_NAME: projectName, TEMPLATE_NAME: templateName, YEAR: String(new Date().getFullYear()) });

// After (registry):
import { installPackage } from './registry/install.js';
await installPackage(templateName, { studioDir: resolve(cwd, '.studio'), force: false });
// App scaffold files (src/, prisma/, package.json, README.md) now come from registry project/ directory
```

The key change: `generateAppFiles` copies from local `templates/projects/<name>/`. After refactor, this directory won't exist. Instead, the template's `project/` directory gets downloaded to `.studio/projects/<name>/`. The app scaffold (src/, prisma/, package.json, README.md) lives inside `project/` — copy those out to `cwd`.

Update `generateFullApp` to:
1. Call `installPackage(templateName, { studioDir })` which downloads to `.studio/projects/<name>/`
2. Copy `APP_SCAFFOLD_ITEMS` from `.studio/projects/<name>/` to `cwd`
3. Delete from `.studio/projects/<name>/` (they belong in cwd, not .studio)

**Step 4: Run all init tests**

```bash
npm test -- tests/commands/init.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/commands/init.ts tests/commands/init.test.ts
git commit -m "feat(init): use registry to fetch templates instead of local bundled files"
```

---

### Task 17: Remove bundled templates from Studio CLI

**Files:**
- Delete: `cli/templates/projects/` (all 4 project template directories)

> **Warning: coordinate with the team.** Only do this after Task 16 passes all tests and `studio init --template software` works end-to-end with the live registry.

**Step 1: Verify registry is live**

```bash
studio registry install software --dry-run
```
Expected: no errors, metadata found

**Step 2: Remove local template directories**

```bash
cd ~/dev/src/Studio
rm -rf cli/templates/projects/software
rm -rf cli/templates/projects/software-full
rm -rf cli/templates/projects/content
rm -rf cli/templates/projects/document-analysis
# Keep: cli/templates/projects/blank (no registry equivalent yet)
```

**Step 3: Run all tests**

```bash
cd ~/dev/src/Studio/cli
npm test
```
Expected: all pass (init tests now mock installPackage)

**Step 4: Commit**

```bash
cd ~/dev/src/Studio/cli
git add -u cli/templates/projects/
git commit -m "chore: remove bundled project templates (now served by community registry)"
```

---

## Phase 5: Integration Test

---

### Task 18: End-to-end smoke test

**Step 1: Build the CLI**

```bash
cd ~/dev/src/Studio/cli
npm run build
```

**Step 2: Test search**

```bash
./dist/index.js registry search software
```
Expected: lists `software` and `software-full` templates

**Step 3: Test install in a temp directory**

```bash
mkdir /tmp/studio-test && cd /tmp/studio-test
mkdir .studio
~/dev/src/Studio/cli/dist/index.js registry install software
```
Expected: creates `.studio/projects/software/` with pipeline YAML files, writes `registry.lock.json`

**Step 4: Test audit**

```bash
~/dev/src/Studio/cli/dist/index.js registry audit
```
Expected:
```
  ✓ software
```

**Step 5: Test init (registry-backed)**

```bash
mkdir /tmp/studio-init-test && cd /tmp/studio-init-test
~/dev/src/Studio/cli/dist/index.js init my-app --template software --provider anthropic --api-key $ANTHROPIC_API_KEY
```
Expected: creates project, downloads template from registry, no local template files used

**Step 6: Cleanup**

```bash
rm -rf /tmp/studio-test /tmp/studio-init-test
```

---

## Summary of Commits

| # | Repo | Message |
|---|------|---------|
| 1 | studio-community | `feat: add software, software-full, content, document-analysis templates` |
| 2 | studio-community | `feat: add linear, slack, webhook integrations (from STU-184)` |
| 3 | studio-community | `feat: add index.json generator and initial index` |
| 4 | studio-community | `ci: add GitHub Action to regenerate index.json on metadata changes` |
| 5 | Studio/cli | `feat(registry): add shared types` |
| 6 | Studio/cli | `feat(registry): add RegistryCache with 24h TTL` |
| 7 | Studio/cli | `feat(registry): add RegistryLockfile` |
| 8 | Studio/cli | `feat(registry): add RegistryClient (fetch index + download)` |
| 9 | Studio/cli | `feat(registry): add syncRegistry command` |
| 10 | Studio/cli | `feat(registry): add search and browse commands` |
| 11 | Studio/cli | `feat(registry): add install command` |
| 12 | Studio/cli | `feat(registry): add remove, update, outdated commands` |
| 13 | Studio/cli | `feat(registry): add audit command (SHA256 integrity check)` |
| 14 | Studio/cli | `feat(registry): add publish command (GitHub PR flow)` |
| 15 | Studio/cli | `feat(registry): wire up studio registry command group` |
| 16 | Studio/cli | `feat(init): use registry to fetch templates instead of local bundled files` |
| 17 | Studio/cli | `chore: remove bundled project templates (now served by community registry)` |
