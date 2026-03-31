---
summary: "CLI reference for `openclaw skills` (search/install/update/list/info/check)"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search, install, or update skills
  - You want to debug missing binaries/env/config for skills
title: "skills"
---

# `openclaw skills`

Inspect local skills and install/update skills.

Related:

- Skills system: [Skills](/tools/skills)
- Skills config: [Skills config](/tools/skills-config)

## Commands

```bash
openclaw skills search "calendar"
openclaw skills install <slug>
openclaw skills install <slug> --version <version>
openclaw skills update <slug>
openclaw skills update --all
openclaw skills list
openclaw skills list --eligible
openclaw skills info <name>
openclaw skills check
```

`search`/`install`/`update` install into the active
workspace `skills/` directory. `list`/`info`/`check` inspect the local
skills visible to the current workspace and config.
