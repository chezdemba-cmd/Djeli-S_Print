"use client";

import { useActionState, useState } from "react";
import { createPairingCode, type PairingState } from "./actions";

export function PairAgentForm({ workstationId }: { workstationId: string }) {
  const [state, action, pending] = useActionState<PairingState, FormData>(createPairingCode, {});
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!state.code) return;
    await navigator.clipboard.writeText(state.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <form action={action} className="pairing-form">
      <input type="hidden" name="workstationId" value={workstationId} />
      {!state.code ? (
        <button className="secondary-button" type="submit" disabled={pending}>
          {pending ? "CRÉATION…" : "LIER L’AGENT"}
        </button>
      ) : null}
      {state.error ? <small className="notice error">{state.error}</small> : null}
      {state.code ? (
        <div className="pairing-code">
          <div className="pairing-code-heading"><span>CODE D’APPAIRAGE</span><span className="pairing-live">● ACTIF</span></div>
          <div className="pairing-code-value">
            <code>{state.code}</code>
            <button type="button" onClick={copyCode}>{copied ? "COPIÉ ✓" : "COPIER"}</button>
          </div>
          <small>À saisir dans le Print Agent avant {new Date(state.expiresAt!).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}. Ce code n’est affiché qu’une seule fois.</small>
        </div>
      ) : null}
    </form>
  );
}
