import { Logger } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { Readable, Writable } from 'stream';
import { pipeline } from 'stream/promises';
import { IdleTimeoutStreamUtility } from './idle-timeout-stream.utility';

/** Streamed downloads (installers) that PRA API passes through from the Sync API to its client. */
export class SyncApiDownloadUtility {
    /**
     * Returns the response with a body that fails with a StreamIdleTimeoutError when no data arrived for
     * idleTimeoutInMs; the upstream socket is closed as well. axios' own timeout covers the time until the
     * response headers, see IdleTimeoutStreamUtility.
     */
    public static withIdleTimeout(
        response: AxiosResponse<NodeJS.ReadableStream>,
        idleTimeoutInMs: number,
        description: string,
    ): AxiosResponse<NodeJS.ReadableStream> {
        const guarded = IdleTimeoutStreamUtility.create(idleTimeoutInMs, description);
        // The error reaches the consumer through `guarded`; the callback only completes the pipeline.
        void pipeline(response.data as Readable, guarded).catch(() => undefined);

        return { ...response, data: guarded };
    }

    /**
     * Forwards a download body to the client response. Never rejects: once the headers are sent, a failure can
     * only end the connection, which pipeline() does, so the client sees an incomplete transfer instead of a
     * connection that stays open. Replaces `body.pipe(res)`, which left both sides open and the error unhandled.
     */
    public static async forward(
        body: NodeJS.ReadableStream,
        res: Writable,
        logger: Logger,
        description: string,
    ): Promise<void> {
        try {
            await pipeline(body as Readable, res);
        } catch (error) {
            logger.warn(`${description} ended early: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
