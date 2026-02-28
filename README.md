# studio-community

The community registry for [Studio](https://github.com/arianeguay/studio) — share and install tools, templates, pipelines, integrations, agents, plugins, and skills.

This is the [wordpress.org/plugins](https://wordpress.org/plugins/) of Studio.

---

## Install a package

```bash
studio registry install nutrition-tools
studio registry install @studio/integration-linear
studio registry install commit-conventions
studio registry install legal-analyzer-template
studio registry install git-tools@2.1.0
```

## Publish a package

```bash
studio registry publish tools/my-tool.tool.yaml
studio registry publish integrations/my-integration.integration.yaml
studio registry publish skills/my-skill.skill.md
studio registry publish --template ./my-project/
```

---

## Repository structure

```
studio-community/
├── index.json          ← package index (auto-generated, do not edit manually)
├── tools/
├── templates/
├── pipelines/
├── integrations/
├── agents/
├── plugins/
└── skills/
```

Each package lives in its own subdirectory with two files:

```
tools/nutrition-tools/
├── metadata.json           ← name, version, author, tags, type
└── nutrition.tool.yaml     ← the package itself
```

For `template` and `plugin` types, the payload is a full directory instead of a single file:

```
templates/legal-analyzer/
├── metadata.json
└── project/
    ├── pipelines/
    ├── agents/
    ├── contracts/
    ├── tools/
    └── inputs/
```

---

## Package types

| Type | File | Installed into |
|------|------|----------------|
| `tool` | `.tool.yaml` | `.studio/tools/` |
| `template` | directory | `.studio/` (new project) |
| `pipeline` | `.pipeline.yaml` | `.studio/pipelines/` |
| `integration` | `.integration.yaml` | `.studio/integrations/` |
| `agent` | `.agent.yaml` | `.studio/agents/` |
| `plugin` | directory | `.studio/plugins/` |
| `skill` | `.skill.md` | `.studio/skills/` |

---

## metadata.json format

```json
{
  "name": "nutrition-tools",
  "version": "1.0.0",
  "description": "Nutritional analysis and allergen checking tools",
  "author": "your-github-username",
  "license": "MIT",
  "tags": ["cuisine", "nutrition", "health"],
  "type": "tool",
  "studio_version": ">=7.0.0",
  "requires_binaries": ["nutrition-api"]
}
```

Required fields: `name`, `version`, `description`, `author`, `license`, `type`.  
Optional: `tags`, `studio_version`, `requires_binaries`.

---

## Contributing a package

### 1. Fork this repo

### 2. Create your package directory

```
tools/my-tool/
├── metadata.json
└── my-tool.tool.yaml
```

### 3. Validate locally

```bash
studio validate tool .studio/tools/my-tool.tool.yaml
```

### 4. Open a pull request

The PR title should follow: `[type] package-name vX.Y.Z`  
Example: `[tool] nutrition-tools v1.0.0`

The index is regenerated automatically on merge.

---

## Governance

- All packages must be open source (license required)
- No review gate — publish is open
- Flag system for reporting malicious content
- Packages with `execute.type: shell` are shown to the user before install — Studio will display a warning
- No paid packages — this registry is a common good

---

## Security

Packages that execute shell commands (`execute.type: shell` in `.tool.yaml` or `.integration.yaml`) are flagged automatically. Studio will show the commands to the user and require explicit confirmation before installing.

Each installed package is checksummed in `.studio/registry.lock.json`. Run `studio registry audit` to verify integrity.

If you find a malicious package, open an issue with the `[report]` prefix.

---

## Lockfile

Studio maintains `.studio/registry.lock.json` in your project to track installed packages:

```json
{
  "installed": {
    "nutrition-tools": { "version": "1.0.0", "type": "tool", "installed_at": "2026-02-28" },
    "linear": { "version": "1.2.0", "type": "integration", "installed_at": "2026-02-28" },
    "commit-conventions": { "version": "1.0.0", "type": "skill", "installed_at": "2026-02-28" }
  }
}
```

Commit this file. Do not commit the packages themselves — they are installed on demand.

---

## Studio CLI reference

```bash
studio registry search <query>           # Search packages
studio registry search <query> --type tool
studio registry browse                   # Browse most popular
studio registry install <name>           # Install a package
studio registry install <name>@<version> # Install specific version
studio registry update <name>            # Update an installed package
studio registry outdated                 # List packages with updates available
studio registry remove <name>            # Uninstall a package
studio registry publish <path>           # Publish a package
studio registry audit                    # Verify integrity of installed packages
```

---

## Related

- [Studio](https://github.com/PipStudio/studio) — the kernel
- [Ariane Guay Foundation](https://github.com/arianeguay) — governance

> This registry is a common good. Nothing here is for sale.