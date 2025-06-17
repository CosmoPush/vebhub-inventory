// Sample CSV data for testing with realistic data
export const VENDOR_A_SAMPLE = `Location_ID,Product_Name,Scancode,Trans_Date,Price,Total_Amount
2.0_SW_02,Celsius Arctic,889392014,06/09/2025,3.50,3.82
SW_02,Muscle Milk,520000519,06/10/2025,4.25,4.64
NE_01,Coca Cola,049000028,06/11/2025,2.00,2.18
DT_05,Red Bull,902794001,06/09/2025,3.99,4.35
WS_03,Snickers,040000001,06/10/2025,1.50,1.64
2.0_SW_02,Doritos Nacho,028400001,06/11/2025,1.75,1.91
NE_01,Pepsi,012000001,06/09/2025,2.00,2.18
DT_05,Muscle Milk,520000519,06/10/2025,4.25,4.64
WS_03,Celsius Arctic,889392014,06/11/2025,3.50,3.82
SW_02,Lays Classic,028400002,06/09/2025,1.75,1.91`

export const VENDOR_B_SAMPLE = `Site_Code,Item_Description,UPC,Sale_Date,Unit_Price,Final_Total
SW_02,Celsius Arctic Berry,889392014,2025-06-09,3.50,3.82
NE_01,Muscle Milk Vanilla,520000519,2025-06-10,4.25,4.64
DT_05,Pepsi,012000001,2025-06-11,2.00,2.18
WS_03,Red Bull,902794001,2025-06-09,3.99,4.35
2.0_SW_02,Snickers,040000001,2025-06-10,1.50,1.64
SW_02,Doritos Nacho,028400001,2025-06-11,1.75,1.91
NE_01,Coca Cola,049000028,2025-06-09,2.00,2.18
DT_05,Muscle Milk Vanilla,520000519,2025-06-10,4.25,4.64
WS_03,Celsius Arctic Berry,889392014,2025-06-11,3.50,3.82
2.0_SW_02,Lays Classic,028400002,2025-06-09,1.75,1.91`

export function downloadSampleCSV(dataSource: "vendor_a" | "vendor_b") {
  const csvContent = dataSource === "vendor_a" ? VENDOR_A_SAMPLE : VENDOR_B_SAMPLE
  const filename = `${dataSource}_sample.csv`

  const blob = new Blob([csvContent], { type: "text/csv" })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
