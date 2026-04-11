import { describe, it, expect, vi } from "vitest";
import { InboundMessageQueue } from "../inboundQueue";
import type { ChannelMessage } from "../types";

function msg(source: string, content: string, id?: string): ChannelMessage {
  return {
    messageId: id ?? `msg-${Math.random().toString(36).slice(2)}`,
    source,
    sender: "user1",
    content,
    receivedAt: new Date().toISOString(),
  };
}

describe("GAP-MCPC-001: InboundMessageQueue", () => {
  describe("bind/unbind channels", () => {
    it("binds a channel to a run", () => {
      const queue = new InboundMessageQueue();
      queue.bindChannel("slack:C123", "run-1");
      expect(queue.getBoundRunId("slack:C123")).toBe("run-1");
    });

    it("unbinds a channel", () => {
      const queue = new InboundMessageQueue();
      queue.bindChannel("slack:C123", "run-1");
      queue.unbindChannel("slack:C123");
      expect(queue.getBoundRunId("slack:C123")).toBeUndefined();
    });

    it("lists all bindings", () => {
      const queue = new InboundMessageQueue();
      queue.bindChannel("slack:C1", "run-1");
      queue.bindChannel("discord:D1", "run-2");
      expect(queue.getBindings()).toHaveLength(2);
    });
  });

  describe("enqueue", () => {
    it("queues message for bound run", () => {
      const queue = new InboundMessageQueue();
      queue.bindChannel("slack:C123", "run-1");
      queue.enqueue(msg("slack:C123", "hello"));
      expect(queue.queueSize("run-1")).toBe(1);
    });

    it("queues to unbound when no binding exists", () => {
      const queue = new InboundMessageQueue();
      queue.enqueue(msg("slack:C999", "orphan"));
      expect(queue.getUnboundMessages()).toHaveLength(1);
    });

    it("fires wake callback for bound run", () => {
      const onWake = vi.fn();
      const queue = new InboundMessageQueue({ onWake });
      queue.bindChannel("slack:C1", "run-1");
      const m = msg("slack:C1", "wake up");
      queue.enqueue(m);
      expect(onWake).toHaveBeenCalledWith("run-1", m);
    });

    it("trims queue at maxQueueSize", () => {
      const queue = new InboundMessageQueue({ maxQueueSize: 3 });
      queue.bindChannel("s:c", "r1");
      for (let i = 0; i < 5; i++) {
        queue.enqueue(msg("s:c", `msg-${i}`));
      }
      expect(queue.queueSize("r1")).toBe(3);
      const msgs = queue.peek("r1", 10);
      expect(msgs[0].content).toBe("msg-2"); // oldest trimmed
    });
  });

  describe("peek / dequeue", () => {
    it("peek returns messages without removing", () => {
      const queue = new InboundMessageQueue();
      queue.bindChannel("s:c", "r1");
      queue.enqueue(msg("s:c", "a"));
      queue.enqueue(msg("s:c", "b"));
      const peeked = queue.peek("r1");
      expect(peeked).toHaveLength(2);
      expect(queue.queueSize("r1")).toBe(2);
    });

    it("dequeue removes messages", () => {
      const queue = new InboundMessageQueue();
      queue.bindChannel("s:c", "r1");
      queue.enqueue(msg("s:c", "a"));
      queue.enqueue(msg("s:c", "b"));
      const dequeued = queue.dequeue("r1", 1);
      expect(dequeued).toHaveLength(1);
      expect(dequeued[0].content).toBe("a");
      expect(queue.queueSize("r1")).toBe(1);
    });

    it("returns empty for unknown run", () => {
      const queue = new InboundMessageQueue();
      expect(queue.peek("nope")).toEqual([]);
      expect(queue.dequeue("nope")).toEqual([]);
    });
  });

  describe("hasMessages", () => {
    it("returns true when messages exist", () => {
      const queue = new InboundMessageQueue();
      queue.bindChannel("s:c", "r1");
      queue.enqueue(msg("s:c", "hi"));
      expect(queue.hasMessages("r1")).toBe(true);
    });

    it("returns false when empty", () => {
      const queue = new InboundMessageQueue();
      expect(queue.hasMessages("r1")).toBe(false);
    });
  });

  describe("clear", () => {
    it("clears all queues and bindings", () => {
      const queue = new InboundMessageQueue();
      queue.bindChannel("s:c", "r1");
      queue.enqueue(msg("s:c", "hi"));
      queue.clear();
      expect(queue.hasMessages("r1")).toBe(false);
      expect(queue.getBoundRunId("s:c")).toBeUndefined();
    });
  });
});
