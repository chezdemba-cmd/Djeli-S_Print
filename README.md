# Handoff : Presspoint — plateforme d'impression par QR code

## Overview
SaaS B2B pour imprimeries. Un client scanne un QR code au comptoir, envoie un document depuis son smartphone (sans app ni compte) ; le fichier apparaît instantanément sur le poste de l'imprimerie, où l'opérateur configure et lance l'impression. Le fichier est supprimé automatiquement après impression (ou 20 min après réception).

Deux surfaces :
- **Client mobile** (web mobile, 4 écrans).
- **Poste imprimeur** (desktop, cible 1920×1080 / 1440×900 / 1366×768).

## About the Design Files
Les fichiers de ce dossier sont des **références de design en HTML** — un prototype montrant l'apparence et le comportement attendus, **pas du code de production**. La tâche est de **recréer ces écrans dans l'environnement du codebase cible** (React, Vue…) avec ses patterns et bibliothèques. Si aucun environnement n'existe, choisir le framework le plus adapté (recommandé : React + TypeScript, CSS modules ou Tailwind, tokens ci-dessous).

Ouvrir `Plateforme Impression QR.dc.html` dans un navigateur (avec `support.js` dans le même dossier). La barre du haut permet de naviguer entre les vues et de basculer FR/EN. Toute la logique (données mock, états) est dans la classe `Component` en bas du fichier.

## Fidelity
**High-fidelity.** Couleurs, typographie, espacements, états et interactions sont définitifs. À recréer au pixel près. Les zones hachurées (aperçus de documents, images) sont des placeholders pour du contenu réel (rendu PDF/image). Le QR affiché est un motif factice : générer un vrai QR (ex. `qrcode` lib) pointant vers l'URL d'envoi de l'imprimerie.

## Screens / Views

Le poste imprimeur est conçu sur un artboard **1440×936** (sidebar 228 px + zone principale). En production : layout fluide, sidebar fixe 228 px, contenu en `minmax(0,1fr)`.

### 1. Architecture UX (doc)
Vue de documentation : 4 étapes (Scan → Envoi → Préparation → Suppression), parcours client C1–C5, parcours imprimeur P1–P8, bandeau confidentialité. Non destinée à la production.

### 2. Tableau de bord (poste)
- **Sidebar** 228 px, fond `#FBFCFC`, bordure droite `#E3E8EA`. Bloc imprimerie (logo 30×30 r8 fond primaire, nom 14/800, sous-titre 11 `ink-3`). Groupes « Travail » (Tableau de bord, Impressions, Nouveaux fichiers + badge ambre) et « Atelier » (Machines, Supports, Tarifs, Historique, Paramètres). Item : h36, r9, 13/600 ; actif = fond `#E6F2F5` texte `#0E7490`. Bas : carte Print Agent (pastille verte pulsée, « Connecté · 4 machines détectées »).
- **Topbar** : titre de page 16/700, date en mono 11.5, à droite bouton « Afficher l'écran QR », cloche avec badge ambre, avatar 30 + nom/rôle.
- **KPI** : grille 6 colonnes, gap 12. Carte blanche r13, padding 14/15, libellé 11.5/600 ink-3, valeur 25/800 letter-spacing −.03em, delta mono 11 (vert `#15803D` / ambre `#B45309` / ink-3). Indicateurs : Impressions aujourd'hui, Documents en attente, Machines actives, Chiffre d'affaires, Volume imprimé, Travaux terminés.
- **Nouveaux travaux** (2.15fr) : grille 2 colonnes de cartes. Carte r14 : miniature 76×102, nom 13.5/700 ellipsis, badge statut (NOUVEAU primaire / À VÉRIFIER ambre / PRÉPARÉ vert, mono 10/600 r5), puces mono 10.5 (type, pages, poids, format, dpi), heure + « Suppression dans N min » (rouge si < 10 min). Actions : Préparer (primaire, flex 1, h34 r9), Aperçu (secondaire), × (supprimer, rouge au hover).
- **Colonne droite** (1fr) : histogramme « Impressions par heure » (10 barres, heure courante en ambre), « File d'attente » (5 lignes avec barres), « Machines » (3 lignes : pastille, nom, spec mono, état).

### 3. Impressions — file d'attente (Kanban)
5 colonnes égales : En attente (`#7C8B94`), Préparation (primaire), Prêt (ambre), Impression (vert), Terminé (`#C3CDD1`). Cartes r11 : nom, puces format/quantité, méta, barre de progression optionnelle. Drag & drop non requis (le changement de statut se fait via les actions).

### 4. Nouveaux fichiers
Grille 4 colonnes de cartes détaillées (aperçu 150 px, méta, compte à rebours, bouton Préparer).

