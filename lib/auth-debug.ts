import { createClient } from "@/lib/supabase/client";
import { sessionManager } from "./session-manager";

interface AuthDebugInfo {
  timestamp: string;
  userAgent: string;
  url: string;
  supabase: {
    url: string | null;
    hasAnonKey: boolean;
    clientId: string;
  };
  session: {
    exists: boolean;
    isValid: boolean;
    expiresAt: string | null;
    timeUntilExpiry: number | null;
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    userId: string | null;
    email: string | null;
    lastRefresh: string | null;
  };
  storage: {
    hasSessionInLocalStorage: boolean;
    hasSessionInSessionStorage: boolean;
    cookieCount: number;
    supabaseCookies: string[];
  };
  network: {
    isOnline: boolean;
    connectionType: string | null;
  };
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

class AuthDebugger {
  private supabase = createClient();

  /**
   * Generate comprehensive debug information
   */
  async generateDebugInfo(): Promise<AuthDebugInfo> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic environment info
    const timestamp = new Date().toISOString();
    const userAgent =
      typeof window !== "undefined" ? navigator.userAgent : "Server-side";
    const url =
      typeof window !== "undefined" ? window.location.href : "Server-side";

    // Supabase configuration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null;
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const clientId = this.generateClientId();

    if (!supabaseUrl) {
      errors.push("NEXT_PUBLIC_SUPABASE_URL is not set");
    }
    if (!hasAnonKey) {
      errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
    }

    // Session information
    let session = null;
    let sessionExists = false;
    let isValid = false;
    let expiresAt = null;
    let timeUntilExpiry = null;
    let hasAccessToken = false;
    let hasRefreshToken = false;
    let userId = null;
    let email = null;
    let lastRefresh = null;

