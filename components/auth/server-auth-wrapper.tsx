import { createClient } from "@/lib/supabase/server";
import { SSRAuthProvider } from "./ssr-auth-provider";
import { ClientAuthFallback } from "./client-auth-fallback";

interface ServerAuthWrapperProps {
  children: React.ReactNode;
}

export async function ServerAuthWrapper({ children }: ServerAuthWrapperProps) {
  try {
    const supabase = await createClient();

    // Always use getUser() for security - never trust session.user alone
    const {
      data: { user: authenticatedUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.warn("Error getting authenticated user:", userError.message);
    }

    // Create a valid session object only if user is authenticated
    let validatedSession = null;
    if (authenticatedUser) {
      // Build a safe session object with the authenticated user
      validatedSession = {
        user: authenticatedUser,
        access_token: "", // Will be handled client-side
        refresh_token: "", // Will be handled client-side
        expires_in: 0,
        expires_at: 0,
        token_type: "bearer" as const,
      };
    }

    return (
      <SSRAuthProvider initialSession={validatedSession}>
        {children}
      </SSRAuthProvider>
    );
  } catch (error) {
    console.error(
      "Error in server auth wrapper, falling back to client-only auth:",
      error,
    );

    // Fallback to client-only auth if server auth fails completely
    return <ClientAuthFallback>{children}</ClientAuthFallback>;
  }
}
