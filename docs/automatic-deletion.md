# Suppression automatique

La suppression est pilotée par une file durable `deletion_requests`.

- Un document imprimé est mis en file immédiatement par trigger.
- À chaque exécution, le worker met aussi en file les documents arrivés à expiration.
- Les demandes sont réclamées avec `FOR UPDATE SKIP LOCKED`, ce qui autorise plusieurs workers sans double traitement.
- Le fichier Storage est supprimé avant le passage du document à `DELETED`.
- Après succès, le nom original, le hash, les données de préflight et les messages d’erreur sont effacés; les métadonnées techniques minimales restent disponibles pour l’historique.
- Un échec Storage est retenté avec un délai exponentiel, au maximum dix fois.
- Une demande bloquée en `PROCESSING` plus de dix minutes est automatiquement récupérée.

La route `GET /api/cron/cleanup` exige `Authorization: Bearer $CRON_SECRET`. Vercel l’appelle toutes les cinq minutes via `vercel.json`. Cette fréquence nécessite un plan Vercel autorisant les crons infrajournaliers; sinon, utiliser un planificateur externe avec le même en-tête.

Variables serveur nécessaires :

```env
CRON_SECRET=<valeur aléatoire d’au moins 16 caractères>
SUPABASE_SECRET_KEY=<clé serveur Supabase>
```
