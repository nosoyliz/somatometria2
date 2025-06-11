-- Script para crear la base de datos MySQL
-- Ejecuta este script en phpMyAdmin o MySQL Workbench

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS csv_upload_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Usar la base de datos
USE csv_upload_db;

-- Tabla para los usuarios
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para los archivos subidos
CREATE TABLE file_uploads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    original_filename VARCHAR(255) NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    total_rows INT DEFAULT 0,
    total_columns INT DEFAULT 0,
    upload_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL
);

-- Tabla para las definiciones de columnas
CREATE TABLE table_columns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    upload_id INT NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    column_name VARCHAR(255) NOT NULL,
    column_type VARCHAR(100) NOT NULL,
    column_position INT NOT NULL,
    is_nullable BOOLEAN DEFAULT TRUE,
    default_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (upload_id) REFERENCES file_uploads(id) ON DELETE CASCADE
);

-- Tabla para los datos del CSV
CREATE TABLE csv_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    upload_id INT NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    row_data JSON NOT NULL,
    row_index INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (upload_id) REFERENCES file_uploads(id) ON DELETE CASCADE
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_file_uploads_status ON file_uploads(upload_status);
CREATE INDEX idx_file_uploads_created ON file_uploads(created_at);
CREATE INDEX idx_table_columns_upload ON table_columns(upload_id);
CREATE INDEX idx_csv_data_upload ON csv_data(upload_id);
CREATE INDEX idx_csv_data_table ON csv_data(table_name);

-- Tabla específica para datos de somatometría
CREATE TABLE somatometria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    upload_id INT,
    no_control VARCHAR(50),
    curp VARCHAR(18),
    nombre VARCHAR(100),
    paterno VARCHAR(100),
    materno VARCHAR(100),
    grupo VARCHAR(10),
    edad INT,
    certificacion_medica VARCHAR(50),
    sexo VARCHAR(1),
    peso DECIMAL(5,2),
    perimetro DECIMAL(5,2),
    estatura DECIMAL(5,2),
    tension VARCHAR(20),
    tension_a INT,
    presion_a INT,
    tension_d INT,
    frecuencia INT,
    temperatura DECIMAL(4,1),
    saturacion DECIMAL(5,2),
    glucometria DECIMAL(6,2),
    imc DECIMAL(4,2),
    clasificacion VARCHAR(50),
    imp VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (upload_id) REFERENCES file_uploads(id) ON DELETE CASCADE
);

-- Crear índices para la tabla de somatometría
CREATE INDEX idx_somatometria_upload ON somatometria(upload_id);
CREATE INDEX idx_somatometria_no_control ON somatometria(no_control);
CREATE INDEX idx_somatometria_curp ON somatometria(curp);

-- Insertar un usuario de ejemplo (opcional)
INSERT INTO users (username, password) VALUES ('admin', 'admin123');