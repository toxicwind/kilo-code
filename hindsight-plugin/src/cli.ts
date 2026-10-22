#!/usr/bin/env node
/**
 * kilocode-hindsight
 *
 * Hindsight plugin for Kilo: recall / retrospective across past estate work.
 *
 * Reads, when present:
 *   - the Kappa session store  (~/.local/share/kappa/kappa-main.db)
 *       recent sessions, goals (titles), todo state (blockers / in-progress)
 *   - the Squawk oracle ledger (ranch/squawk/oracle/ledger/ledger.jsonl)
 *       settled / slashed tasks, prior blockers
 *   - the fleet directives file (ranch/hatch/kite/agents/ember/directives.md)
 *       standing directives / INBOX notes
 *
 * Zero runtime dependencies. Requires Node >= 22.5 (node:sqlite).
 */
import { DatabaseSync } from "node:sqlite"
import { readFileSync, existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const HOME = homedir()
const STORE = join(HOME, ".local/share/kappa/kappa-main.db")
const ORACLE_LEDGER = "/home/toxic/estate/ranch/squawk/oracle/ledger/ledger.jsonl"
const DIRECTIVES = "/home/toxic/estate/ranch/hatch/kite/agents/ember/directives.md"

function log(...a) {
  console.log(...a)
}

function openStore(path) {
  if (!existsSync(path)) return null
  const db = new DatabaseSync(path, { readOnly: true })
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => r.name)
  if (!tables.includes("session")) return null
  return db
}

function recentSessions(db, n = 8) {
  if (!db) return []
  return db
    .prepare(
      `SELECT id, title, agent, model, datetime(time_updated/1000,'unixepoch') AS ts,
              summary_additions AS a, summary_deletions AS d, summary_files AS files
       FROM session
       ORDER BY time_updated DESC LIMIT ?`,
    )
    .all(n)
}

function activeTodos(db) {
  if (!db) return []
  return db
    .prepare(
      `SELECT s.title AS session_title, t.content, t.status
       FROM todo t JOIN session s ON s.id = t.session_id
       WHERE t.status IN ('in_progress','pending')
       ORDER BY t.time_updated DESC LIMIT 12`,
    )
    .all()
}

function oracleStats(path) {
  if (!existsSync(path)) return null
  const events = {}
  let settled = 0
  let slashed = 0
  let last = null
  const fd = readFileSync(path, "utf8")
  for (const line of fd.split("\n")) {
    if (!line.trim()) continue
    let rec
    try {
      rec = JSON.parse(line)
    } catch {
      continue
    }
    const ev = rec.event || "unknown"
    events[ev] = (events[ev] || 0) + 1
    if (ev === "settled") settled++
    if (ev === "slashed") slashed++
    last = rec
  }
  return { events, settled, slashed, last }
}

function latestDirectives(path, maxLen = 2000) {
  if (!existsSync(path)) return null
  const text = readFileSync(path, "utf8")
  const lines = text.split("\n").filter(Boolean)
  return lines.slice(0, 40).join("\n").slice(0, maxLen)
}

function modelId(m) {
  if (!m) return ""
  try {
    const j = JSON.parse(m)
    return j.id ?? ""
  } catch {
    return String(m)
  }
}

function fmtSessions(rows) {
  return rows
    .map(
      (r) =>
        `  [${r.ts}] ${r.title}  (${r.agent || "?"}${modelId(r.model) ? `, ${modelId(r.model)}` : ""}${
          typeof r.files === "number" && r.files ? `, +${r.a}/-${r.d} ${r.files}f` : ""
        })`,
    )
    .join("\n")
}

function fmtTodos(rows) {
  return rows.map((r) => `  [${r.status}] (${r.session_title || "?"}) ${r.content}`).join("\n")
}

function fmtOracle(o) {
  if (!o) return "  (oracle ledger not found)"
  return [
    `  settled tasks: ${o.settled}`,
    `  slashed tasks: ${o.slashed}`,
    `  last event: ${o.last ? o.last.event : "-"}${o.last && o.last.task_id ? ` (${o.last.task_id})` : ""}`,
    `  event tally: ${Object.entries(o.events)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 6)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ")}`,
  ].join("\n")
}

function main() {
  const args = process.argv.slice(2)
  if (args.includes("-h") || args.includes("--help")) {
    log(
      `kilocode-hindsight — estate recall plugin
Usage: node src/cli.ts [goals|changed|blockers]

  goals    recent session goals (default)
  changed  recent sessions + diff stats (what changed)
  blockers in-progress / pending todos + oracle slashed
  all      everything above`,
    )
    return
  }
  const mode = args[0] || "goals"
  const db = openStore(STORE)

  if (!db) log(`# store not found: ${STORE}`)
  if (mode === "all") {
    log("## HINDSIGHT — recent goals")
    log(fmtSessions(recentSessions(db)))
    log("\n## HINDSIGHT — what changed (todos/open work)")
    log(fmtTodos(activeTodos(db)))
    log("\n## HINDSIGHT — prior blockers / activity (oracle)")
    log(fmtOracle(oracleStats(ORACLE_LEDGER)))
    log("\n## HINDSIGHT — fleet directives (head)")
    log(latestDirectives(DIRECTIVES) || "  (none)")
  } else if (mode === "changed") {
    if (db) {
      log("## HINDSIGHT — what changed (recent sessions, newest last-session-first)")
      log(fmtSessions(recentSessions(db, 10)))
    } else {
      log("(no session store)")
    }
  } else if (mode === "blockers") {
    log("## HINDSIGHT — prior blockers / open work")
    log(fmtTodos(activeTodos(db)))
    log("\nOracle activity:")
    log(fmtOracle(oracleStats(ORACLE_LEDGER)))
  } else {
    log("## HINDSIGHT — recent goals (sessions)")
    log(fmtSessions(recentSessions(db)))
  }
}

main()
