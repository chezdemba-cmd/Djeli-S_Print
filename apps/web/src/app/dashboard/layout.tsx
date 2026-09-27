import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMemberships, requireUser } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";
import { ProductNavigation, SidebarNavigation } from "./dashboard-navigation";

export default async function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  const [memberships, user] = await Promise.all([getMemberships(), requireUser()]);
  if (memberships.length === 0) redirect("/onboarding");
  const membership = memberships[0]!;
  const relation = membership.organizations;
  const organization = Array.isArray(relation) ? relation[0] : relation;
  const displayName = String(user.user_metadata?.display_name ?? user.email ?? "Utilisateur");
  const initials = displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return <div className="presspoint-app">
    <header className="presspoint-topbar">
      <Link className="presspoint-wordmark" href="/dashboard"><span>▣</span><strong>Presspoint</strong><small>DJELI&apos;S PRINT</small></Link>
      <ProductNavigation />
      <div className="presspoint-lang"><b>FR</b><span>EN</span></div>
    </header>
    <div className="presspoint-shell">
      <aside className="presspoint-sidebar">
        <div className="presspoint-shop"><span>▣</span><div><strong>{organization?.name ?? "Mon imprimerie"}</strong><small>{membership.role} · Poste principal</small></div></div>
        <SidebarNavigation />
        <div className="presspoint-agent"><b><i /> Print Agent</b><span>Connecté · Surveillance active</span></div>
      </aside>
      <div className="presspoint-workspace">
        <header className="presspoint-pagebar">
          <div><strong>Presspoint</strong><small>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}</small></div>
          <div className="presspoint-user"><Link href="/dashboard/qr">Afficher l’écran QR</Link><span className="avatar">{initials}</span><div><b>{displayName}</b><small>{membership.role}</small></div><form action={signOut}><button type="submit" title="Se déconnecter">↗</button></form></div>
        </header>
        {children}
      </div>
    </div>
  </div>;
}
