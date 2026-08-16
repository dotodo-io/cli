# dotodo CLI

Install the [dotodo](https://dotodo.io) agent skill and add the MCP server URL for Cursor, Claude Code, Codex, and Grok.

```bash
npx dotodo install
```

The CLI does not log you in or store tokens. After install, sign in with OAuth in your AI client.

Skill source: [dotodo-io/skills](https://github.com/dotodo-io/skills).

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
- `DOTODO_SKILL_REF` — release tag or git ref (default: latest zip)
- `DOTODO_SKILL_DIR` — local skill folder; skip download

## License

MIT
