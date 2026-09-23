import { app, safeStorage } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type StoredConfig = { encryptedToken: string; workstationId: string; workstationName: string };

export async function loadConfig(): Promise<{ token: string; workstationId: string; workstationName: string } | null> {
  if (!safeStorage.isEncryptionAvailable()) return null;
  try {
    const stored = JSON.parse(await readFile(configPath(), "utf8")) as StoredConfig;
    return { token: safeStorage.decryptString(Buffer.from(stored.encryptedToken, "base64")), workstationId: stored.workstationId, workstationName: stored.workstationName };
  } catch { return null; }
}

export async function saveConfig(token: string, workstation: { id: string; name: string }) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error("Le chiffrement système n’est pas disponible.");
  const target = configPath();
  await mkdir(path.dirname(target), { recursive: true });
  const stored: StoredConfig = { encryptedToken: safeStorage.encryptString(token).toString("base64"), workstationId: workstation.id, workstationName: workstation.name };
  await writeFile(target, JSON.stringify(stored), { encoding: "utf8", mode: 0o600 });
}

function configPath() { return path.join(app.getPath("userData"), "agent-config.json"); }
