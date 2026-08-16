# dotodo CLI

Install the **dotodo agent skill** (from [dotodo-io/skills](https://github.com/dotodo-io/skills)) and merge a **URL-only MCP server entry** for Cursor, Claude Code, Codex, and Grok.

This CLI **does not log you in**. It does not store tokens, write Authorization headers, or call the API. After install, complete OAuth in your AI client.

```bash
npx dotodo install
```

https://dotodo.io · [npm](https://www.npmjs.com/package/dotodo)

## What it does

1. Downloads `skill.zip` from [the latest GitHub Release](https://github.com/dotodo-io/skills/releases/latest/download/skill.zip) (fallback: repo tarball on `main`).
2. Copies the skill into agent skill directories.
3. Merges `mcpServers.dotodo.url` = `https://mcp.dotodo.io/mcp` (or `--mcp-url`).

## Commands

| Command     | What it does                                                             |
| ----------- | ------------------------------------------------------------------------ |
| `install`   | Fetch skill; copy into agent skill dirs; merge MCP URL                   |
| `update`    | Same as install (overwrite skill; ensure MCP entry)                      |
| `uninstall` | Remove skill dirs and the `dotodo` MCP entry (`--keep-mcp` to leave MCP) |
| `status`    | Show which agents have the skill / MCP URL                               |

```bash
npx dotodo install
npx dotodo update
npx dotodo uninstall
npx dotodo status
npx dotodo help
```

## Options

```
--agents, -a <list|all>   cursor,claude,codex,grok or all (default: detected)
--global                  User home paths (default)
--project                 Project-local paths when the client supports them
--mcp-url <url>           Default https://mcp.dotodo.io/mcp
--no-mcp, --skill-only    Skip MCP config
--mcp-only                Only MCP config
--dry-run                 Print actions, write nothing
--force                   Replace a different existing MCP URL
--keep-mcp                uninstall: leave MCP entry
```

Environment:

- `DOTODO_MCP_URL` — default MCP URL
- `DOTODO_SKILL_REF` — release tag (e.g. `skill-a2a2f29`) or git ref (`main`)
- `DOTODO_SKILL_DIR` — local skill folder; skip download

## Develop from a checkout

```bash
git clone https://github.com/dotodo-io/cli.git
cd cli
npm install
npm test
node bin/dotodo.js install --dry-run --agents cursor
```

`npm link` also works (`dotodo help` on PATH); unlink with `npm unlink -g dotodo`.

## License

MIT
