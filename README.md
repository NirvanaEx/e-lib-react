# e-lib

Monorepo for the e-lib electronic library.

## Local development

Prerequisites:
- Node.js 18+
- Docker

1) Copy env files:

```
cp .env.example .env
```

2) Install deps:

```
npm install
```

3) Run dev (starts Postgres + API + Web):

```
npm run dev
```

API: http://localhost:3003/api
Web: http://localhost:5173

## Migrations and seeds

```
cd apps/api
npm run migrate
npm run seed
```

## Production deployment (git push)

1) Bare repo on server:

```
/srv/git/e-lib.git
```

2) App directory:


```
/srv/apps/e-lib/
```

Place `.env` and `uploads/` in `/srv/apps/e-lib/`.

3) Install post-receive hook:

```
cp scripts/post-receive.sample.sh /srv/git/e-lib.git/hooks/post-receive
chmod +x /srv/git/e-lib.git/hooks/post-receive
```

Push to the bare repo; the hook checks out to `/srv/apps/e-lib/current` and runs Docker Compose.
