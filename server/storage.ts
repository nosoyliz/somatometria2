import { 
  users, 
  fileUploads, 
  tableColumns, 
  csvData,
  type User, 
  type InsertUser,
  type FileUpload,
  type InsertFileUpload,
  type TableColumn,
  type InsertTableColumn,
  type CsvData,
  type InsertCsvData
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // File upload methods
  createFileUpload(upload: InsertFileUpload): Promise<FileUpload>;
  getFileUpload(id: number): Promise<FileUpload | undefined>;
  updateFileUploadStatus(id: number, status: string, errorMessage?: string): Promise<void>;
  updateFileUploadStats(id: number, totalRows: number, totalColumns: number): Promise<void>;
  getFileUploads(limit?: number): Promise<FileUpload[]>;
  
  // Table column methods
  createTableColumn(column: InsertTableColumn): Promise<TableColumn>;
  getTableColumns(uploadId: number): Promise<TableColumn[]>;
  
  // CSV data methods
  createCsvData(data: InsertCsvData): Promise<CsvData>;
  getCsvData(uploadId: number, limit?: number): Promise<CsvData[]>;
  getCsvDataByTable(tableName: string, limit?: number): Promise<CsvData[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createFileUpload(upload: InsertFileUpload): Promise<FileUpload> {
    const [fileUpload] = await db
      .insert(fileUploads)
      .values(upload)
      .returning();
    return fileUpload;
  }

  async getFileUpload(id: number): Promise<FileUpload | undefined> {
    const [upload] = await db.select().from(fileUploads).where(eq(fileUploads.id, id));
    return upload || undefined;
  }

  async updateFileUploadStatus(id: number, status: string, errorMessage?: string): Promise<void> {
    const updateData: any = { uploadStatus: status };
    if (status === "completed") {
      updateData.completedAt = new Date();
    }
    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await db
      .update(fileUploads)
      .set(updateData)
      .where(eq(fileUploads.id, id));
  }

  async updateFileUploadStats(id: number, totalRows: number, totalColumns: number): Promise<void> {
    await db
      .update(fileUploads)
      .set({ totalRows, totalColumns })
      .where(eq(fileUploads.id, id));
  }

  async getFileUploads(limit: number = 50): Promise<FileUpload[]> {
    return await db
      .select()
      .from(fileUploads)
      .orderBy(desc(fileUploads.createdAt))
      .limit(limit);
  }

  async createTableColumn(column: InsertTableColumn): Promise<TableColumn> {
    const [tableColumn] = await db
      .insert(tableColumns)
      .values(column)
      .returning();
    return tableColumn;
  }

  async getTableColumns(uploadId: number): Promise<TableColumn[]> {
    return await db
      .select()
      .from(tableColumns)
      .where(eq(tableColumns.uploadId, uploadId))
      .orderBy(tableColumns.columnPosition);
  }

  async createCsvData(data: InsertCsvData): Promise<CsvData> {
    const [csvDataEntry] = await db
      .insert(csvData)
      .values(data)
      .returning();
    return csvDataEntry;
  }

  async getCsvData(uploadId: number, limit: number = 100): Promise<CsvData[]> {
    return await db
      .select()
      .from(csvData)
      .where(eq(csvData.uploadId, uploadId))
      .limit(limit);
  }

  async getCsvDataByTable(tableName: string, limit: number = 100): Promise<CsvData[]> {
    return await db
      .select()
      .from(csvData)
      .where(eq(csvData.tableName, tableName))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
