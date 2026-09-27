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
      <section className="auth-showcase register-showcase" aria-label="Présentation Djeli'S Print">
        <Link className="landing-brand auth-brand" href="/"><Image src="/brand/djelis-print-logo.png" alt="" width={72} height={72} /><span><strong>DJELI&apos;S</strong><small>PRINT</small></span></Link>
        <div className="auth-showcase-copy"><p>DÉMARRAGE RAPIDE</p><h2>Votre comptoir<br /><em>passe au QR.</em></h2><span>Créez votre espace, ajoutez un poste et recevez votre premier fichier.</span></div>
        <div className="auth-trust"><span>✓ Sans engagement</span><span>✓ Données protégées</span><span>✓ Installation guidée</span></div>
      </section>
      <section className="auth-card auth-card-premium">
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
