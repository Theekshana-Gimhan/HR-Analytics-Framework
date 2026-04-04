import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * STRESS TEST
 * 
 * Purpose: Push the system to its limits and find the breaking point.
 * Targets: 100+ concurrent users.
 */

export const options = {
    stages: [
        { duration: '2m', target: 50 },  // Ramp up to 50 users
        { duration: '2m', target: 100 }, // Ramp up to 100 users
        { duration: '5m', target: 100 }, // Stay at 100 users
        { duration: '2m', target: 200 }, // Ramp up to 200 users (Stress)
        { duration: '2m', target: 200 }, // Stay at 200 users
        { duration: '5m', target: 0 },   // Ramp down
    ],
    thresholds: {
        http_req_failed: ['rate<0.10'], // We expect some failures under stress, but keep < 10%
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const EMAIL = __ENV.ADMIN_EMAIL || 'admin@simpala.lk';
const PASSWORD = __ENV.ADMIN_PASSWORD || 'password123';

export default function () {
    const loginPayload = JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
    });

    const loginParams = {
        headers: { 'Content-Type': 'application/json' },
    };

    const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, loginParams);

    if (loginRes.status === 200) {
        const token = loginRes.json().accessToken;
        const authHeaders = {
            headers: { 'Authorization': `Bearer ${token}` },
        };

        // Heavy Read Operations
        http.get(`${BASE_URL}/api/v1/employees`, authHeaders);
        http.get(`${BASE_URL}/api/v1/payroll/stats?month=11&year=2025`, authHeaders);
    }

    sleep(1);
}
