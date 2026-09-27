import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const supabase = await createClient();
  if ((await supabase.auth.getUser()).data.user) redirect("/dashboard");
  const params = await searchParams;
  return <main className="auth-shell branded-auth">
    <section className="auth-visual"><div className="auth-visual-brand"><Image src="/brand/djelis-print-logo.png" alt="Djeli’S Print" width={90} height={90} /><b>DJELI&apos;S PRINT</b></div><div className="auth-orbit auth-orbit-one" /><div className="auth-orbit auth-orbit-two" /><div className="auth-visual-copy"><p>ESPACE IMPRIMEUR</p><h1>Vos impressions.<br /><span>Sous contrôle.</span></h1><small>Documents, postes et travaux réunis dans un espace sécurisé.</small></div><ol><li><b>01</b>Le client scanne</li><li><b>02</b>Vous contrôlez</li><li><b>03</b>Vous imprimez</li></ol></section>
    <section className="auth-card"><Image src="/brand/djelis-print-logo.png" alt="Djeli’S Print" width={104} height={104} priority /><p className="eyebrow">ESPACE IMPRIMEUR</p><h1>Connexion</h1><p className="auth-lead">Accédez à vos postes, documents et travaux d’impression.</p>{params.error ? <p className="notice error" role="alert">{params.error}</p> : null}{params.message ? <p className="notice success">{params.message}</p> : null}<form action={signIn} className="auth-form"><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Mot de passe<input name="password" type="password" autoComplete="current-password" required /></label><button className="primary-button" type="submit">SE CONNECTER</button></form><p className="auth-foot">Première connexion ? <Link href="/auth/register">Créer un compte</Link></p></section>
  </main>;
}
