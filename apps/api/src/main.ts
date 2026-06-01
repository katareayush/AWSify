import "reflect-metadata";
import cookieParser from "cookie-parser";
import { loadEnv } from "@awsify/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";

const env = loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: env.APP_URL,
    credentials: true
  });
  app.use(cookieParser());
  app.setGlobalPrefix("v1");
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000);
}

void bootstrap();
