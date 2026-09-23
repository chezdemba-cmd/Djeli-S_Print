"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

const formats = new Set(["A4", "A3", "A2", "A1", "A0"]);
const orientations = new Set(["PORTRAIT", "LANDSCAPE"]);
const colors = new Set(["COLOR", "BLACK_AND_WHITE"]);

export async function createPrintJob(formData: FormData) {
  await requireUser();
  const documentId = String(formData.get("documentId") ?? "");
  const printerId = String(formData.get("printerId") ?? "");
  const format = String(formData.get("format") ?? "");
  const orientation = String(formData.get("orientation") ?? "");
  const colorMode = String(formData.get("colorMode") ?? "");
  const copies = Number(formData.get("copies"));
  const fallback = `/dashboard/documents/${documentId}/prepare`;
  if (!documentId || !printerId || !formats.has(format) || !orientations.has(orientation) || !colors.has(colorMode) || !Number.isInteger(copies) || copies < 1 || copies > 999) {
    redirect(`${fallback}?error=Réglages+d’impression+invalides.`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_print_job", {
    target_document_id: documentId, target_printer_id: printerId,
    requested_format: format, requested_orientation: orientation,
    requested_color_mode: colorMode, requested_copies: copies,
  });
  if (error) redirect(`${fallback}?error=${encodeURIComponent("Le document ou l’imprimante n’est plus disponible.")}`);
  redirect("/dashboard/jobs?message=Travail+d’impression+créé.");
}
