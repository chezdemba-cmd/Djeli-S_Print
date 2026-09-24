import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("printAgent", {
  platform: process.platform,
  version: process.versions.electron,
  state: () => ipcRenderer.invoke("agent:state"),
  pair: (input: { code: string; serverUrl: string }) => ipcRenderer.invoke("agent:pair", input),
  onError: (listener: (message: string) => void) => ipcRenderer.on("agent:error", (_event, message: string) => listener(message)),
});
