"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ExternalLink, CheckCircle, Database, Shield, Upload } from "lucide-react"
import Link from "next/link"

export default function SetupCompletePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Setup Complete!</h1>
          <p className="text-gray-600">
            Your VendHub credentials are configured. Complete these final steps to get started.
          </p>
        </div>

        <div className="space-y-6">
          {/* Step 1: Database Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 text-blue-600 mr-3" />
                Set Up Database Schema
              </CardTitle>
              <CardDescription>Run SQL scripts to create tables and add sample data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <p className="font-medium text-blue-900">Open SQL Editor</p>
                  <p className="text-sm text-blue-700">Run the database scripts to set up your inventory system</p>
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

              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  <strong>Run these scripts in order:</strong>
                  <br />
                  1. Copy and run <code>scripts/01-create-tables.sql</code> - Creates all database tables
                  <br />
                  2. Copy and run <code>scripts/02-seed-data.sql</code> - Adds sample locations and products
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Step 2: Authentication Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 text-green-600 mr-3" />
                Configure Authentication
              </CardTitle>
              <CardDescription>Enable email authentication for user login</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <p className="font-medium text-green-900">Auth Settings</p>
                  <p className="text-sm text-green-700">Make sure email authentication is enabled</p>
                </div>
                <Button variant="outline" asChild>
                  <a
                    href="https://supabase.com/dashboard/project/feeoklcyjsumzxrudnwg/auth/providers"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Auth Providers
                  </a>
                </Button>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Recommended settings for testing:</strong>
                  <br />• Enable "Email" provider
                  <br />• Disable "Enable email confirmations" (for easier testing)
                  <br />• You can enable confirmations later for production
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Step 3: Test the Application */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 text-purple-600 mr-3" />
                Test Your Setup
              </CardTitle>
              <CardDescription>Everything is ready! Start using VendHub</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-purple-900 mb-2">1. Create Account</h4>
                  <p className="text-sm text-purple-700 mb-3">Sign up with your email to get started</p>
                  <Link href="/login">
                    <Button variant="outline" size="sm" className="w-full">
                      Go to Login
                    </Button>
                  </Link>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-purple-900 mb-2">2. View Dashboard</h4>
                  <p className="text-sm text-purple-700 mb-3">See your inventory overview and locations</p>
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm" className="w-full">
                      View Dashboard
                    </Button>
                  </Link>
                </div>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>What you can do now:</strong>
                  <br />• View sample locations and inventory data
                  <br />• Upload CSV files from vending machine providers
                  <br />• Manage inventory levels for each location
                  <br />• Track sales and stock levels in real-time
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-4">Your VendHub inventory management system is ready to use!</p>
          <div className="flex justify-center space-x-4">
            <Link href="/login">
              <Button size="lg">
                Start Using VendHub
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
