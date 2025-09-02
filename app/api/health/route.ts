import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const startTime = Date.now();

  try {
    // Health check response structure
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      checks: {
        database: { status: "unknown", responseTime: 0 },
        auth: { status: "unknown", responseTime: 0 },
        memory: { status: "ok", usage: process.memoryUsage() }
      }
    };

    // Check database connectivity
    try {
      const dbStart = Date.now();
      const { error: dbError } = await supabaseAdmin
        .from("users")
        .select("id")
        .limit(1);

      health.checks.database = {
        status: dbError ? "error" : "ok",
        responseTime: Date.now() - dbStart,
        error: dbError?.message
      };
    } catch (error) {
      health.checks.database = {
        status: "error",
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Database connection failed"
      };
    }

    // Check auth service
    try {
      const authStart = Date.now();
      const { error: authError } = await supabase.auth.getSession();

      health.checks.auth = {
        status: authError ? "error" : "ok",
        responseTime: Date.now() - authStart,
        error: authError?.message
      };
    } catch (error) {
      health.checks.auth = {
        status: "error",
        responseTime: Date.now() - authStart,
        error: error instanceof Error ? error.message : "Auth service failed"
      };
    }

    // Determine overall status
    const hasErrors = Object.values(health.checks).some(
      check => check.status === "error"
    );

    if (hasErrors) {
      health.status = "degraded";
    }

    const responseTime = Date.now() - startTime;
    health.checks.overall = {
      status: health.status,
      responseTime
    };

    // Return appropriate HTTP status
    const httpStatus = health.status === "ok" ? 200 : 503;

    return NextResponse.json(health, { status: httpStatus });

  } catch (error) {
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Health check failed",
        responseTime
      },
      { status: 503 }
    );
  }
}

export async function HEAD() {
  // Simple health check without body
  try {
    const { error } = await supabaseAdmin
      .from("users")
      .select("id")
      .limit(1);

    return new Response(null, {
      status: error ? 503 : 200,
      headers: {
        'Cache-Control': 'no-cache',
        'X-Health-Status': error ? 'error' : 'ok'
      }
    });
  } catch (error) {
    return new Response(null, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache',
        'X-Health-Status': 'error'
      }
    });
  }
}
