import { app, BrowserWindow, ipcMain } from "electron";

/** The hidden renderer owns the citation stream; the library never subscribes. */
export async function createCitationWindow(options: {
  url: string;
  token: string;
  preload: string;
  backgroundColor: string;
}) {
  const window = new BrowserWindow({
    title: "引注",
    width: 740,
    height: 740,
    minWidth: 520,
    minHeight: 420,
    show: false,
    minimizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    backgroundColor: options.backgroundColor,
    webPreferences: {
      preload: options.preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  window.setMenu(null);
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.on("will-attach-webview", (event) =>
    event.preventDefault(),
  );
  window.on("close", (event) => {
    if (quitting) return;
    event.preventDefault();
    window.hide();
    window.webContents.send("neoread:citation-close");
  });
  let quitting = false;
  app.once("before-quit", () => {
    quitting = true;
  });
  ipcMain.handle("neoread:citation-visible", (event, visible: unknown) => {
    if (
      event.sender !== window.webContents ||
      event.senderFrame !== window.webContents.mainFrame
    )
      throw new Error("Invalid sender");
    if (typeof visible !== "boolean") throw new Error("Invalid visibility");
    if (!visible) {
      window.hide();
      return;
    }
    window.show();
    if (process.platform === "darwin") app.focus({ steal: true });
    window.focus();
  });
  await window.loadURL(
    `${options.url}/?citationWindow=1#token=${options.token}`,
  );
  return window;
}
