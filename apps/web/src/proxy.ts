import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { response, user } = await refreshSession(request);
  // Défense en profondeur : dashboard/layout.tsx fait déjà cette vérification
  // pour chaque page (requireUser -> redirect), mais un proxy qui ne bloque
  // rien par chemin ne protégerait pas une future route sensible ajoutée hors
  // de /dashboard sans y penser explicitement.
  if (request.nextUrl.pathname.startsWith("/dashboard") && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
