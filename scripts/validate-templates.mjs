import { readdir, readFile, stat } from 'node:fs/promises';
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

  try {
    await stat(projectDir);
  } catch {
    errors.push('project/: directory not found');
    return errors;
  }

  // --- Collect cross-ref sets from the template's own project/ ---
  const agentFiles = await ls(join(projectDir, 'agents'));
  const contractFiles = await ls(join(projectDir, 'contracts'));
  const toolFiles = await ls(join(projectDir, 'tools'));
  const agentNames = new Set(agentFiles.filter(f => f.endsWith('.agent.yaml')).map(f => f.slice(0, -'.agent.yaml'.length)));
  const contractNames = new Set(contractFiles.filter(f => f.endsWith('.contract.yaml')).map(f => f.slice(0, -'.contract.yaml'.length)));
  const toolPlugins = new Set(toolFiles.filter(f => f.endsWith('.tool.yaml')).map(f => f.slice(0, -'.tool.yaml'.length)));
  const dependencyAgents = new Set([
    ...(meta.dependencies?.agents?.required ?? []),
    ...(meta.dependencies?.agents?.recommended ?? []),
  ]);

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
              if (!agentNames.has(a) && !dependencyAgents.has(a)) {
                errors.push(`${rel}: agent "${a}" not found in project/agents/ or declared in dependencies`);
              }
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
    let content;
    try {
      content = await readFile(join(projectDir, 'skills', f), 'utf-8');
    } catch (e) {
      errors.push(`project/skills/${f}: cannot read — ${e.message}`);
      continue;
    }
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
