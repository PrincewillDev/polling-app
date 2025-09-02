import { createClient } from "@/lib/supabase/client";

export interface RateLimitInfo {
  isRateLimited: boolean;
  estimatedResetTime?: Date;
  attemptCount?: number;
  suggestions: string[];
}

/**
 * Check if user is likely rate limited and provide recovery suggestions
 */
export function analyzeRateLimitError(error: any): RateLimitInfo {
  const errorMessage = error?.message?.toLowerCase() || "";

  const isRateLimited =
    errorMessage.includes("rate limit") ||
    errorMessage.includes("too many requests") ||
    errorMessage.includes("request rate limit reached");

  const suggestions: string[] = [];

  if (isRateLimited) {
    // Supabase typically uses different rate limits:
    // - Email rate limit: 1 email per 60 seconds
    // - Auth attempts: varies by plan (usually 30-60 per hour)
    suggestions.push(
      "Wait 15-60 minutes before trying again",
      "Clear your browser cache and cookies",
      "Try using an incognito/private browsing window",
      'If you forgot your password, use the "Forgot Password" option instead',
      "Check if you have multiple browser tabs trying to authenticate",
      "If the issue persists, contact support",
    );

    // Estimate reset time (conservative estimate)
    const estimatedResetTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    return {
      isRateLimited: true,
      estimatedResetTime,
      suggestions,
    };
  }

  return {
    isRateLimited: false,
    suggestions: [],
  };
}

/**
 * Get user-friendly error message with recovery suggestions
 */
export function getRateLimitErrorMessage(error: any): string {
  const analysis = analyzeRateLimitError(error);

  if (!analysis.isRateLimited) {
    return error?.message || "An error occurred";
  }

  const baseMessage = "Too many authentication attempts detected.";
  const timeEstimate = analysis.estimatedResetTime
    ? ` Please wait until ${analysis.estimatedResetTime.toLocaleTimeString()} before trying again.`
    : " Please wait 15-60 minutes before trying again.";

  const suggestions =
    analysis.suggestions.length > 0
      ? `\n\nSuggestions:\n• ${analysis.suggestions.slice(0, 3).join("\n• ")}`
      : "";

  return baseMessage + timeEstimate + suggestions;
}

/**
 * Check if we can attempt a different auth method (like password reset)
 */
export function canAttemptPasswordReset(error: any): boolean {
  const analysis = analyzeRateLimitError(error);

  // Password reset usually has separate rate limits
  // Allow password reset unless specifically blocked
  return !error?.message?.toLowerCase().includes("password reset");
}

/**
 * Clear local auth state to help with rate limit issues
 */
export async function clearAuthState(): Promise<void> {
  try {
    const supabase = createClient();

    // Sign out to clear any stale sessions
    await supabase.auth.signOut();

    // Clear local storage items that might be related to auth
    if (typeof window !== "undefined") {
      const keysToRemove = [];

      // Find Supabase-related keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith("supabase") ||
            key.startsWith("sb-") ||
            key.includes("auth"))
        ) {
          keysToRemove.push(key);
        }
      }

      // Remove the keys
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Also clear session storage
      keysToRemove.forEach((key) => sessionStorage.removeItem(key));
    }
  } catch (error) {
    console.error("Error clearing auth state:", error);
  }
}

/**
 * Get rate limit recovery instructions
 */
export function getRateLimitRecoveryInstructions(): {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
} {
  return {
    immediate: [
      "Stop trying to sign in for now",
      "Close any extra browser tabs with the app open",
      "Try using incognito/private browsing mode",
    ],
    shortTerm: [
      "Wait 15-60 minutes before your next attempt",
      "Clear browser cache and cookies",
      "Try a different browser or device",
      'Use "Forgot Password" if you\'re unsure of your credentials',
    ],
    longTerm: [
      "Contact support if the issue persists after waiting",
      "Check if your IP might be blocked",
      "Ensure you're using the correct email address",
      "Consider if you have automation/scripts running that might trigger limits",
    ],
  };
}

/**
 * Create a rate limit error with helpful information
 */
export class RateLimitError extends Error {
  public readonly isRateLimited = true;
  public readonly estimatedResetTime?: Date;
  public readonly suggestions: string[];

  constructor(originalError: any) {
    const analysis = analyzeRateLimitError(originalError);
    const message = getRateLimitErrorMessage(originalError);

    super(message);
    this.name = "RateLimitError";
    this.estimatedResetTime = analysis.estimatedResetTime;
    this.suggestions = analysis.suggestions;
  }
}

/**
 * Wrap auth functions to handle rate limits gracefully
 */
export function withRateLimitHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const analysis = analyzeRateLimitError(error);

      if (analysis.isRateLimited) {
        throw new RateLimitError(error);
      }

      throw error;
    }
  };
}

/**
 * Store rate limit attempt for tracking
 */
export function recordAuthAttempt(
  email: string,
  type: "login" | "register" | "reset",
): void {
  if (typeof window === "undefined") return;

  const key = `auth_attempts_${type}`;
  const now = Date.now();
  const attempts = JSON.parse(localStorage.getItem(key) || "{}");

  // Clean up old attempts (older than 1 hour)
  const oneHourAgo = now - 60 * 60 * 1000;
  Object.keys(attempts).forEach((email) => {
    attempts[email] = attempts[email].filter(
      (time: number) => time > oneHourAgo,
    );
    if (attempts[email].length === 0) {
      delete attempts[email];
    }
  });

  // Record new attempt
  if (!attempts[email]) {
    attempts[email] = [];
  }
  attempts[email].push(now);

  localStorage.setItem(key, JSON.stringify(attempts));
}

/**
 * Check recent attempt count for an email
 */
export function getRecentAttemptCount(
  email: string,
  type: "login" | "register" | "reset",
): number {
  if (typeof window === "undefined") return 0;

  const key = `auth_attempts_${type}`;
  const attempts = JSON.parse(localStorage.getItem(key) || "{}");
  const userAttempts = attempts[email] || [];

  // Count attempts in the last hour
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  return userAttempts.filter((time: number) => time > oneHourAgo).length;
}

/**
 * Should we warn user about approaching rate limit?
 */
export function shouldWarnAboutRateLimit(
  email: string,
  type: "login" | "register" | "reset",
): boolean {
  const count = getRecentAttemptCount(email, type);

  // Warn after 3 attempts (before hitting typical limits of 5-10)
  return count >= 3;
}