### 5. Console d'impression (écran principal)
3 zones : miniatures des pages à gauche, grand aperçu au centre (fond `#EDF0F1`, feuille blanche ombrée, outils zoom/rotation/marges/fond perdu/zones de coupe), panneau de réglages à droite (352 px).
- Panneau droit : onglets **Réglages / Préflight**, bascule **Mode rapide / Mode professionnel**.
  - Rapide : Machine, A4/A3, Couleur/N&B, Copies.
  - Pro : Format (A6→A0, Personnalisé), Orientation, Couleur, Recto/Recto-verso, Échelle, Papier/support, Qualité, Résolution DPI, Finitions (multi). N'afficher que les options compatibles avec la machine choisie.
  - Machine grand format (traceur) → bloc **Dimensions libres** : largeur × hauteur, unités mm/cm/m, surface calculée en m² ; l'aperçu central prend les proportions réelles.
- **Barre de résumé** (bas) : Machine, Support, Format, Exemplaires, État du fichier ; prix estimé 24/800 ; ANNULER (secondaire) ; **IMPRIMER** (ambre `#F59E0B`, texte `#3B2600`, 15/800, h46, padding 0 34, ombre `0 2px 10px rgba(245,158,11,.35)`).
- **Bandeau de progression** au-dessus de la barre : Impression (primaire, page x/3) → « Document imprimé. Suppression sécurisée en cours. » (gris) → « Fichier supprimé » (fond `#EAF6EF`), masqué après 4 s.

### 6. Préflight — « Contrôle avant impression »
Checklist avec pastilles vert/ambre/rouge (Résolution, Dimensions, DPI, Orientation, Couleurs RVB → CMJN recommandée, Fond perdu manquant, Qualité grand format). Pour les images : « Qualité recommandée par format » A4→A0 avec barres (excellente/bonne/moyenne/déconseillée). Bouton « Ouvrir le Studio IA ».

### 7. Studio IA
Comparateur avant/après (ORIGINAL à gauche, VERSION AMÉLIORÉE à droite, séparateur blanc 2 px piloté par un slider). Panneau 352 px : explication, 8 traitements toggle (Netteté, Upscale ×2, ×4, Bruit, Couleurs, Contraste, Arrière-plan, Grand format) avec durée estimée, résultat DPI calculé, avertissement ambre, **APPLIQUER ET REVENIR** / Conserver l'original. Confirmation explicite obligatoire.

### 8. Machines
Grille 2 colonnes. Carte : nom 15/750, IP/protocole mono, badge état (ONLINE vert `#EAF6EF`/`#15803D`, BUSY `#FEF3D6`/`#B45309`, OFFLINE `#FEF2F2`/`#B91C1C`), tags capacités, niveaux consommables (barres), boutons Réglages / Page de test.

### 9. Supports
Grille 3 colonnes : nom, stock (EN STOCK / FAIBLE / ÉPUISÉ), spec, machines compatibles, niveau, prix.

### 10. Tarifs
Tableau : Prestation / Unité / Prix / Marge. Exemples : A4 N&B 0,10 €/page, A4 couleur 0,50 €, A3 couleur 1,20 €, A1 14 €/m², Bâche 12 €/m², Vinyle 18 €/m², Plastification 1,50 € forfait, Œillets 0,80 €/u.

### 11. Historique
Tableau : Réf., Fichier, Impression, Machine, Prix, Confidentialité (fichier supprimé / suppression en cours / annulé).

### 12. Paramètres
4 cartes : Imprimerie, Print Agent, Suppression automatique (20 min, immédiate après impression, effacement sécurisé), Écran QR (URL, préférences client, taille max 80 Mo).

### 13. Écran QR (plein écran comptoir)
Fond `#F5F7F7`, logo + nom, titre 52/800 « Scannez pour envoyer votre document », sous-titre 19 « Aucune application nécessaire. », QR dans carte blanche r22, URL en mono, pied « Vos fichiers sont supprimés automatiquement après impression. ». En production : vrai plein écran (1920×1080), QR ≥ 400 px.

### 14. Client mobile (390 px)
1. **Accueil** : logo, « Envoyez votre document » 29/800, boutons CHOISIR UN FICHIER (primaire h58 r14) et PRENDRE UNE PHOTO (secondaire), note de suppression en bas.
2. **Document** : aperçu, nom, taille, format ; préférences facultatives (Format A4–A0, Couleur/N&B, Exemplaires ±) ; note ambre « Les options seront confirmées par l'imprimeur. » ; ENVOYER POUR IMPRESSION.
3. **Envoi** : barre de progression + pourcentage.
4. **Confirmation** : « Document envoyé », « Votre document est disponible au comptoir. », Référence **#0248** (mono 34, primaire), mention de suppression, « Envoyer un autre document ».
Cibles tactiles ≥ 44 px.

