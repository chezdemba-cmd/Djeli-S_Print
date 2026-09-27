import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import "./styles.css";

export const metadata: Metadata = {
  title: "Djeli'S_Print",
  description: "Réception et préparation sécurisées de documents d'impression.",
  icons: {
    icon: "/brand/djelis-print-logo.png",
    apple: "/brand/djelis-print-logo.png",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // A per-request CSP nonce cannot be embedded in statically generated HTML.
  // Opt the application into request-time rendering so Next.js can apply the
  // nonce supplied by proxy.ts to its framework and hydration scripts.
  await connection();
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
