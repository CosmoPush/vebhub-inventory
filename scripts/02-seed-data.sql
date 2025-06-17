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
  FLOOR(RANDOM() * 30 + 10) as current_stock, -- Random stock between 10-40
  5 as min_stock,
  50 as max_stock
FROM locations l
CROSS JOIN products p
ON CONFLICT (location_id, product_id) DO NOTHING;
