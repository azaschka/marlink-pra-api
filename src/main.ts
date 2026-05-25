/* eslint-disable @typescript-eslint/no-misused-promises */
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';
import helmet from 'helmet';
import { description, name, version } from '../package.json';
import { AppModule } from './app.module';
import { LogService } from './log/services/log.service';
import { runMigrationsBeforeStartup } from './migration/run-migrations-before-startup';
import { AllExceptionsFilter } from './shared/filters';
// import { TimeoutInterceptor } from './shared/interceptors';

function configureOpenApi(app: INestApplication<unknown>) {
    const options = new DocumentBuilder()
        .setTitle(name)
        .setDescription(description)
        .setVersion(version)
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, options, {
        ignoreGlobalPrefix: false,
    });

    SwaggerModule.setup('open-api', app, document);
}

async function bootstrap() {
    try {
        // Run critical migrations BEFORE NestJS/TypeORM initializes
        await runMigrationsBeforeStartup();

        const app = await NestFactory.create(AppModule, {
            logger: ['error', 'warn', 'log'],
            abortOnError: false, // Don't crash on startup errors
        });

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
            allowedHeaders: ['Content-Type', 'X-Api-Key', 'X-Access-Key', 'X-Tenant-Id', 'Authorization'],
            exposedHeaders: ['Content-Length', 'Content-Disposition'],
            credentials: false,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            maxAge: 3600,
            optionsSuccessStatus: 204,
        });

        // Enable global prefix for API routes
        // const defaultApiVersion = version.split('.')[0] ?? '1';
        app.setGlobalPrefix('api', { exclude: ['open-api'] });
        // app.enableVersioning({
        //     type: VersioningType.URI,
        //     defaultVersion: defaultApiVersion,
        // });

        configureOpenApi(app);

        await app.startAllMicroservices();

        // Enable shutdown hooks for graceful shutdown on k8s or process termination
        app.enableShutdownHooks();

        const listeningPort = process.env.PORT || 3001;
        await app.listen(listeningPort);

        console.log(`✅ Application started successfully on PORT: ${listeningPort}`);
        console.log(`📊 Health check: http://localhost:${listeningPort}/health`);
        console.log(`📚 API Documentation: http://localhost:${listeningPort}/open-api`);
        console.log(`🔧 Node.js version: ${process.version}`);
        console.log(`💾 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

        // Setup graceful shutdown handlers
        setupGracefulShutdown(app);
    } catch (error) {
        console.error('❌ Fatal error during application bootstrap:', error);
        console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
        process.exit(1);
    }
}

function setupGracefulShutdown(app: INestApplication) {
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

    signals.forEach((signal) => {
        process.on(signal, async () => {
            console.log(`\n⚠️  Received ${signal} signal - initiating graceful shutdown...`);

            try {
                // Close the server (stop accepting new connections)
                await app.close();
                console.log('✅ Application closed gracefully');
                process.exit(0);
            } catch (error) {
                console.error('❌ Error during graceful shutdown:', error);
                process.exit(1);
            }
        });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
        console.error('❌ Uncaught Exception:', error);
        console.error('Stack trace:', error.stack);
        // Log to database if possible, then exit
        setTimeout(() => process.exit(1), 1000);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
        console.error('❌ Unhandled Promise Rejection at:', promise);
        console.error('Reason:', reason);
        // Don't exit immediately - log and continue
    });

    // Log when process is about to exit
    process.on('exit', (code: number) => {
        console.log(`\n🔚 Process exiting with code: ${code}`);
    });
}

void bootstrap();
