import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const fileUploads = pgTable("file_uploads", {
  id: serial("id").primaryKey(),
  originalFilename: text("original_filename").notNull(),
  tableName: text("table_name").notNull(),
  fileSize: integer("file_size").notNull(),
  totalRows: integer("total_rows").default(0),
  totalColumns: integer("total_columns").default(0),
  uploadStatus: text("upload_status").notNull().default("pending"), // pending, processing, completed, error
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const tableColumns = pgTable("table_columns", {
  id: serial("id").primaryKey(),
  uploadId: integer("upload_id").notNull(),
  tableName: text("table_name").notNull(),
  columnName: text("column_name").notNull(),
  columnType: text("column_type").notNull(),
  columnPosition: integer("column_position").notNull(),
  isNullable: boolean("is_nullable").default(true),
  defaultValue: text("default_value"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const csvData = pgTable("csv_data", {
  id: serial("id").primaryKey(),
  uploadId: integer("upload_id").notNull(),
  tableName: text("table_name").notNull(),
  rowData: jsonb("row_data").notNull(),
  rowIndex: integer("row_index").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const fileUploadsRelations = relations(fileUploads, ({ many }) => ({
  columns: many(tableColumns),
  data: many(csvData),
}));

export const tableColumnsRelations = relations(tableColumns, ({ one }) => ({
  upload: one(fileUploads, {
    fields: [tableColumns.uploadId],
    references: [fileUploads.id],
  }),
}));

export const csvDataRelations = relations(csvData, ({ one }) => ({
  upload: one(fileUploads, {
    fields: [csvData.uploadId],
    references: [fileUploads.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertFileUploadSchema = createInsertSchema(fileUploads).pick({
  originalFilename: true,
  tableName: true,
  fileSize: true,
});

export const insertTableColumnSchema = createInsertSchema(tableColumns).pick({
  uploadId: true,
  tableName: true,
  columnName: true,
  columnType: true,
  columnPosition: true,
  isNullable: true,
  defaultValue: true,
});

export const insertCsvDataSchema = createInsertSchema(csvData).pick({
  uploadId: true,
  tableName: true,
  rowData: true,
  rowIndex: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertFileUpload = z.infer<typeof insertFileUploadSchema>;
export type FileUpload = typeof fileUploads.$inferSelect;

export type InsertTableColumn = z.infer<typeof insertTableColumnSchema>;
export type TableColumn = typeof tableColumns.$inferSelect;

export type InsertCsvData = z.infer<typeof insertCsvDataSchema>;
export type CsvData = typeof csvData.$inferSelect;
