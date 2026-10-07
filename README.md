# 🚐 Wassalni — plateforme de réservation de voyages (Algérie)

Monorepo : **frontend** (Vue 3 + Vite) ↔ **backend** (Express + TypeScript) ↔ **Supabase PostgreSQL**
(delivery domain v3 : 69 wilayas / 591 dairas / 1541 communes).

```
frontend (Vue 3 + Vite, :5173)
   │  fetch /api/* (proxy dev → même origine, cookies de session)
   ▼
backend (Express + TS, :3000)
   ├── api/      → routes, sessions, 2FA email, admin
   └── DB/       → couche données (DBHelper, DomainRepository, DatabaseInitializer)
   ▼
Supabase Postgres — wassalni (delivery_domain v3 + registry + app_user/app_session)
```

## Démarrage

```bash
# 1) Backend
cd backend
npm install
cp .env.example .env        # renseigner SUPABASE_PROJECT_REF + SUPABASE_ACCESS_TOKEN (ou DATABASE_URL)
npm run db:init             # installe le schéma v3 + le registre Algérie (idempotent)
npm run api                 # API sur :3000

# 2) Frontend (autre terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxy /api → :3000)
```

## Mode production

Le frontend et le backend restent deux process séparés (pas de serveur unique
qui sert les fichiers statiques), mais chacun tourne en mode "build" :

```bash
# 1) Backend — build TypeScript puis exécution du JS compilé
cd backend
npm install
cp .env.example .env            # renseigner SUPABASE_PROJECT_REF + SUPABASE_ACCESS_TOKEN
                                 # + NODE_ENV=production (voir commentaires dans .env.example)
                                 # + SMTP_HOST/PORT/USER/PASS/FROM dès qu'ils sont disponibles
npm run db:init                 # si pas déjà fait
npm run build                   # tsc → dist/
npm run start                   # node dist/api/server.js, API sur :3000

# 2) Frontend (autre terminal) — vrai build Vite, pas le serveur de dev
cd frontend
npm install
npm run build                   # vite build → dist/
npm run preview                 # vite preview --host 0.0.0.0 (voir vite.config.ts), :5173
```

Ce que `NODE_ENV=production` change côté backend :
- **Cookies de session** marqués `Secure` par défaut (nécessite HTTPS — déjà le cas via le proxy e2b.app en aperçu).
- **CORS** strict par défaut : seules les requêtes same-origin (via le proxy `/api` du frontend) sont acceptées, sauf si `CORS_ORIGIN` est renseigné explicitement.
- **Aucune fuite du code 2FA** : ni `dev_code` dans la réponse JSON, ni log console — même si `SMTP_HOST` n'est pas encore configuré. Dans ce cas, l'inscription/connexion reste bloquée à l'étape "vérifiez votre email" tant que le SMTP n'est pas renseigné (un avertissement clair est loggué au démarrage de l'API).
- Le script `npm run start` exécute le JS compilé (`dist/api/server.js`) plutôt que `ts-node`.

Le sélecteur de compte de démonstration a été retiré : l'authentification réelle (mot de passe + code 2FA par email) est le seul chemin de connexion.

## Authentification (sessions + 2FA email)

1. **Inscription** (`/register`) : email + téléphone + mot de passe → crée `app_user` + `customer`.
2. **Connexion** (`/login`) : mot de passe vérifié (scrypt) → un **code à 6 chiffres** est envoyé par email.
3. **Vérification** du code → session (cookie `httpOnly`, révocable côté serveur, 7 jours).

Sans SMTP configuré (`SMTP_HOST` vide), l'API fonctionne en **mode dev** : le code est
affiché dans la console de l'API et renvoyé dans la réponse (`dev_code`) — pratique pour
tester. En production, configurez le SMTP dans `backend/.env`.

Créer un compte admin :

```bash
cd backend
npm run user:create -- admin@exemple.dz 'MotDePasse!' --role admin --name "Admin"
```

## API (résumé)

| Méthode & route | Accès | Description |
|---|---|---|
| `POST /api/auth/register` | public | créer un compte client |
| `POST /api/auth/login` | public | mot de passe → défi 2FA |
| `POST /api/auth/verify-2fa` | public | code → cookie de session |
| `GET  /api/auth/me` | session | profil courant |
| `GET  /api/registry/wilayas[/dairas/communes]` | public | registre administratif |
| `GET  /api/trips?from=&to=&date=` | public | recherche de voyages publiés |
| `GET  /api/trips/:id` | public | détail (arrêts + tarifs) |
| `POST /api/reservations` | client | réserver (serveur → `reserve()`) |
| `GET  /api/reservations/me` | client | mes réservations |
| `POST /api/reservations/:id/cancel` | client | annuler (la sienne) |
| `GET/POST /api/admin/drivers|vehicles|trajectories|trips…` | admin | flotte, trajectoires, prix, cycle de vie des voyages |

Les erreurs métier de la base remontent avec leur code `DZxxx` (voir `v_domain_errors`).

## Scripts utiles (backend/)

| Commande | Rôle |
|---|---|
| `npm run db:init` | installer le schéma + les données Algérie |
| `npm run db:reset` | ⚠ tout effacer (schema public) et réinstaller |
| `npm run db:status` | état, compteurs, dernier import |
| `npm run db:demo` | démo CLI du cycle complet d'un voyage |
| `npm run user:create` | créer/promouvoir un compte |
| `npm run test:utils` | tests offline (SQL splitter, builders) |
| `npm run typecheck` | TypeScript |

## Sécurité — à lire

- `.env`, `.env.*`, `data/init/env.txt` et `uploads/` sont **ignorés par git** — jamais de secrets dans le dépôt.
- L'API se connecte à la base en tant qu'admin (RLS contourné) : le frontend ne parle **jamais** à Supabase directement.
- Tokens exposés dans des chats/ fichiers : **à révoquer** (GitHub → Settings → Developer settings ; Supabase → Account → Access tokens).
- En production : configurer `SMTP_*`, `CORS_ORIGIN`, `DATABASE_URL` (mode direct + transactions), et servir le frontend en HTTPS (cookies `secure` automatiques).
