import { transcriptions, type Transcription, type InsertTranscription, users, type User, type InsertUser, products, type Product, type InsertProduct } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createTranscription(transcription: InsertTranscription): Promise<Transcription>;
  getTranscriptions(): Promise<Transcription[]>;
  getTranscription(id: number): Promise<Transcription | undefined>;
  
  // Product catalog operations - optimized for Talk2Trade format
  createProduct(product: InsertProduct): Promise<Product>;
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductsByCategory(category: string): Promise<Product[]>;
  updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  searchProducts(query: string): Promise<Product[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transcriptions: Map<number, Transcription>;
  private products: Map<number, Product>;
  private currentUserId: number;
  private currentTranscriptionId: number;
  private currentProductId: number;

  constructor() {
    this.users = new Map();
    this.transcriptions = new Map();
    this.products = new Map();
    this.currentUserId = 1;
    this.currentTranscriptionId = 1;
    this.currentProductId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createTranscription(insertTranscription: InsertTranscription): Promise<Transcription> {
    const id = this.currentTranscriptionId++;
    const transcription: Transcription = {
      ...insertTranscription,
      id,
      createdAt: new Date(),
      duration: insertTranscription.duration ?? null,
      language: insertTranscription.language ?? null,
      confidence: insertTranscription.confidence ?? null,
    };
    this.transcriptions.set(id, transcription);
    return transcription;
  }

  async getTranscriptions(): Promise<Transcription[]> {
    return Array.from(this.transcriptions.values()).sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getTranscription(id: number): Promise<Transcription | undefined> {
    return this.transcriptions.get(id);
  }

  // Product catalog methods - optimized for Talk2Trade format
  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const product: Product = {
      ...insertProduct,
      id,
      last_updated: new Date(),
    };
    this.products.set(id, product);
    return product;
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).sort(
      (a, b) => (b.last_updated?.getTime() || 0) - (a.last_updated?.getTime() || 0)
    );
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (product) => product.category?.toLowerCase() === category.toLowerCase()
    );
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const existingProduct = this.products.get(id);
    if (!existingProduct) {
      return undefined;
    }
    
    const updatedProduct: Product = {
      ...existingProduct,
      ...updates,
      last_updated: new Date(),
    };
    
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  async searchProducts(query: string): Promise<Product[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.products.values()).filter((product) => {
      return (
        product.title?.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm) ||
        product.category?.toLowerCase().includes(searchTerm)
      );
    });
  }
}

export const storage = new MemStorage();