### 15. Design system & états vides
Voir onglet Design system : palette, typo, boutons (IMPRIMER, primaire, secondaire, désactivé, destructif), champs (normal, select, erreur), badges, notifications (info / attention / erreur), et 4 états vides : Aucun fichier reçu, Print Agent déconnecté, Fichier illisible, Machine hors ligne.

## Interactions & Behavior
- **Arrivée d'un fichier** : carte ajoutée en tête des Nouveaux travaux (fade-up 350 ms, translateY 6 px) + toast bas-droite (fond `#0F1A20`, pastille ambre), 3,2 s.
- **Suppression manuelle** : toast « Suppression sécurisée — nom » puis « Fichier supprimé » (pastille verte).
- **Préparer** → ouvre la console sur le fichier.
- **IMPRIMER** → progression impression → suppression sécurisée → confirmation (voir §5).
- **Compte à rebours** de suppression visible sur chaque document ; passe en rouge sous 10 min.
- Upload mobile : barre de progression, transition vers la confirmation ~400 ms après 100 %.
- Hover cartes : bordure `#C9D4D8` + ombre `0 6px 18px rgba(16,26,32,.07)`. Hover boutons secondaires : fond `#F3F6F6`.
- Animations : fade-up 250–350 ms ease ; pulse 1,8–2,4 s pour les indicateurs « live ». Pas d'autres animations.
- i18n : FR (défaut) + EN ; toutes les chaînes sont dans les dictionnaires `FR` / `EN` du fichier.

## State Management
- `jobs[]` : { id, name, type, pages, sizeBytes, format, dpi, receivedAt, status (new|check|prepared|queued|printing|done), expiresAt }.
- `machines[]` : { id, name, ip, protocol, state (online|busy|offline), capabilities (formats, color, duplex, media, finishing), consumables[] }.
- `media[]`, `prices[]`, `history[]`, `settings`.
- Console : jobId, mode (quick|pro), machineId, format, custom {w,h,unit}, orientation, color, duplex, scale, media, quality, dpi, finishing[], copies ; prix dérivé.
- Impression : `printJob` { phase: idle|printing|wiping|deleted, progress }.
- Temps réel : WebSocket/SSE pour arrivée des fichiers, états machines (Print Agent local), progression.
- Suppression : purge serveur + locale à `expiresAt` ou fin d'impression ; l'UI reflète les 3 phases.

## Design Tokens
Couleurs :
- Primaire `#0E7490` · foncé `#0B5A70` · clair `#E6F2F5`
- Action chaude `#F59E0B` · clair `#FEF3D6` · texte sur ambre `#3B2600` / `#6B4A05`
- Encre `#0F1A20` · secondaire `#4A5A63` · tertiaire `#7C8B94`
- Ligne `#E3E8EA` · fond app `#F5F7F7` · fond panneau `#FBFCFC` · fond neutre `#F3F6F6` / `#EEF1F2`
- Succès `#15803D` / `#EAF6EF` · Attention `#B45309` / `#FEF3D6` · Erreur `#B91C1C` / `#FEF2F2` / bordure `#FECACA`

Typographie :
- Manrope (400/500/600/700/800) — UI. Titres 38–52/800 ls −.025/−.03em ; H2 28/800 ; section 14.5/700 ; texte 13–15 ; libellés 11.5–12.5/600.
- IBM Plex Mono (400/500/600) — valeurs techniques (formats, dpi, prix, références, eyebrows 10–11 uppercase ls .12–.14em).

Rayons : 5–7 (badges), 8–9 (petits boutons/champs), 10–11 (boutons), 12–14 (cartes), 16 (panneaux/shell), 22 (carte QR), 44/34 (mockup téléphone).
Espacements : 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 26, 30.
Ombres : carte `0 1px 2px rgba(16,26,32,.04)` ; hover `0 6px 18px rgba(16,26,32,.07)` ; shell `0 8px 28px rgba(16,26,32,.07)` ; toast `0 12px 30px rgba(16,26,32,.28)`.
Hauteurs : boutons 34 / 42 / 46 / 58 (mobile) ; champs 38–42 ; items nav 36.

## Assets
Aucun asset externe. Logo = carré placeholder (fond primaire + carré blanc). Icônes = formes géométriques placeholder : utiliser une librairie d'icônes du codebase (ex. Lucide) en trait 1.6 px. Aperçus de documents : rendu réel (pdf.js / miniatures serveur).

## Files
- `Plateforme Impression QR.dc.html` — prototype complet (template + logique + données mock + i18n).
- `support.js` — runtime nécessaire pour ouvrir le prototype dans un navigateur.
