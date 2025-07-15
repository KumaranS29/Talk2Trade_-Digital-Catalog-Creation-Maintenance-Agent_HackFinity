import { transcriptions, type Transcription, type InsertTranscription, users, type User, type InsertUser } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createTranscription(transcription: InsertTranscription): Promise<Transcription>;
  getTranscriptions(): Promise<Transcription[]>;
  getTranscription(id: number): Promise<Transcription | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transcriptions: Map<number, Transcription>;
  private currentUserId: number;
  private currentTranscriptionId: number;

  constructor() {
    this.users = new Map();
    this.transcriptions = new Map();
    this.currentUserId = 1;
    this.currentTranscriptionId = 1;
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
}

export const storage = new MemStorage();
