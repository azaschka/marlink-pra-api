import { Transform, TransformCallback } from 'stream';

/** Raised when a streamed body made no progress for the configured time. */
export class StreamIdleTimeoutError extends Error {
    public readonly code = 'ESTREAMIDLE';

    constructor(
        public readonly idleTimeoutInMs: number,
        description: string,
    ) {
        super(`${description}: no data for ${idleTimeoutInMs} ms`);
        this.name = 'StreamIdleTimeoutError';
    }
}

/**
 * Pass-through stage that fails a streamed body when no chunk passed for idleTimeoutInMs.
 *
 * axios' `timeout` limits the time until the response headers. What ends a body that stalls afterwards depends on
 * the transport: with redirects enabled (the axios default), follow-redirects destroys the idle socket after the
 * same time with a generic "aborted" error; with `maxRedirects: 0` nothing does. This stage makes the bound for the
 * body explicit and independent of that detail, and reports it as a StreamIdleTimeoutError. Put it into a
 * `stream.pipeline(...)` behind the response body: the pipeline then destroys every stage, including the upstream
 * socket. Back-pressure counts as no progress, which is intended: a download that does not move for the whole
 * period is stuck, whichever side is the cause.
 *
 * Only use it inside pipeline() or with an 'error' listener, as every stream that is destroyed with an error emits
 * 'error'.
 */
export class IdleTimeoutStreamUtility {
    public static create(idleTimeoutInMs: number, description: string): Transform {
        let timer: NodeJS.Timeout | undefined;

        const stage = new Transform({
            transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
                arm();
                callback(null, chunk);
            },
            flush(callback: TransformCallback) {
                clearTimeout(timer);
                callback();
            },
            destroy(error: Error | null, callback: (error: Error | null) => void) {
                clearTimeout(timer);
                callback(error);
            },
        });

        const arm = () => {
            clearTimeout(timer);
            timer = setTimeout(
                () => stage.destroy(new StreamIdleTimeoutError(idleTimeoutInMs, description)),
                idleTimeoutInMs,
            );
            timer.unref();
        };

        arm();

        return stage;
    }
}
