import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";

export interface AuthenticatedRequest extends NextRequest {
  user: User;
}

/**
 * Authenticate API request and return user
 */
export async function authenticateRequest(request: NextRequest): Promise<{
  user: User | null;
  error: string | null;
}> {
  try {
    // First try to get user from Authorization header (for client requests)
    const authHeader = request.headers.get("authorization");

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");

      try {
        // Create a temporary supabase client to verify the token
        const supabase = await createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser(token);

        if (authError) {
          console.error("Token authentication error:", authError);
          return {
            user: null,
            error: "Invalid authentication token",
          };
        }

        if (!user) {
          return {
            user: null,
            error: "User not found",
          };
        }

        return { user, error: null };
      } catch (error) {
        console.error("Error creating supabase client:", error);
        return {
          user: null,
          error: "Authentication failed",
        };
      }
    }

    try {
      // Fallback to cookie-based auth (for server-side requests)
      const supabase = await createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("User authentication error:", userError);
        return {
          user: null,
          error: "Invalid authentication",
        };
      }

      if (!user) {
        return {
          user: null,
          error: "Authentication required",
        };
      }

      return { user, error: null };
    } catch (error) {
      console.error("Error getting user:", error);
      return {
        user: null,
        error: "Authentication failed",
      };
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      user: null,
      error: "Authentication failed",
    };
  }
}

/**
 * Middleware wrapper for API routes that require authentication
 */
export function withAuth<T = any>(
  handler: (request: AuthenticatedRequest, context?: any) => Promise<Response>,
  options?: {
    requireAuth?: boolean;
    roles?: string[];
  },
) {
  return async (request: NextRequest, context?: any): Promise<Response> => {
    const { requireAuth = true } = options || {};

    if (!requireAuth) {
      // If auth is not required, add user if available but don't block
      const { user } = await authenticateRequest(request);
      const authenticatedRequest = Object.assign(request, {
        user,
      }) as AuthenticatedRequest;
      return handler(authenticatedRequest, context);
    }

    // Authenticate the request
    const { user, error } = await authenticateRequest(request);

    if (error || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error || "Authentication required",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    // TODO: Add role-based authorization if needed
    // if (options?.roles && !options.roles.some(role => user.app_metadata?.roles?.includes(role))) {
    //   return new Response(
    //     JSON.stringify({
    //       success: false,
    //       error: 'Insufficient permissions'
    //     }),
    //     {
    //       status: 403,
    //       headers: {
    //         'Content-Type': 'application/json',
    //       },
    //     }
    //   )
    // }

    // Add user to request object
    const authenticatedRequest = Object.assign(request, {
      user,
    }) as AuthenticatedRequest;

    return handler(authenticatedRequest, context);
  };
}

/**
 * Extract and validate user from request
 */
export async function getCurrentUserFromRequest(
  request: NextRequest,
): Promise<User | null> {
  const { user } = await authenticateRequest(request);
  return user;
}

/**
 * Check if user owns a resource
 */
export function checkResourceOwnership(
  user: User,
  resourceUserId: string,
): boolean {
  return user.id === resourceUserId;
}

/**
 * Validate request body and return parsed data
 */
export async function validateRequestBody<T = any>(
  request: NextRequest,
  validator?: (data: any) => boolean,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const body = await request.json();

    if (validator && !validator(body)) {
      return {
        data: null,
        error: "Invalid request body",
      };
    }

    return { data: body as T, error: null };
  } catch (error) {
    return {
      data: null,
      error: "Invalid JSON in request body",
    };
  }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: string,
  status: number = 400,
  details?: any,
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error,
      details,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T = any>(
  data: T,
  message?: string,
  status: number = 200,
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      message,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

/**
 * Handle CORS for API routes
 */
export function handleCORS(request: NextRequest): Response | null {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  return null;
}

/**
 * Add CORS headers to response
 */
export function addCORSHeaders(response: Response): Response {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  return response;
}

/**
 * Rate limiting utility (basic implementation)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000, // 15 minutes
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const current = requestCounts.get(identifier);

  if (!current || now > current.resetTime) {
    // Reset or initialize
    const resetTime = now + windowMs;
    requestCounts.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime };
  }

  current.count++;
  requestCounts.set(identifier, current);

  return {
    allowed: true,
    remaining: limit - current.count,
    resetTime: current.resetTime,
  };
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return "unknown";
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .trim();
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
