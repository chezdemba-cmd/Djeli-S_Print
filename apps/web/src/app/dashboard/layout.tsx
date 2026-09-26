import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMemberships } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";

export default async function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  const memberships = await getMemberships();
  if (memberships.length === 0) redirect("/onboarding");
  return (
    <div className="dashboard-frame">
      <nav className="console-nav" aria-label="Navigation principale">
        <Link className="console-brand" href="/dashboard">
          <img src="/brand/djelis-print-logo.png" alt="Djeli’S Print" />
          <span><b>Djeli&apos;S_Print</b><small>Console d’impression</small></span>
        </Link>
        <div className="console-nav-links">
          <Link href="/dashboard">Accueil</Link>
          <Link href="/dashboard/documents">Documents</Link>
          <Link href="/dashboard/jobs">Impressions</Link>
          <Link href="/dashboard/workstations">Postes</Link>
          <Link href="/dashboard/qr">QR client</Link>
        </div>
        <form action={signOut}>
          <button className="console-signout" type="submit" title="Se déconnecter">↗</button>
        </form>
      </nav>
      {children}
    </div>
  );
}
