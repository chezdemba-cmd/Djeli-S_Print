# Authentification imprimeur

L'application utilise Supabase Auth avec le flux PKCE et des cookies gérés côté serveur. Le fichier
`src/proxy.ts` rafraîchit la session et redirige désormais vers `/auth/login` toute requête
`/dashboard/**` sans utilisateur authentifié — une défense en profondeur, pas la frontière
d'autorisation principale : chaque layout protégé appelle toujours `auth.getUser()` (via
`requireUser`) et les requêtes restent filtrées par RLS.

`signIn`/`signUp` (`src/app/auth/actions.ts`) sont limités en fréquence via
`consumeRateLimit` (10 tentatives/10 min pour la connexion, 5/10 min pour l'inscription), sur la
même empreinte réseau que les endpoints publics `/s/[token]/**`. Cette empreinte utilise
`RATE_LIMIT_PEPPER`, distinct de `SESSION_TOKEN_PEPPER` (séparation de domaine cryptographique).

## Parcours

1. Inscription avec nom, email et mot de passe d'au moins 10 caractères.
2. Confirmation par email via `/auth/callback`.
3. Création atomique de l'organisation par la fonction SQL `create_organization`.
4. Redirection vers le dashboard uniquement après vérification d'une adhésion active.
5. Déconnexion côté serveur avec suppression de la session Supabase.

Les messages d'erreur d'authentification restent génériques afin de ne pas révéler l'existence
d'un compte. L'URL de confirmation vient exclusivement de `NEXT_PUBLIC_APP_URL`, jamais d'un
en-tête contrôlé par la requête.
