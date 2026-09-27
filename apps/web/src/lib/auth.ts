import "server-only";

import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VERIFIED_USER_HEADER } from "@/lib/supabase/proxy";

export const requireUser = cache(async (): Promise<User> => {
  // The middleware already validated the session with Supabase Auth on this
  // same request and forwarded the result here, so this avoids repeating
  // that network round-trip on every protected page. The header can only
  // have been set by the middleware (see proxy.ts) — the client cannot
  // inject it.
  const verified = (await headers()).get(VERIFIED_USER_HEADER);
  if (verified !== null) {
    if (verified === "") redirect("/auth/login");
    try {
      return JSON.parse(decodeURIComponent(verified)) as User;
    } catch {
      // Malformed header: fall through to a real check below.
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) redirect("/auth/login");
  return data.user;
});

export const getMemberships = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(id, name, slug)")
    .eq("user_id", user.id);

  if (error) throw new Error("Impossible de charger les organisations de l’utilisateur.");
  return data ?? [];
});
