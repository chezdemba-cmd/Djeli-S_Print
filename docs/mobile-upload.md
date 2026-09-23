# Upload mobile

Le mobile réserve atomiquement un document avec le hash du token QR. La session est consommée au
moment de la réservation afin que deux requêtes concurrentes ne puissent pas obtenir deux chemins.
Le serveur crée ensuite une URL signée Storage, sans exposer la clé secrète Supabase.

Les fichiers utilisent TUS avec des blocs de 6 Mio, reprise automatique et progression réelle. Ils
vont directement du téléphone vers le hostname Storage et ne transitent pas par Vercel.

Après transfert, la route de finalisation vérifie :

- l'association entre token, session et document ;
- la présence de l'objet privé ;
- la taille exacte annoncée ;
- la signature binaire PDF, JPEG, PNG ou WEBP.

En cas de divergence, l'objet est supprimé et le document passe à `FAILED`. Sinon il passe de
`UPLOADING` à `RECEIVED`. La limite actuelle est définie par l'organisation et plafonnée par le
bucket privé à 80 Mio.
