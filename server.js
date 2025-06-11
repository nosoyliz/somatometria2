const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuración de la base de datos MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'csv_upload_db',
  port: process.env.DB_PORT || 3306
});

// Conectar a la base de datos
db.connect((err) => {
  if (err) {
    console.error('Error conectando a MySQL:', err);
    return;
  }
  console.log('Conectado a MySQL exitosamente');
});

// Configuración de multer para subir archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV'));
    }
  }
});

// Funciones auxiliares
function generateTableName(filename) {
  const name = filename
    .replace(/\.csv$/i, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toLowerCase();
  
  const prefix = /^[0-9]/.test(name) ? 'table_' : '';
  return `${prefix}${name}_${Date.now()}`;
}

function detectColumnType(values) {
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
      return maxLength > 255 ? 'TEXT' : 'VARCHAR(255)';
    }
  }
  
  if (hasDecimals) return 'DECIMAL(10,2)';
  if (hasIntegers) return 'INT';
  return 'TEXT';
}

function cleanColumnName(name) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .toLowerCase()
    .substring(0, 60);
}

// Función para detectar si es un archivo de somatometría
function isSomatometriaFile(headers) {
  const somatometriaColumns = [
    'no_control', 'curp', 'nombre', 'paterno', 'materno', 'grupo', 'edad',
    'certificacion_medica', 'sexo', 'peso', 'perimetro', 'estatura'
  ];
  
  const cleanedHeaders = headers.map(h => cleanColumnName(h));
  const matchCount = somatometriaColumns.filter(col => 
    cleanedHeaders.some(header => header.includes(col) || col.includes(header))
  ).length;
  
  return matchCount >= 6; // Si coinciden al menos 6 columnas, es somatometría
}

// Función para mapear columnas de somatometría
function mapSomatometriaData(row, originalHeaders) {
  const mapped = {};
  
  // Mapeo de columnas
  const columnMapping = {
    'no_control': ['no_control', 'control', 'numero_control'],
    'curp': ['curp'],
    'nombre': ['nombre', 'name'],
    'paterno': ['paterno', 'apellido_paterno', 'ap_paterno'],
    'materno': ['materno', 'apellido_materno', 'ap_materno'],
    'grupo': ['grupo', 'group'],
    'edad': ['edad', 'age'],
    'certificacion_medica': ['certificacion_medica', 'certificacion', 'cert_medica'],
    'sexo': ['sexo', 'sex', 'genero'],
    'peso': ['peso', 'weight'],
    'perimetro': ['perimetro', 'perimeter'],
    'estatura': ['estatura', 'altura', 'height'],
    'tension': ['tension'],
    'tension_a': ['tension_a', 'presion_arterial'],
    'presion_a': ['presion_a'],
    'tension_d': ['tension_d'],
    'frecuencia': ['frecuencia', 'freq'],
    'temperatura': ['temperatura', 'temp'],
    'saturacion': ['saturacion', 'sat'],
    'glucometria': ['glucometria', 'glucosa'],
    'imc': ['imc', 'bmi'],
    'clasificacion': ['clasificacion', 'classification'],
    'imp': ['imp', 'clasificacion_imp', 'clasificación', 'clasificacion']
  };
  
  // Buscar cada columna en los datos originales
  for (const [targetCol, possibleNames] of Object.entries(columnMapping)) {
    for (const originalHeader of originalHeaders) {
      const cleanOriginal = cleanColumnName(originalHeader);
      
      if (possibleNames.some(name => cleanOriginal.includes(name) || name.includes(cleanOriginal))) {
        let value = row[originalHeader];
        
        // Conversiones específicas
        if (['peso', 'perimetro', 'estatura', 'temperatura', 'saturacion', 'glucometria', 'imc'].includes(targetCol)) {
          value = value ? parseFloat(value.toString().replace(',', '.')) : null;
        } else if (['edad', 'tension_a', 'presion_a', 'tension_d', 'frecuencia'].includes(targetCol)) {
          value = value ? parseInt(value) : null;
        }
        
        mapped[targetCol] = value || null;
        break;
      }
    }
  }
  
  return mapped;
}

// Rutas de la API

