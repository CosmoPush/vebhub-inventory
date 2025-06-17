-- =====================================================
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
SELECT 'VendHub database setup completed successfully!' as status;
