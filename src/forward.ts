/**
 * phonsteps core: a forwarding client for the hosted
 * dyslexiasteps MCP server.
 *
 * Nothing about phonics or word lists is computed here.
 * tools/list is answered from the literal definitions
 * below, which reproduce a live capture of the upstream
 * server word for word (name, title, description and
 * inputSchema exactly as captured; four tools --
 * list_word_lists, find_words, get_placement_basis and
 * get_citation -- carry no `required` key, so none is
 * served for them; get_word_list requires id and
 * get_words_for_grade requires grade). A tools/call
 * travels upstream over a streamable-HTTP JSON-RPC
 * session: an initialize POST, a
 * notifications/initialized POST, then the tools/call
 * POST, carrying the Mcp-Session-Id response header on
 * later requests when the upstream issues one. The
 * session opens lazily on the first forwarded call and
 * is reused for the client's lifetime.
 *
 * The endpoint is pinned to
 * https://mcp.dyslexiasteps.com/mcp and may be replaced
 * with the DYSLEXIASTEPS_MCP_URL environment variable
 * (that override is a labelled reconstruction). The
 * registry record declares NO headers on the upstream
 * remote, so no auth header is ever sent, under any
 * environment.
 *
 * A successful upstream result is returned exactly as
 * received, isError flag and extra fields included.
 * Failures -- an upstream JSON-RPC error, a non-2xx
 * status, a body that cannot be parsed, or a fetch
 * that throws or times out -- become an isError result
 * whose text begins with `phonsteps error:` (that
 * rendering is a labelled reconstruction). Replies may
 * be plain JSON or SSE (`data:` lines); the JSON-RPC
 * message whose id matches the request wins.
 */
import type {
  FetchFn,
  FetchResponseLike,
  ForwardDeps,
  ToolArgs,
  ToolDef,
  ToolResult,
} from "./types.js";

export const VERSION = "0.1.0";

export const DEFAULT_ENDPOINT_URL = "https://mcp.dyslexiasteps.com/mcp";

export const DEFAULT_TIMEOUT_MS = 30000;

export const PROTOCOL_VERSION = "2025-03-26";

/* ------------------------------------------------------------------ */
/* Tool definitions (tools/list literals, verbatim from the live       */
/* capture in harness/fixtures/dyslexiasteps-tools.json;               */
/* generated programmatically by parsing and re-serialising the        */
/* fixture JSON, never retyped). All 6 captured tools are built.       */
/* ------------------------------------------------------------------ */

