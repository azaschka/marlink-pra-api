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
    try {
        const app = await NestFactory.create(AppModule);
        app.use(json({ limit: '1mb' }));
        app.enableCors({
            origin: true,
            methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
            allowedHeaders: 'Content-Type, X-Api-Key, Authorization',
            exposedHeaders: ['X-Total-Count'],
            credentials: false,
            maxAge: 600,
        });

        configureOpenApi(app);

        await app.startAllMicroservices();

        const listeningPort = process.env.PORT || 3001;
        await app.listen(listeningPort);
        console.log(`Listening on PORT: ${listeningPort}`);
    } catch (error) {
        console.error('Error during application bootstrap:', error);
        process.exit(1);
    }
}

void bootstrap();
