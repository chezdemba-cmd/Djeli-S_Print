"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  ["/dashboard", "▣", "Tableau de bord"],
  ["/dashboard/jobs", "□", "Impressions"],
  ["/dashboard/documents", "▤", "Nouveaux fichiers"],
  ["/dashboard/workstations", "◉", "Machines"],
  ["/dashboard/qr", "⌗", "Écran QR"],
] as const;

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function ProductNavigation() {
  const pathname = usePathname();
  return <nav aria-label="Sections du produit">
    <Link className={isActive(pathname, "/dashboard") ? "active" : undefined} href="/dashboard">Tableau de bord</Link>
    <Link className={isActive(pathname, "/dashboard/jobs") ? "active" : undefined} href="/dashboard/jobs">Console d’impression</Link>
    <Link className={isActive(pathname, "/dashboard/qr") ? "active" : undefined} href="/dashboard/qr">Écran QR</Link>
    <Link className={isActive(pathname, "/dashboard/documents") ? "active" : undefined} href="/dashboard/documents">Fichiers</Link>
  </nav>;
}

export function SidebarNavigation() {
  const pathname = usePathname();
  return <>
    <p>TRAVAIL</p>
    <nav>{navigation.slice(0, 3).map(([href, icon, label]) => <Link className={isActive(pathname, href) ? "active" : undefined} href={href} key={href}><i>{icon}</i>{label}</Link>)}</nav>
    <p>ATELIER</p>
    <nav>{navigation.slice(3).map(([href, icon, label]) => <Link className={isActive(pathname, href) ? "active" : undefined} href={href} key={href}><i>{icon}</i>{label}</Link>)}<Link href="/dashboard/settings"><i>□</i>Paramètres</Link></nav>
  </>;
}
