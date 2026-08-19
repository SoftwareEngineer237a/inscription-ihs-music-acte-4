# IHS Music — ACTE IV

Application d'inscription gratuite au concert **ACTE IV** de **IHS Music**.

Le visiteur s'inscrit, reçoit immédiatement un badge numérique avec QR code, et le présente à l'entrée. Un tableau de bord et une page de scan permettent d'accueillir les participants et d'estimer la présence.

Aucune création de compte, aucun paiement, aucun e-mail automatique.

## Architecture

```
Visiteur / Admin / Contrôle
        │
        ▼
  Site statique (HTML/CSS/JS)
        │
        ▼
  Google Apps Script (API)
        │
        ▼
  Google Sheets (stockage)
```

- **Frontend** : site statique, mobile-first. Pages : `/` inscription, `/admin` tableau de bord, `/scan` contrôle d'entrée.
- **QR code** : généré dans le navigateur à partir de l'identifiant unique.
- **API** : Google Apps Script uniquement. Le navigateur n'ouvre jamais le Sheet.
- **Identifiant** : `IHS-ACT4-XXXXXX` (ex. `IHS-ACT4-8F72KQ`), jamais un numéro de ligne.

Sans `apiUrl`, l'application fonctionne en **mode local** (données dans le navigateur) pour tester le parcours. Dès que l'URL Apps Script est renseignée, les inscriptions vont dans Google Sheets.

## Configuration centrale

Fichier unique : `src/config.ts`

```javascript
export const CONFIG = {
  organization: "IHS Music",
  eventName: "ACTE IV",
  flyerUrl: "/assets/flyer.jpg",
  logoUrl: "/assets/logo.png",
  apiUrl: "", // URL du déploiement Google Apps Script (.../exec)
};
```

- Remplacez `flyerUrl` par l'URL de votre flyer officiel, ou remplacez le fichier `public/assets/flyer.jpg`.
- Collez l'URL Web App dans `apiUrl` après le déploiement Apps Script.
- `EVENT_FLYER_URL` est un alias de `flyerUrl`.

## Structure Google Sheet

Créez un classeur Google Sheets (le script crée aussi l'onglet s'il manque).

**Onglet :** `Inscriptions`

| Colonne | Nom | Exemple |
|---|---|---|
| A | Code | `IHS-ACT4-8F72KQ` |
| B | Nom complet | Marie Dupont |
| C | Téléphone | 0700000000 |
| D | Email | marie@email.com |
| E | Attentes | Texte libre |
| F | QR Code/identifiant | `IHS-ACT4-8F72KQ` |
| G | Présent | `NON` puis `OUI` |
| H | Date d'inscription | `2026-05-12 18:41:03` |
| I | Heure d'entrée | vide, puis horodatage |

La première ligne doit contenir exactement ces en-têtes. Le script les écrit automatiquement au premier appel.

## Déployer Google Apps Script

1. Ouvrez votre Google Sheet.
2. Menu **Extensions → Apps Script**.
3. Collez le contenu de `apps-script/Code.gs`.
4. Enregistrez le projet (ex. `IHS ACTE IV API`).
5. **Déployer → Nouveau déploiement**.
6. Type : **Application Web**.
7. Description : `acte-iv-v1`.
8. **Exécuter en tant que :** Moi.
9. **Qui peut y accéder :** Tout le monde.
10. Cliquez sur **Déployer**, autorisez le compte Google.
11. Copiez l'URL qui se termine par `/exec`.
12. Collez-la dans `src/config.ts` → `apiUrl`.
13. Reconstruisez / redéployez le frontend.

Si vous modifiez `Code.gs` plus tard : **Déployer → Gérer les déploiements → Modifier → Nouvelle version**.

Test rapide de l'API dans le navigateur :

```
https://script.google.com/macros/s/XXXX/exec?action=list
```

Vous devez voir `{"ok":true,"rows":[]}`.

## Déployer le frontend (Vercel)

