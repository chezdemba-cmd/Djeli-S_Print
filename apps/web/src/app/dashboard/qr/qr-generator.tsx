"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import QRCode from "qrcode";
import { createQrSession, getActiveQrSessionStatus, type QrSessionState } from "./actions";

const initialState: QrSessionState = {};

type CachedSession = { token: string; publicUrl: string; expiresAt: string };

function storageKey(workstationId: string) {
  return `djelis-qr:${workstationId}`;
}

// The raw token is never persisted server-side (only its HMAC hash is, like
// every other secret in this app) — so "show the same QR again on reload"
// can only be done from a cache in this browser, not fetched back from the
// server. See supabase/migrations/202609270012_day_pass_qr_sessions.sql.
function readCachedSession(workstationId: string): CachedSession | undefined {
  try {
    const raw = window.localStorage.getItem(storageKey(workstationId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CachedSession;
    if (!parsed.token || !parsed.publicUrl || Date.parse(parsed.expiresAt) <= Date.now()) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function writeCachedSession(workstationId: string, session: CachedSession) {
  try {
    window.localStorage.setItem(storageKey(workstationId), JSON.stringify(session));
  } catch {
    // Private browsing / storage disabled: the QR still displays for this
    // page view, it just won't survive a reload. Not worth surfacing.
  }
}

export function QrGenerator({ workstations }: { workstations: Array<{ id: string; name: string }> }) {
  const [state, action, pending] = useActionState(createQrSession, initialState);
  const [workstationId, setWorkstationId] = useState(workstations[0]?.id ?? "");
  const [session, setSession] = useState<CachedSession>();
  const [remoteActiveUntil, setRemoteActiveUntil] = useState<string>();
  const [qrDataUrl, setQrDataUrl] = useState<string>();

  // Resolve what to show for the selected workstation: a locally cached QR
  // takes priority (zero server round-trip); otherwise ask the server
  // whether one is already active from another screen.
  useEffect(() => {
    setQrDataUrl(undefined);
    setRemoteActiveUntil(undefined);
    if (!workstationId) { setSession(undefined); return; }

    const cached = readCachedSession(workstationId);
    setSession(cached);
    if (cached) return;

    let cancelled = false;
    void getActiveQrSessionStatus(workstationId).then((status) => {
      if (!cancelled && status.active) setRemoteActiveUntil(status.expiresAt);
    });
    return () => { cancelled = true; };
  }, [workstationId]);

  // A fresh (re)generation succeeded: cache it and adopt it as the session
  // shown on screen.
  useEffect(() => {
    if (!state.token || !state.publicUrl || !state.expiresAt || !workstationId) return;
    const fresh: CachedSession = { token: state.token, publicUrl: state.publicUrl, expiresAt: state.expiresAt };
    writeCachedSession(workstationId, fresh);
    setSession(fresh);
    setRemoteActiveUntil(undefined);
  }, [state.token, state.publicUrl, state.expiresAt, workstationId]);

  useEffect(() => {
    if (!session?.publicUrl) { setQrDataUrl(undefined); return; }
    void QRCode.toDataURL(session.publicUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 520,
      color: { dark: "#0f1a20", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [session?.publicUrl]);

  const alreadyKnown = Boolean(session || remoteActiveUntil);
  const expiryLabel = (value: string) => new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="qr-layout">
      <form action={action} className="side-card auth-form">
        <label>Poste
          <select name="workstationId" required value={workstationId} onChange={(event) => setWorkstationId(event.target.value)}>
            {workstations.map((workstation) => <option key={workstation.id} value={workstation.id}>{workstation.name}</option>)}
          </select>
        </label>
        <button className="primary-button" type="submit" disabled={pending || workstations.length === 0}>
          {pending ? "GÉNÉRATION…" : alreadyKnown ? "RÉGÉNÉRER LE QR DU JOUR" : "GÉNÉRER LE QR DU JOUR"}
        </button>
        {alreadyKnown ? <p className="notice">Régénérer invalide immédiatement l’ancien QR : les clients qui l’ont déjà scanné ne pourront plus l’utiliser.</p> : null}
        {state.error ? <p className="notice error" role="alert">{state.error}</p> : null}
      </form>
      <section className="qr-stage">
        {qrDataUrl && session ? (
          <>
            <Image src={qrDataUrl} alt="QR code de la session d’impression" width={420} height={420} unoptimized />
            <p className="qr-url">{session.publicUrl}</p>
            <p>Valable jusqu’au {expiryLabel(session.expiresAt)}.</p>
          </>
        ) : remoteActiveUntil ? (
          <>
            <div className="qr-placeholder" />
            <h2>Un QR est déjà actif pour ce poste</h2>
            <p>Généré depuis un autre écran, valable jusqu’au {expiryLabel(remoteActiveUntil)}. Cliquez sur Régénérer pour en afficher un ici.</p>
          </>
        ) : <><div className="qr-placeholder" /><h2>Votre QR apparaîtra ici</h2><p>Un seul QR par poste, valable toute la journée pour tous vos clients.</p></>}
      </section>
    </div>
  );
}
