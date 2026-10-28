import { EventEmitter } from "node:events";
import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  handlers: new Map<string, (...args: any[]) => unknown>(),
  options: {} as Record<string, unknown>,
}));
vi.mock("electron", () => ({
  app: { once: vi.fn(), focus: vi.fn() },
  ipcMain: {
    handle: (name: string, handler: (...args: any[]) => unknown) =>
      state.handlers.set(name, handler),
  },
  BrowserWindow: class extends EventEmitter {
    webContents = Object.assign(new EventEmitter(), {
      mainFrame: {},
      send: vi.fn(),
      setWindowOpenHandler: vi.fn(),
    });
    hide = vi.fn();
    show = vi.fn();
    focus = vi.fn();
    setMenu = vi.fn();
    loadURL = vi.fn(async () => {});
    constructor(options: Record<string, unknown>) {
      super();
      state.options = options;
    }
  },
}));
import { createCitationWindow } from "./citation-window";
beforeEach(() => state.handlers.clear());
it("starts hidden, limits visibility IPC to its own main frame and cancels on close", async () => {
  const window = await createCitationWindow({
    url: "http://127.0.0.1:1234",
    token: "test",
    preload: "/preload.cjs",
    backgroundColor: "#fff",
  });
  expect(state.options.show).toBe(false);
  expect(window.loadURL).toHaveBeenCalledWith(
    "http://127.0.0.1:1234/?citationWindow=1#token=test",
  );
  const visible = state.handlers.get("neoread:citation-visible")!;
  expect(() => visible({ sender: {}, senderFrame: {} }, true)).toThrow(
    "Invalid sender",
  );
  const event = {
    sender: window.webContents,
    senderFrame: window.webContents.mainFrame,
  };
  visible(event, true);
  expect(window.show).toHaveBeenCalledOnce();
  const preventDefault = vi.fn();
  window.emit("close", { preventDefault });
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(window.hide).toHaveBeenCalled();
  expect(window.webContents.send).toHaveBeenCalledWith(
    "neoread:citation-close",
  );
  visible(event, false);
});
