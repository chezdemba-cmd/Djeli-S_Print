import { app, BrowserWindow, ipcMain } from "electron";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { AgentApi } from "../core/agent-api.js";
import { JobRunner } from "../core/job-runner.js";
import { normalizeServerUrl } from "../core/server-url.js";
import { ElectronPrinterProvider } from "./electron-printer-provider.js";
import { loadConfig, saveConfig } from "./secure-config.js";
import { AgentTemporaryFiles } from "./temporary-files.js";

let serverUrl = (process.env.DJELIS_PRINT_SERVER_URL ?? "http://localhost:3000").replace(/\/$/, "");
const api = new AgentApi(serverUrl);
let mainWindow: BrowserWindow;
let runner: JobRunner;
let pairedName: string | null = null;
let synchronizing = false;

function createWindow() {
  mainWindow = new BrowserWindow({ width: 760, height: 620, show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, "preload.js") } });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => { if (!url.startsWith("file:")) event.preventDefault(); });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  void mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  return mainWindow;
}

void app.whenReady().then(async () => {
  createWindow();
  const printers = new ElectronPrinterProvider(() => mainWindow);
  runner = new JobRunner(api, printers, new AgentTemporaryFiles());
  const config = await loadConfig();
  if (config) {
    api.setToken(config.token);
    pairedName = config.workstationName;
    if (config.serverUrl) { serverUrl = config.serverUrl; api.setBaseUrl(serverUrl); }
  }

  ipcMain.handle("agent:state", () => ({ paired: Boolean(pairedName), workstationName: pairedName, serverUrl }));
  ipcMain.handle("agent:pair", async (_event, input: { code: string; serverUrl: string }) => {
    const requestedUrl = normalizeServerUrl(input.serverUrl);
    api.setBaseUrl(requestedUrl);
    const result = await api.pair(input.code, `${process.platform}-${randomUUID()}`, app.getVersion());
    await saveConfig(result.token, result.workstation, requestedUrl);
    serverUrl = requestedUrl;
    api.setToken(result.token); pairedName = result.workstation.name;
    app.setLoginItemSettings({ openAtLogin: true });
    return { paired: true, workstationName: pairedName };
  });

  const synchronize = async () => {
    if (!pairedName || synchronizing) return;
    synchronizing = true;
    try { await api.heartbeat(await printers.discover(), app.getVersion()); await runner.tick(); }
    catch (error) { mainWindow.webContents.send("agent:error", error instanceof Error ? error.message : "Connexion impossible"); }
    finally { synchronizing = false; }
  };
  await synchronize();
  setInterval(() => void synchronize(), 20_000).unref();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
