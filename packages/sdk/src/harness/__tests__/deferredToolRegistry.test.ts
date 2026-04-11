import { describe, it, expect, vi } from "vitest";
import {
  DeferredToolRegistry,
  type DeferredToolEntry,
  type ToolSchema,
} from "../deferredToolRegistry";

describe("GAP-TOOLS-034: DeferredToolRegistry", () => {
  function entry(name: string, desc: string, source: "builtin" | "mcp" | "plugin" | "custom" = "builtin", qualifier?: string): DeferredToolEntry {
    return { name, description: desc, source, sourceQualifier: qualifier };
  }

  describe("registerTools / getAllEntries", () => {
    it("registers and returns tier-1 entries", () => {
      const reg = new DeferredToolRegistry();
      reg.registerTools([
        entry("read", "Read a file"),
        entry("write", "Write a file"),
      ]);
      expect(reg.size).toBe(2);
      expect(reg.getAllEntries().map((e) => e.name)).toEqual(["read", "write"]);
    });

    it("replaces duplicate entries (same source + name)", () => {
      const reg = new DeferredToolRegistry();
      reg.registerTools([entry("read", "v1")]);
      reg.registerTools([entry("read", "v2")]);
      expect(reg.size).toBe(1);
      expect(reg.getAllEntries()[0].description).toBe("v2");
    });

    it("distinguishes tools by source qualifier", () => {
      const reg = new DeferredToolRegistry();
      reg.registerTools([
        entry("read", "Read from server A", "mcp", "serverA"),
        entry("read", "Read from server B", "mcp", "serverB"),
      ]);
      expect(reg.size).toBe(2);
    });
  });

  describe("removeToolsBySource", () => {
    it("removes all entries for a source", () => {
      const reg = new DeferredToolRegistry();
      reg.registerTools([
        entry("t1", "d1", "builtin"),
        entry("t2", "d2", "mcp", "s1"),
        entry("t3", "d3", "mcp", "s2"),
      ]);
      const removed = reg.removeToolsBySource("mcp");
      expect(removed).toBe(2);
      expect(reg.size).toBe(1);
    });

    it("removes entries for a specific source qualifier", () => {
      const reg = new DeferredToolRegistry();
      reg.registerTools([
        entry("t1", "d1", "mcp", "s1"),
        entry("t2", "d2", "mcp", "s2"),
      ]);
      const removed = reg.removeToolsBySource("mcp", "s1");
      expect(removed).toBe(1);
      expect(reg.getAllEntries()[0].sourceQualifier).toBe("s2");
    });
  });

  describe("getEntriesBySource", () => {
    it("filters by source", () => {
      const reg = new DeferredToolRegistry();
      reg.registerTools([
        entry("t1", "d1", "builtin"),
        entry("t2", "d2", "mcp", "s1"),
        entry("t3", "d3", "plugin"),
      ]);
      expect(reg.getEntriesBySource("mcp")).toHaveLength(1);
      expect(reg.getEntriesBySource("builtin")).toHaveLength(1);
    });
  });

  describe("searchTools", () => {
    it("matches by name", () => {
      const reg = new DeferredToolRegistry();
      reg.registerTools([
        entry("file_read", "Read a file"),
        entry("file_write", "Write a file"),
        entry("bash", "Run bash commands"),
      ]);
      const results = reg.searchTools("file");
      expect(results).toHaveLength(2);
    });

    it("matches by description", () => {
      const reg = new DeferredToolRegistry();
      reg.registerTools([
        entry("t1", "Send an email notification"),
        entry("t2", "Read a database record"),
      ]);
      const results = reg.searchTools("email");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("t1");
    });

    it("ranks exact name match highest", () => {
      const reg = new DeferredToolRegistry();
      reg.registerTools([
        entry("grep", "Search file contents"),
        entry("ast_grep", "AST-based grep"),
        entry("searcher", "Like grep but different"),
      ]);
      const results = reg.searchTools("grep");
      expect(results[0].name).toBe("grep");
    });

    it("ranks name prefix match above substring", () => {
      const reg = new DeferredToolRegistry();
      reg.registerTools([
        entry("reader", "Reads things"),
        entry("file_reader", "File reader"),
        entry("readme_viewer", "Views readme"),
      ]);
      const results = reg.searchTools("read");
      expect(results[0].name).toBe("reader"); // prefix match
    });

    it("respects maxResults", () => {
      const reg = new DeferredToolRegistry();
      reg.registerTools(
        Array.from({ length: 30 }, (_, i) => entry(`tool_${i}`, `Description for tool ${i}`)),
      );
      const results = reg.searchTools("tool", 5);
      expect(results).toHaveLength(5);
    });

    it("is case-insensitive", () => {
      const reg = new DeferredToolRegistry();
      reg.registerTools([entry("ReadFile", "READS files from DISK")]);
      expect(reg.searchTools("readfile")).toHaveLength(1);
      expect(reg.searchTools("READS")).toHaveLength(1);
    });
  });

  describe("fetchSchema (tier-2 loading)", () => {
    it("loads schema via registered loader", async () => {
      const reg = new DeferredToolRegistry();
      reg.registerTools([entry("read", "Read a file", "builtin")]);
      const schema: ToolSchema = { inputSchema: { type: "object", properties: { path: { type: "string" } } } };
      reg.registerLoader("builtin", vi.fn().mockResolvedValue(schema));

      const resolved = await reg.fetchSchema("read");
      expect(resolved).toBeDefined();
      expect(resolved?.schema.inputSchema).toEqual(schema.inputSchema);
      expect(resolved?.name).toBe("read");
    });

    it("caches schema after first load", async () => {
      const reg = new DeferredToolRegistry();
      reg.registerTools([entry("read", "Read a file", "builtin")]);
      const loader = vi.fn().mockResolvedValue({ inputSchema: {} });
      reg.registerLoader("builtin", loader);

      await reg.fetchSchema("read");
      await reg.fetchSchema("read");
      expect(loader).toHaveBeenCalledTimes(1);
      expect(reg.loadedSchemaCount).toBe(1);
    });

    it("returns undefined for unknown tool", async () => {
      const reg = new DeferredToolRegistry();
      const result = await reg.fetchSchema("nonexistent");
      expect(result).toBeUndefined();
    });

    it("returns undefined when no loader registered", async () => {
      const reg = new DeferredToolRegistry();
      reg.registerTools([entry("t1", "d1", "custom")]);
      const result = await reg.fetchSchema("t1");
      expect(result).toBeUndefined();
    });

    it("fetches with source filter", async () => {
      const reg = new DeferredToolRegistry();
      reg.registerTools([
        entry("read", "Builtin read", "builtin"),
        entry("read", "MCP read", "mcp", "s1"),
      ]);
      reg.registerLoader("mcp", vi.fn().mockResolvedValue({ inputSchema: { mcp: true } }));

      const resolved = await reg.fetchSchema("read", "mcp", "s1");
      expect(resolved?.source).toBe("mcp");
      expect(resolved?.schema.inputSchema).toEqual({ mcp: true });
    });
  });

  describe("clear", () => {
    it("removes all entries and schemas", async () => {
      const reg = new DeferredToolRegistry();
      reg.registerTools([entry("t1", "d1")]);
      reg.registerLoader("builtin", vi.fn().mockResolvedValue({ inputSchema: {} }));
      await reg.fetchSchema("t1");
      expect(reg.size).toBe(1);
      expect(reg.loadedSchemaCount).toBe(1);
      reg.clear();
      expect(reg.size).toBe(0);
      expect(reg.loadedSchemaCount).toBe(0);
    });
  });
});
