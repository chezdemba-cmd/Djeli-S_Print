# Développement local

## Prérequis

- Node.js 24 ou supérieur
- pnpm 12
- Docker Desktop pour la pile Supabase locale (à partir de l'étape 2)

## Commandes

```powershell
pnpm.cmd install
pnpm.cmd dev
pnpm.cmd typecheck
pnpm.cmd build
```

Sous PowerShell avec une politique d'exécution restrictive, utiliser les exécutables `.cmd` évite
le blocage des wrappers `.ps1`.

Copier `.env.example` vers `.env.local` et renseigner uniquement des clés de développement. Les
clés secrètes ne doivent jamais être placées dans une variable préfixée par `NEXT_PUBLIC_`.

## Références visuelles

`Plateforme Impression QR.dc.html` et `support.js` restent volontairement à la racine pendant la
phase d'intégration. Ils ne font partie d'aucun workspace et ne sont jamais déployés.
