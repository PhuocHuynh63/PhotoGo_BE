import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import passport from 'passport';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RabbitmqConsumerService } from './3rdService/microservices/rabbitmq/rabbitmq.consumer.service';

async function bootstrap() {

  // const httpsOptions = {
  //   // pfx: fs.readFileSync('src/config/keystore.p12'),

  //   pfx: fs.readFileSync('dist/config/keystore.p12'),
  //   passphrase: '123123123',
  // };

  // const app = await NestFactory.create(AppModule, {
  //   httpsOptions,
  // });


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


  //#region Swagger
  //ConfigSwagger
  const config = new DocumentBuilder()
    .setTitle('API PhotoGO')
    .setDescription('NestJS API PhotoGO')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/document', app, document);
  //#endregion

  await app.listen(port);
}
bootstrap();
