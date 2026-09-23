"use client";

import { useMemo, useState } from "react";
import { createPrintJob } from "./actions";

type PrinterOption = { id: string; name: string; formats: string[]; supportsColor: boolean };

export function PrintSettingsForm({ documentId, printers }: { documentId: string; printers: PrinterOption[] }) {
  const [printerId, setPrinterId] = useState(printers[0]?.id ?? "");
  const printer = useMemo(() => printers.find((item) => item.id === printerId), [printerId, printers]);

  if (printers.length === 0) return <div className="notice error">Aucune imprimante compatible n’est enregistrée. Connectez d’abord le Print Agent.</div>;

  return (
    <form action={createPrintJob} className="print-settings-form">
      <input type="hidden" name="documentId" value={documentId} />
      <label>Imprimante<select name="printerId" value={printerId} onChange={(event) => setPrinterId(event.target.value)}>{printers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <fieldset><legend>Format</legend><div className="segmented-options" key={`formats-${printerId}`}>{printer?.formats.filter((format) => format !== "CUSTOM").map((format, index) => <label key={format}><input type="radio" name="format" value={format} defaultChecked={index === 0} /><span>{format}</span></label>)}</div></fieldset>
      <fieldset><legend>Orientation</legend><div className="segmented-options"><label><input type="radio" name="orientation" value="PORTRAIT" defaultChecked /><span>Portrait</span></label><label><input type="radio" name="orientation" value="LANDSCAPE" /><span>Paysage</span></label></div></fieldset>
      <fieldset><legend>Couleur</legend><div className="segmented-options" key={`colors-${printerId}`}>{printer?.supportsColor ? <label><input type="radio" name="colorMode" value="COLOR" defaultChecked /><span>Couleur</span></label> : null}<label><input type="radio" name="colorMode" value="BLACK_AND_WHITE" defaultChecked={!printer?.supportsColor} /><span>Noir et blanc</span></label></div></fieldset>
      <label>Copies<input name="copies" type="number" min="1" max="999" defaultValue="1" required /></label>
      <button className="print-button" type="submit">CRÉER LE TRAVAIL</button>
    </form>
  );
}
