"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
  FileUp,
  Info,
  Database,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { downloadSampleCSV } from "@/lib/utils/csv-samples"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [dataSource, setDataSource] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [validationDetails, setValidationDetails] = useState<string>("")

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.name.endsWith(".csv") || selectedFile.type === "text/csv") {
        setFile(selectedFile)
        setError("")
      } else {
        setError("Please select a valid CSV file")
        setFile(null)
      }
    }
  }

  const handleUpload = async () => {
    if (!file || !dataSource) {
      setError("Please select a file and data source")
      return
    }

    // Basic client-side validation
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setError("Please select a CSV file")
      return
    }

    if (file.size === 0) {
      setError("The selected file is empty")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      setError("File size must be less than 10MB")
      return
    }

    setUploading(true)
    setError("")
    setUploadResult(null)
    setValidationDetails("")
    setUploadProgress(10)

    try {
      console.log("Starting upload", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        dataSource,
      })

      const formData = new FormData()
      formData.append("file", file)
      formData.append("dataSource", dataSource)

      setUploadProgress(30)

      const response = await fetch("/api/upload-csv", {
        method: "POST",
        body: formData,
      })

      setUploadProgress(70)

      console.log("Upload response received", {
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get("content-type"),
      })

      // Check if response is JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text()
        console.error("Non-JSON response received", { textResponse })
        throw new Error(`Server returned non-JSON response: ${textResponse.substring(0, 100)}...`)
      }

      let result: any
      try {
        result = await response.json()
      } catch (jsonError) {
        console.error("Failed to parse JSON response", { jsonError })
        throw new Error("Server returned invalid JSON response")
      }

      setUploadProgress(90)

      console.log("Upload response parsed", {
        status: response.status,
        ok: response.ok,
        result,
      })

      if (!response.ok) {
        // Try to extract more detailed error information
        let errorMessage = result.error || `Upload failed with status ${response.status}`

        if (result.error && result.error.includes("validation")) {
          setValidationDetails(result.error)
          errorMessage = "CSV validation failed. Please check the format and try again."
        }

        throw new Error(errorMessage)
      }

      if (!result.success) {
        throw new Error(result.error || "Upload failed")
      }

      setUploadProgress(100)
      setUploadResult(result.data)

      // Reset form
      setFile(null)
      setDataSource("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error: any) {
      console.error("Upload error", error)
      setError(error.message || "Upload failed")
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setDataSource("")
    setError("")
    setValidationDetails("")
    setUploadResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Upload Sales Data</h1>
                <p className="text-sm text-gray-500">Import transactions from vending machine providers</p>
              </div>
            </div>
            <Badge variant="outline" className="hidden md:flex">
              <Database className="h-3 w-3 mr-1" />
              Data Import
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {uploadResult ? (
          <Card className="border-green-100 shadow-lg">
            <CardHeader className="bg-green-50 border-b border-green-100">
              <div className="flex items-center">
                <div className="bg-green-100 p-2 rounded-full mr-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-green-800">Upload Complete</CardTitle>
                  <CardDescription>Your data has been processed successfully</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-lg border p-4 text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">{uploadResult.processed}</div>
                  <div className="text-sm text-gray-600">Rows Processed</div>
                </div>
                <div className="bg-white rounded-lg border p-4 text-center">
                  <div className="text-3xl font-bold text-red-600 mb-1">{uploadResult.failed}</div>
                  <div className="text-sm text-gray-600">Rows Failed</div>
                </div>
                <div className="bg-white rounded-lg border p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{uploadResult.total}</div>
                  <div className="text-sm text-gray-600">Total Rows</div>
                </div>
              </div>

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <Alert variant="warning" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Processing Warnings</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 max-h-40 overflow-y-auto text-sm">
                      {uploadResult.errors.slice(0, 10).map((error: string, index: number) => (
                        <div key={index} className="mb-1 pb-1 border-b border-yellow-100 last:border-0">
                          {error}
                        </div>
                      ))}
                      {uploadResult.errors.length > 10 && (
                        <div className="text-gray-600 mt-2 pt-2 border-t border-yellow-100">
                          ... and {uploadResult.errors.length - 10} more warnings
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="bg-gray-50 flex justify-between">
              <Button variant="outline" onClick={resetForm}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Upload Another File
              </Button>
              <Link href="/dashboard">
                <Button>
                  View Updated Dashboard
                  <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload Form */}
            <Card className="lg:col-span-2 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileUp className="h-5 w-5 mr-2 text-blue-600" />
                  Upload CSV File
                </CardTitle>
                <CardDescription>
                  Upload sales data from your vending machine providers to update inventory levels automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="dataSource" className="text-sm font-medium">
                      Data Source
                    </Label>
                    <Select value={dataSource} onValueChange={setDataSource}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select data source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vendor_a">Vendor A (iOS Vending Systems)</SelectItem>
                        <SelectItem value="vendor_b">Vendor B (Cantaloupe Systems)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="file" className="text-sm font-medium">
                      CSV File
                    </Label>
                    <div className="mt-1.5">
                      <Input
                        ref={fileInputRef}
                        id="file"
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="cursor-pointer"
                        value="" // Always keep file inputs uncontrolled
                      />
                    </div>
                  </div>
                </div>

                {file && (
                  <div className="bg-blue-50 border border-blue-100 rounded-md p-3 flex items-center">
                    <FileText className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-blue-900 truncate">{file.name}</p>
                      <p className="text-sm text-blue-700">
                        {(file.size / 1024).toFixed(1)} KB • {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {validationDetails && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Validation Details</AlertTitle>
                    <AlertDescription className="text-sm mt-1">{validationDetails}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={!file || !dataSource || uploading}
                  className="w-full"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload and Process
                    </>
                  )}
                </Button>

                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing CSV data...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full h-2" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data Format Guide */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="h-5 w-5 mr-2 text-blue-600" />
                  CSV Format Guide
                </CardTitle>
                <CardDescription>Download sample files or check the required format.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="vendor_a" className="w-full">
                  <div className="px-6 pt-2">
                    <TabsList className="w-full">
                      <TabsTrigger value="vendor_a" className="flex-1">
                        Vendor A
                      </TabsTrigger>
                      <TabsTrigger value="vendor_b" className="flex-1">
                        Vendor B
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="vendor_a" className="p-6 pt-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center">
                          <Badge variant="secondary" className="mr-2">
                            iOS Vending Systems
                          </Badge>
                          Required Format
                        </h4>
                        <div className="bg-gray-50 border rounded p-3 text-xs font-mono overflow-x-auto">
                          Location_ID,Product_Name,Scancode,Trans_Date,Price,Total_Amount
                          <br />
                          2.0_SW_02,Celsius Arctic,889392014,06/09/2025,3.50,3.82
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Field Descriptions</h4>
                        <ul className="text-xs space-y-1 text-gray-700">
                          <li>
                            <span className="font-semibold">Location_ID:</span> Vending machine location code
                          </li>
                          <li>
                            <span className="font-semibold">Product_Name:</span> Name of the product sold
                          </li>
                          <li>
                            <span className="font-semibold">Scancode:</span> UPC/barcode of the product
                          </li>
                          <li>
                            <span className="font-semibold">Trans_Date:</span> Date in MM/DD/YYYY format
                          </li>
                          <li>
                            <span className="font-semibold">Price:</span> Unit price (without tax)
                          </li>
                          <li>
                            <span className="font-semibold">Total_Amount:</span> Total amount with tax
                          </li>
                        </ul>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => downloadSampleCSV("vendor_a")}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Sample CSV
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="vendor_b" className="p-6 pt-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center">
                          <Badge variant="secondary" className="mr-2">
                            Cantaloupe Systems
                          </Badge>
                          Required Format
                        </h4>
                        <div className="bg-gray-50 border rounded p-3 text-xs font-mono overflow-x-auto">
                          Site_Code,Item_Description,UPC,Sale_Date,Unit_Price,Final_Total
                          <br />
                          SW_02,Celsius Arctic Berry,889392014,2025-06-09,3.50,3.82
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Field Descriptions</h4>
                        <ul className="text-xs space-y-1 text-gray-700">
                          <li>
                            <span className="font-semibold">Site_Code:</span> Vending machine location code
                          </li>
                          <li>
                            <span className="font-semibold">Item_Description:</span> Name of the product sold
                          </li>
                          <li>
                            <span className="font-semibold">UPC:</span> UPC/barcode of the product
                          </li>
                          <li>
                            <span className="font-semibold">Sale_Date:</span> Date in YYYY-MM-DD format
                          </li>
                          <li>
                            <span className="font-semibold">Unit_Price:</span> Unit price (without tax)
                          </li>
                          <li>
                            <span className="font-semibold">Final_Total:</span> Total amount with tax
                          </li>
                        </ul>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => downloadSampleCSV("vendor_b")}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Sample CSV
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
