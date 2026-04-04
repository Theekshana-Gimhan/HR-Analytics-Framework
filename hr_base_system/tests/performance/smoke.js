import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * SMOKE TEST
 * 
 * Purpose: Verify that the system can handle minimal load and returns correct responses.
 * Usage: Use this to verify that the environment is ready for higher-load tests.
 */

export const options = {
    vus: 1, // 1 virtual user
    duration: '1m', // for 1 minute
    thresholds: {
        http_req_duration: ['p(99)<1500'], // 99% of requests must complete below 1.5s
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const EMAIL = __ENV.ADMIN_EMAIL || 'admin@simpala.lk';
const PASSWORD = __ENV.ADMIN_PASSWORD || 'password123';

export default function () {
    // 1. Health Check
    const healthRes = http.get(`${BASE_URL}/health`);
    check(healthRes, {
        'health status is 200': (r) => r.status === 200,
    });

    // 2. Login
    const loginPayload = JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
    });

    const loginParams = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, loginParams);

    const loginCheck = check(loginRes, {
        'login status is 200': (r) => r.status === 200,
        'has access token': (r) => r.json().accessToken !== undefined,
    });

    if (loginCheck) {
        const token = loginRes.json().accessToken;
        const authHeaders = {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        };

        // 3. Get Employees (Protected)
        const employeesRes = http.get(`${BASE_URL}/api/v1/employees`, authHeaders);
        check(employeesRes, {
            'get employees status is 200': (r) => r.status === 200,
        });

        // 4. Get My Attendance (Protected)
        const attendanceRes = http.get(`${BASE_URL}/api/v1/attendance/me`, authHeaders);
        check(attendanceRes, {
            'get attendance status is 200': (r) => r.status === 200,
        });
    }

    sleep(1);
}
