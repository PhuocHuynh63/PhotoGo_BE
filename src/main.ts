import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import * as passport from 'passport';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);


  app.use(passport.initialize());
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 8000;

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  app.setGlobalPrefix('api/v1', { exclude: [''] });

  //ConfigCORS
  app.enableCors(
    {
      "origin": true,
      "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
      "preflightContinue": false,
      credentials: true
    }
  );

  //#region Microservices
  // const rabbitmqConsumerService = app.get(RabbitmqConsumerService);
  // await rabbitmqConsumerService.listen();
  //#endregion

  await app.listen(port);
}
bootstrap();
