import { PassThrough, Readable, Writable } from 'stream';
import { pipeline } from 'stream/promises';
import { IdleTimeoutStreamUtility, StreamIdleTimeoutError } from './idle-timeout-stream.utility';

function sink() {
    const chunks: Buffer[] = [];

    return {
        chunks,
        stream: new Writable({
            write(chunk: Buffer, _encoding, callback) {
                chunks.push(chunk);
                callback();
            },
        }),
    };
}

describe('IdleTimeoutStreamUtility', () => {
    it('passes a body through unchanged when data keeps flowing', async () => {
        const target = sink();

        await pipeline(
            Readable.from([Buffer.from('a'), Buffer.from('b'), Buffer.from('c')]),
            IdleTimeoutStreamUtility.create(1000, 'download'),
            target.stream,
        );

        expect(Buffer.concat(target.chunks).toString()).toBe('abc');
    });

    it('fails the pipeline and destroys the source when no data arrives for the idle time', async () => {
        const source = new PassThrough();
        source.write('first chunk');

        const outcome = pipeline(source, IdleTimeoutStreamUtility.create(100, 'installer download'), sink().stream);

        await expect(outcome).rejects.toEqual(
            expect.objectContaining({
                name: 'StreamIdleTimeoutError',
                code: 'ESTREAMIDLE',
                message: 'installer download: no data for 100 ms',
            }),
        );
        await expect(outcome).rejects.toBeInstanceOf(StreamIdleTimeoutError);
        expect(source.destroyed).toBe(true);
    });

    it('resets the timer with every chunk, so a slow but moving body is not cut off', async () => {
        const source = new PassThrough();
        const target = sink();
        const outcome = pipeline(source, IdleTimeoutStreamUtility.create(150, 'download'), target.stream);

        for (let i = 0; i < 6; i++) {
            await new Promise((resolve) => setTimeout(resolve, 60)); // 360 ms in total, never 150 ms idle
            source.write(String(i));
        }
        source.end();

        await expect(outcome).resolves.toBeUndefined();
        expect(Buffer.concat(target.chunks).toString()).toBe('012345');
    });

    it('does not keep the process alive and stops its timer once the body ended', async () => {
        const stage = IdleTimeoutStreamUtility.create(50, 'download');
        const destroy = jest.spyOn(stage, 'destroy');

        await pipeline(Readable.from([Buffer.from('x')]), stage, sink().stream);
        await new Promise((resolve) => setTimeout(resolve, 120));

        expect(destroy).not.toHaveBeenCalledWith(expect.any(StreamIdleTimeoutError));
    });
});
