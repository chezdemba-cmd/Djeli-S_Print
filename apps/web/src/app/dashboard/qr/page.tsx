import Link from "next/link";
import { getMemberships } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { QrGenerator } from "./qr-generator";

export default async function QrPage() {
  const memberships = await getMemberships();
  const organizationId = memberships[0]?.organization_id;
  const supabase = await createClient();
  const { data } = organizationId
    ? await supabase.from("workstations").select("id, name").eq("organization_id", organizationId).order("name")
    : { data: [] };

  return (
    <main className="dashboard-shell narrow-dashboard">
      <nav className="back-nav"><Link href="/dashboard/workstations">← Postes informatiques</Link></nav>
      <header className="dashboard-header"><div><p className="eyebrow">SESSION SÉCURISÉE</p><h1>Écran QR</h1></div></header>
      <QrGenerator workstations={data ?? []} />
    </main>
  );
}
