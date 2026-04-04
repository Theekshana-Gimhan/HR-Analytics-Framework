import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * LOAD TEST
 * 
 * Purpose: Simulate a typical high-load period (e.g., peak morning check-ins).
 * Targets: 50 concurrent users.
 */

export const options = {
    stages: [
        { duration: '1m', target: 20 }, // Ramp up to 20 users over 1 minute
        { duration: '3m', target: 50 }, // Ramp up to 50 users over 3 minutes
        { duration: '5m', target: 50 }, // Stay at 50 users for 5 minutes
        { duration: '1m', target: 0 },  // Ramp down to 0 users
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests must be below 500ms
        http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const EMAIL = __ENV.ADMIN_EMAIL || 'admin@simpala.lk';
const PASSWORD = __ENV.ADMIN_PASSWORD || 'password123';

export default function () {
    // 1. Health Check
    http.get(`${BASE_URL}/health`);

    // 2. Login
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

        // 3. User Browsing Activity
        // Randomize activity slightly
        const rand = Math.random();

        if (rand < 0.4) {
            http.get(`${BASE_URL}/api/v1/employees`, authHeaders);
        } else if (rand < 0.7) {
            http.get(`${BASE_URL}/api/v1/attendance/me`, authHeaders);
        } else {
            http.get(`${BASE_URL}/api/v1/dashboard/summary`, authHeaders);
        }
    }

    sleep(Math.random() * 3 + 1); // Random wait between 1-4 seconds
}
