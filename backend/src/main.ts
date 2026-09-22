import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

const logger = new Logger('Bootstrap');

// Surface anything that would otherwise kill the process silently after startup -
// on a host like Railway that just shows "Application failed to respond" with no
// further detail, this is the difference between a diagnosable log and a mystery.
process.on('unhandledRejection', (reason) => logger.error(`Unhandled rejection: ${reason}`));
process.on('uncaughtException', (err) => logger.error(`Uncaught exception: ${err.stack ?? err}`));

async function bootstrap() {
  // rawBody is needed to verify Stripe webhook signatures.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors({ origin: true }); // tighten to the web app origin in production
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = Number(process.env.PORT) || 3000;
  // Explicit 0.0.0.0, not left to Node's default - hosts like Railway route to the
  // container's external interface, and binding only to a loopback/IPv6-only default
  // would start the server "successfully" while still being unreachable from outside.
  await app.listen(port, '0.0.0.0');
  logger.log(`Listening on 0.0.0.0:${port}`);
}
await bootstrap();
