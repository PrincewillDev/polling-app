#!/usr/bin/env node

/**
 * Authentication Test Script for Polling App
 * Tests various authentication scenarios and API endpoints
 */

import https from "https";
import http from "http";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const TEST_EMAIL = process.env.TEST_EMAIL || "test@example.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "testpassword123";
const TEST_NAME = process.env.TEST_NAME || "Test User";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith("https");
    const client = isHttps ? https : http;

    const requestOptions = {
      timeout: 10000,
      ...options,
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const parsedData = res.headers["content-type"]?.includes(
            "application/json",
          )
            ? JSON.parse(data)
            : data;

          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedData,
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
          });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function testHealthCheck() {
  log("\n🏥 Testing Health Check...", "cyan");

  try {
    const response = await makeRequest(`${BASE_URL}/api/health`);

    if (response.status === 200) {
      log("✅ Health check passed", "green");
      if (response.data.checks) {
        Object.entries(response.data.checks).forEach(([service, check]) => {
          const status =
            check.status === "ok"
              ? "✅"
              : check.status === "error"
                ? "❌"
                : "⚠️";
          log(
            `   ${status} ${service}: ${check.status} (${check.responseTime || 0}ms)`,
          );
        });
      }
    } else {
      log(`❌ Health check failed with status ${response.status}`, "red");
      log(`   Response: ${JSON.stringify(response.data)}`, "yellow");
    }
  } catch (error) {
    log(`❌ Health check error: ${error.message}`, "red");
  }
}

async function testPageLoads() {
  log("\n📄 Testing Page Loads...", "cyan");

  const pages = [
    { path: "/", name: "Home Page" },
    { path: "/login", name: "Login Page" },
    { path: "/register", name: "Register Page" },
    { path: "/rate-limit-help", name: "Rate Limit Help" },
  ];

  for (const page of pages) {
    try {
      const response = await makeRequest(`${BASE_URL}${page.path}`, {
        method: "GET",
        headers: {
          "User-Agent": "Auth-Test-Script/1.0",
        },
      });

      if (response.status === 200) {
        log(`✅ ${page.name} loaded successfully`, "green");
      } else if (response.status >= 300 && response.status < 400) {
        log(`🔄 ${page.name} redirected (${response.status})`, "yellow");
      } else {
        log(`❌ ${page.name} failed (${response.status})`, "red");
      }
    } catch (error) {
      log(`❌ ${page.name} error: ${error.message}`, "red");
    }
  }
}

async function testProtectedRoutes() {
  log("\n🔒 Testing Protected Routes (Unauthenticated)...", "cyan");

  const protectedRoutes = ["/dashboard", "/polls/create", "/polls/edit"];

  for (const route of protectedRoutes) {
    try {
      const response = await makeRequest(`${BASE_URL}${route}`, {
        method: "GET",
        headers: {
          "User-Agent": "Auth-Test-Script/1.0",
        },
      });

      if (response.status === 302 || response.status === 307) {
        const location = response.headers.location || "unknown";
        if (location.includes("/login")) {
          log(`✅ ${route} correctly redirects to login`, "green");
        } else {
          log(
            `⚠️ ${route} redirects to ${location} instead of login`,
            "yellow",
          );
        }
      } else if (response.status === 200) {
        log(`❌ ${route} accessible without authentication!`, "red");
      } else {
        log(`⚠️ ${route} returned status ${response.status}`, "yellow");
      }
    } catch (error) {
      log(`❌ ${route} error: ${error.message}`, "red");
    }
  }
}

async function testAPIEndpoints() {
  log("\n🔌 Testing API Endpoints (Unauthenticated)...", "cyan");

  const apiEndpoints = [
    { path: "/api/polls", method: "GET", name: "Public Polls" },
    { path: "/api/user/polls", method: "GET", name: "User Polls (Protected)" },
    { path: "/api/polls", method: "POST", name: "Create Poll (Protected)" },
  ];

  for (const endpoint of apiEndpoints) {
    try {
      const response = await makeRequest(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Auth-Test-Script/1.0",
        },
        body:
          endpoint.method === "POST"
            ? JSON.stringify({
                title: "Test Poll",
                category: "test",
                options: [{ text: "Option 1" }, { text: "Option 2" }],
              })
            : undefined,
      });

      if (endpoint.name.includes("Protected")) {
        if (response.status === 401) {
          log(
            `✅ ${endpoint.name} correctly returns 401 unauthorized`,
            "green",
          );
        } else {
          log(
            `❌ ${endpoint.name} should return 401 but got ${response.status}`,
            "red",
          );
        }
      } else {
        if (response.status === 200) {
          log(`✅ ${endpoint.name} accessible`, "green");
        } else {
          log(`⚠️ ${endpoint.name} returned ${response.status}`, "yellow");
        }
      }
    } catch (error) {
      log(`❌ ${endpoint.name} error: ${error.message}`, "red");
    }
  }
}

