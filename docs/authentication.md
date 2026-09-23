# Authentification imprimeur

L'application utilise Supabase Auth avec le flux PKCE et des cookies gérés côté serveur. Le fichier
`src/proxy.ts` rafraîchit la session, mais ne constitue pas la frontière d'autorisation : chaque
layout protégé appelle `auth.getUser()` puis les requêtes sont encore filtrées par RLS.

## Parcours

1. Inscription avec nom, email et mot de passe d'au moins 10 caractères.
2. Confirmation par email via `/auth/callback`.
3. Création atomique de l'organisation par la fonction SQL `create_organization`.
4. Redirection vers le dashboard uniquement après vérification d'une adhésion active.
5. Déconnexion côté serveur avec suppression de la session Supabase.

Les messages d'erreur d'authentification restent génériques afin de ne pas révéler l'existence
d'un compte. L'URL de confirmation vient exclusivement de `NEXT_PUBLIC_APP_URL`, jamais d'un
en-tête contrôlé par la requête.
