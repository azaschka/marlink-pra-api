import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';
import { description, name, version } from '../package.json';
import { AppModule } from './app.module';

function configureOpenApi(app: INestApplication<unknown>) {
    const options = new DocumentBuilder()
        .setTitle(name)
        .setDescription(description)
        .setVersion(version)
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, options);

    SwaggerModule.setup('open-api', app, document);
}

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.use(json({ limit: '1mb' }));

    configureOpenApi(app);

    await app.startAllMicroservices();

    const listeningPort = process.env.PORT || 3001;
    await app.listen(listeningPort);
    console.log(`Listening on PORT: ${listeningPort}`);
}

void bootstrap();