async function testRateLimitHandling() {
  log("\n⏱️ Testing Rate Limit Handling...", "cyan");

  // Test multiple rapid requests to trigger potential rate limiting
  const requests = [];
  const numRequests = 5;

  log(`   Making ${numRequests} rapid authentication attempts...`);

  for (let i = 0; i < numRequests; i++) {
    requests.push(
      makeRequest(`${BASE_URL}/api/user/polls`, {
        method: "GET",
        headers: {
          Authorization: "Bearer invalid-token-" + i,
          "Content-Type": "application/json",
        },
      }).catch((error) => ({ error: error.message, index: i })),
    );
  }

  try {
    const responses = await Promise.all(requests);

    let authErrors = 0;
    let rateLimitErrors = 0;
    let timeoutErrors = 0;

    responses.forEach((response, index) => {
      if (response.error) {
        if (response.error.includes("timeout")) {
          timeoutErrors++;
        }
        log(`   Request ${index + 1}: Error - ${response.error}`, "yellow");
      } else if (response.status === 401) {
        authErrors++;
      } else if (response.status === 429) {
        rateLimitErrors++;
      }
    });

    log(
      `   Results: ${authErrors} auth errors, ${rateLimitErrors} rate limit errors, ${timeoutErrors} timeouts`,
    );

    if (timeoutErrors === 0) {
      log("✅ No timeout errors during rapid requests", "green");
    } else {
      log(`⚠️ ${timeoutErrors} requests timed out`, "yellow");
    }
  } catch (error) {
    log(`❌ Rate limit test error: ${error.message}`, "red");
  }
}

async function testMiddlewareTimeout() {
  log("\n⏰ Testing Middleware Timeout Handling...", "cyan");

  try {
    // Test a protected route that should go through middleware
    const startTime = Date.now();
    const response = await makeRequest(`${BASE_URL}/dashboard`, {
      method: "GET",
      headers: {
        "User-Agent": "Auth-Test-Script/1.0",
      },
    });

    const responseTime = Date.now() - startTime;

    if (responseTime < 5000) {
      // Less than 5 seconds
      log(`✅ Middleware responds quickly (${responseTime}ms)`, "green");
    } else {
      log(`⚠️ Middleware slow response (${responseTime}ms)`, "yellow");
    }

    // Check if it's a proper redirect or response
    if (response.status >= 300 && response.status < 400) {
      log(
        `✅ Middleware correctly handles redirect (${response.status})`,
        "green",
      );
    } else if (response.status === 200) {
      log(`✅ Middleware allows access (${response.status})`, "green");
    } else {
      log(
        `⚠️ Middleware returned unexpected status: ${response.status}`,
        "yellow",
      );
    }
  } catch (error) {
    if (error.message.includes("timeout")) {
      log(`❌ Middleware timeout detected: ${error.message}`, "red");
    } else {
      log(`❌ Middleware error: ${error.message}`, "red");
    }
  }
}

async function runTests() {
  log("🧪 Starting Authentication Tests", "magenta");
  log("=====================================", "magenta");
  log(`Base URL: ${BASE_URL}`, "blue");
  log(`Test Email: ${TEST_EMAIL}`, "blue");
  log(`Timestamp: ${new Date().toISOString()}`, "blue");

  await testHealthCheck();
  await testPageLoads();
  await testProtectedRoutes();
  await testAPIEndpoints();
  await testRateLimitHandling();
  await testMiddlewareTimeout();

  log("\n📊 Test Summary", "magenta");
  log("=====================================", "magenta");
  log("✅ = Passed", "green");
  log("⚠️ = Warning/Unexpected", "yellow");
  log("❌ = Failed", "red");
  log("🔄 = Redirected", "cyan");

  log("\n🏁 Tests completed!", "magenta");
}

// Handle process signals
process.on("SIGINT", () => {
  log("\n\n⚡ Test interrupted by user", "yellow");
  process.exit(0);
});

process.on("unhandledRejection", (reason, promise) => {
  log(`❌ Unhandled Promise Rejection: ${reason}`, "red");
});

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch((error) => {
    log(`❌ Test suite error: ${error.message}`, "red");
    process.exit(1);
  });
}

export {
  runTests,
  testHealthCheck,
  testPageLoads,
  testProtectedRoutes,
  testAPIEndpoints,
  testRateLimitHandling,
  testMiddlewareTimeout,
};
