# Environment Setup

Use `.env.example` as the source of truth for environment variables.

```bash
cp .env.example .env
```

Fill the blank values in `.env` before running integrations that need them. Keep customer application secrets out of this file; those belong to project/deployment-level secret storage after that flow is implemented.
