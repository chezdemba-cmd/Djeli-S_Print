"use client";

import { useActionState } from "react";
import { createPairingCode, type PairingState } from "./actions";

export function PairAgentForm({ workstationId }: { workstationId: string }) {
  const [state, action, pending] = useActionState<PairingState, FormData>(createPairingCode, {});
  return (
    <form action={action} className="pairing-form">
      <input type="hidden" name="workstationId" value={workstationId} />
      <button className="secondary-button" type="submit" disabled={pending}>{pending ? "CRÉATION…" : "LIER L’AGENT"}</button>
      {state.error ? <small className="notice error">{state.error}</small> : null}
      {state.code ? <div className="pairing-code"><strong>{state.code}</strong><small>À saisir dans l’agent avant {new Date(state.expiresAt!).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}. Affiché une seule fois.</small></div> : null}
    </form>
  );
}
