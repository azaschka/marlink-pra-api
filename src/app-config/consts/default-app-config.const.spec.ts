import { DefaultAppConfig } from './default-app-config.const';

/**
 * Guards the relations between the database connection constants (MARLINKPRA-42).
 * If one of these fails after a change, the pool can hand out stale connections or exceed the MariaDB limits.
 */
describe('DefaultAppConfig database settings', () => {
    // MariaDB target on all environments (wait_timeout = interactive_timeout = 300 s)
    const MARIADB_WAIT_TIMEOUT_IN_MS = 300_000;
    // MariaDB max_connections these pool sizes are sized for (the MariaDB default of 151 is NOT sufficient)
    const MARIADB_MAX_CONNECTIONS = 300;
    // Kept free for admin tools, monitoring and migrations
    const MARIADB_CONNECTION_HEADROOM = 50;
    // Pool size of the other service. Keep in sync with DB_EXTRA_MAX_CONNECTIONS in pra-sync-api.
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
        // Old and new pods run side by side during a rolling update, so both pools count twice
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
