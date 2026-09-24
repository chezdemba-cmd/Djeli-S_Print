# Audit sécurité et exploitabilité — 24 septembre 2026

## Verdict

Le socle web, Supabase et Print Agent est apte à un pilote contrôlé après configuration du déploiement et test sur une imprimante réelle. Aucun défaut critique ou élevé connu ne reste ouvert dans le code audité.

## Périmètre contrôlé

- authentification PKCE et cookies SSR;
- isolation multi-tenant, RLS, clés étrangères composites et rôles;
- sessions QR, upload TUS, signatures MIME, URLs signées et Storage privé;
- préflight PDF/image et limites de ressources;
- création, réclamation et transitions des travaux d’impression;
- appairage, secrets locaux, réseau et fichiers temporaires du Print Agent;
- expiration, suppression Storage, reprise sur erreur et minimisation des métadonnées;
- journaux d’audit, cron, en-têtes HTTP et dépendances de production.

## Garanties vérifiées

- Les jetons QR et agent sont aléatoires; seuls leurs HMAC/empreintes sont stockés.
- La clé Supabase serveur reste dans les Route Handlers et n’est jamais préfixée par `NEXT_PUBLIC_`.
- Le bucket `documents` est privé; les accès temporaires utilisent des URLs signées courtes.
- Les réservations d’upload et réclamations de travaux sont atomiques et verrouillées.
- Les rôles anonymes et authentifiés ne peuvent pas appeler les fonctions de service.
- Les politiques RLS et clés composites empêchent les relations entre organisations.
- L’agent chiffre son jeton avec le coffre du système, limite ses navigations, impose des délais réseau, revalide la signature téléchargée et efface le fichier dans un `finally`.
- Le worker marque les postes sans heartbeat `OFFLINE` et libère en erreur les travaux abandonnés.
- Les endpoints publics sensibles utilisent un rate limiting PostgreSQL atomique par empreinte réseau.
- Les documents excessifs sont refusés avant impression: PDF > 1 000 pages, dimensions > 5 080 mm, image > 400 mégapixels ou côté > 100 000 px.
- Les réponses web définissent HSTS, anti-MIME-sniffing, anti-framing, Referrer-Policy et Permissions-Policy.

## Corrections apportées pendant l’audit

1. Rate limiting distribué pour appairage et upload public.
2. Détection automatique des postes hors ligne.
3. Échec sûr des travaux bloqués après disparition de l’agent.
4. Heartbeat et capacités imprimantes regroupés en trois écritures maximum par cycle.
5. Délai réseau et nouvelle validation MIME dans l’agent.
6. Blocage des fenêtres et navigations externes Electron.
7. Limites anti-fichiers pathologiques dans le préflight.
8. En-têtes HTTP défensifs.
9. Configuration cron placée dans la racine de l’application Vercel `apps/web`.

## Validation

- 9 suites pgTAP distantes, 46 assertions;
- tests unitaires web et agent;
- typecheck de tous les workspaces;
- build de production Next.js et Electron;
- audit des dépendances de production: aucune vulnérabilité connue;
- scan du dépôt et de l’historique Git: aucun secret connu suivi.

## Risques résiduels et conditions du pilote

1. **Impression physique** — valider chaque pilote/driver et les formats réels sur le poste de l’imprimerie. Le callback Electron confirme la remise au spooler, pas la sortie papier.
2. **Distribution Electron** — produire et signer un installateur Windows avant installation chez un tiers; le binaire de développement n’est pas un canal de distribution.
3. **Cron Vercel** — définir `CRON_SECRET` et utiliser une offre autorisant une fréquence de cinq minutes, ou brancher un planificateur externe équivalent.
4. **Analyse antimalware** — le MVP valide format, taille et structure basique, mais n’intègre pas encore de moteur antivirus/CDR. À ajouter avant ouverture à fort volume ou environnement réglementé.
5. **Charge** — effectuer un test de montée en charge avec les volumes et tailles réels de la première imprimerie; le préflight PDF charge actuellement le fichier complet avec une limite organisationnelle de 80 Mio.
6. **Exploitation** — configurer alertes sur erreurs cron, taux de `FAILED`, agents `OFFLINE`, stockage et quotas Supabase.

## Décision de mise en production

Le déploiement pilote peut être autorisé quand les points 1 à 3 ci-dessus sont terminés. Une ouverture publique générale doit en plus traiter les points 4 à 6.
