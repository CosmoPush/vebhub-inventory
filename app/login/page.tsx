"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package2, AlertCircle, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");
  const router = useRouter();
  const supabase = createClient();

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        console.log("Login page - Initial user check:", {
          hasUser: !!user,
          error: error?.message,
          userId: user?.id,
          userEmail: user?.email,
        });

        if (user && !error) {
          console.log(
            "Login page - User already logged in, redirecting to dashboard"
          );
          router.replace("/dashboard");
        }
      } catch (error) {
        console.error("Login page - User check error:", error);
      }
    };

    checkUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Login page - Auth state change:", {
        event,
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        timestamp: new Date().toISOString(),
      });

      if (event === "SIGNED_IN" && session?.user) {
        console.log("Login page - User signed in, redirecting to dashboard");
        // Small delay to ensure session is fully established
        setTimeout(() => {
          router.replace("/dashboard");
        }, 100);
      }

      if (event === "SIGNED_OUT") {
        console.log("Login page - User signed out");
        setError("");
        setSuccess("");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase.auth]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setDebugInfo("");

    // Basic validation
    if (!email || !password) {
      setError("Please enter both email and password");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      console.log("Attempting authentication:", {
        email,
        isSignUp,
        timestamp: new Date().toISOString(),
      });

      if (isSignUp) {
        console.log("Signing up user...");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        console.log("Sign up response:", {
          hasUser: !!data.user,
          hasSession: !!data.session,
          error: error?.message,
        });

        if (error) {
          console.error("Sign up error:", error);
          throw error;
        }

        if (data.user) {
          if (data.session) {
            setSuccess("Account created and logged in! Redirecting...");
            setDebugInfo(`User created and signed in: ${data.user.email}`);
          } else {
            setSuccess(
              "Account created! Please check your email to confirm your account, then sign in."
            );
            setIsSignUp(false);
            setDebugInfo(
              `User created but email confirmation required: ${data.user.id}`
            );
          }
        } else {
          setError("Sign up succeeded but no user data returned");
        }
      } else {
        console.log("Signing in user...");
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        console.log("Sign in response:", {
          hasUser: !!data.user,
          hasSession: !!data.session,
          error: error?.message,
        });

        if (error) {
          console.error("Sign in error:", error);
          throw error;
        }

        if (data.user && data.session) {
          setSuccess("Login successful! Redirecting...");
          setDebugInfo(`Logged in as: ${data.user.email}`);
        } else {
          setError("Login succeeded but no session created");
        }
      }
    } catch (error: any) {
      console.error("Authentication error:", error);

      let errorMessage = "Authentication failed";

      if (error.message) {
        errorMessage = error.message;
      }

      // Handle specific Supabase errors
      if (error.message?.includes("Invalid login credentials")) {
        errorMessage =
          "Invalid email or password. Please check your credentials.";
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage =
          "Please check your email and confirm your account before signing in.";
      } else if (error.message?.includes("User already registered")) {
        errorMessage =
          "An account with this email already exists. Try signing in instead.";
      } else if (error.message?.includes("signup disabled")) {
        errorMessage =
          "Account creation is currently disabled. Please contact support.";
      }

      setError(errorMessage);
      setDebugInfo(`Error details: ${JSON.stringify(error, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  // Test connection function
  const testConnection = async () => {
    try {
      console.log("Testing Supabase connection...");
      const { data, error } = await supabase
        .from("locations")
        .select("count", { count: "exact", head: true });

      if (error) {
        setDebugInfo(`Connection test failed: ${error.message}`);
      } else {
        setDebugInfo(`Connection successful! Database accessible.`);
      }
    } catch (error) {
      setDebugInfo(`Connection test error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Package2 className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">VendHub</CardTitle>
          <CardDescription>
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password (min 6 characters)"
                minLength={6}
                disabled={loading}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                setSuccess("");
                setDebugInfo("");
              }}
              className="text-sm text-blue-600 hover:text-blue-500"
              disabled={loading}
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
