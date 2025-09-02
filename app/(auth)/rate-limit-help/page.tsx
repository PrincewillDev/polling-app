"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Clock,
  RefreshCw,
  CheckCircle,
  HelpCircle,
  ArrowLeft,
  Shield,
} from "lucide-react";
import {
  clearAuthState,
  getRateLimitRecoveryInstructions,
  getRecentAttemptCount,
} from "@/lib/rate-limit-utils";

export default function RateLimitHelpPage() {
  const [isClearing, setIsClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState("");
  const [email, setEmail] = useState("");

  const handleClearAuthState = async () => {
    setIsClearing(true);
    setClearMessage("");

    try {
      await clearAuthState();
      setClearMessage(
        "✅ Browser auth data cleared successfully. You can now try signing in again.",
      );
    } catch (error) {
      setClearMessage("❌ Failed to clear auth data. Please try manually.");
    } finally {
      setIsClearing(false);
    }
  };

  const instructions = getRateLimitRecoveryInstructions();
  const loginAttempts = email ? getRecentAttemptCount(email, "login") : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Link>
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Authentication Rate Limit
            </h1>
            <p className="text-lg text-gray-600">
              Too many authentication attempts detected. Here&apos;s how to resolve this.
            </p>
          </div>
        </div>

        {/* Quick Status Check */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Quick Status Check
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check your email&apos;s recent attempts:
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                {email && (
                  <div className="mt-2 text-sm">
                    <Badge variant={loginAttempts > 5 ? "destructive" : "secondary"}>
                      {loginAttempts} login attempts in the last hour
                    </Badge>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleClearAuthState}
                  disabled={isClearing}
                  className="flex items-center"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {isClearing ? "Clearing..." : "Clear Browser Auth Data"}
                </Button>
              </div>

              {clearMessage && (
                <div className="p-3 text-sm bg-blue-50 border border-blue-200 rounded-md">
                  {clearMessage}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Immediate Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Immediate Actions (Do This Now)
            </CardTitle>
            <CardDescription>
              Stop what you&apos;re doing and follow these steps first
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {instructions.immediate.map((instruction, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-xs font-medium text-red-600">
                      {index + 1}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{instruction}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Short-term Solutions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-600">
              <Clock className="h-5 w-5 mr-2" />
              Short-term Solutions (Next 15-60 minutes)
            </CardTitle>
            <CardDescription>
              Try these if you need to sign in soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {instructions.shortTerm.map((instruction, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-xs font-medium text-orange-600">
                      {index + 1}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{instruction}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-medium text-orange-800 mb-2">
                Alternative: Use Password Reset
              </h4>
              <p className="text-sm text-orange-700 mb-3">
                If you&apos;re unsure about your password, use the password reset
                option instead of repeatedly trying to guess.
              </p>
              <Button variant="outline" asChild size="sm">
                <Link href="/login">Go to Login & Reset Password</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Long-term Solutions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-2" />
              Long-term Solutions (If problem persists)
            </CardTitle>
            <CardDescription>
              For recurring issues or if nothing else works
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {instructions.longTerm.map((instruction, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-xs font-medium text-green-600">
                      {index + 1}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{instruction}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <HelpCircle className="h-5 w-5 mr-2" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">
                  Why am I seeing this error?
                </h4>
                <p className="text-sm text-gray-600">
                  Rate limiting is a security feature that prevents brute force
                  attacks. It triggers after multiple failed authentication
                  attempts in a short period.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-1">
                  How long do I have to wait?
                </h4>
                <p className="text-sm text-gray-600">
                  Typically 15-60 minutes, depending on the number of attempts.
                  The timer resets with each failed attempt, so it&apos;s important to
                  stop trying and wait.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-1">
                  Can I speed up the process?
                </h4>
                <p className="text-sm text-gray-600">
                  No, you cannot speed up the rate limit timer. However, you can
                  try using a different browser, device, or network connection.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-1">
                  What if I forgot my password?
                </h4>
                <p className="text-sm text-gray-600">
                  Use the &quot;Forgot Password&quot; option on the login page instead of
                  guessing. Password reset emails have separate rate limits.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-1">
                  Is my account compromised?
                </h4>
                <p className="text-sm text-gray-600">
                  Not necessarily. Rate limits can be triggered by legitimate
                  users who forget their password or have typing errors. However,
                  if you didn&apos;t make these attempts, consider changing your
                  password.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manual Browser Cleanup */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Manual Browser Cleanup</CardTitle>
            <CardDescription>
              If the automatic cleanup didn&apos;t work, try these manual steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Chrome/Edge:</h4>
                <ol className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>1. Press Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)</li>
                  <li>2. Select &quot;All time&quot; from the time range</li>
                  <li>3. Check &quot;Cookies and other site data&quot;</li>
                  <li>4. Check &quot;Cached images and files&quot;</li>
                  <li>5. Click &quot;Clear data&quot;</li>
                </ol>
              </div>

              <div>
                <h4 className="font-medium mb-2">Firefox:</h4>
                <ol className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>1. Press Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)</li>
                  <li>2. Select &quot;Everything&quot; from the time range</li>
                  <li>3. Check &quot;Cookies&quot; and &quot;Cache&quot;</li>
                  <li>4. Click &quot;Clear Now&quot;</li>
                </ol>
              </div>

              <div>
                <h4 className="font-medium mb-2">Safari:</h4>
                <ol className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>1. Go to Safari → Preferences → Privacy</li>
                  <li>2. Click &quot;Manage Website Data&quot;</li>
                  <li>3. Find and remove entries for this site</li>
                  <li>4. Or click &quot;Remove All&quot; to clear everything</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link href="/login">Try Login Again</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/register">Create New Account</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/">Go to Homepage</Link>
          </Button>
        </div>

        {/* Timer Display */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <Clock className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-sm text-blue-800">
              Recommended wait time: 60 minutes from your last failed attempt
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
