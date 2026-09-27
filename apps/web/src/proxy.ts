import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString("base64");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : null;
  // Next/Turbopack's dev server needs eval() for HMR and debugging; never
  // relaxed in production, where React itself never calls eval().
  const scriptSrc = process.env.NODE_ENV === "production"
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`;
  const contentSecurityPolicy = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const { response, user } = await refreshSession(request, requestHeaders);
  // Défense en profondeur : dashboard/layout.tsx fait déjà cette vérification
  // pour chaque page (requireUser -> redirect), mais un proxy qui ne bloque
  // rien par chemin ne protégerait pas une future route sensible ajoutée hors
  // de /dashboard sans y penser explicitement.
  if (request.nextUrl.pathname.startsWith("/dashboard") && !user) {
    const redirect = NextResponse.redirect(new URL("/auth/login", request.url));
    redirect.headers.set("Content-Security-Policy", contentSecurityPolicy);
    return redirect;
  }
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
