"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/components/auth/ssr-auth-provider";
import {
  analyzeRateLimitError,
  getRateLimitRecoveryInstructions,
  recordAuthAttempt,
  shouldWarnAboutRateLimit,
  canAttemptPasswordReset,
  clearAuthState,
} from "@/lib/rate-limit-utils";
import { AlertTriangle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    isRateLimited: boolean;
    suggestions: string[];
    waitTime?: number;
  } | null>(null);
  const [showRecoveryTips, setShowRecoveryTips] = useState(false);
  const router = useRouter();
  const { login, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setResetMessage("");
    setRateLimitInfo(null);
    setShowRecoveryTips(false);

    // Record the attempt
    recordAuthAttempt(email, "login");

    try {
      await login(email, password);

      // Get redirect URL from query params
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get("redirectTo") || "/dashboard";

      router.push(redirectTo);
    } catch (error: unknown) {
      const authError = error as Error;
      const rateLimitAnalysis = analyzeRateLimitError(authError);

      if (rateLimitAnalysis.isRateLimited) {
        setRateLimitInfo(rateLimitAnalysis);
        setError(
          "Too many login attempts. Please wait before trying again or use password reset below.",
        );
      } else {
        setError(authError?.message || "Login failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setError("Please enter your email address first");
      return;
    }

    // Check if we can attempt password reset
    if (rateLimitInfo && !canAttemptPasswordReset(rateLimitInfo)) {
      setError(
        "Password reset is also rate limited. Please wait before trying again.",
      );
      return;
    }

    setIsResetting(true);
    setError("");
    setResetMessage("");

    // Record the attempt
    recordAuthAttempt(email, "reset");

    try {
      await resetPassword(email);
      setResetMessage(
        "Password reset email sent! Check your inbox and spam folder.",
      );
    } catch (error: unknown) {
      const authError = error as Error;
      const rateLimitAnalysis = analyzeRateLimitError(authError);

      if (rateLimitAnalysis.isRateLimited) {
        setError(
          "Too many password reset attempts. Please wait before trying again.",
        );
      } else {
        setError(authError?.message || "Failed to send reset email");
      }
    } finally {
      setIsResetting(false);
    }
  };

  const handleClearAuthState = async () => {
    try {
      await clearAuthState();
      setError("");
      setRateLimitInfo(null);
      setResetMessage(
        "Browser auth data cleared. You can try signing in again.",
      );
    } catch {
      setError("Failed to clear auth data");
    }
  };

  // Check if user should be warned about rate limiting
  const shouldShowWarning = email && shouldWarnAboutRateLimit(email, "login");

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>
          Enter your email and password to sign in to your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          {resetMessage && (
            <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
              {resetMessage}
            </div>
          )}
          {shouldShowWarning && !rateLimitInfo && (
            <div className="p-3 text-sm text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-md flex items-start">
              <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                Multiple login attempts detected. If you continue to have
                issues, consider using &quot;Forgot Password&quot; instead.
              </div>
            </div>
          )}
          {rateLimitInfo && (
            <div className="p-3 text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-md">
              <div className="font-medium mb-2">Rate limit reached</div>
              <div className="text-xs space-y-1">
                {rateLimitInfo.suggestions
                  .slice(0, 3)
                  .map((suggestion: string, index: number) => (
                    <div key={index}>• {suggestion}</div>
                  ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowRecoveryTips(!showRecoveryTips)}
                className="mt-2 p-0 h-auto text-xs"
              >
                {showRecoveryTips ? "Hide" : "Show more"} recovery tips
              </Button>
              {showRecoveryTips && (
                <div className="mt-2 pt-2 border-t border-orange-200">
                  <div className="text-xs space-y-2">
                    <div>
                      <div className="font-medium">Try these steps:</div>
                      {getRateLimitRecoveryInstructions().immediate.map(
                        (tip, index) => (
                          <div key={index}>• {tip}</div>
                        ),
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClearAuthState}
                      className="w-full text-xs"
                    >
                      Clear Browser Auth Data
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      asChild
                      className="w-full text-xs"
                    >
                      <Link href="/rate-limit-help">Get detailed help →</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="demo@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePasswordReset}
              disabled={isResetting}
              className="p-0 h-auto font-normal text-muted-foreground hover:text-primary"
            >
              {isResetting ? "Sending..." : "Forgot password?"}
            </Button>
          </div>

          <div className="text-sm text-center">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
