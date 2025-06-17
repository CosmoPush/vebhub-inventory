"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Copy, ExternalLink, AlertTriangle, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function SetupPage() {
  const [copied, setCopied] = useState("")

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(""), 2000)
  }

  // Your specific Supabase project details
  const supabaseUrl = "https://feeoklcyjsumzxrudnwg.supabase.co"
  const anonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZW9rbGN5anN1bXp4cnVkbndnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNzg4NjMsImV4cCI6MjA2NTY1NDg2M30.nLfjzVe7Qv4HWOfiBudh_nr3kXQd6j_0oHJCU7Mr8SM"

  const envVars = [
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      value: supabaseUrl,
      description: "Your Supabase project URL",
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      value: anonKey,
      description: "Your Supabase anonymous/public key",
    },
    {
      key: "SUPABASE_SERVICE_ROLE_KEY",
      value: "⚠️ NEED TO GET FROM SUPABASE DASHBOARD",
      description: "Your Supabase service role key (different from anon key)",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">VendHub Setup</h1>
          <p className="text-gray-600">Configure your environment variables to get started with VendHub.</p>
        </div>

        <div className="space-y-6">
          {/* Step 1: Get Service Role Key */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">
                  !
                </span>
                Get Your Service Role Key
              </CardTitle>
              <CardDescription>You need to get the correct service role key from Supabase</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Your anon key and service role key are the same, but they should be
                  different. The service role key has elevated permissions for server-side operations.
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Go to Supabase Project Settings</p>
                  <p className="text-sm text-gray-600">Navigate to Settings → API to find your service role key</p>
                </div>
                <Button variant="outline" asChild>
                  <a
                    href="https://supabase.com/dashboard/project/feeoklcyjsumzxrudnwg/settings/api"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Project Settings
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Environment Variables */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">
                  2
                </span>
                Add Environment Variables
              </CardTitle>
              <CardDescription>Copy these exact values to your environment variables</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {envVars.map((envVar) => (
                <div key={envVar.key} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{envVar.key}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(envVar.value, envVar.key)}
                      className="h-8"
                      disabled={envVar.value.includes("⚠️")}
                    >
                      {copied === envVar.key ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{envVar.description}</p>
                  <code
                    className={`text-xs px-2 py-1 rounded block break-all ${
                      envVar.value.includes("⚠️") ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-700"
                    }`}
                  >
                    {envVar.value}
                  </code>
                </div>
              ))}

              <Alert>
                <AlertDescription>
                  <strong>In Supabase Dashboard:</strong>
                  <br />
                  1. Go to Settings → API
                  <br />
                  2. Find the "service_role" key (NOT the anon key)
                  <br />
                  3. Copy it and use it for SUPABASE_SERVICE_ROLE_KEY
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Step 3: Enable Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">
                  3
                </span>
                Enable Email Authentication
              </CardTitle>
              <CardDescription>Configure authentication in your Supabase project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Configure Auth Settings</p>
                  <p className="text-sm text-gray-600">Enable email provider and configure settings</p>
                </div>
                <Button variant="outline" asChild>
                  <a
                    href="https://supabase.com/dashboard/project/feeoklcyjsumzxrudnwg/auth/providers"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Auth Settings
                  </a>
                </Button>
              </div>
              <Alert>
                <AlertDescription>
                  Make sure "Enable email confirmations" is turned OFF for testing, or configure your email settings
                  properly.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Step 4: Database Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">
                  4
                </span>
                Set Up Database
              </CardTitle>
              <CardDescription>Run the SQL scripts to create your database schema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Open SQL Editor</p>
                  <p className="text-sm text-gray-600">Run the database scripts in order</p>
                </div>
                <Button variant="outline" asChild>
                  <a
                    href="https://supabase.com/dashboard/project/feeoklcyjsumzxrudnwg/sql/new"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    SQL Editor
                  </a>
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Run these scripts in order:</p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span>1. scripts/01-create-tables.sql</span>
                    <span className="text-xs text-gray-600">Creates tables & indexes</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span>2. scripts/02-seed-data.sql</span>
                    <span className="text-xs text-gray-600">Adds sample data</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 5: Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">
                  ✓
                </span>
                Test Your Setup
              </CardTitle>
              <CardDescription>Once everything is configured, test the application</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <p className="text-gray-600 mb-4">After completing all steps above:</p>
                <Link href="/login">
                  <Button size="lg">
                    Go to Login Page
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