1. Poussez ce dépôt sur GitHub.
2. Importez-le dans [Vercel](https://vercel.com).
3. Framework : Vite. Commande de build : `npm run build`. Dossier : `dist`.
4. Déployez.

Le fichier `vercel.json` redirige `/admin` et `/scan` vers l'application.

Autres hébergeurs statiques (Netlify, GitHub Pages, dossier `dist` sur un serveur) : servez le contenu de `dist/`. Utilisez alors :

- `/#/` inscription
- `/#/admin` tableau de bord
- `/#/scan` contrôle d'entrée

## Tester une inscription de bout en bout

1. Ouvrez la page d'accueil.
2. Vérifiez le flyer, le titre **IHS MUSIC — ACTE IV** et la mention concert gratuit.
3. Laissez un champ vide puis cliquez **S'inscrire** : un message d'erreur clair doit apparaître.
4. Remplissez les 4 champs et validez.
5. Le bouton se désactive pendant l'envoi.
6. Le badge s'affiche avec le nom, l'identifiant `IHS-ACT4-XXXXXX` et le QR code.
7. Si `apiUrl` est configuré, une ligne apparaît dans le Sheet, colonne **Présent = NON**.
8. Ouvrez `/admin` (ou `/#/admin`) : l'inscrit est dans la liste, les compteurs sont à jour.

## Tester un QR code

1. Inscrivez-vous et conservez le badge à l'écran.
2. Cliquez **Télécharger mon badge** : une image PNG se télécharge (pas un PDF).
3. Ouvrez `/scan` sur un téléphone.
4. Autorisez la caméra et visez le QR du badge (écran ou image enregistrée).
5. L'écran affiche **INSCRIPTION VALIDE** avec le nom et le code.
6. Cliquez **Valider l'entrée**.
7. Dans le Sheet, **Présent** passe à `OUI` et **Heure d'entrée** est remplie.
8. Scannez le même badge : **INSCRIPTION DÉJÀ VALIDÉE** (le statut n'est pas modifié).
9. Scannez un code inventé : **QR CODE INVALIDE**, sans fausse fiche.

## Utiliser le scanner le jour du concert

1. Ouvrez `/scan` sur le téléphone du responsable d'accueil (connexion HTTPS obligatoire pour la caméra).
2. Autorisez l'appareil photo arrière.
3. Scannez le badge du participant.
4. Si l'inscription est valide, appuyez sur **Valider l'entrée**.
5. Si le QR a déjà été validé, l'heure d'entrée s'affiche.
6. Si le QR est illisible ou absent : utilisez la **recherche manuelle** (nom ou téléphone).
7. Une personne sans badge n'est pas présentée comme refusée. Le QR sert à fluidifier l'accueil et à estimer la présence, pas à bloquer l'entrée d'un concert gratuit.

Le tableau de bord `/admin` permet de suivre le nombre d'inscrits, les présents, les non-présents et le taux de présence, de filtrer, de rechercher et d'exporter un CSV compatible Excel / Google Sheets.

## API Apps Script

**POST** `{ action: "register", nom, telephone, email, attentes }`  
→ crée la ligne, génère l'identifiant, `Présent = NON`, renvoie `{ ok, code, nom }`.

**GET** `?action=lookup&code=IHS-ACT4-XXXXXX`  
→ renvoie le code, le nom, le téléphone, l'email, le statut et la date.

**POST** `{ action: "checkin", code }`  
→ passe `Présent` à `OUI` et enregistre l'heure. Sans effet si déjà validé.

**GET** `?action=list` — liste pour le tableau de bord.  
**GET** `?action=search&q=` — recherche par nom, téléphone ou code.

## Pages

| URL | Fichier logique | Accès |
|---|---|---|
| `/` ou `/#/` | Inscription + badge | Public |
| `/admin` ou `/#/admin` | Tableau de bord | Direct, sans mot de passe |
| `/scan` ou `/#/scan` | Contrôle d'entrée | Direct, sans mot de passe |

## Développement

```bash
npm install
npm run dev
npm run build
```
