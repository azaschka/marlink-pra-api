import { DefaultAppConfig } from './default-app-config.const';

describe('DefaultAppConfig database settings', () => {
    const MARIADB_WAIT_TIMEOUT_IN_MS = 300_000;
    const MARIADB_MAX_CONNECTIONS = 300;
    const MARIADB_CONNECTION_HEADROOM = 50;
    // Keep in sync with DB_EXTRA_MAX_CONNECTIONS in pra-sync-api.
    const OTHER_SERVICE_POOL_SIZE = 50;

    const { extra } = DefaultAppConfig.database;

    it('should retire idle connections, which mysql2 only does when maxIdle is below connectionLimit', () => {
        expect(extra.maxIdle).toBeGreaterThan(0);
        expect(extra.maxIdle).toBeLessThan(extra.connectionLimit);
    });

    it('should close idle connections well before MariaDB does (idleTimeout at most half of wait_timeout)', () => {
        expect(extra.idleTimeout).toBeGreaterThan(0);
        expect(extra.idleTimeout).toBeLessThanOrEqual(MARIADB_WAIT_TIMEOUT_IN_MS / 2);
    });

    it('should send keep-alive probes before an idle connection would be closed', () => {
        expect(extra.enableKeepAlive).toBe(true);
        expect(extra.keepAliveInitialDelay).toBeGreaterThan(0);
        expect(extra.keepAliveInitialDelay).toBeLessThan(extra.idleTimeout);
    });

    it('should keep both services during a rolling update within max_connections minus the headroom', () => {
        const connectionsDuringRollingUpdate = (extra.connectionLimit + OTHER_SERVICE_POOL_SIZE) * 2;

        expect(connectionsDuringRollingUpdate).toBeLessThanOrEqual(
            MARIADB_MAX_CONNECTIONS - MARIADB_CONNECTION_HEADROOM,
        );
    });

    it('should bound the wait for a pooled connection', () => {
        expect(DefaultAppConfig.database.acquireTimeoutInMs).toBeGreaterThan(0);
        expect(DefaultAppConfig.database.readMaxAttempts).toBeGreaterThanOrEqual(1);
    });
});
