# Postes et sessions QR

## Création

Un propriétaire ou administrateur enregistre le poste dans `/dashboard/workstations`. Un opérateur
authentifié peut ensuite créer une session temporaire depuis `/dashboard/qr`.

Le serveur génère 32 octets aléatoires avec `crypto.randomBytes`. Le token brut est renvoyé une
seule fois à l'écran opérateur pour composer l'URL et le QR. PostgreSQL ne conserve que :

```text
HMAC-SHA256(SESSION_TOKEN_PEPPER, token)
```

`SESSION_TOKEN_PEPPER` doit contenir au moins 32 caractères, être différent entre environnements
et rester exclusivement dans les secrets Vercel.

## Résolution publique

La page `/s/{token}` vérifie le format du token, calcule son HMAC côté serveur puis appelle
`resolve_print_session`. Cette fonction `security definer` ne retourne une ligne que si la session :

- existe et est active ;
- n'est pas expirée ;
- possède encore une capacité de document.

Elle n'expose que les noms de l'organisation et du poste, l'expiration, la capacité restante et la
limite d'upload. Le rôle `anon` ne peut toujours pas lire `print_sessions` directement.

## Limitation actuelle

Le MVP sélectionne la première organisation de l'utilisateur. Un sélecteur d'organisation et une
préférence persistée seront ajoutés avant de supporter les comptes réellement multi-organisations.
