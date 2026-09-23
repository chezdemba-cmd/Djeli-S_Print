import type { Metadata } from "next";
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

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
