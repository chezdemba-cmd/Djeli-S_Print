"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import QRCode from "qrcode";
import { createQrSession, type QrSessionState } from "./actions";

const initialState: QrSessionState = {};

export function QrGenerator({ workstations }: { workstations: Array<{ id: string; name: string }> }) {
  const [state, action, pending] = useActionState(createQrSession, initialState);
  const [qrDataUrl, setQrDataUrl] = useState<string>();

  useEffect(() => {
    if (!state.publicUrl) {
      setQrDataUrl(undefined);
      return;
    }
    void QRCode.toDataURL(state.publicUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 520,
      color: { dark: "#0f1a20", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [state.publicUrl]);

  return (
    <div className="qr-layout">
      <form action={action} className="side-card auth-form">
        <label>Poste
          <select name="workstationId" required defaultValue={workstations[0]?.id}>
            {workstations.map((workstation) => <option key={workstation.id} value={workstation.id}>{workstation.name}</option>)}
          </select>
        </label>
        <label>Durée
          <select name="durationMinutes" defaultValue="15">
            <option value="5">5 minutes</option><option value="15">15 minutes</option>
            <option value="30">30 minutes</option><option value="60">60 minutes</option>
          </select>
        </label>
        <button className="primary-button" type="submit" disabled={pending || workstations.length === 0}>
          {pending ? "GÉNÉRATION…" : "GÉNÉRER LE QR"}
        </button>
        {state.error ? <p className="notice error" role="alert">{state.error}</p> : null}
      </form>
      <section className="qr-stage">
        {qrDataUrl && state.publicUrl ? (
          <>
            <Image src={qrDataUrl} alt="QR code de la session d’impression" width={420} height={420} unoptimized />
            <p className="qr-url">{state.publicUrl}</p>
            <p>Session valable jusqu’à {new Date(state.expiresAt!).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.</p>
          </>
        ) : <><div className="qr-placeholder" /><h2>Votre QR apparaîtra ici</h2><p>Chaque QR est temporaire et limité à un document.</p></>}
      </section>
    </div>
  );
}
