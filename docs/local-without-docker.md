# Local Setup Without Docker

Docker is not required for AWSify local development. It is only a convenient way to run PostgreSQL and Redis.

Since this Mac has Homebrew installed, use native Homebrew services instead.

## 1. Install PostgreSQL And Redis

```bash
brew install postgresql@16 redis
```

## 2. Start Services

```bash
brew services start postgresql@16
brew services start redis
```

If your shell cannot find `psql` after installing PostgreSQL, add it to your path:

```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## 3. Create The Local Database

```bash
createdb awsify
```

If `createdb awsify` says the database already exists, that is fine.

## 4. Configure `.env`

Copy the example file:

```bash
cp .env.example .env
```

For native Homebrew PostgreSQL, use your macOS username in `DATABASE_URL`.

```bash
DATABASE_URL=postgresql://katareayush@localhost:5432/awsify
REDIS_URL=redis://localhost:6379
```

The Docker-style value `postgresql://awsify:awsify@localhost:5432/awsify` will not work unless you manually create that Postgres user and password.

## 5. Generate And Migrate Prisma

```bash
pnpm db:generate
pnpm db:migrate
```

## 6. Run AWSify

Use separate terminal tabs:

```bash
pnpm web
pnpm api
pnpm worker
```

URLs:

- Web: http://localhost:3000
- API health: http://localhost:4000/v1/health

## Useful Checks

```bash
brew services list
psql postgres
redis-cli ping
```

`redis-cli ping` should return `PONG`.
