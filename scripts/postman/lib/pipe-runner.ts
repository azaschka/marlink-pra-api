import { ArgumentMetadata, HttpException, PipeTransform, ValidationPipe } from '@nestjs/common';
import { NonEmptyBodyPipe } from '../../../src/shared/pipes';
import { ClassRef, ExtractedComponent } from './model';

/**
 * Runs example values through the request pipes of a route, exactly as Nest would for the argument.
 *
 * Only side-effect free pipes are executed: ValidationPipe (with the options configured on the route) and
 * NonEmptyBodyPipe. Pipes that need the request scope or the database (scope checks, monitoring) are skipped;
 * they are documented, not executed. Nest applies controller pipes, then method pipes, then parameter pipes.
 */

export interface PipeRunResult {
    ok: boolean;
    errors: string[];
    value?: unknown;
}

const RUNNABLE_PIPES: Array<{ name: string; create: () => PipeTransform }> = [
    { name: 'ValidationPipe', create: () => new ValidationPipe() },
    { name: 'NonEmptyBodyPipe', create: () => new NonEmptyBodyPipe() },
];

function toPipe(component: ExtractedComponent): PipeTransform | undefined {
    const runnable = RUNNABLE_PIPES.find((entry) => entry.name === component.name);

    if (!runnable) {
        return undefined;
    }

    if (typeof component.reference === 'object' && component.reference !== null) {
        return component.reference as PipeTransform;
    }

    return runnable.create();
}

/** Pipes in Nest execution order for one argument. */
export function runnablePipes(
    routeComponents: ExtractedComponent[],
    parameterPipes: ExtractedComponent[],
): PipeTransform[] {
    const ordered = [
        ...routeComponents.filter((component) => component.kind === 'pipe' && component.scope === 'controller'),
        ...routeComponents.filter((component) => component.kind === 'pipe' && component.scope === 'method'),
        ...parameterPipes,
    ];

    return ordered.map(toPipe).filter((pipe): pipe is PipeTransform => pipe !== undefined);
}

export function hasValidationPipe(
    routeComponents: ExtractedComponent[],
    parameterPipes: ExtractedComponent[],
): boolean {
    return [...routeComponents, ...parameterPipes].some(
        (component) => component.kind === 'pipe' && component.name === 'ValidationPipe',
    );
}

function messages(error: unknown): string[] {
    if (error instanceof HttpException) {
        const response = error.getResponse() as { message?: string | string[] } | string;

        if (typeof response === 'string') {
            return [response];
        }

        const message = response.message ?? error.message;

        return Array.isArray(message) ? message : [message];
    }

    return [error instanceof Error ? error.message : String(error)];
}

export async function runPipes(
    pipes: PipeTransform[],
    value: unknown,
    type: ArgumentMetadata['type'],
    metatype: ClassRef | undefined,
): Promise<PipeRunResult> {
    let current = value;

    try {
        for (const pipe of pipes) {
            current = await pipe.transform(current, { type, metatype: metatype as ArgumentMetadata['metatype'] });
        }

        return { ok: true, errors: [], value: current };
    } catch (error) {
        return { ok: false, errors: messages(error) };
    }
}
