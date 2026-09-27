import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn, signInDemo } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");
  const params = await searchParams;

  return (
    <main className="auth-shell">
      <section className="auth-showcase" aria-label="Présentation Djeli'S Print">
        <Link className="landing-brand auth-brand" href="/"><Image src="/brand/djelis-print-logo.png" alt="" width={72} height={72} /><span><strong>DJELI&apos;S</strong><small>PRINT</small></span></Link>
        <div className="auth-showcase-copy"><p>CONSOLE IMPRIMEUR</p><h2>Vos impressions.<br /><em>Sous contrôle.</em></h2><span>Documents, postes et travaux réunis dans un espace sécurisé.</span></div>
        <div className="auth-flow"><div><b>01</b><span>Le client scanne</span></div><i>→</i><div><b>02</b><span>Vous contrôlez</span></div><i>→</i><div><b>03</b><span>Vous imprimez</span></div></div>
      </section>
      <section className="auth-card auth-card-premium">
        <Image src="/brand/djelis-print-logo.png" alt="Djeli'S_Print" width={104} height={104} priority />
        <p className="eyebrow">ESPACE IMPRIMEUR</p>
        <h1>Connexion</h1>
        <p className="auth-lead">Accédez à vos postes, documents et travaux d’impression.</p>
        {params.error ? <p className="notice error" role="alert">{params.error}</p> : null}
        {params.message ? <p className="notice success">{params.message}</p> : null}
        <form action={signIn} className="auth-form">
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Mot de passe<input name="password" type="password" autoComplete="current-password" required /></label>
          <button className="primary-button" type="submit">SE CONNECTER</button>
        </form>
        {process.env.NODE_ENV === "development" ? (
          <form action={signInDemo} className="demo-access-form">
            <button className="demo-access-button" type="submit"><span>▶</span> VOIR LA DÉMO SANS SE CONNECTER</button>
          </form>
        ) : null}
        <p className="auth-foot">Première connexion ? <Link href="/auth/register">Créer un compte</Link></p>
      </section>
    </main>
  );
}
