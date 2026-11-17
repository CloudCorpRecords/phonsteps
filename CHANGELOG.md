# Changelog

## 0.1.0 (2026-10-28)

- First release: a forwarding client for the hosted dyslexiasteps MCP server. All 6 captured tools are answered locally for tools/list, and every tools/call is forwarded upstream over a streamable-HTTP JSON-RPC session (initialize, notifications/initialized, tools/call, honouring the Mcp-Session-Id header when the upstream issues one).
- Tools: `list_word_lists`, `get_word_list`, `get_words_for_grade`, `find_words`, `get_placement_basis`, `get_citation`. The capture carries `title` keys, served verbatim; `list_word_lists`, `find_words`, `get_placement_basis` and `get_citation` carry no `required` key in the capture and none is served; `get_word_list` requires `id` and `get_words_for_grade` requires `grade`.
- Upstream results pass through verbatim, including the isError flag; upstream failures surface as `phonsteps error:` text results.
- One bin serves the CLI (one subcommand per tool, plus `--version`) and the stdio MCP server (`mcp` subcommand). The upstream endpoint can be overridden via `DYSLEXIASTEPS_MCP_URL`. The upstream record declares no headers, so no auth header is ever sent.
