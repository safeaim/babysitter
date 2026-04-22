import { describe, it, expect, beforeEach } from "vitest";
import {
  getAmuxClient,
  isAmuxAvailable,
  _resetAmuxClientCache,
} from "../amuxClientFactory";

async function expectAmuxUnavailable(): Promise<void> {
  await expect(getAmuxClient()).rejects.toThrow(
    /agent-mux runtime is unavailable|node:sqlite/,
  );
}

beforeEach(() => {
  _resetAmuxClientCache();
});

describe("getAmuxClient", () => {
  it("returns a client instance when the runtime can load agent-mux", async () => {
    if (!(await isAmuxAvailable())) {
      await expectAmuxUnavailable();
      return;
    }
    const client = await getAmuxClient();
    expect(client).not.toBeNull();
    expect(client).toBeDefined();
  });

  it("caches the client across calls", async () => {
    if (!(await isAmuxAvailable())) {
      await expectAmuxUnavailable();
      return;
    }
    const first = await getAmuxClient();
    const second = await getAmuxClient();
    expect(first).toBe(second);
  });
});

describe("isAmuxAvailable", () => {
  it("matches whether the runtime can create an agent-mux client", async () => {
    const available = await isAmuxAvailable();
    if (available) {
      const client = await getAmuxClient();
      expect(client).toBeDefined();
      return;
    }
    await expectAmuxUnavailable();
  });
});

describe("_resetAmuxClientCache", () => {
  it("allows re-creation after reset", async () => {
    if (!(await isAmuxAvailable())) {
      await expectAmuxUnavailable();
      _resetAmuxClientCache();
      await expectAmuxUnavailable();
      return;
    }
    const first = await getAmuxClient();
    _resetAmuxClientCache();
    const second = await getAmuxClient();
    expect(first).not.toBe(second);
    expect(second).not.toBeNull();
  });
});
