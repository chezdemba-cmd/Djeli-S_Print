# Réception temps réel et aperçu

La table `documents` est ajoutée à la publication `supabase_realtime` de manière idempotente. RLS
reste active : un abonnement ne reçoit que les lignes auxquelles l'utilisateur authentifié a déjà
accès dans son organisation.

La page `/dashboard/documents` charge les 100 documents récents côté serveur, puis applique les
événements `INSERT`, `UPDATE` et `DELETE` côté client. Les cartes affichent l'état, la taille, les
métadonnées disponibles et le compte à rebours avant expiration.

L'aperçu récupère le document par une requête soumise à RLS puis crée une URL Storage signée valable
300 secondes. Cette URL n'est jamais enregistrée en base. Les PDF sont isolés dans une iframe
sandboxée et les images utilisent une politique de référent stricte.

Les métadonnées absentes apparaissent comme « Analyse en attente » jusqu'à l'intégration du moteur
de préflight à l'étape suivante.
