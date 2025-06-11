# Sistema de Carga CSV con MySQL - Instrucciones de Instalación

## 📋 Requisitos previos

1. **XAMPP** instalado en tu computadora
   - Descarga desde: https://www.apachefriends.org/
   - Incluye Apache, MySQL, PHP y phpMyAdmin

2. **Node.js** instalado
   - Descarga desde: https://nodejs.org/
   - Versión recomendada: 18 o superior

## 🚀 Paso 1: Configurar la base de datos MySQL

### 1.1 Iniciar XAMPP
1. Abre XAMPP Control Panel
2. Inicia los servicios **Apache** y **MySQL**

### 1.2 Crear la base de datos
1. Abre tu navegador y ve a: http://localhost/phpmyadmin
2. Haz clic en "Nuevo" para crear una nueva base de datos
3. Nombra la base de datos: `csv_upload_db`
4. Selecciona "utf8mb4_unicode_ci" como cotejamiento
5. Haz clic en "Crear"

### 1.3 Ejecutar el script SQL
1. Selecciona la base de datos `csv_upload_db`
2. Ve a la pestaña "SQL"
3. Copia y pega todo el contenido del archivo `mysql-setup.sql`
4. Haz clic en "Continuar" para ejecutar

## 🚀 Paso 2: Configurar el proyecto

### 2.1 Crear directorio del proyecto
```bash
mkdir csv-upload-mysql
cd csv-upload-mysql
```

### 2.2 Copiar archivos
Copia estos archivos a tu directorio del proyecto:
- `server.js`
- `local-package.json` (renómbralo a `package.json`)
- `.env.example`
- Carpeta `public/` con `index.html` y `script.js`

### 2.3 Configurar variables de entorno
1. Copia `.env.example` y renómbralo a `.env`
2. Edita el archivo `.env` con tus credenciales:

```env
# Configuración de la base de datos MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password_de_mysql
DB_NAME=csv_upload_db
DB_PORT=3306

# Puerto del servidor
PORT=3000
```

**Nota:** Si no tienes contraseña en MySQL (instalación por defecto de XAMPP), deja `DB_PASSWORD` vacío.

### 2.4 Instalar dependencias
```bash
npm install
```

## 🚀 Paso 3: Ejecutar la aplicación

### 3.1 Iniciar el servidor
```bash
npm start
```

O para desarrollo (con reinicio automático):
```bash
npm run dev
```

### 3.2 Acceder a la aplicación
Abre tu navegador y ve a: http://localhost:3000

## 📁 Estructura del proyecto

```
csv-upload-mysql/
├── server.js              # Servidor Express principal
├── package.json           # Dependencias del proyecto
├── .env                   # Variables de entorno
├── mysql-setup.sql        # Script de base de datos
├── uploads/               # Archivos CSV temporales
└── public/
    ├── index.html         # Interfaz web
    └── script.js          # JavaScript del frontend
```

## 🎯 Uso de la aplicación

1. **Subir archivos CSV:**
   - Arrastra archivos CSV a la zona de subida
   - O haz clic para seleccionar archivos
   - Máximo 10MB por archivo

2. **Visualizar datos:**
   - Ve las estadísticas en tiempo real
   - Revisa el historial de subidas
   - Observa el estado de procesamiento

3. **Verificar en phpMyAdmin:**
   - Ve a http://localhost/phpmyadmin
   - Selecciona la base de datos `csv_upload_db`
   - Revisa las tablas:
     - `file_uploads`: Metadatos de archivos
     - `table_columns`: Definiciones de columnas
     - `csv_data`: Datos reales del CSV

## 🔧 Características

- **Detección automática de tipos:** Determina automáticamente si una columna es texto, número entero o decimal
- **Mapeo de columnas:** Cada columna del CSV se mapea a la estructura de la base de datos
- **Validación de datos:** Verifica formato y tamaño de archivos
- **Manejo de errores:** Reporta errores detallados si algo falla
- **Interfaz intuitiva:** Drag & drop para facilidad de uso
- **Estadísticas en tiempo real:** Monitorea el progreso de las subidas

## 🐛 Solución de problemas

### Error de conexión a MySQL
- Verifica que MySQL esté ejecutándose en XAMPP
- Confirma las credenciales en el archivo `.env`
- Asegúrate de que la base de datos `csv_upload_db` exista

### Puerto ocupado
- Si el puerto 3000 está ocupado, cambia `PORT=3001` en `.env`

### Archivos no se suben
- Verifica que el archivo sea CSV válido
- Confirma que el tamaño sea menor a 10MB
- Revisa la consola del navegador para errores

## 📊 Ejemplo de archivo CSV compatible

Tu archivo CSV debe tener encabezados en la primera fila:

```csv
nombre,edad,salario,activo
Juan Pérez,25,50000.50,true
María García,30,75000.00,true
Pedro López,22,45000.25,false
```

¡Tu sistema de carga CSV con MySQL está listo para usar!