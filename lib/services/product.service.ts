import type { SupabaseClient } from "@supabase/supabase-js"
import { BaseService } from "./base.service"
import type { Product, ProductCategory } from "@/lib/types/domain"

export class ProductService extends BaseService {
  constructor(db: SupabaseClient) {
    super(db, "ProductService")
  }

  async findById(id: string): Promise<Product> {
    this.logger.info("Finding product by ID", { id })

    return await this.executeQuery(
      () => this.db.from("products").select("*").eq("id", id).single(),
      "Product not found",
    )
  }

  async findByUPC(upc: string): Promise<Product | null> {
    this.logger.info("Finding product by UPC", { upc })

    const { data } = await this.db.from("products").select("*").eq("upc", upc).single()

    return data
  }

  async findOrCreateByUPC(upc: string, name: string, category: ProductCategory): Promise<Product> {
    this.logger.info("Finding or creating product by UPC", { upc, name, category })

    try {
      // Try to find by UPC first
      let existingProduct = await this.findByUPC(upc)

      if (existingProduct) {
        this.logger.info("Found existing product by UPC", { productId: existingProduct.id, name: existingProduct.name })
        return existingProduct
      }

      // Try to find by similar name
      const normalizedName = this.normalizeProductName(name)
      const { data: similarProducts } = await this.db.from("products").select("*").ilike("name", `%${normalizedName}%`)

      if (similarProducts && similarProducts.length > 0) {
        existingProduct = similarProducts[0]
        this.logger.info("Found existing product by name similarity", {
          productId: existingProduct.id,
          existingName: existingProduct.name,
          searchName: normalizedName,
        })
        return existingProduct
      }

      // Create new product
      this.logger.info("Creating new product", { upc, name, category })

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
        this.logger.error("Failed to create product", { error, upc, name, category })
        throw error
      }

      if (!newProduct) {
        throw new Error("No product returned after creation")
      }

      this.logger.info("Successfully created new product", {
        productId: newProduct.id,
        name: newProduct.name,
        upc: newProduct.upc,
        category: newProduct.category,
      })

      return newProduct
    } catch (error) {
      this.logger.error("Error in findOrCreateByUPC", { error, upc, name, category })
      throw error
    }
  }

  async getAll(): Promise<Product[]> {
    this.logger.info("Fetching all products")

    return await this.executeQuery(() => this.db.from("products").select("*").order("name"), "Failed to fetch products")
  }

  async getByCategory(category: ProductCategory): Promise<Product[]> {
    this.logger.info("Fetching products by category", { category })

    return await this.executeQuery(
      () => this.db.from("products").select("*").eq("category", category).order("name"),
      "Failed to fetch products by category",
    )
  }

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    this.logger.info("Updating product", { id, updates })

    return await this.executeQuery(
      () =>
        this.db
          .from("products")
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single(),
      "Failed to update product",
    )
  }

  async delete(id: string): Promise<void> {
    this.logger.info("Deleting product", { id })

    await this.executeCommand(() => this.db.from("products").delete().eq("id", id), "Failed to delete product")
  }

  private normalizeProductName(name: string): string {
    return name
      .replace(/\s+(Vanilla|Berry|Arctic|Classic|Original).*$/i, "")
      .trim()
      .toLowerCase()
  }
}
