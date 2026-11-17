# BUILD REPORT — phonsteps

Clean-room rebuild of `dyslexiasteps/dyslexia-steps`
v1.0.1 (remote-only MCP server at
`https://mcp.dyslexiasteps.com/mcp`), built 2026-10-28
as a forwarding client. Package: `@reneturcios/phonsteps`
0.1.0, registry name `io.github.CloudCorpRecords/phonsteps`.

## Surface built

Full surface: **6 of 6 captured tools built**, none omitted.

| Tool | Required fields as served |
|------|---------------------------|
| `list_word_lists` | NO `required` key in the capture — served verbatim, none invented |
| `get_word_list` | `id` |
| `get_words_for_grade` | `grade` |
| `find_words` | NO `required` key in the capture — served verbatim, none invented |
| `get_placement_basis` | NO `required` key in the capture — served verbatim, none invented |
| `get_citation` | NO `required` key in the capture — served verbatim, none invented |

Each served tool carries exactly the keys `name`, `title`,
`description`, `inputSchema`, exactly as captured: the capture
carries `title` keys, so they are served verbatim. The tool
literals were generated programmatically from
`harness/fixtures/dyslexiasteps-tools.json` by the script
at `/tmp/b49-phonsteps-scratch/gen.py` (parse + re-serialise;
the emitted `TOOL_DEFS` block was verified to byte-match the
block in `src/forward.ts`, and the generator's own round-trip
assertion confirmed the literals parse back to the fixture's
tool objects) — never retyped — and the registration-integrity
test suite plus the parity harness confirmed the served
literals deep-equal the fixture's 6 tool objects, in order.
Tools are registered via the MCP SDK low-level Server API
(`ListToolsRequestSchema` / `CallToolRequestSchema` handlers),
not McpServer+zod.

## Fixture conflicts

**None.** The spec and the fixture agree on all 6 tools' names,
titles, descriptions, required fields (including the four tools
with no `required` key: `list_word_lists`, `find_words`,
`get_placement_basis`, `get_citation`, plus `get_word_list`
requiring `id` and `get_words_for_grade` requiring `grade`)
and property shapes.

## Labelled reconstructions (from the spec's Wire section)

- Upstream endpoint pinned: `https://mcp.dyslexiasteps.com/mcp`.
- Env override `DYSLEXIASTEPS_MCP_URL` — labelled reconstruction.
- The registry record declares NO headers on the remote: no auth
  header is ever sent. Tests assert that no `Authorization` header
  is sent under any environment — including with key-like env vars
  (`DYSLEXIASTEPS_API_KEY`, `API_KEY`, `AUTHORIZATION`) set — and
  that no `X-API-Key` header is ever sent; upstream requests carry
  only `Content-Type`, `Accept` and, when issued, `Mcp-Session-Id`.
- Error rendering `phonsteps error:` text for upstream failures —
  labelled reconstruction.
- Upstream results pass through verbatim, including `isError` and
  extra fields. tools/call is forwarded as streamable-HTTP
  JSON-RPC: initialize (protocolVersion `2025-03-26`) →
  notifications/initialized → tools/call, honouring
  `Mcp-Session-Id` when issued; plain-JSON and SSE replies are
  both parsed. The forwarding core takes an injectable fetch;
  tests stub the upstream — no live network calls in tests.

## Deviations

None.

## Lockfile

- Route: generated clean from birth in the build dir with no
  `node_modules` and no pre-existing lockfile:
  `npm install --package-lock-only --ignore-scripts --offline`
  (Route 3).
- Parses as JSON; `name` == `@reneturcios/phonsteps`.
- Package entries: **128**.
- sha256: `e3a8be24b197a42a78b1e3f664754701433db244c7bcdd50c69716df8a6d6d77`
  (re-verified unchanged after the subsequent offline `npm ci`).

## server.json

- Description exactly: "Structured phonics word lists: browse, filter by grade or pattern, placement basis and citations." —
  **97 characters** (verified programmatically).
- npm package entry carries `"version": "0.1.0"`; the OCI entry
  (`ghcr.io/cloudcorprecords/phonsteps:0.1.0`) carries **no**
  `version` field. Both entries carry packageArguments
  `[{type: positional, value: mcp}]` and transport stdio.
  Dockerfile (node:20-alpine, both stages) carries the label
  `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/phonsteps"`.
  Container workflow `IMAGE` is `ghcr.io/cloudcorprecords/phonsteps`
  and its smoke test asserts the server name `phonsteps`.

## Verification (all run 2026-10-28)

1. `npx tsc --noEmit` → exit 0.
2. `npm run build` → exit 0; real `dist/` produced (cli, forward,
   index, mcp, types — .js, .d.ts, .js.map each).
3. `node dist/cli.js --version` → `0.1.0`.
4. `npm test` → **58 tests, 58 pass, 0 fail** (registration-integrity
   suite deep-equals the served tools/list against the fixture's 6
   tools, including the title keys and required-key exactness
   assertions — get_word_list requires id, get_words_for_grade
   requires grade, the other four have NO required key — plus
   session handling/reuse, env override, the
   no-Authorization-header assertions under any environment,
   verbatim argument forwarding and result pass-through including
   upstream isError and structuredContent, SSE parsing, both error
   renderings, MCP-layer validation, and CLI behaviour including a
   forwarding test for every tool subcommand against a local stub
   server).
5. Parity: `python3 /home/hatch/workspace/mcp-rebuild-100/harness/parity.py --original /home/hatch/workspace/mcp-rebuild-100/harness/fixtures/dyslexiasteps-tools.json --rebuild "stdio:node /home/hatch/workspace/mcp-rebuild-100/builds/phonsteps/dist/cli.js mcp" --out /home/hatch/workspace/mcp-rebuild-100/builds/phonsteps/parity-out` → **verdict PASS, parity 100.0**
   (6/6 identical, 0 missing, 0 extra, no schema diffs). Output in
   `parity-out/`.
