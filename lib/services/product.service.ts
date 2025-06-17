import type { SupabaseClient } from "@supabase/supabase-js"
import { BaseService } from "./base.service"

// Define types locally to avoid import issues
interface Product {
  id: string
  name: string
  upc: string
  category: string
  updated_at?: string
}

type ProductCategory = "Energy Drinks" | "Protein Drinks" | "Soft Drinks" | "Candy" | "Snacks" | "Other"

export class ProductService extends BaseService {
  constructor(db: SupabaseClient) {
    super(db, "ProductService")
  }

  async findById(id: string): Promise<Product> {
    console.log("Finding product by ID", { id })

    const { data, error } = await this.db.from("products").select("*").eq("id", id).single()

    if (error) {
      throw new Error(`Product not found: ${error.message}`)
    }

    if (!data) {
      throw new Error("Product not found")
    }

    return data
  }

  async findByUPC(upc: string): Promise<Product | null> {
    console.log("Finding product by UPC", { upc })

    const { data, error } = await this.db.from("products").select("*").eq("upc", upc).single()

    if (error && error.code !== "PGRST116") {
      throw new Error(`Failed to find product: ${error.message}`)
    }

    return data || null
  }

  async findOrCreateByUPC(upc: string, name: string, category: ProductCategory): Promise<Product> {
    console.log("Finding or creating product by UPC", { upc, name, category })

    try {
      // Try to find by UPC first
      let existingProduct = await this.findByUPC(upc)

      if (existingProduct) {
        console.log("Found existing product by UPC", { productId: existingProduct.id, name: existingProduct.name })
        return existingProduct
      }

      // Try to find by similar name
      const normalizedName = this.normalizeProductName(name)
      const { data: similarProducts, error: searchError } = await this.db
        .from("products")
        .select("*")
        .ilike("name", `%${normalizedName}%`)

      if (searchError) {
        console.warn("Error searching for similar products:", searchError.message)
      }

      if (similarProducts && similarProducts.length > 0) {
        existingProduct = similarProducts[0]
        console.log("Found existing product by name similarity", {
          productId: existingProduct.id,
          existingName: existingProduct.name,
          searchName: normalizedName,
        })
        return existingProduct
      }

      // Create new product
      console.log("Creating new product", { upc, name, category })

      const { data: newProduct, error } = await this.db
        .from("products")
        .insert({
          name,
          upc,
          category,
        })
        .select()
        .single()

      if (error) {
        console.error("Failed to create product", { error, upc, name, category })
        throw error
      }

      if (!newProduct) {
        throw new Error("No product returned after creation")
      }

      console.log("Successfully created new product", {
        productId: newProduct.id,
        name: newProduct.name,
        upc: newProduct.upc,
        category: newProduct.category,
      })

      return newProduct
    } catch (error) {
      console.error("Error in findOrCreateByUPC", { error, upc, name, category })
      throw error
    }
  }

  async getAll(): Promise<Product[]> {
    console.log("Fetching all products")

    const { data, error } = await this.db.from("products").select("*").order("name")

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`)
    }

    return data || []
  }

  async getByCategory(category: ProductCategory): Promise<Product[]> {
    console.log("Fetching products by category", { category })

    const { data, error } = await this.db.from("products").select("*").eq("category", category).order("name")

    if (error) {
      throw new Error(`Failed to fetch products by category: ${error.message}`)
    }

    return data || []
  }

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    console.log("Updating product", { id, updates })

    const dbUpdates = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await this.db.from("products").update(dbUpdates).eq("id", id).select().single()

    if (error) {
      throw new Error(`Failed to update product: ${error.message}`)
    }

    if (!data) {
      throw new Error("No product returned after update")
    }

    return data
  }

  async delete(id: string): Promise<void> {
    console.log("Deleting product", { id })

    const { error } = await this.db.from("products").delete().eq("id", id)

    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`)
    }
  }

  async searchProducts(searchTerm: string): Promise<Product[]> {
    console.log("Searching products", { searchTerm })

    const { data, error } = await this.db
      .from("products")
      .select("*")
      .or(`name.ilike.%${searchTerm}%,upc.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
      .order("name")

    if (error) {
      throw new Error(`Failed to search products: ${error.message}`)
    }

    return data || []
  }

  async getProductsByUPCs(upcs: string[]): Promise<Product[]> {
    console.log("Fetching products by UPCs", { upcCount: upcs.length })

    if (upcs.length === 0) {
      return []
    }

    const { data, error } = await this.db.from("products").select("*").in("upc", upcs)

    if (error) {
      throw new Error(`Failed to fetch products by UPCs: ${error.message}`)
    }

    return data || []
  }

  async getCategoryCounts(): Promise<Record<ProductCategory, number>> {
    console.log("Fetching category counts")

    const { data, error } = await this.db
      .from("products")
      .select("category")
      .then(({ data, error }) => {
        if (error) throw error

        const counts: Record<ProductCategory, number> = {
          "Energy Drinks": 0,
          "Protein Drinks": 0,
          "Soft Drinks": 0,
          Candy: 0,
          Snacks: 0,
          Other: 0,
        }

        if (data) {
          data.forEach((product) => {
            const category = product.category as ProductCategory
            if (counts[category] !== undefined) {
              counts[category]++
            } else {
              counts["Other"]++
            }
          })
        }

        return { data: counts, error: null }
      })

    if (error) {
      throw new Error(`Failed to fetch category counts: ${error.message}`)
    }

    return (
      data || {
        "Energy Drinks": 0,
        "Protein Drinks": 0,
        "Soft Drinks": 0,
        Candy: 0,
        Snacks: 0,
        Other: 0,
      }
    )
  }

  private normalizeProductName(name: string): string {
    return name
      .replace(/\s+(Vanilla|Berry|Arctic|Classic|Original).*$/i, "")
      .trim()
      .toLowerCase()
  }

  categorizeProduct(productName: string): ProductCategory {
    const name = productName.toLowerCase()

    if (name.includes("celsius") || name.includes("red bull") || name.includes("monster")) {
      return "Energy Drinks"
    }
    if (name.includes("muscle milk") || name.includes("protein")) {
      return "Protein Drinks"
    }
    if (name.includes("coke") || name.includes("pepsi") || name.includes("sprite") || name.includes("cola")) {
      return "Soft Drinks"
    }
    if (name.includes("snickers") || name.includes("candy") || name.includes("chocolate")) {
      return "Candy"
    }
    if (name.includes("doritos") || name.includes("lays") || name.includes("chips") || name.includes("crackers")) {
      return "Snacks"
    }

    return "Other"
  }
}