export const TOOL_DEFS: ToolDef[] = [
  {
    "name": "list_word_lists",
    "title": "List word lists",
    "description": "Lists the available word lists with id, title, language, section, grade range, the source of the grade placement and word count. Filter by language, grade (English lists whose grade range includes it) or section. A grade is a typical guide, not a rule: programs and standards differ, and it is not an assessment of any child. English lists are placed by grade; lists in other languages follow each language's own curriculum and have no grade.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "language": {
          "type": "string",
          "enum": [
            "en",
            "de",
            "es",
            "fr",
            "nl",
            "pt-br"
          ],
          "description": "en, de, es, fr, nl or pt-br. Omit for all."
        },
        "grade": {
          "type": "string",
          "enum": [
            "pre-k",
            "kindergarten",
            "grade-1",
            "grade-2",
            "grade-3"
          ],
          "description": "English lists that cover this grade."
        },
        "section": {
          "type": "string",
          "enum": [
            "cvc",
            "families",
            "sight",
            "digraphs",
            "patterns",
            "wordlist"
          ],
          "description": "cvc, families, sight, digraphs, patterns or wordlist (other languages)."
        }
      },
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_word_list",
    "title": "Get one word list",
    "description": "The full list: every word, its groups (for example -at, -an, -ap families), the grade range, the placement basis, the page URL and the license. Use an id from list_word_lists, e.g. short-a, kindergarten, sh.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "description": "List id, e.g. short-a, kindergarten, vowel-teams, or es:palabras-con-m"
        }
      },
      "required": [
        "id"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_words_for_grade",
    "title": "Words for a grade",
    "description": "Every different English word from the lists that cover a grade, deduplicated, with the lists each word comes from. Optional section filter (for example only sight words or only cvc). A grade is a typical guide, not a rule: programs and standards differ, and it is not an assessment of any child. English lists are placed by grade; lists in other languages follow each language's own curriculum and have no grade.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "grade": {
          "type": "string",
          "enum": [
            "pre-k",
            "kindergarten",
            "grade-1",
            "grade-2",
            "grade-3"
          ],
          "description": "pre-k, kindergarten, grade-1, grade-2 or grade-3"
        },
        "section": {
          "type": "string",
          "enum": [
            "cvc",
            "families",
            "sight",
            "digraphs",
            "patterns",
            "wordlist"
          ]
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 1500,
          "description": "Maximum words to return. Default 300."
        }
      },
      "required": [
        "grade"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "find_words",
    "title": "Find words by pattern",
    "description": "Finds words in the lists that start with, end with or contain a letter pattern, for example 'sh', 'ck', '-ight' or 'ai'. Returns each match with its list, grade range and page. Case-insensitive.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "contains": {
          "type": "string",
          "minLength": 1,
          "maxLength": 12
        },
        "starts_with": {
          "type": "string",
          "minLength": 1,
          "maxLength": 12
        },
        "ends_with": {
          "type": "string",
          "minLength": 1,
          "maxLength": 12
        },
        "language": {
          "type": "string",
          "enum": [
            "en",
            "de",
            "es",
            "fr",
            "nl",
            "pt-br"
          ]
        },
        "grade": {
          "type": "string",
          "enum": [
            "pre-k",
            "kindergarten",
            "grade-1",
            "grade-2",
            "grade-3"
          ],
          "description": "Only English lists covering this grade."
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 500,
          "description": "Default 60."
        }
      },
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_placement_basis",
    "title": "How grades were assigned",
    "description": "Explains the source of each grade placement: Dolch's own grade levels (1936, public domain), the Common Core Foundational Skills item that names the skill, or a typical sequence when no standard names it. Includes the limits.",
    "inputSchema": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {}
    }
  },
  {
    "name": "get_citation",
    "title": "How to cite and reuse the word lists",
    "description": "License (CC BY 4.0 for the compilation; the Dolch words are public domain), the citation text and the CSV and JSON download addresses.",
    "inputSchema": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {}
    }
  }
];
export const TOOL_NAMES = TOOL_DEFS.map((t) => t.name);

/** Whether `name` belongs to the captured built surface. */
export function isKnownTool(name: string): boolean {
  return TOOL_NAMES.includes(name);
}

/* ------------------------------------------------------------------ */
/* Forwarding client                                                   */
/* ------------------------------------------------------------------ */

function errorResult(detail: string): ToolResult {
  return {
    content: [{ type: "text", text: `phonsteps error: ${detail}` }],
    isError: true,
  };
}

function rpcErrorMessage(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message !== "") return message;
    return JSON.stringify(error);
  }
  return String(error);
}

/**
 * Read a JSON-RPC response body, tolerating SSE framing.
 * Returns the message whose id matches `expectedId` when
 * present, otherwise the last parseable message, otherwise
 * null when nothing in the body parses.
 */
export function parseRpcBody(
  text: string,
  expectedId?: number,
): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const candidates: Record<string, unknown>[] = [];
  const tryPush = (payload: string): void => {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        candidates.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Not a JSON payload; skip this candidate.
    }
  };
  if (trimmed.includes("data:")) {
    for (const line of trimmed.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice("data:".length).trim();
      if (payload !== "" && payload !== "[DONE]") tryPush(payload);
    }
  } else {
    tryPush(trimmed);
  }
  if (candidates.length === 0) return null;
  if (expectedId !== undefined) {
    const match = candidates.find((c) => c.id === expectedId);
    if (match !== undefined) return match;
  }
  return candidates[candidates.length - 1];
}

async function defaultFetch(
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
): Promise<FetchResponseLike> {
  return fetch(url, init) as unknown as FetchResponseLike;
}

/**
 * A forwarding client holding a single upstream session,
 * opened lazily on first use and reused from then on
 * (for the process lifetime in the MCP server, or for a
 * single invocation in the CLI).
 */
export class PhonstepsClient {
  private readonly deps: ForwardDeps;
  private sessionId: string | null = null;
  private ready = false;
  private sessionPromise: Promise<void> | null = null;
  private idCounter = 0;

