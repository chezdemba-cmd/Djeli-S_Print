import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/app/auth/actions";
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
      <section className="auth-card">
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
        <p className="auth-foot">Première connexion ? <Link href="/auth/register">Créer un compte</Link></p>
      </section>
    </main>
  );
}
