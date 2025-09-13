// external imports
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
// import express from 'express';
// internal imports
import { AppModule } from './app.module';
import { CustomExceptionFilter } from './common/exception/custom-exception.filter';
import appConfig from './config/app.config';
import { SojebStorage } from './common/lib/Disk/SojebStorage';
// import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Handle raw body for webhooks
  // app.use('/payment/stripe/webhook', express.raw({ type: 'application/json' }));

  app.setGlobalPrefix('api');
  // Configure CORS
  app.enableCors({
    origin: true, // Add your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
  });
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    })
  );
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    index: false,
    prefix: '/public',
  }); 
  app.useStaticAssets(join(__dirname, '..', 'public/storage'), {
    index: false,
    prefix: '/storage',
  });
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  app.useGlobalFilters(new CustomExceptionFilter());

  // storage setup
  SojebStorage.config({
    driver: 'local',
    connection: {
      rootUrl: appConfig().storageUrl.rootUrl,
      publicUrl: appConfig().storageUrl.rootUrlPublic,
      // awsBucket: appConfig().fileSystems.s3.bucket,
      // awsAccessKeyId: appConfig().fileSystems.s3.key,
      // awsSecretAccessKey: appConfig().fileSystems.s3.secret,
      // awsDefaultRegion: appConfig().fileSystems.s3.region,
      // awsEndpoint: appConfig().fileSystems.s3.endpoint,
      // minio: true,
    },
  });
  // prisma setup
  // const prismaService = app.get(PrismaService);
  // await prismaService.enableShutdownHooks(app);
  // end prisma

  // swagger
  const options = new DocumentBuilder()
    .setTitle(`${process.env.APP_NAME} api`)
    .setDescription(`${process.env.APP_NAME} api docs`)
    .setVersion('1.0')
    .addTag(`${process.env.APP_NAME}`)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api/docs', app, document);
  // end swagger

  // Try to start server with dynamic port allocation
  const startServer = async (port: number): Promise<void> => {
    try {
      await app.listen(port, '0.0.0.0');
      console.log(`Server running on port ${port}`);
    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, trying port ${port + 1}`);
        await startServer(port + 1);
      } else {
        throw error;
      }
    }
  };

  const initialPort = process.env.PORT ? parseInt(process.env.PORT) : 4000;
  await startServer(initialPort);
}

bootstrap();