  constructor(deps: ForwardDeps = {}) {
    this.deps = deps;
  }

  private fetchFn(): FetchFn {
    return this.deps.fetchFn ?? defaultFetch;
  }

  private endpointUrl(): string {
    if (this.deps.url && this.deps.url.trim() !== "") return this.deps.url.trim();
    const raw = (this.deps.env ?? process.env).DYSLEXIASTEPS_MCP_URL;
    if (raw && raw.trim() !== "") return raw.trim();
    return DEFAULT_ENDPOINT_URL;
  }

  private timeoutMs(): number {
    if (typeof this.deps.timeoutMs === "number" && this.deps.timeoutMs > 0) {
      return this.deps.timeoutMs;
    }
    return DEFAULT_TIMEOUT_MS;
  }

  private nextId(): number {
    this.idCounter += 1;
    return this.idCounter;
  }

  private async post(
    body: unknown,
    withSession: boolean,
  ): Promise<FetchResponseLike> {
    // The registry record declares NO headers on the upstream
    // remote: no Authorization header is ever sent.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (withSession && this.sessionId !== null) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      return await this.fetchFn()(this.endpointUrl(), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async ensureSession(): Promise<void> {
    if (this.ready) return;
    if (this.sessionPromise === null) {
      this.sessionPromise = (async () => {
        const initId = this.nextId();
        const initRes = await this.post(
          {
            jsonrpc: "2.0",
            id: initId,
            method: "initialize",
            params: {
              protocolVersion: PROTOCOL_VERSION,
              capabilities: {},
              clientInfo: { name: "phonsteps", version: VERSION },
            },
          },
          false,
        );
        const sessionId = initRes.headers.get("mcp-session-id");
        if (sessionId) this.sessionId = sessionId;
        const initText = await initRes.text();
        const initParsed = parseRpcBody(initText, initId);
        if (initParsed !== null && initParsed.error) {
          throw new Error(rpcErrorMessage(initParsed.error));
        }
        if (initRes.status < 200 || initRes.status >= 300) {
          throw new Error(`HTTP ${initRes.status}`);
        }
        if (initParsed === null && initText.trim() !== "") {
          throw new Error("malformed response");
        }
        const initializedRes = await this.post(
          { jsonrpc: "2.0", method: "notifications/initialized" },
          true,
        );
        try {
          await initializedRes.text();
        } catch {
          // Nothing needed from the notification response body.
        }
        this.ready = true;
      })();
    }
    try {
      await this.sessionPromise;
    } catch (err) {
      this.sessionPromise = null;
      this.sessionId = null;
      throw err;
    }
  }

  /** Forward one tool call; upstream failures come back as isError results. */
  async callTool(name: string, args: ToolArgs): Promise<ToolResult> {
    try {
      await this.ensureSession();
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }

    const callId = this.nextId();
    let callRes: FetchResponseLike;
    try {
      callRes = await this.post(
        {
          jsonrpc: "2.0",
          id: callId,
          method: "tools/call",
          params: { name, arguments: args ?? {} },
        },
        true,
      );
    } catch (err) {
      return errorResult(
        `request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const parsed = parseRpcBody(await callRes.text(), callId);
    if (parsed !== null && parsed.error) {
      return errorResult(rpcErrorMessage(parsed.error));
    }
    if (callRes.status < 200 || callRes.status >= 300) {
      return errorResult(`HTTP ${callRes.status}`);
    }
    if (parsed === null) return errorResult("malformed response");
    const result = parsed.result as ToolResult | undefined;
    if (result === undefined || result === null || typeof result !== "object") {
      return errorResult("malformed response");
    }
    // Hand the upstream result back exactly as received.
    return result;
  }
}

/** Build a forwarding client; tests inject a fake fetch and env through deps. */
export function createClient(deps: ForwardDeps = {}): PhonstepsClient {
  return new PhonstepsClient(deps);
}

/** One-shot helper: a fresh client for a single call (the CLI path). */
export async function callTool(
  name: string,
  args: ToolArgs,
  deps: ForwardDeps = {},
): Promise<ToolResult> {
  return new PhonstepsClient(deps).callTool(name, args);
}
