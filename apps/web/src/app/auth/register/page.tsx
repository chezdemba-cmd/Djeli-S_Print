import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signUp } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  if ((await supabase.auth.getUser()).data.user) redirect("/dashboard");
  const params = await searchParams;
  return <main className="auth-shell branded-auth">
    <section className="auth-visual"><div className="auth-visual-brand"><Image src="/brand/djelis-print-logo.png" alt="Djeli’S Print" width={90} height={90} /><b>DJELI&apos;S PRINT</b></div><div className="auth-orbit auth-orbit-one" /><div className="auth-orbit auth-orbit-two" /><div className="auth-visual-copy"><p>COMMENCEZ MAINTENANT</p><h1>Votre atelier.<br /><span>Enfin connecté.</span></h1><small>Un espace professionnel pensé pour recevoir, préparer et imprimer.</small></div></section>
    <section className="auth-card"><Image src="/brand/djelis-print-logo.png" alt="Djeli’S Print" width={104} height={104} priority /><p className="eyebrow">CRÉATION D’ESPACE</p><h1>Créer votre compte</h1><p className="auth-lead">Votre identité, puis votre organisation d’imprimerie.</p>{params.error ? <p className="notice error" role="alert">{params.error}</p> : null}<form action={signUp} className="auth-form"><label>Nom complet<input name="displayName" autoComplete="name" minLength={2} required /></label><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Mot de passe<input name="password" type="password" autoComplete="new-password" minLength={10} required /></label><button className="primary-button" type="submit">CRÉER MON COMPTE</button></form><p className="auth-foot">Déjà inscrit ? <Link href="/auth/login">Se connecter</Link></p></section>
  </main>;
}
