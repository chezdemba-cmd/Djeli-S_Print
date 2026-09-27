# Suppression automatique

La suppression est pilotée par une file durable `deletion_requests`.

- Un document imprimé est mis en file immédiatement par trigger.
- À chaque exécution, le worker met aussi en file les documents arrivés à expiration.
- Les demandes sont réclamées avec `FOR UPDATE SKIP LOCKED`, ce qui autorise plusieurs workers sans double traitement.
- Le fichier Storage est supprimé avant le passage du document à `DELETED`.
- Après succès, le nom original, le hash, les données de préflight et les messages d’erreur sont effacés; les métadonnées techniques minimales restent disponibles pour l’historique.
- Un échec Storage est retenté avec un délai exponentiel, au maximum dix fois.
- Une demande bloquée en `PROCESSING` plus de dix minutes est automatiquement récupérée.

La route `GET /api/cron/cleanup` exige `Authorization: Bearer $CRON_SECRET`. Le plan Vercel Hobby n'autorisant que des crons quotidiens, l'appel toutes les cinq minutes est piloté par un workflow GitHub Actions planifié (`.github/workflows/cron-cleanup.yml`), pas par `vercel.json`. Ce workflow lit le secret `CRON_SECRET` du dépôt GitHub (Settings → Secrets and variables → Actions) — il doit avoir exactement la même valeur que la variable d'environnement `CRON_SECRET` du projet Vercel. La planification GitHub Actions est au mieux (« best-effort »), pas garantie à la minute près ; un léger retard occasionnel repousse la suppression de quelques minutes sans jamais affaiblir le contrôle d'accès (le bucket reste privé, RLS s'applique dans tous les cas). Si le projet passe un jour sur un plan Vercel Pro, `crons` peut être réintroduit dans `apps/web/vercel.json` à la place.

Le même cycle marque `OFFLINE` les postes sans heartbeat depuis une minute et place en échec contrôlé les travaux abandonnés par un agent, afin qu’ils ne restent jamais bloqués indéfiniment.

Variables serveur nécessaires :

```env
CRON_SECRET=<valeur aléatoire d’au moins 16 caractères>
SUPABASE_SECRET_KEY=<clé serveur Supabase>
```
