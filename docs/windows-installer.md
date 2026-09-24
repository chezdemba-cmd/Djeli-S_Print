# Installateur Windows du Print Agent

## Artefacts

La commande suivante produit deux installateurs NSIS dans `apps/print-agent/release/` :

```powershell
corepack.cmd pnpm --filter @djelis-print/print-agent package:win
```

- `Djelis-Print-Agent-<version>-x64-Setup.exe` pour les PC Windows Intel/AMD;
- `Djelis-Print-Agent-<version>-arm64-Setup.exe` pour Windows ARM64.

Le dossier `release/` est volontairement ignoré par Git. Les installateurs doivent être publiés comme artefacts de release, jamais commités dans le dépôt.

## Installation pilote

1. Installer l’architecture correspondant au poste.
2. Ouvrir le Print Agent.
3. Saisir l’origine HTTPS de la plateforme, sans chemin, par exemple `https://print.example.com`.
4. Dans la console web, ouvrir **Postes**, générer un code d’appairage et le saisir dans l’agent avant son expiration.
5. Vérifier que le poste devient `ONLINE` et que les imprimantes apparaissent.
6. Effectuer une impression de test sans document client avant le pilote.

L’agent accepte HTTP uniquement pour `localhost` et `127.0.0.1` en développement. L’URL et le jeton d’agent sont persistés dans le stockage chiffré du système.

## Signature Authenticode

Les builds locaux sans certificat sont adaptés uniquement à la validation interne. Pour distribuer l’agent, fournir le certificat à la CI via les secrets pris en charge par electron-builder, notamment `WIN_CSC_LINK` et `WIN_CSC_KEY_PASSWORD`, puis reconstruire les installateurs. Ne jamais stocker le fichier PFX ou son mot de passe dans Git.

Après génération, vérifier chaque fichier :

```powershell
Get-AuthenticodeSignature .\apps\print-agent\release\Djelis-Print-Agent-*.exe
Get-FileHash .\apps\print-agent\release\Djelis-Print-Agent-*.exe -Algorithm SHA256
```

La mise à disposition publique est interdite tant que `Status` vaut `NotSigned`.
