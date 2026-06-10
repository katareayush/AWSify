import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanRepository, scanToSuggestion } from "./index";

function newRepo(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `awsify-${prefix}-`));
}

describe("repo scanner", () => {
  it("detects an Express backend", () => {
    const root = newRepo("express");
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        scripts: { build: "tsc", start: "node dist/index.js" },
        dependencies: { express: "^4.18.0" }
      })
    );
    writeFileSync(join(root, "server.js"), "app.get('/health', (_req, res) => res.send('ok')); app.listen(process.env.PORT || 8080); process.env.DATABASE_URL;");

    const suggestion = scanToSuggestion(scanRepository(root));

    expect(suggestion.appType).toBe("node-backend");
    expect(suggestion.port).toBe(8080);
    expect(suggestion.healthPath).toBe("/health");
    expect(suggestion.envVars.map((envVar) => envVar.name)).toContain("DATABASE_URL");
  });

  it("detects a Next.js app", () => {
    const root = newRepo("next");
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        scripts: { build: "next build", start: "next start" },
        dependencies: { next: "^15.0.0", react: "^19.0.0" }
      })
    );

    const suggestion = scanToSuggestion(scanRepository(root));

    expect(suggestion.appType).toBe("nextjs-app");
    expect(suggestion.services).toEqual(["frontend"]);
  });

  it("detects a Vite static SPA", () => {
    const root = newRepo("vite");
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        scripts: { build: "vite build" },
        devDependencies: { vite: "^5.0.0", react: "^18.0.0" }
      })
    );

    const suggestion = scanToSuggestion(scanRepository(root));

    expect(suggestion.appType).toBe("static-spa");
    expect(suggestion.services).toEqual(["frontend"]);
    expect(suggestion.port).toBe(80);
  });

  it("detects a FastAPI Python backend", () => {
    const root = newRepo("fastapi");
    writeFileSync(join(root, "requirements.txt"), "fastapi==0.110.0\nuvicorn==0.27.0\npsycopg2-binary==2.9\n");
    writeFileSync(join(root, "main.py"), "from fastapi import FastAPI\napp = FastAPI()\n@app.get('/health')\ndef h(): return {}\n");

    const suggestion = scanToSuggestion(scanRepository(root));

    expect(suggestion.appType).toBe("python-backend");
    expect(suggestion.port).toBe(8000);
    expect(suggestion.healthPath).toBe("/health");
    expect(suggestion.database.required).toBe(true);
    expect(suggestion.database.engine).toBe("postgresql");
  });

  it("detects a Django app via pyproject.toml", () => {
    const root = newRepo("django");
    writeFileSync(
      join(root, "pyproject.toml"),
      `[project]\nname = "site"\nversion = "0.1.0"\ndependencies = ["django>=5.0", "gunicorn"]\n`
    );
    writeFileSync(join(root, "manage.py"), "import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'site.settings')");

    const suggestion = scanToSuggestion(scanRepository(root));

    expect(suggestion.appType).toBe("python-backend");
  });

  it("detects a Go backend", () => {
    const root = newRepo("go");
    writeFileSync(
      join(root, "go.mod"),
      `module example.com/svc\ngo 1.23\nrequire github.com/jackc/pgx/v5 v5.5.1\nrequire github.com/go-redis/redis/v9 v9.0.0\n`
    );
    writeFileSync(
      join(root, "main.go"),
      `package main\nimport "net/http"\nfunc main(){ http.HandleFunc("/healthz", nil); http.ListenAndServe(":9000", nil) }\n`
    );

    const suggestion = scanToSuggestion(scanRepository(root));

    expect(suggestion.appType).toBe("go-backend");
    expect(suggestion.port).toBe(9000);
    expect(suggestion.healthPath).toBe("/healthz");
    expect(suggestion.database.required).toBe(true);
    expect(suggestion.cache.required).toBe(true);
  });

  it("detects a Rails backend", () => {
    const root = newRepo("rails");
    writeFileSync(
      join(root, "Gemfile"),
      `source 'https://rubygems.org'\ngem 'rails', '~> 7.1'\ngem 'pg'\ngem 'sidekiq'\n`
    );
    writeFileSync(join(root, "config.ru"), "require_relative 'config/environment'\nrun Rails.application");

    const suggestion = scanToSuggestion(scanRepository(root));

    expect(suggestion.appType).toBe("ruby-backend");
    expect(suggestion.database.required).toBe(true);
    expect(suggestion.cache.required).toBe(true);
  });

  it("detects a Spring Boot Maven app", () => {
    const root = newRepo("spring");
    writeFileSync(
      join(root, "pom.xml"),
      `<project><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency><dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId></dependency></dependencies></project>`
    );

    const suggestion = scanToSuggestion(scanRepository(root));

    expect(suggestion.appType).toBe("java-backend");
    expect(suggestion.healthPath).toBe("/actuator/health");
    expect(suggestion.database.required).toBe(true);
  });

  it("detects a Rust crate", () => {
    const root = newRepo("rust");
    writeFileSync(
      join(root, "Cargo.toml"),
      `[package]\nname = "api"\nversion = "0.1.0"\n\n[dependencies]\naxum = "0.7"\nsqlx = { version = "0.7", features = ["postgres"] }\n`
    );
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src/main.rs"), `fn main(){ let _ = "/health"; }`);

    const suggestion = scanToSuggestion(scanRepository(root));

    expect(suggestion.appType).toBe("rust-backend");
    expect(suggestion.startCommand).toBe("/app/api");
    expect(suggestion.database.required).toBe(true);
  });

  it("detects a Laravel PHP app", () => {
    const root = newRepo("laravel");
    writeFileSync(
      join(root, "composer.json"),
      JSON.stringify({
        require: { "laravel/framework": "^11.0", "ext-pdo_pgsql": "*" }
      })
    );

    const suggestion = scanToSuggestion(scanRepository(root));

    expect(suggestion.appType).toBe("php-backend");
    expect(suggestion.database.required).toBe(true);
    expect(suggestion.database.engine).toBe("postgresql");
  });

  it("marks env vars as required only with strong evidence", () => {
    const root = newRepo("envvars");
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        scripts: { start: "node server.js" },
        dependencies: { express: "^4.18.0" }
      })
    );
    // STRIPE_SECRET_KEY: in .env.example with no default + used unguarded -> REQUIRED
    // LOG_LEVEL: has a default in .env.example -> OPTIONAL
    // FEATURE_DARK: has a fallback in source -> OPTIONAL
    // ANALYTICS_ID: only referenced inside `if (process.env.ANALYTICS_ID)` guard -> OPTIONAL
    writeFileSync(
      join(root, ".env.example"),
      [
        "STRIPE_SECRET_KEY=",
        "LOG_LEVEL=info",
        "FEATURE_DARK=",
        ""
      ].join("\n")
    );
    writeFileSync(
      join(root, "server.js"),
      [
        "const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);",
        "const level = process.env.LOG_LEVEL;",
        "const dark = process.env.FEATURE_DARK || false;",
        "if (process.env.ANALYTICS_ID) { track(process.env.ANALYTICS_ID); }",
        "app.listen(3000);"
      ].join("\n")
    );

    const suggestion = scanToSuggestion(scanRepository(root));
    const byName = new Map(suggestion.envVars.map((envVar) => [envVar.name, envVar]));

    expect(byName.get("STRIPE_SECRET_KEY")?.required).toBe(true);
    expect(byName.get("STRIPE_SECRET_KEY")?.category).toBe("secret");
    expect(byName.get("LOG_LEVEL")?.required).toBe(false);
    expect(byName.get("FEATURE_DARK")?.required).toBe(false);
    expect(byName.get("ANALYTICS_ID")?.required).toBe(false);
  });

  it("detects destructured, nullish-coalesced, and import.meta env usage", () => {
    const root = newRepo("env-patterns");
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        scripts: { start: "node server.js" },
        dependencies: { express: "^4.18.0" }
      })
    );
    writeFileSync(
      join(root, "server.js"),
      [
        "const { DATABASE_URL, SMTP_HOST = 'localhost' } = process.env;",
        "const key = process.env.STRIPE_SECRET_KEY ?? 'test';",
        "app.listen(3000);"
      ].join("\n")
    );
    writeFileSync(join(root, "client.ts"), "const api = import.meta.env.VITE_API_URL; const mode = import.meta.env.MODE;");

    const suggestion = scanToSuggestion(scanRepository(root));
    const byName = new Map(suggestion.envVars.map((envVar) => [envVar.name, envVar]));

    // destructured without default + integration-looking -> required
    expect(byName.get("DATABASE_URL")?.required).toBe(true);
    // destructured WITH default -> optional
    expect(byName.get("SMTP_HOST")?.required).toBe(false);
    // ?? fallback counts as guarded -> optional
    expect(byName.get("STRIPE_SECRET_KEY")?.required).toBe(false);
    // import.meta.env custom var detected; Vite builtin excluded
    expect(byName.has("VITE_API_URL")).toBe(true);
    expect(byName.has("MODE")).toBe(false);
  });

  it("reads .env.example from subdirectories and promotes vars from local .env", () => {
    const root = newRepo("env-monorepo");
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        scripts: { start: "node apps/api/server.js" },
        dependencies: { express: "^4.18.0" }
      })
    );
    mkdirSync(join(root, "apps", "api"), { recursive: true });
    writeFileSync(join(root, "apps", "api", ".env.example"), "JWT_SECRET=\n");
    // Local .env: names should surface, values must never leak.
    writeFileSync(join(root, ".env"), "SESSION_KEY=super-secret-value\n");
    writeFileSync(
      join(root, "apps", "api", "server.js"),
      "const jwt = process.env.JWT_SECRET; const session = process.env.SESSION_KEY; app.listen(3000);"
    );

    const suggestion = scanToSuggestion(scanRepository(root));
    const byName = new Map(suggestion.envVars.map((envVar) => [envVar.name, envVar]));

    // declared in nested .env.example without default + unguarded use -> required
    expect(byName.get("JWT_SECRET")?.required).toBe(true);
    // present in local .env + used unguarded -> required, but value never leaks
    expect(byName.get("SESSION_KEY")?.required).toBe(true);
    expect(byName.get("SESSION_KEY")?.example).toBeUndefined();
  });

  it("throws a helpful error for unsupported repos", () => {
    const root = newRepo("empty");
    writeFileSync(join(root, "README.md"), "nothing useful here");

    expect(() => scanRepository(root)).toThrow(/Node\.js, Next\.js, static SPAs, Python, Go, Ruby, Java, Rust, and PHP/);
  });
});
