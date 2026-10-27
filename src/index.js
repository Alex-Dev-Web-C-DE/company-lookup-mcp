import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export default {
  async fetch(request, env, ctx) {
    // Перевіряємо чи це MCP запит (SSE або POST)
    const url = new URL(request.url);
    if (url.pathname !== "/mcp" && url.pathname !== "/sse") {
      return new Response("MCP Server is running. Connect via /mcp", { status: 200 });
    }

    // Для простоти, ми використовуємо HTTP transport (без SSE, щоб не ускладнювати)
    // У реальному MCP це робиться через WebSocket або SSE, але для Cloudflare Workers
    // найпростіше використовувати стандартний JSON-RPC через POST.

    if (request.method === "POST") {
      const body = await request.json().catch(() => null);
      if (!body || !body.method) {
        return new Response(JSON.stringify({ error: "Invalid JSON-RPC" }), { status: 400 });
      }

      const server = new McpServer({ name: "company-lookup", version: "0.1.0" });

      // --- TOOL 1: lookup_by_lei ---
      server.tool(
        "lookup_by_lei",
        "Find legal entity by 20-char LEI code (GLEIF).",
        { lei: z.string().length(20).describe("LEI code, 20 characters") },
        async ({ lei }) => {
          try {
            const r = await fetch(`${env.COMPLIANCE_API_URL}/entity/${encodeURIComponent(lei)}`);
            if (!r.ok) return { content: [{ type: "text", text: `HTTP ${r.status}: Not found` }] };
            const data = await r.json();
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
          } catch (e) {
            return { content: [{ type: "text", text: `Error: ${e.message}` }] };
          }
        }
      );

      // --- TOOL 2: lookup_by_name ---
      server.tool(
        "lookup_by_name",
        "Fuzzy search legal entities by name.",
        {
          name: z.string().min(2).describe("Company name fragment"),
          limit: z.number().int().min(1).max(50).default(10),
        },
        async ({ name, limit }) => {
          try {
            const r = await fetch(`${env.COMPLIANCE_API_URL}/check/entity?q=${encodeURIComponent(name)}&limit=${limit}`);
            if (!r.ok) return { content: [{ type: "text", text: `HTTP ${r.status}: Error` }] };
            const data = await r.json();
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
          } catch (e) {
            return { content: [{ type: "text", text: `Error: ${e.message}` }] };
          }
        }
      );

      // --- TOOL 3: get_address ---
      server.tool(
        "get_address",
        "Return legal address for an LEI.",
        { lei: z.string().length(20) },
        async ({ lei }) => {
          try {
            const r = await fetch(`${env.COMPLIANCE_API_URL}/entity/${encodeURIComponent(lei)}`);
            if (!r.ok) return { content: [{ type: "text", text: `HTTP ${r.status}: Not found` }] };
            const data = await r.json();
            const addr = data.entity?.address || "No address found";
            return { content: [{ type: "text", text: addr }] };
          } catch (e) {
            return { content: [{ type: "text", text: `Error: ${e.message}` }] };
          }
        }
      );

      // Обробка JSON-RPC запиту
      const result = await server.handleRequest(body);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Method Not Allowed", { status: 405 });
  },
};
