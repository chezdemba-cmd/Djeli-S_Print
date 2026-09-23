# Architecture MVP Djeli'S_Print

## Objectif

Djeli'S_Print est un système multi-tenant de réception et d'impression, pas un service de partage de
fichiers. Le flux autoritaire est : session QR temporaire, upload privé, préflight, validation par
l'opérateur, exécution par un agent local, puis suppression vérifiable.

## Contextes et frontières

1. `apps/web` : application Next.js unique. Elle héberge le parcours mobile anonyme et la console
   authentifiée. Les mutations sensibles passent par des Route Handlers ou fonctions SQL dédiées.
2. `supabase` : source de vérité pour l'identité, les organisations, les états, Realtime et le
   stockage privé. Les politiques RLS constituent la frontière de sécurité principale.
3. `apps/print-agent` : processus Electron local. Il ne reçoit jamais de clé Supabase privilégiée.
   Il s'authentifie comme poste, obtient une URL signée de courte durée et exécute l'impression.
4. `packages/contracts` : vocabulaire stable partagé entre web et agent. Aucune dépendance vers
   Next.js, Electron ou Supabase afin de faciliter une migration future vers Tauri.

## Modèle de confiance

- Le navigateur mobile est non fiable et anonyme.
- Le token QR est opaque, aléatoire, expirant et stocké uniquement sous forme de hash en base.
- Le navigateur opérateur est authentifié mais chaque requête reste limitée par organisation.
- L'agent est une identité de machine révocable, distincte d'un utilisateur humain.
- Le bucket de documents est privé ; aucun chemin de Storage ne constitue une autorisation.
- Les transitions de statut sont contrôlées côté serveur et journalisées.

## Flux MVP

1. L'opérateur crée une session liée à un poste ; l'URL publique contient uniquement le token.
2. Le mobile échange ce token contre une capacité d'upload courte et limitée à un document.
3. Le serveur valide extension, MIME détecté, taille et quota avant de finaliser `RECEIVED`.
4. Une fonction de préflight extrait les métadonnées sans rendre le fichier public.
5. Realtime notifie la console, qui configure un job compatible avec les capacités imprimante.
6. L'agent réclame le job de manière atomique, télécharge via URL signée et imprime.
7. Après succès, la copie locale est supprimée, le serveur planifie la purge Storage et conserve
   uniquement les métadonnées minimales et l'audit.

## Décisions structurantes

- Monorepo pnpm + Turborepo pour partager les contrats tout en gardant des déploiements séparés.
- Next.js App Router, avec composants serveur par défaut.
- Supabase SSR par cookies sera ajouté à l'étape Auth ; aucune clé secrète dans le client.
- Adaptateur `PrinterProvider` pour isoler Windows/Electron du cœur et permettre Tauri plus tard.
- Aucun contenu client dans les logs ; les identifiants techniques suffisent à la corrélation.
- Les supports, finitions et capacités seront des données administrables, jamais des enums UI.

## Déploiements

- Vercel : `apps/web`.
- Supabase : migrations, fonctions et tâches planifiées dans `supabase`.
- Windows : paquet signé de `apps/print-agent`, mises à jour et démarrage automatique opt-in.

## Étapes suivantes

La prochaine étape est le schéma Supabase complet : tables, contraintes, index, fonctions de
transition, bucket privé et politiques RLS testées pour les scénarios inter-organisations.
