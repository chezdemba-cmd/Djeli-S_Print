import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("printAgent", {
  platform: process.platform,
  version: process.versions.electron,
  state: () => ipcRenderer.invoke("agent:state"),
  pair: (code: string) => ipcRenderer.invoke("agent:pair", code),
  onError: (listener: (message: string) => void) => ipcRenderer.on("agent:error", (_event, message: string) => listener(message)),
});
