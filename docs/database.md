# Base de données et sécurité

## Migration initiale

La migration `202609230001_initial_schema.sql` crée le modèle multi-tenant complet du MVP. Toute
table exposée dans `public` active RLS et les rôles `anon` et `authenticated` perdent d'abord leurs
droits implicites avant de recevoir uniquement les opérations nécessaires.

## Isolation

- Un utilisateur peut appartenir à plusieurs organisations via `organization_members`.
- Les rôles sont `OWNER`, `ADMIN`, `OPERATOR` et `VIEWER`.
- Les clés étrangères composites `(id, organization_id)` empêchent de rattacher un document, un
  poste, une imprimante ou un réglage à une ressource d'une autre organisation.
- Les fonctions RLS sont dans le schéma non exposé `private`, utilisent un `search_path` vide et ne
  retournent que les organisations de `auth.uid()`.
- Le dernier propriétaire d'une organisation ne peut être retiré ou rétrogradé.

## Documents

Le bucket `documents` est privé, limité à 80 MiB et n'accepte que PDF, JPEG, PNG et WEBP. Le chemin
commence obligatoirement par l'identifiant de l'organisation. Une URL Storage n'est jamais traitée
comme une autorisation.

Le visiteur mobile n'a aucun accès SQL ou Storage direct. À l'étape Upload, une Route Handler
validera le token QR côté serveur et générera une capacité d'upload limitée. Cette décision évite
qu'une policy `anon` globale transforme le token public Supabase en canal d'écriture.

## Suppression

`enqueue_expired_documents()` marque par lots les documents expirés et crée une entrée idempotente
dans `deletion_requests`. La suppression physique du bucket doit être faite par un worker avec le
rôle serveur ; seulement après confirmation, le document passe à `DELETED`. Aucun client connecté
ne peut lire ou modifier cette file interne.

## Vérification locale

```powershell
supabase start
supabase db reset
supabase test db
supabase db lint --level warning
```

Les tests couvrent le caractère privé du bucket, les privilèges anonymes, l'isolation inter-tenant,
les rôles, l'immuabilité des audits et les transitions de statut.
