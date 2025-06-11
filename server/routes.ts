import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import { insertFileUploadSchema } from "@shared/schema";
import { z } from "zod";

const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

interface CSVRow {
  [key: string]: string;
}

function generateTableName(filename: string): string {
  const name = filename
    .replace(/\.csv$/i, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toLowerCase();
  
  // Ensure it starts with a letter
  const prefix = /^[0-9]/.test(name) ? 'table_' : '';
  return `${prefix}${name}_${Date.now()}`;
}

function detectColumnType(values: string[]): string {
  const nonEmptyValues = values.filter(v => v && v.trim() !== '');
  
  if (nonEmptyValues.length === 0) return 'TEXT';
  
  let hasDecimals = false;
  let hasIntegers = false;
  let maxLength = 0;
  
  for (const value of nonEmptyValues) {
    const trimmed = value.trim();
    maxLength = Math.max(maxLength, trimmed.length);
    
    if (!isNaN(Number(trimmed))) {
      if (trimmed.includes('.')) {
        hasDecimals = true;
      } else {
        hasIntegers = true;
      }
    } else {
      // If we find any non-numeric value, it's text
      return maxLength > 255 ? 'TEXT' : 'VARCHAR(255)';
    }
  }
  
  if (hasDecimals) return 'DECIMAL(10,2)';
  if (hasIntegers) return 'INTEGER';
  return 'TEXT';
}

function cleanColumnName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .toLowerCase()
    .substring(0, 60);
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Upload CSV file
  app.post("/api/upload", upload.single('csvFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { originalname, size, path: filePath } = req.file;
      const tableName = generateTableName(originalname);

      // Create upload record
      const fileUpload = await storage.createFileUpload({
        originalFilename: originalname,
        tableName,
        fileSize: size,
      });

      // Update status to processing
      await storage.updateFileUploadStatus(fileUpload.id, "processing");

      // Process CSV file
      const results: CSVRow[] = [];
      const headers: string[] = [];
      let isFirstRow = true;

      const processCSV = new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('headers', (headerList) => {
            headers.push(...headerList.map(cleanColumnName));
          })
          .on('data', (data) => {
            if (isFirstRow) {
              isFirstRow = false;
            }
            results.push(data);
          })
          .on('end', () => {
            resolve();
          })
          .on('error', (error) => {
            reject(error);
          });
      });

      await processCSV;

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      if (results.length === 0) {
        await storage.updateFileUploadStatus(fileUpload.id, "error", "CSV file is empty");
        return res.status(400).json({ error: "CSV file is empty" });
      }

      // Detect column types
      const columnTypes: { [key: string]: string } = {};
      for (const header of headers) {
        const values = results.map(row => row[Object.keys(row).find(k => cleanColumnName(k) === header) || ''] || '');
        columnTypes[header] = detectColumnType(values);
      }

      // Store column definitions
      for (let i = 0; i < headers.length; i++) {
        await storage.createTableColumn({
          uploadId: fileUpload.id,
          tableName,
          columnName: headers[i],
          columnType: columnTypes[headers[i]],
          columnPosition: i + 1,
        });
      }

      // Store CSV data
      for (let i = 0; i < results.length; i++) {
        const row = results[i];
        const normalizedRow: { [key: string]: any } = {};
        
        // Normalize the row data to match our cleaned headers
        Object.keys(row).forEach(originalKey => {
          const cleanedKey = cleanColumnName(originalKey);
          normalizedRow[cleanedKey] = row[originalKey];
        });

        await storage.createCsvData({
          uploadId: fileUpload.id,
          tableName,
          rowData: normalizedRow,
          rowIndex: i + 1,
        });
      }

      // Update upload stats and mark as completed
      await storage.updateFileUploadStats(fileUpload.id, results.length, headers.length);
      await storage.updateFileUploadStatus(fileUpload.id, "completed");

      res.json({
        success: true,
        uploadId: fileUpload.id,
        tableName,
        rowsProcessed: results.length,
        columnsCreated: headers.length,
        columns: headers,
      });

    } catch (error) {
      console.error('Upload error:', error);
      
      // Clean up file if it exists
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Upload failed" 
      });
    }
  });

  // Get upload history
  app.get("/api/uploads", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const uploads = await storage.getFileUploads(limit);
      res.json(uploads);
    } catch (error) {
      console.error('Error fetching uploads:', error);
      res.status(500).json({ error: "Failed to fetch uploads" });
    }
  });

  // Get upload details
  app.get("/api/uploads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const upload = await storage.getFileUpload(id);
      
      if (!upload) {
        return res.status(404).json({ error: "Upload not found" });
      }

      const columns = await storage.getTableColumns(id);
      const data = await storage.getCsvData(id, 100);

      res.json({
        upload,
        columns,
        data,
      });
    } catch (error) {
      console.error('Error fetching upload details:', error);
      res.status(500).json({ error: "Failed to fetch upload details" });
    }
  });

  // Get data from a specific table
  app.get("/api/tables/:tableName/data", async (req, res) => {
    try {
      const { tableName } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      
      const data = await storage.getCsvDataByTable(tableName, limit);
      res.json(data);
    } catch (error) {
      console.error('Error fetching table data:', error);
      res.status(500).json({ error: "Failed to fetch table data" });
    }
  });

  // Get database statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const uploads = await storage.getFileUploads();
      const totalFiles = uploads.length;
      const totalRecords = uploads.reduce((sum, upload) => sum + (upload.totalRows || 0), 0);
      const completedUploads = uploads.filter(u => u.uploadStatus === 'completed').length;
      
      res.json({
        totalFiles,
        totalRecords,
        completedUploads,
        failedUploads: uploads.filter(u => u.uploadStatus === 'error').length,
        recentUploads: uploads.slice(0, 5),
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
