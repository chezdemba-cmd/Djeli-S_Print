import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getMemberships } from "@/lib/auth";

export default async function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  const memberships = await getMemberships();
  if (memberships.length === 0) redirect("/onboarding");
  return children;
}
