import "server-only";

import { PDFDocument } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { readImageDimensions } from "./image-metadata";
import { imageQualityByFormat } from "./quality";

export async function analyzeDocument(documentId: string) {
  const admin = createAdminClient();
  const { data: document } = await admin.from("documents")
    .select("id, storage_path, mime_type, status").eq("id", documentId).maybeSingle();
  if (!document || document.status !== "RECEIVED") return;
  await admin.from("documents").update({ status: "ANALYZING" }).eq("id", document.id);

  try {
    if (document.mime_type === "application/pdf") {
      const { data: blob, error } = await admin.storage.from("documents").download(document.storage_path);
      if (error || !blob) throw new Error("PDF download failed");
      const pdf = await PDFDocument.load(await blob.arrayBuffer(), { ignoreEncryption: true, updateMetadata: false });
      const pages = pdf.getPages();
      if (pages.length === 0) throw new Error("Empty PDF");
      if (pages.length > 1000) throw new Error("PDF page limit exceeded");
      const first = pages[0]!.getSize();
      const widthMm = first.width * 25.4 / 72;
      const heightMm = first.height * 25.4 / 72;
      if (widthMm > 5080 || heightMm > 5080 || widthMm < 1 || heightMm < 1) throw new Error("PDF dimensions unsafe");
      await admin.from("documents").update({
        status: "READY", page_count: pages.length,
        width_mm: Number(widthMm.toFixed(2)), height_mm: Number(heightMm.toFixed(2)),
        preflight_rating: "EXCELLENT",
        preflight_data: { kind: "pdf", orientation: widthMm > heightMm ? "LANDSCAPE" : "PORTRAIT", pageSizesConsistent: pages.every((page) => { const size = page.getSize(); return Math.abs(size.width - first.width) < 1 && Math.abs(size.height - first.height) < 1; }) },
      }).eq("id", document.id);
      return;
    }

    const { data: signed } = await admin.storage.from("documents").createSignedUrl(document.storage_path, 60);
    if (!signed?.signedUrl) throw new Error("Image URL failed");
    const response = await fetch(signed.signedUrl, { headers: { Range: "bytes=0-262143" }, cache: "no-store" });
    if (response.status !== 206) throw new Error("Image range failed");
    const dimensions = readImageDimensions(new Uint8Array(await response.arrayBuffer()), document.mime_type);
    if (!dimensions || dimensions.width < 1 || dimensions.height < 1) throw new Error("Image dimensions unavailable");
    if (dimensions.width > 100_000 || dimensions.height > 100_000 || dimensions.width * dimensions.height > 400_000_000) {
      throw new Error("Image dimensions unsafe");
    }
    const qualities = imageQualityByFormat(dimensions.width, dimensions.height);
    const a4 = qualities.find((item) => item.format === "A4")!;
    await admin.from("documents").update({
      status: "READY", page_count: 1, width_px: dimensions.width, height_px: dimensions.height,
      preflight_rating: a4.rating, preflight_data: { kind: "image", formatQualities: qualities },
    }).eq("id", document.id);
  } catch {
    await admin.from("documents").update({ status: "FAILED", error_code: "PREFLIGHT_FAILED", error_message: "Le document n’a pas pu être analysé." }).eq("id", document.id);
  }
}
