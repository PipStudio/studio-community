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
      dependencies: meta.dependencies ?? {},
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
