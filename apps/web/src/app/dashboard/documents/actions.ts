"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function deleteDocument(formData: FormData) {
  await requireUser();
  const documentId = String(formData.get("documentId") ?? "");
  if (!documentId) return;
  const supabase = await createClient();
  await supabase.rpc("request_document_deletion", { target_document_id: documentId });
  revalidatePath("/dashboard/documents");
}
