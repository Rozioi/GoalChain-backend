const autocannon = require("autocannon");

/**
 * Basic Stress Test using Autocannon
 * This script tests the health check endpoint to determine the baseline proccessing power of the Fastify server.
 */

async function runTest() {
  const url =
    process.env.TARGET_URL || "http://localhost:3000/api/v1/season/current";

  console.log(`🚀 Starting stress test on: ${url}`);

  const result = await autocannon({
    url: url,
    connections: 1000, // 100 concurrent connections
    duration: 10, // 10 seconds duration
    pipelining: 1,
    title: "Basic Health Check Stress Test",
  });

  console.log("✅ Test Completed!");
  console.log(`-----------------------------------------`);
  console.log(`Requests/sec: ${result.requests.average}`);
  console.log(`Latency (avg): ${result.latency.average} ms`);
  console.log(
    `Throughput (avg): ${(result.throughput.average / 1024 / 1024).toFixed(2)} Mb/s`,
  );
  console.log(`Errors: ${result.errors}`);
  console.log(`Total Requests: ${result.requests.sent}`);
  console.log(`-----------------------------------------`);
}

runTest().catch(console.error);
