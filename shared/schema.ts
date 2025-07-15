import { pgTable, text, serial, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const transcriptions = pgTable("transcriptions", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  language: text("language"),
  confidence: real("confidence"),
  duration: real("duration"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTranscriptionSchema = createInsertSchema(transcriptions).omit({
  id: true,
  createdAt: true,
});

export type InsertTranscription = z.infer<typeof insertTranscriptionSchema>;
export type Transcription = typeof transcriptions.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Product catalog schema
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  price: real("price"),
  currency: text("currency").default("INR"),
  quantity: real("quantity"),
  unit: text("unit"), // e.g., "pieces", "kg", "meters"
  brand: text("brand"),
  color: text("color"),
  size: text("size"),
  material: text("material"),
  origin: text("origin"), // location/place mentioned
  tags: text("tags").array(), // searchable keywords
  extractedFrom: text("extracted_from"), // original transcription text
  transcriptionId: serial("transcription_id").references(() => transcriptions.id),
  confidence: real("confidence"), // AI extraction confidence
  status: text("status").default("draft"), // draft, reviewed, published
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
