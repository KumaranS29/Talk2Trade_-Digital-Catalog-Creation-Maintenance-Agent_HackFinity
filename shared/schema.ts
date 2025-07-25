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

// Product catalog schema - optimized for Talk2Trade format
export const products = pgTable("products", {
  id: text("id").primaryKey(), // UUID format
  title: text("title").notNull(),
  description: text("description"),
  price: real("price"),
  quantity: real("quantity"),
  category: text("category"), // Format: "Health & Beauty > Soap"
  last_updated: timestamp("last_updated").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  last_updated: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
