"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Copy, ExternalLink, CheckCircle, Database, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function DatabaseSetupPage() {
  const [copied, setCopied] = useState(false)

  const sqlScript = `-- =====================================================
-- VendHub Database Setup - Run this entire script
-- =====================================================

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  upc VARCHAR(50),
  category VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory table (current stock levels per location/product)
CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  current_stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 5,
  max_stock INTEGER DEFAULT 50,
  last_restocked TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, product_id)
);

-- Create sales_transactions table
CREATE TABLE IF NOT EXISTS sales_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity_sold INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  sale_date DATE NOT NULL,
  data_source VARCHAR(50) NOT NULL,
  raw_data JSONB,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create data_imports table to track CSV uploads
CREATE TABLE IF NOT EXISTS data_imports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  data_source VARCHAR(50) NOT NULL,
  total_rows INTEGER NOT NULL,
  processed_rows INTEGER NOT NULL,
  failed_rows INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'processing',
  error_details TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_location_product ON inventory(location_id, product_id);
CREATE INDEX IF NOT EXISTS idx_sales_location_date ON sales_transactions(location_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_product_date ON sales_transactions(product_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_products_upc ON products(upc);
CREATE INDEX IF NOT EXISTS idx_locations_code ON locations(location_code);

-- Insert sample locations
INSERT INTO locations (location_code, name, address) VALUES
('2.0_SW_02', 'Southwest Office Building 2', '123 Business Park Dr, Austin, TX'),
('SW_02', 'Southwest Campus', '456 University Ave, Austin, TX'),
('NE_01', 'Northeast Plaza', '789 Commerce St, Dallas, TX'),
('DT_05', 'Downtown Tower', '321 Main St, Houston, TX'),
('WS_03', 'Westside Mall', '654 Shopping Center Blvd, San Antonio, TX')
ON CONFLICT (location_code) DO NOTHING;

-- Insert sample products
INSERT INTO products (name, upc, category) VALUES
('Celsius Arctic', '889392014', 'Energy Drinks'),
('Celsius Arctic Berry', '889392014', 'Energy Drinks'),
('Muscle Milk', '520000519', 'Protein Drinks'),
('Muscle Milk Vanilla', '520000519', 'Protein Drinks'),
('Coca Cola', '049000028', 'Soft Drinks'),
('Pepsi', '012000001', 'Soft Drinks'),
('Snickers', '040000001', 'Candy'),
('Doritos Nacho', '028400001', 'Snacks'),
('Lays Classic', '028400002', 'Snacks'),
('Red Bull', '902794001', 'Energy Drinks')
ON CONFLICT DO NOTHING;

-- Insert initial inventory levels
INSERT INTO inventory (location_id, product_id, current_stock, min_stock, max_stock)
SELECT 
  l.id as location_id,
  p.id as product_id,
  FLOOR(RANDOM() * 30 + 10) as current_stock,
  5 as min_stock,
  50 as max_stock
FROM locations l
CROSS JOIN products p
ON CONFLICT (location_id, product_id) DO NOTHING;

-- Success message
SELECT 'VendHub database setup completed successfully!' as status;`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Database className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Setup</h1>
          <p className="text-gray-600">Copy and run this SQL script to set up your VendHub database</p>
        </div>

        <div className="space-y-6">
          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-orange-500 mr-3" />
                Important Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Don't type the filename!</strong> You need to copy the actual SQL code below and paste it into
                  the Supabase SQL Editor.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-3">
                    1
                  </span>
                  <span>Copy the SQL script below</span>
                </div>
                <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-3">
                    2
                  </span>
                  <span>Open Supabase SQL Editor</span>
                </div>
                <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-3">
                    3
                  </span>
                  <span>Paste and run the script</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SQL Script */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Complete Database Setup Script</CardTitle>
                  <CardDescription>Copy this entire script and run it in Supabase SQL Editor</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={copyToClipboard}>
                    {copied ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? "Copied!" : "Copy Script"}
                  </Button>
                  <Button variant="outline" asChild>
                    <a
                      href="https://supabase.com/dashboard/project/feeoklcyjsumzxrudnwg/sql/new"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open SQL Editor
                    </a>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm whitespace-pre-wrap">{sqlScript}</pre>
              </div>
            </CardContent>
          </Card>

          {/* What this script does */}
          <Card>
            <CardHeader>
              <CardTitle>What This Script Creates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Database Tables:</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>
                      • <strong>locations</strong> - Vending machine locations
                    </li>
                    <li>
                      • <strong>products</strong> - Product catalog with UPC codes
                    </li>
                    <li>
                      • <strong>inventory</strong> - Stock levels per location
                    </li>
                    <li>
                      • <strong>sales_transactions</strong> - Sales data from CSV uploads
                    </li>
                    <li>
                      • <strong>data_imports</strong> - Track CSV upload history
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium">Sample Data:</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• 5 sample vending locations</li>
                    <li>• 10 popular vending products</li>
                    <li>• Random inventory levels (10-40 items)</li>
                    <li>• Performance indexes for fast queries</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                After Running the Script
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <p className="text-gray-600 mb-4">
                  Once you've successfully run the SQL script, you can start using VendHub!
                </p>
                <div className="flex justify-center space-x-4">
                  <Link href="/login">
                    <Button>
                      Go to Login
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button variant="outline">View Dashboard</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
