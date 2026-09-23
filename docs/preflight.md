# Préflight basique

Après la transition vers `RECEIVED`, Next.js `after()` lance l'analyse sans retarder la réponse au
téléphone. Le document passe par `ANALYZING`, puis `READY` ou `FAILED`.

Pour les images, le service lit une plage privée de 256 Kio et extrait les dimensions depuis les
en-têtes PNG, JPEG ou WEBP. Il calcule ensuite le DPI effectif pour A4, A3, A2, A1 et A0 et attribue
les recommandations `EXCELLENT`, `GOOD`, `ACCEPTABLE`, `LOW` ou `NOT_RECOMMENDED`.

Pour les PDF, le fichier privé est chargé avec `pdf-lib` afin d'obtenir le nombre de pages, la taille
de la première page, l'orientation et la cohérence des tailles. Les PDF vectoriels reçoivent la
recommandation initiale `EXCELLENT`; l'analyse CMJN, des images incorporées et du fond perdu reste
prévue pour une version ultérieure.

L'analyse est limitée à 60 secondes sur Vercel. Les erreurs ne révèlent pas de détail technique au
client et placent le document en `FAILED` avec un code interne `PREFLIGHT_FAILED`.
