import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("printAgent", {
  platform: process.platform,
  version: process.versions.electron,
});
