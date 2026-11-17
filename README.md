# phonsteps

Which word lists exist, which words belong to a grade, and which words match a letter pattern? phonsteps is a local forwarding client for the hosted dyslexiasteps MCP service: it answers `tools/list` locally from the captured tool definitions and forwards every call to the service, returning the answers exactly as the service sends them back.

The catalogue is a published set of structured phonics word lists (a CC BY 4.0 compilation; the Dolch words are public domain). Lists are browsable by language, grade, and section; words can be pulled per grade or found by pattern; and the service also explains how each grade placement was assigned and how to cite and reuse the lists. There is no write, signup, or send tool in this surface.

## The tools

- **`list_word_lists`** — Lists the available word lists with id, title, language, section, grade range, placement source, and word count. Optional filters: `language` (`en`, `de`, `es`, `fr`, `nl`, `pt-br`), `grade` (English lists covering it), and `section` (`cvc`, `families`, `sight`, `digraphs`, `patterns`, `wordlist`). No required parameters.
- **`get_word_list`** — The full list: every word, its groups (for example the -at, -an, -ap families), grade range, placement basis, page URL, and license. Requires `id` (for example `short-a`, `kindergarten`, `sh`).
- **`get_words_for_grade`** — Every different English word from the lists covering a grade, deduplicated, with the lists each word comes from. Requires `grade` (`pre-k`, `kindergarten`, `grade-1`, `grade-2`, `grade-3`); optional `section` filter and `limit` (1–1500, default 300).
- **`find_words`** — Words that start with, end with, or contain a letter pattern (for example `sh`, `ck`, `-ight`, `ai`), case-insensitive, each match returned with its list, grade range, and page. Optional `contains`, `starts_with`, `ends_with`, `language`, `grade`, and `limit` (1–500, default 60). No required parameters.
- **`get_placement_basis`** — How grades were assigned: Dolch's own grade levels, the Common Core Foundational Skills item naming the skill, or a typical sequence when no standard names it, including the limits. No parameters.
- **`get_citation`** — The license, the citation text, and the CSV and JSON download addresses for the word lists. No parameters.

A grade here is a typical guide, not a rule: programs and standards differ, and it is not an assessment of any child. English lists are placed by grade; lists in other languages follow each language's own curriculum and have no grade.

## Install and run

As an MCP server via npm:

```bash
npx -y @reneturcios/phonsteps mcp
```

MCP client configuration:

```json
{
  "mcpServers": {
    "phonsteps": {
      "command": "npx",
      "args": ["-y", "@reneturcios/phonsteps", "mcp"]
    }
  }
}
```

As a container:

```bash
docker run -i ghcr.io/cloudcorprecords/phonsteps
docker run --rm ghcr.io/cloudcorprecords/phonsteps find_words '{}'
```

## CLI

One binary serves both the command line and the MCP server. Each tool is a subcommand taking a single JSON string with that tool's arguments:

```bash
phonsteps list_word_lists '{"language":"en","section":"cvc"}'
phonsteps get_word_list '{"id":"short-a"}'
phonsteps get_words_for_grade '{"grade":"grade-1","limit":50}'
phonsteps find_words '{"contains":"ight"}'
phonsteps get_placement_basis '{}'
phonsteps get_citation '{}'
phonsteps --version
```

Exit codes: `0` when the forwarded call succeeds, `1` when the upstream result is an error, and `2` for usage problems such as an unknown subcommand or a malformed JSON argument.

## Configuration

- `DYSLEXIASTEPS_MCP_URL` — Overrides the upstream endpoint. The default is the pinned hosted endpoint, `https://mcp.dyslexiasteps.com/mcp`. (The override variable is a reconstruction added by this rebuild.)

The upstream registry record declares no headers, so no authentication header is ever sent; the tool surface was captured keyless.

Upstream failures — a JSON-RPC error from the service, a non-2xx response, an unreadable body, or a request that fails outright — are reported to the caller as an error result whose text starts with `phonsteps error:`.

## How forwarding works

The first forwarded call opens a session: an `initialize` request (protocol version `2025-03-26`), followed by a `notifications/initialized` notification, then the `tools/call` itself. If the service answers the initialize request with an `Mcp-Session-Id` header, that value is carried on every later request, and the open session is reused for the rest of the process. Replies are accepted either as plain JSON or as server-sent events. Successful results pass through verbatim, including any `isError` flag and any extra fields the service includes.

## Development

```bash
npm install
npm run build   # tsc -> dist/ (dist/cli.js is the bin)
npm test        # tsx --test test/*.test.ts — stubbed upstream, no network
npm run dev     # run the CLI from source
```

The test suite checks the served tool list against the captured surface (all 6 tools, deep-equal, in order, titles included exactly as captured, and no `required` key added to the four tools that carry none), exercises the session handshake and its reuse, verifies that no `Authorization` or `X-API-Key` header is ever sent under any environment, and verifies that arguments go upstream untouched and results come back untouched.

## License

MIT — see `LICENSE`. Copyright (c) 2026 Rene Turcios.
