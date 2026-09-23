# ADR 0001 — Frontières du système

Statut : accepté

Le web, l'infrastructure Supabase et l'agent local sont trois unités de déploiement. Ils échangent
des contrats versionnés, mais aucun package métier ne dépend d'Electron ou de Next.js. Cette
séparation limite l'impact d'une compromission du navigateur, rend l'agent remplaçable par Tauri et
permet de tester les transitions d'impression sans accès à une imprimante réelle.
