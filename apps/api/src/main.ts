import "reflect-metadata";
import { resolve } from "node:path";
try { process.loadEnvFile(resolve(process.cwd(), "../../.env")); } catch {}
import cookieParser from "cookie-parser";
import { loadEnv } from "@awsify/config";
import { NestFactory } from "@nestjs/core";
import { AllExceptionsFilter } from "./modules/all-exceptions.filter";
import { AppModule } from "./modules/app.module";

const env = loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.use(cookieParser());
  app.enableCors({
    origin: env.APP_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  });
  app.setGlobalPrefix("v1");
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000);
}

void bootstrap();
