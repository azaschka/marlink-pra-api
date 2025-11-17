import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';
import helmet from 'helmet';
import { description, name, version } from '../package.json';
import { AppModule } from './app.module';
import { LogService } from './log/services/log.service';
import { AllExceptionsFilter } from './shared/filters';
// import { TimeoutInterceptor } from './shared/interceptors';

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
        const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
        // Enable HTTP security headers
        app.use(helmet());
        // Parse JSON requests with a limit of 5MB
        app.use(json({ limit: '5mb' }));
        // Setup logging and error handling interceptors
        // app.useGlobalInterceptors(new TimeoutInterceptor(180_000));
        // app.useGlobalInterceptors(new LoggingInterceptor(app.get(LogService)), new TimeoutInterceptor(180_000));
        // Setup global exception filter
        app.useGlobalFilters(new AllExceptionsFilter(app.get(LogService)));
        // Enable CORS
        app.enableCors({
            origin: true,
            allowedHeaders: 'Content-Type, X-Api-Key, X-Access-Key, X-Tenant-Id, Authorization',
            exposedHeaders: ['Content-Length', 'Content-Disposition'],
            credentials: false,
            methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
            maxAge: 3600,
            optionsSuccessStatus: 204,
        });
        // Enable global prefix for API routes
        // const defaultApiVersion = version.split('.')[0] ?? '1';
        // app.setGlobalPrefix('api', { exclude: ['open-api'] });
        // app.enableVersioning({
        //     type: VersioningType.URI,
        //     defaultVersion: defaultApiVersion,
        // });

        configureOpenApi(app);

        await app.startAllMicroservices();
        // Enable shutdown hooks for graceful shutdown on k8s or process termination
        // This is important for cleaning up resources and connections properly
        app.enableShutdownHooks();

        const listeningPort = process.env.PORT || 3001;
        await app.listen(listeningPort);
        console.log(`Listening on PORT: ${listeningPort}`);
    } catch (error) {
        console.error('Error during application bootstrap:', error);
        process.exit(1);
    }
}

void bootstrap();
