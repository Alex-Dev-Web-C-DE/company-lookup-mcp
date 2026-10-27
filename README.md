# Company Lookup MCP

An MCP (Model Context Protocol) server that provides tools for looking up legal entities and sanctions data by LEI or company name.

## Tools

- `lookup_by_lei` — Find legal entity by 20-char LEI code (GLEIF).
- `lookup_by_name` — Fuzzy search legal entities by name.
- `get_address` — Return legal address for an LEI.

## Data Source

Powered by the Compliance Engine API (https://compliance-engine.boring-saas-infra.workers.dev).

## Usage

Connect to the MCP endpoint:
https://company-lookup-mcp.boring-saas-infra.workers.dev/mcp

Example JSON-RPC request:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "lookup_by_name",
    "arguments": { "name": "Rosneft", "limit": 3 }
  }
}
