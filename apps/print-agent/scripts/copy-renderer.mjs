import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../src/renderer");
const destination = resolve(here, "../dist/renderer");

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
