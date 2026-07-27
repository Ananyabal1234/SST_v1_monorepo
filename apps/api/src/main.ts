import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ApiErrorDto } from './common/swagger/api-error.dto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });
  
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'ready', 'metrics'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Service Staffing Tracker API')
    .setDescription(
      [
        'MVP hiring pipeline REST API (`/api/v1`).',
        '',
        '## Auth',
        'Use **Authorize** and paste a JWT from `POST /api/v1/auth/login`.',
        'Refresh tokens are returned in the body and as the httpOnly cookie `sst_refresh`.',
        '',
        '## Roles',
        '`ADMIN`, `SALES`, `TA`, `HR`',
        '',
        '## Errors',
        'Errors use `{ statusCode, error, message, correlationId? }`.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token from login/refresh',
      },
      'bearer',
    )
    .addTag('Auth', 'Login, refresh, logout, current user')
    .addTag('Users', 'Admin user management and directory')
    .addTag('Master data', 'Lookups, clients, job families')
    .addTag('Requirements', 'Staffing requirements and status transitions')
    .addTag('Candidates', 'Pipeline candidates linked to requirements')
    .addTag('Offers', 'Offers for selected candidates')
    .addTag('Onboardings', 'HR onboarding after accepted offers')
    .addTag('Dashboard', 'KPI summary, breakdowns, escalations')
    .addTag('Audit', 'Admin audit log queries')
    .addTag('Imports', 'CSV validate / commit')
    .addTag('Health', 'Liveness, readiness, metrics')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ApiErrorDto],
  });
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'SST API Docs',
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`SST API listening on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`Swagger UI at http://localhost:${port}/api/docs`);
}

bootstrap();
