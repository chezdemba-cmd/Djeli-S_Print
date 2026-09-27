# Sauvegarde et reprise après sinistre

Aucune politique de sauvegarde n'est vérifiable depuis ce dépôt — elle dépend
entièrement du plan Supabase souscrit et de la configuration du projet cloud,
que ni le code ni l'audit ne peuvent observer. Ce document liste ce qu'il faut
vérifier et tester, pas ce qui est garanti aujourd'hui.

## Base de données (Supabase Postgres)

1. **Vérifier le plan** — Dashboard Supabase → Settings → Add-ons (ou
   Billing). Le PITR (Point-in-Time Recovery) et les sauvegardes
   automatiques quotidiennes ne sont disponibles qu'à partir du plan Pro ;
   sur le plan gratuit, il n'existe **aucune sauvegarde automatique**.
2. **Si PITR actif** — noter la fenêtre de rétention (7 jours par défaut sur
   Pro, extensible). Dashboard → Database → Backups.
3. **Tester une restauration au moins une fois avant le lancement** — créer
   un projet Supabase de test, restaurer une sauvegarde récente dedans,
   vérifier que `pnpm turbo test` (suite pgTAP) passe contre cette copie. Une
   sauvegarde jamais restaurée n'est pas une garantie.
4. **Pas de scripts de migration descendants** (`down`) dans
   `supabase/migrations/` — en cas de migration défectueuse en production, la
   voie de retour est une restauration PITR à l'instant précédent, pas un
   rollback de schéma. En tenir compte avant d'appliquer une migration
   risquée en prod.

## Fichiers (Supabase Storage, bucket `documents`)

Par conception, ce bucket n'est **pas** un actif à sauvegarder : chaque
document y séjourne au plus `document_ttl_minutes` (20 min par défaut) avant
suppression automatique (`docs/automatic-deletion.md`). Il n'y a donc rien à
restaurer côté fichiers clients — la seule perte possible est celle d'un
document en cours de traitement au moment d'un incident, que le client devra
renvoyer.

## Déploiement (Vercel)

Vercel conserve l'historique des déploiements et permet un rollback quasi
instantané vers un déploiement précédent (Dashboard → Deployments → ... →
Promote to Production). C'est le mécanisme de repli principal pour un
déploiement défectueux — mais il ne restaure pas la base de données, qui suit
son propre cycle de migrations indépendant. Un rollback de déploiement après
une migration destructive peut laisser le code en désaccord avec le schéma :
prévoir cette combinaison avant de rollback en prod, pas pendant l'incident.

## Ce qui manque encore (voir aussi l'audit de production)

- Aucune alerte automatique si le PITR expire, si un backup échoue, ou si le
  quota de stockage Supabase est atteint — à configurer manuellement pour
  l'instant (voir `docs/malware-scanning.md` et `apps/web/src/lib/observability.ts`
  pour le même constat côté erreurs applicatives).
- Aucun exercice de restauration n'a jamais été effectué à ce jour.
