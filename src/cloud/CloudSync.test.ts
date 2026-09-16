import { afterEach, describe, expect, it, vi } from "vitest";
import { CloudSync } from "./CloudSync";

type Listener = (event: Event) => void;
const listeners = new Map<string, Listener>();

const rawWindow = {
  addEventListener: (type: string, handler: Listener) => listeners.set(type, handler),
  removeEventListener: (type: string, handler: Listener) => {
    if (listeners.get(type) === handler) listeners.delete(type);
  },
  dispatchEvent: (type: string) => {
    listeners.get(type)?.(new Event(type));
  },
};
const fakeWindow = rawWindow as unknown as { addEventListener: typeof window.addEventListener; removeEventListener: typeof window.removeEventListener };
afterEach(() => {
  listeners.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CloudSync online listener lifecycle", () => {
  it("构造时注册 online 监听,dispose 时移除", () => {
    vi.stubGlobal("window", fakeWindow);
    const onStatus = vi.fn();
    const sync = new CloudSync(onStatus);

    expect(listeners.has("online")).toBe(true);

    sync.dispose();
    expect(listeners.has("online")).toBe(false);
  });

  it("online 事件触发 flush;dispose 后不再触发", async () => {
    vi.stubGlobal("window", fakeWindow);
    const onStatus = vi.fn();
    const sync = new CloudSync(onStatus);
    const flushSpy = vi.spyOn(CloudSync.prototype, "flush").mockResolvedValue(null);

    rawWindow.dispatchEvent("online");
    await vi.waitFor(() => expect(flushSpy).toHaveBeenCalledTimes(1));

    sync.dispose();
    rawWindow.dispatchEvent("online");
    expect(flushSpy).toHaveBeenCalledTimes(1);
  });
});