    try {
      const debugInfo = sessionManager.getDebugInfo();
      session = sessionManager.getSession();

      sessionExists = debugInfo.hasSession;
      isValid = debugInfo.isValid;
      expiresAt = debugInfo.expiresAt;
      timeUntilExpiry = debugInfo.timeUntilExpiry;
      lastRefresh = debugInfo.lastRefresh;

      if (session) {
        hasAccessToken = !!session.access_token;
        hasRefreshToken = !!session.refresh_token;
        userId = session.user?.id || null;
        email = session.user?.email || null;

        // Validate session expiry
        if (timeUntilExpiry !== null && timeUntilExpiry <= 0) {
          warnings.push("Session has expired");
          suggestions.push("Attempt to refresh the session or re-authenticate");
        } else if (
          timeUntilExpiry !== null &&
          timeUntilExpiry < 5 * 60 * 1000
        ) {
          warnings.push("Session expires in less than 5 minutes");
          suggestions.push("Session will be automatically refreshed soon");
        }

        if (!hasAccessToken) {
          errors.push("Session exists but has no access token");
        }
        if (!hasRefreshToken) {
          warnings.push(
            "Session has no refresh token - cannot refresh automatically",
          );
        }
      }
    } catch (error) {
      errors.push(
        `Failed to get session info: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Storage information
    let hasSessionInLocalStorage = false;
    let hasSessionInSessionStorage = false;
    let cookieCount = 0;
    const supabaseCookies: string[] = [];

    if (typeof window !== "undefined") {
      try {
        // Check localStorage
        const localStorageKeys = Object.keys(localStorage);
        hasSessionInLocalStorage = localStorageKeys.some(
          (key) => key.includes("supabase") || key.includes("auth"),
        );

        // Check sessionStorage
        const sessionStorageKeys = Object.keys(sessionStorage);
        hasSessionInSessionStorage = sessionStorageKeys.some(
          (key) => key.includes("supabase") || key.includes("auth"),
        );

        // Check cookies
        const cookies = document.cookie.split(";");
        cookieCount = cookies.length;
        cookies.forEach((cookie) => {
          const name = cookie.split("=")[0].trim();
          if (name.includes("supabase") || name.includes("auth")) {
            supabaseCookies.push(name);
          }
        });

        if (supabaseCookies.length === 0 && sessionExists) {
          warnings.push("Session exists but no auth cookies found");
          suggestions.push("Check if cookies are being blocked or cleared");
        }
      } catch (error) {
        warnings.push("Failed to check browser storage");
      }
    }

    // Network information
    let isOnline = true;
    let connectionType = null;

    if (typeof window !== "undefined") {
      isOnline = navigator.onLine;
      connectionType = (navigator as any).connection?.effectiveType || null;

      if (!isOnline) {
        errors.push("Device is offline");
        suggestions.push("Check internet connection");
      }
    }

    // Generate suggestions based on findings
    if (
      errors.length === 0 &&
      warnings.length === 0 &&
      sessionExists &&
      isValid
    ) {
      suggestions.push("Authentication appears to be working correctly");
    } else if (!sessionExists) {
      suggestions.push("No active session found - user needs to log in");
    } else if (sessionExists && !isValid) {
      suggestions.push(
        "Session exists but is invalid - try refreshing or re-authenticating",
      );
    }

    if (errors.length > 0) {
      suggestions.push("Fix configuration errors first");
    }

    return {
      timestamp,
      userAgent,
      url,
      supabase: {
        url: supabaseUrl,
        hasAnonKey,
        clientId,
      },
      session: {
        exists: sessionExists,
        isValid,
        expiresAt,
        timeUntilExpiry,
        hasAccessToken,
        hasRefreshToken,
        userId,
        email,
        lastRefresh,
      },
      storage: {
        hasSessionInLocalStorage,
        hasSessionInSessionStorage,
        cookieCount,
        supabaseCookies,
      },
      network: {
        isOnline,
        connectionType,
      },
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Generate a unique client ID for debugging
   */
  private generateClientId(): string {
    if (typeof window !== "undefined") {
      let clientId = localStorage.getItem("auth-debug-client-id");
      if (!clientId) {
        clientId = Math.random().toString(36).substring(2, 15);
        localStorage.setItem("auth-debug-client-id", clientId);
      }
      return clientId;
    }
    return "server-side";
  }

  /**
   * Log debug information to console
   */
  async logDebugInfo(): Promise<void> {
    const debugInfo = await this.generateDebugInfo();

    console.group("🔧 Auth Debug Information");
    console.log("Timestamp:", debugInfo.timestamp);
    console.log("URL:", debugInfo.url);
    console.log("Client ID:", debugInfo.supabase.clientId);

    console.group("🔑 Supabase Configuration");
    console.log("URL configured:", !!debugInfo.supabase.url);
    console.log("Anon key configured:", debugInfo.supabase.hasAnonKey);
    if (debugInfo.supabase.url) {
      console.log("Supabase URL:", debugInfo.supabase.url);
    }
    console.groupEnd();

    console.group("👤 Session Information");
    console.log("Session exists:", debugInfo.session.exists);
    console.log("Session valid:", debugInfo.session.isValid);
    console.log("Has access token:", debugInfo.session.hasAccessToken);
    console.log("Has refresh token:", debugInfo.session.hasRefreshToken);
    if (debugInfo.session.email) {
      console.log("User email:", debugInfo.session.email);
    }
    if (debugInfo.session.expiresAt) {
      console.log("Expires at:", debugInfo.session.expiresAt);
      console.log(
        "Time until expiry:",
        debugInfo.session.timeUntilExpiry,
        "ms",
      );
    }
    if (debugInfo.session.lastRefresh) {
      console.log("Last refresh:", debugInfo.session.lastRefresh);
    }
    console.groupEnd();

    console.group("💾 Storage Information");
    console.log(
      "Auth data in localStorage:",
      debugInfo.storage.hasSessionInLocalStorage,
    );
    console.log(
      "Auth data in sessionStorage:",
      debugInfo.storage.hasSessionInSessionStorage,
    );
    console.log("Total cookies:", debugInfo.storage.cookieCount);
    console.log("Supabase cookies:", debugInfo.storage.supabaseCookies);
    console.groupEnd();

    console.group("🌐 Network Information");
    console.log("Online:", debugInfo.network.isOnline);
    if (debugInfo.network.connectionType) {
      console.log("Connection type:", debugInfo.network.connectionType);
    }
    console.groupEnd();

    if (debugInfo.errors.length > 0) {
      console.group("❌ Errors");
      debugInfo.errors.forEach((error) => console.error(error));
      console.groupEnd();
    }

    if (debugInfo.warnings.length > 0) {
      console.group("⚠️ Warnings");
      debugInfo.warnings.forEach((warning) => console.warn(warning));
      console.groupEnd();
    }

    if (debugInfo.suggestions.length > 0) {
      console.group("💡 Suggestions");
      debugInfo.suggestions.forEach((suggestion) => console.log(suggestion));
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * Generate a user-friendly debug report
   */
  async generateReport(): Promise<string> {
    const debugInfo = await this.generateDebugInfo();

    let report = `# Authentication Debug Report\n\n`;
    report += `**Generated:** ${debugInfo.timestamp}\n`;
    report += `**URL:** ${debugInfo.url}\n`;
    report += `**Client ID:** ${debugInfo.supabase.clientId}\n\n`;

    report += `## Configuration\n`;
    report += `- Supabase URL: ${debugInfo.supabase.url ? "✅ Set" : "❌ Missing"}\n`;
    report += `- Anon Key: ${debugInfo.supabase.hasAnonKey ? "✅ Set" : "❌ Missing"}\n\n`;

    report += `## Session Status\n`;
    report += `- Session exists: ${debugInfo.session.exists ? "✅ Yes" : "❌ No"}\n`;
    report += `- Session valid: ${debugInfo.session.isValid ? "✅ Yes" : "❌ No"}\n`;
    report += `- Access token: ${debugInfo.session.hasAccessToken ? "✅ Present" : "❌ Missing"}\n`;
    report += `- Refresh token: ${debugInfo.session.hasRefreshToken ? "✅ Present" : "❌ Missing"}\n`;

    if (debugInfo.session.email) {
      report += `- User: ${debugInfo.session.email}\n`;
    }
    if (debugInfo.session.expiresAt) {
      report += `- Expires: ${debugInfo.session.expiresAt}\n`;
    }
    if (debugInfo.session.timeUntilExpiry !== null) {
      const minutes = Math.round(debugInfo.session.timeUntilExpiry / 60000);
      report += `- Time until expiry: ${minutes} minutes\n`;
    }
    report += "\n";

    report += `## Storage\n`;
    report += `- Auth data in localStorage: ${debugInfo.storage.hasSessionInLocalStorage ? "✅ Found" : "❌ None"}\n`;
    report += `- Auth data in sessionStorage: ${debugInfo.storage.hasSessionInSessionStorage ? "✅ Found" : "❌ None"}\n`;
    report += `- Total cookies: ${debugInfo.storage.cookieCount}\n`;
    report += `- Supabase cookies: ${debugInfo.storage.supabaseCookies.length}\n\n`;

    report += `## Network\n`;
    report += `- Online: ${debugInfo.network.isOnline ? "✅ Yes" : "❌ Offline"}\n`;
    if (debugInfo.network.connectionType) {
      report += `- Connection: ${debugInfo.network.connectionType}\n`;
    }
    report += "\n";

    if (debugInfo.errors.length > 0) {
      report += `## ❌ Errors\n`;
      debugInfo.errors.forEach((error) => {
        report += `- ${error}\n`;
      });
      report += "\n";
    }

    if (debugInfo.warnings.length > 0) {
      report += `## ⚠️ Warnings\n`;
      debugInfo.warnings.forEach((warning) => {
        report += `- ${warning}\n`;
      });
      report += "\n";
    }

    if (debugInfo.suggestions.length > 0) {
      report += `## 💡 Suggestions\n`;
      debugInfo.suggestions.forEach((suggestion) => {
        report += `- ${suggestion}\n`;
      });
      report += "\n";
    }

    return report;
  }

  /**
   * Copy debug report to clipboard
   */
  async copyReportToClipboard(): Promise<boolean> {
    if (typeof window === "undefined" || !navigator.clipboard) {
      return false;
    }

    try {
      const report = await this.generateReport();
      await navigator.clipboard.writeText(report);
      console.log("✅ Debug report copied to clipboard");
      return true;
    } catch (error) {
      console.error("Failed to copy debug report:", error);
      return false;
    }
  }

  /**
   * Test authentication endpoints
   */
  async testEndpoints(): Promise<{
    [key: string]: { status: number; success: boolean; error?: string };
  }> {
    const results: {
      [key: string]: { status: number; success: boolean; error?: string };
    } = {};

    const endpoints = [
      { name: "session", path: "/api/auth/session", method: "GET" },
      { name: "login", path: "/api/auth/login", method: "GET" }, // Should fail with 405
      { name: "register", path: "/api/auth/register", method: "GET" }, // Should fail with 405
      { name: "logout", path: "/api/auth/logout", method: "POST" },
      { name: "refresh", path: "/api/auth/refresh", method: "POST" },
      { name: "reset", path: "/api/auth/reset-password", method: "GET" }, // Should fail with 405
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.path, {
          method: endpoint.method,
          credentials: "include",
        });

        const data = await response.json().catch(() => ({}));

        results[endpoint.name] = {
          status: response.status,
          success: response.ok || response.status === 405, // 405 is expected for wrong methods
          error: data.error,
        };
      } catch (error) {
        results[endpoint.name] = {
          status: 0,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    return results;
  }

  /**
   * Clear all authentication data (for debugging)
   */
  async clearAllAuthData(): Promise<void> {
    console.warn("🧹 Clearing all authentication data...");

    try {
      // Sign out from Supabase
      await this.supabase.auth.signOut();

      // Clear session manager
      await sessionManager.signOut();

      // Clear browser storage
      if (typeof window !== "undefined") {
        // Clear localStorage
        const localKeys = Object.keys(localStorage);
        localKeys.forEach((key) => {
          if (key.includes("supabase") || key.includes("auth")) {
            localStorage.removeItem(key);
          }
        });

        // Clear sessionStorage
        const sessionKeys = Object.keys(sessionStorage);
        sessionKeys.forEach((key) => {
          if (key.includes("supabase") || key.includes("auth")) {
            sessionStorage.removeItem(key);
          }
        });

        // Clear cookies (limited by same-origin policy)
        document.cookie.split(";").forEach((cookie) => {
          const name = cookie.split("=")[0].trim();
          if (name.includes("supabase") || name.includes("auth")) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          }
        });
      }

      console.log("✅ Authentication data cleared");
    } catch (error) {
      console.error("❌ Failed to clear auth data:", error);
    }
  }
}

// Export singleton instance
export const authDebugger = new AuthDebugger();

// Export class for testing
export { AuthDebugger };

// Convenience functions
export const logAuthDebug = () => authDebugger.logDebugInfo();
export const generateAuthReport = () => authDebugger.generateReport();
export const copyAuthReport = () => authDebugger.copyReportToClipboard();
export const testAuthEndpoints = () => authDebugger.testEndpoints();
export const clearAuthData = () => authDebugger.clearAllAuthData();

// Make available globally in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as any).authDebug = {
    log: logAuthDebug,
    report: generateAuthReport,
    copy: copyAuthReport,
    test: testAuthEndpoints,
    clear: clearAuthData,
    debugger: authDebugger,
  };

  console.log("🔧 Auth debugging tools available at window.authDebug");
  console.log("Usage:");
  console.log("- window.authDebug.log() - Log debug info");
  console.log("- window.authDebug.copy() - Copy report to clipboard");
  console.log("- window.authDebug.test() - Test all endpoints");
  console.log("- window.authDebug.clear() - Clear all auth data");
}
