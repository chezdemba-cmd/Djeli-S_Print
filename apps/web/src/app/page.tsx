import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return <main className="public-home">
    <nav className="public-nav"><Link href="/" className="public-brand"><Image src="/brand/djelis-print-logo.png" alt="Djeli’S Print" width={72} height={72} /><b>DJELI&apos;S <span>PRINT</span></b></Link><div><Link href="/auth/login">Connexion</Link><Link className="public-cta" href="/auth/register">Créer mon espace →</Link></div></nav>
    <section className="public-hero"><div className="public-copy"><p>L’IMPRESSION, SANS FRICTION</p><h1>Du téléphone<br />à l’imprimante.<br /><em>En un scan.</em></h1><span>Recevez les fichiers de vos clients, contrôlez leur qualité et lancez l’impression depuis un seul espace.</span><div><Link className="hero-cta" href="/auth/register">COMMENCER MAINTENANT →</Link><Link href="/auth/login">J’AI DÉJÀ UN COMPTE</Link></div></div><div className="public-logo-stage"><span className="hero-orbit orbit-one" /><span className="hero-orbit orbit-two" /><span className="public-orbit-third" /><Image src="/brand/djelis-print-logo.png" alt="Djeli’S Print" width={440} height={440} priority /></div></section>
    <footer className="public-flow"><span>SCAN QR</span><b>→</b><span>ENVOI DU FICHIER</span><b>→</b><span>CONTRÔLE QUALITÉ</span><b>→</b><span>IMPRESSION</span></footer>
  </main>;
}
