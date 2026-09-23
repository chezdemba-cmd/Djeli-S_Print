# Print Agent

L’agent Electron relie un poste physique à l’application sans exposer la clé de service Supabase.

## Appairage

1. Un administrateur crée un code à usage unique depuis **Tableau de bord → Postes**.
2. Le code aléatoire de 192 bits expire après 10 minutes; seule son empreinte SHA-256 est enregistrée.
3. L’agent l’échange contre un jeton aléatoire de 256 bits. Seule l’empreinte du jeton reste en base.
4. Le jeton local est chiffré avec `safeStorage` d’Electron. L’agent refuse de le persister si le chiffrement du système est indisponible.

## Exécution

Toutes les 10 secondes, l’agent publie son heartbeat et les imprimantes découvertes, puis réclame au plus un travail. La fonction SQL verrouille la file avec `FOR UPDATE SKIP LOCKED`. Le document est téléchargé via une URL signée valable 60 secondes, imprimé silencieusement sur l’imprimante explicitement choisie, puis effacé du dossier temporaire dans un bloc `finally`.

Les transitions `PROCESSING → PRINTING → PRINTED` (ou `FAILED`) sont reportées au serveur. Le jeton machine ne donne jamais un accès direct à Supabase : toutes les opérations passent par les routes `/api/agent/*`.

## Configuration

`DJELIS_PRINT_SERVER_URL` indique l’URL de l’application web et vaut `http://localhost:3000` par défaut. L’application active le démarrage à l’ouverture de session après un appairage réussi.
