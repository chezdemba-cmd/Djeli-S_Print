import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signUp } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

type RegisterPageProps = { searchParams: Promise<{ error?: string }> };

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");
  const params = await searchParams;

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Image src="/brand/djelis-print-logo.png" alt="Djeli'S_Print" width={104} height={104} priority />
        <p className="eyebrow">DJELI&apos;S_PRINT</p>
        <h1>Créer votre espace</h1>
        <p className="auth-lead">Un compte personnel, puis votre organisation d’imprimerie.</p>
        {params.error ? <p className="notice error" role="alert">{params.error}</p> : null}
        <form action={signUp} className="auth-form">
          <label>Nom complet<input name="displayName" autoComplete="name" minLength={2} required /></label>
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Mot de passe<input name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
          <button className="primary-button" type="submit">CRÉER MON COMPTE</button>
        </form>
        <p className="auth-foot">Déjà inscrit ? <Link href="/auth/login">Se connecter</Link></p>
      </section>
    </main>
  );
}
