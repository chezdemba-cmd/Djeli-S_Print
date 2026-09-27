import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getPublicEnv } from "@/lib/env";

export const VERIFIED_USER_HEADER = "x-verified-user";

export async function refreshSession(request: NextRequest, requestHeaders = new Headers(request.headers)) {
  const env = getPublicEnv();
  let refreshedCookies: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          requestHeaders.set("cookie", request.cookies.toString());
          refreshedCookies = cookiesToSet;
        },
      },
    },
  );

  // Validates and refreshes the token. Never replace this with getSession() on the server.
  const { data } = await supabase.auth.getUser();

  // Downstream Server Components (requireUser()) would otherwise repeat this
  // same network call to Supabase Auth on every request. The user is already
  // verified at this point, so it's forwarded via a request header instead.
  // This can't be spoofed by the client: Next.js only honors headers set
  // through `request.headers` in NextResponse.next() from middleware, never
  // ones sent by the browser under the same name.
  requestHeaders.set(VERIFIED_USER_HEADER, data.user ? encodeURIComponent(JSON.stringify(data.user)) : "");

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  refreshedCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));

  return { response, user: data.user };
}