// Subir archivo CSV
app.post('/api/upload', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const { originalname, size, path: filePath } = req.file;
    const tableName = generateTableName(originalname);

    // Crear registro de subida
    const insertUpload = `
      INSERT INTO file_uploads (original_filename, table_name, file_size) 
      VALUES (?, ?, ?)
    `;
    
    const [uploadResult] = await db.promise().execute(insertUpload, [originalname, tableName, size]);
    const uploadId = uploadResult.insertId;

    // Actualizar estado a procesando
    await db.promise().execute(
      'UPDATE file_uploads SET upload_status = ? WHERE id = ?',
      ['processing', uploadId]
    );

    // Procesar archivo CSV
    const results = [];
    const headers = [];
    let isFirstRow = true;

    const processCSV = new Promise((resolve, reject) => {
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

    // Limpiar archivo subido
    fs.unlinkSync(filePath);

    if (results.length === 0) {
      await db.promise().execute(
        'UPDATE file_uploads SET upload_status = ?, error_message = ? WHERE id = ?',
        ['error', 'El archivo CSV está vacío', uploadId]
      );
      return res.status(400).json({ error: 'El archivo CSV está vacío' });
    }

    // Detectar si es archivo de somatometría
    const originalHeaders = Object.keys(results[0] || {});
    const isSomatometria = isSomatometriaFile(originalHeaders);

    if (isSomatometria) {
      // Procesar como archivo de somatometría
      console.log('Detectado archivo de somatometría, procesando en tabla específica...');
      
      for (let i = 0; i < results.length; i++) {
        const row = results[i];
        const mappedData = mapSomatometriaData(row, originalHeaders);
        
        // Insertar en tabla de somatometría
        const insertQuery = `
          INSERT INTO somatometria (
            upload_id, no_control, curp, nombre, paterno, materno, grupo, edad,
            certificacion_medica, sexo, peso, perimetro, estatura, tension,
            tension_a, presion_a, tension_d, frecuencia, temperatura, saturacion,
            glucometria, imc, clasificacion
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        await db.promise().execute(insertQuery, [
          uploadId,
          mappedData.no_control,
          mappedData.curp,
          mappedData.nombre,
          mappedData.paterno,
          mappedData.materno,
          mappedData.grupo,
          mappedData.edad,
          mappedData.certificacion_medica,
          mappedData.sexo,
          mappedData.peso,
          mappedData.perimetro,
          mappedData.estatura,
          mappedData.tension,
          mappedData.tension_a,
          mappedData.presion_a,
          mappedData.tension_d,
          mappedData.frecuencia,
          mappedData.temperatura,
          mappedData.saturacion,
          mappedData.glucometria,
          mappedData.imc,
          mappedData.clasificacion
        ]);
      }
      
      // Actualizar tipo de tabla
      await db.promise().execute(
        'UPDATE file_uploads SET table_name = ? WHERE id = ?',
        ['somatometria', uploadId]
      );
      
    } else {
      // Procesar como CSV genérico (código original)
      const columnTypes = {};
      for (const header of headers) {
        const values = results.map(row => row[Object.keys(row).find(k => cleanColumnName(k) === header) || ''] || '');
        columnTypes[header] = detectColumnType(values);
      }

      // Guardar definiciones de columnas
      for (let i = 0; i < headers.length; i++) {
        await db.promise().execute(
          'INSERT INTO table_columns (upload_id, table_name, column_name, column_type, column_position) VALUES (?, ?, ?, ?, ?)',
          [uploadId, tableName, headers[i], columnTypes[headers[i]], i + 1]
        );
      }

      // Guardar datos del CSV
      for (let i = 0; i < results.length; i++) {
        const row = results[i];
        const normalizedRow = {};
        
        Object.keys(row).forEach(originalKey => {
          const cleanedKey = cleanColumnName(originalKey);
          normalizedRow[cleanedKey] = row[originalKey];
        });

        await db.promise().execute(
          'INSERT INTO csv_data (upload_id, table_name, row_data, row_index) VALUES (?, ?, ?, ?)',
          [uploadId, tableName, JSON.stringify(normalizedRow), i + 1]
        );
      }
    }

    // Actualizar estadísticas y marcar como completado
    await db.promise().execute(
      'UPDATE file_uploads SET total_rows = ?, total_columns = ?, upload_status = ?, completed_at = NOW() WHERE id = ?',
      [results.length, headers.length, 'completed', uploadId]
    );

    res.json({
      success: true,
      uploadId: uploadId,
      tableName,
      rowsProcessed: results.length,
      columnsCreated: headers.length,
      columns: headers,
    });

  } catch (error) {
    console.error('Error en la subida:', error);
    
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: error.message || 'Error en la subida' 
    });
  }
});

// Obtener historial de subidas
app.get('/api/uploads', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const [rows] = await db.promise().execute(
      'SELECT * FROM file_uploads ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error obteniendo subidas:', error);
    res.status(500).json({ error: 'Error obteniendo subidas' });
  }
});

// Obtener detalles de una subida
app.get('/api/uploads/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const [uploads] = await db.promise().execute(
      'SELECT * FROM file_uploads WHERE id = ?',
      [id]
    );
    
    if (uploads.length === 0) {
      return res.status(404).json({ error: 'Subida no encontrada' });
    }

    const [columns] = await db.promise().execute(
      'SELECT * FROM table_columns WHERE upload_id = ? ORDER BY column_position',
      [id]
    );

    const [data] = await db.promise().execute(
      'SELECT * FROM csv_data WHERE upload_id = ? LIMIT 100',
      [id]
    );

    res.json({
      upload: uploads[0],
      columns,
      data,
    });
  } catch (error) {
    console.error('Error obteniendo detalles:', error);
    res.status(500).json({ error: 'Error obteniendo detalles' });
  }
});

// Obtener datos de una tabla específica
app.get('/api/tables/:tableName/data', async (req, res) => {
  try {
    const { tableName } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    const [data] = await db.promise().execute(
      'SELECT * FROM csv_data WHERE table_name = ? LIMIT ?',
      [tableName, limit]
    );
    
    res.json(data);
  } catch (error) {
    console.error('Error obteniendo datos de tabla:', error);
    res.status(500).json({ error: 'Error obteniendo datos de tabla' });
  }
});

// Obtener datos específicos de somatometría
app.get('/api/somatometria', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const [data] = await db.promise().execute(
      'SELECT * FROM somatometria ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    res.json(data);
  } catch (error) {
    console.error('Error obteniendo datos de somatometría:', error);
    res.status(500).json({ error: 'Error obteniendo datos de somatometría' });
  }
});

// Obtener estadísticas de la base de datos
app.get('/api/stats', async (req, res) => {
  try {
    const [uploads] = await db.promise().execute('SELECT * FROM file_uploads');
    const [somatometriaCount] = await db.promise().execute('SELECT COUNT(*) as count FROM somatometria');
    
    const totalFiles = uploads.length;
    const totalRecords = uploads.reduce((sum, upload) => sum + (upload.total_rows || 0), 0);
    const completedUploads = uploads.filter(u => u.upload_status === 'completed').length;
    const failedUploads = uploads.filter(u => u.upload_status === 'error').length;
    const somatometriaRecords = somatometriaCount[0].count;
    
    res.json({
      totalFiles,
      totalRecords,
      completedUploads,
      failedUploads,
      somatometriaRecords,
      recentUploads: uploads.slice(0, 5),
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

// Limpiar todos los datos de la base de datos
app.delete('/api/clear-database', async (req, res) => {
  try {
    // Deshabilitar verificación de claves foráneas temporalmente
    await db.promise().execute('SET FOREIGN_KEY_CHECKS = 0');
    
    // Limpiar todas las tablas de datos
    await db.promise().execute('DELETE FROM somatometria');
    await db.promise().execute('DELETE FROM csv_data');
    await db.promise().execute('DELETE FROM table_columns');
    await db.promise().execute('DELETE FROM file_uploads');
    
    // Agregar columna IMP si no existe
    try {
      await db.promise().execute('ALTER TABLE somatometria ADD COLUMN imp VARCHAR(50)');
      console.log('Columna IMP agregada a la tabla somatometria');
    } catch (error) {
      if (!error.message.includes('Duplicate column name')) {
        console.log('La columna IMP ya existe o error:', error.message);
      }
    }
    
    // Reiniciar auto_increment
    await db.promise().execute('ALTER TABLE somatometria AUTO_INCREMENT = 1');
    await db.promise().execute('ALTER TABLE csv_data AUTO_INCREMENT = 1');
    await db.promise().execute('ALTER TABLE table_columns AUTO_INCREMENT = 1');
    await db.promise().execute('ALTER TABLE file_uploads AUTO_INCREMENT = 1');
    
    // Reactivar verificación de claves foráneas
    await db.promise().execute('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('Base de datos limpiada exitosamente');
    
    res.json({
      success: true,
      message: 'Base de datos limpiada exitosamente',
      cleared: {
        somatometria: true,
        csv_data: true,
        table_columns: true,
        file_uploads: true
      }
    });
  } catch (error) {
    console.error('Error limpiando base de datos:', error);
    res.status(500).json({ 
      error: 'Error limpiando base de datos: ' + error.message 
    });
  }
});

// Servir la página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});