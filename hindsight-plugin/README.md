# kilocode-hindsight

Hindsight plugin for Kilo: recall / retrospective across past estate work.

Reads (when present) the estate's history sources and surfaces them as a
hindsight query:

| Source               | Path                                          | Gives                                                    |
| -------------------- | --------------------------------------------- | -------------------------------------------------------- |
| Kappa session store  | `~/.local/share/kappa/kappa-main.db`          | recent goals (session titles), todos (open/blocked work) |
| Squawk oracle ledger | `ranch/squawk/oracle/ledger/ledger.jsonl`     | settled/slashed tasks, prior blockers, activity tally    |
| Fleet directives     | `ranch/hatch/kite/agents/ember/directives.md` | standing fleet directives / INBOX notes                  |

## Usage

Zero runtime dependencies — requires Node >= 22.5 (`node:sqlite`).

```bash
node src/cli.ts            # recent goals (default)
node src/cli.ts goals      # recent session goals
node src/cli.ts changed    # what changed (recent sessions)
node src/cli.ts blockers   # in-progress / pending todos + oracle activity
node src/cli.ts all        # everything
node src/cli.ts --help     # usage
```

## Example

```text
## HINDSIGHT — recent goals (sessions)
  [2026-10-22 21:19:27] Kilo hindsight plugin replay (@general subagent)  (general, deepseek-v4-flash)
  [2026-10-22 21:19:25] New session - 2026-10-22T01:29:44.467Z  (code, deepseek-v4-flash)
  [2026-10-22 21:18:00] Fix broken market-loop rig (@general subagent)  (general, deepseek-v4-flash)

## HINDSIGHT — prior blockers / open work
  [in_progress] (Kilo hindsight plugin replay ...) Build hindsight-plugin CLI ...
  [pending] (Give oracle full hindsight ...) Create .../oracle/hindsight.md

Oracle activity:
  settled tasks: 162
  slashed tasks: 71
```

## Notes

- Data paths are estate-local; the plugin degrades gracefully (prints "not found")
  when a source is absent.
- No `node_modules`, no `package-lock` — this is a self-contained script package,
  committed-able as-is.
