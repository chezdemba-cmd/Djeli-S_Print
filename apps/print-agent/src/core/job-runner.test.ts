import assert from "node:assert/strict";
import test from "node:test";
import { JobRunner } from "./job-runner.js";

const job = { job_id: "job", document_id: "doc", mime_type: "application/pdf", printer_system_name: "printer", copies: 2, color_mode: "COLOR", orientation: "PORTRAIT", paper_format: "A4", downloadUrl: "https://example.invalid/doc" } as const;

test("runner reports lifecycle and always removes its temporary file", async () => {
  const events: string[] = [];
  const api = { claim: async () => job, report: async (_id: string, status: string) => { events.push(status); } };
  const printers = { discover: async () => [], print: async () => { events.push("print"); } };
  const files = { download: async () => "temp.pdf", remove: async () => { events.push("remove"); } };
  assert.equal(await new JobRunner(api as never, printers, files).tick(), true);
  assert.deepEqual(events, ["PRINTING", "print", "PRINTED", "remove"]);
});

test("runner reports a failure and removes the file after a printer error", async () => {
  const events: string[] = [];
  const api = { claim: async () => job, report: async (_id: string, status: string) => { events.push(status); } };
  const printers = { discover: async () => [], print: async () => { throw new Error("paper jam"); } };
  const files = { download: async () => "temp.pdf", remove: async () => { events.push("remove"); } };
  assert.equal(await new JobRunner(api as never, printers, files).tick(), false);
  assert.deepEqual(events, ["PRINTING", "FAILED", "remove"]);
});
