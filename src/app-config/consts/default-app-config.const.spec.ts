import { DefaultAppConfig } from './default-app-config.const';

/**
 * Guards the relations between the database connection constants (MARLINKPRA-42).
 * If one of these fails after a change, the pool can hand out stale connections or exceed the MariaDB limits.
 */
describe('DefaultAppConfig database settings', () => {
    // MariaDB target on all environments (wait_timeout = interactive_timeout = 300 s)
    const MARIADB_WAIT_TIMEOUT_IN_MS = 300_000;
    // MariaDB default that Prod may still run with until the DC team has applied the target values
    const MARIADB_MIN_MAX_CONNECTIONS = 151;

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

    it('should keep two services during a rolling update within the smallest MariaDB max_connections', () => {
        // 2 services x 2 (old and new pods during a rolling update), assuming equal pool sizes
        expect(extra.connectionLimit * 4).toBeLessThanOrEqual(MARIADB_MIN_MAX_CONNECTIONS);
    });

    it('should bound the wait for a pooled connection', () => {
        expect(DefaultAppConfig.database.acquireTimeoutInMs).toBeGreaterThan(0);
        expect(DefaultAppConfig.database.readMaxAttempts).toBeGreaterThanOrEqual(1);
    });
});
