import http from "k6/http";
import { check, sleep } from "k6";

/**
 * Advanced Stress Test using k6
 * This script simulates realistic user behavior:
 * 1. Hitting the health endpoint
 * 2. Getting match history (if token provided)
 */

export const options = {
  stages: [
    // { duration: "1m", target: 100 },
    // { duration: "2m", target: 500 },
    // { duration: "1m", target: 1000 },
    { duration: "1m", target: 10000 },
    // { duration: "1m", target: 1000 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests should be below 500ms
    http_req_failed: ["rate<0.01"], // Error rate should be less than 1%
  },
};

const BASE_URL = __ENV.TARGET_URL || "http://localhost:5174/api/v1";
const TOKEN = __ENV.AUTH_TOKEN || "";

export default function () {
  let healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    "health status is 200": (r) => r.status === 200,
  });

  // if (TOKEN) {
  //   const params = {
  //     headers: {
  //       Authorization: `Bearer ${TOKEN}`,
  //     },
  //   };
  //   let historyRes = http.get(`${BASE_URL}/match/history`, params);
  //   check(historyRes, {
  //     "match history is 200": (r) => r.status === 200,
  //   });
  // }

  sleep(1); // Wait for 1 second between "users" actions
}
