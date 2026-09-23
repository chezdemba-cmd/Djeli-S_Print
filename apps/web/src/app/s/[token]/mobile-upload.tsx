"use client";

import { useMemo, useRef, useState } from "react";
import * as tus from "tus-js-client";

type Phase = "idle" | "ready" | "uploading" | "finalizing" | "done" | "error";
const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export function MobileUpload({ token, maxUploadBytes }: { token: string; maxUploadBytes: number }) {
  const [file, setFile] = useState<File>();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const sizeLabel = useMemo(() => file ? new Intl.NumberFormat("fr-FR", { style: "unit", unit: "megabyte", maximumFractionDigits: 2 }).format(file.size / 1_000_000) : "", [file]);

  function choose(selected?: File) {
    setMessage(undefined);
    setProgress(0);
    if (!selected) return;
    if (!allowed.has(selected.type)) { setPhase("error"); setMessage("Format non accepté. Utilisez PDF, JPG, PNG ou WEBP."); return; }
    if (selected.size < 1 || selected.size > maxUploadBytes) { setPhase("error"); setMessage(`Le fichier dépasse la limite de ${Math.round(maxUploadBytes / 1_048_576)} Mio.`); return; }
    setFile(selected); setPhase("ready");
  }

  async function beginUpload() {
    if (!file) return;
    setPhase("uploading"); setMessage(undefined);
    const init = await fetch(`/api/s/${token}/uploads`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename: file.name, mimeType: file.type, sizeBytes: file.size }),
    });
    const reservation = await init.json() as { error?: string; documentId?: string; path?: string; uploadToken?: string };
    if (!init.ok || !reservation.documentId || !reservation.path || !reservation.uploadToken) {
      setPhase("error"); setMessage(reservation.error ?? "Impossible de préparer l’envoi."); return;
    }

    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const endpoint = `${projectUrl.replace(".supabase.co", ".storage.supabase.co")}/storage/v1/upload/resumable`;
    const upload = new tus.Upload(file, {
      endpoint,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      chunkSize: 6 * 1024 * 1024,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: { "x-signature": reservation.uploadToken },
      metadata: { bucketName: "documents", objectName: reservation.path, contentType: file.type, cacheControl: "no-cache" },
      onProgress(bytesUploaded, bytesTotal) { setProgress(Math.round((bytesUploaded / bytesTotal) * 100)); },
      onError() { setPhase("error"); setMessage("L’envoi a été interrompu. Réessayez avec un nouveau QR."); },
      async onSuccess() {
        setProgress(100); setPhase("finalizing");
        const result = await fetch(`/api/s/${token}/uploads/${reservation.documentId}/finalize`, { method: "POST" });
        const body = await result.json() as { error?: string };
        if (!result.ok) { setPhase("error"); setMessage(body.error ?? "Le fichier n’a pas pu être validé."); return; }
        setPhase("done");
      },
    });
    const previous = await upload.findPreviousUploads();
    if (previous[0]) upload.resumeFromPreviousUpload(previous[0]);
    upload.start();
  }

  if (phase === "done") return <div className="upload-success"><span>✓</span><h2>Document envoyé</h2><p>Votre document est disponible au comptoir.</p></div>;

  return (
    <div className="mobile-uploader">
      <input ref={inputRef} hidden type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => choose(event.target.files?.[0])} />
      {!file || phase === "error" ? <button className="mobile-file-button" type="button" onClick={() => inputRef.current?.click()}>CHOISIR UN FICHIER</button> : null}
      {file && phase !== "error" ? <div className="selected-file"><strong>{file.name}</strong><span>{file.type} · {sizeLabel}</span></div> : null}
      {phase === "ready" ? <button className="primary-button mobile-submit" type="button" onClick={beginUpload}>ENVOYER POUR IMPRESSION</button> : null}
      {(phase === "uploading" || phase === "finalizing") ? <div className="upload-progress"><div><span style={{ width: `${progress}%` }} /></div><strong>{phase === "finalizing" ? "Vérification…" : `${progress} %`}</strong></div> : null}
      {message ? <p className="notice error" role="alert">{message}</p> : null}
    </div>
  );
}
