// Variables globales
let selectedFiles = [];
let isUploading = false;

// Elementos del DOM
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const actionButtons = document.getElementById('actionButtons');

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadStats();
    loadUploads();
    
    // Actualizar datos cada 5 segundos
    setInterval(loadStats, 5000);
    setInterval(loadUploads, 5000);
});

function setupEventListeners() {
    // Drag and drop
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);
    uploadZone.addEventListener('click', () => fileInput.click());
    
    // Input de archivo
    fileInput.addEventListener('change', handleFileSelect);
}

function handleDragOver(e) {
    e.preventDefault();
    uploadZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFiles(files);
}

function addFiles(files) {
    // Filtrar solo archivos CSV
    const csvFiles = files.filter(file => 
        file.name.toLowerCase().endsWith('.csv') && file.size <= 10 * 1024 * 1024
    );
    
    if (csvFiles.length !== files.length) {
        showAlert('Solo se permiten archivos CSV de máximo 10MB', 'warning');
    }
    
    // Agregar archivos únicos
    csvFiles.forEach(file => {
        if (!selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
            selectedFiles.push({
                file: file,
                id: Math.random().toString(36).substr(2, 9),
                status: 'pending',
                progress: 0
            });
        }
    });
    
    updateFileList();
    updateActionButtons();
}

function updateFileList() {
    if (selectedFiles.length === 0) {
        fileList.innerHTML = '';
        return;
    }
    
    const html = selectedFiles.map(fileItem => `
        <div class="file-item d-flex justify-content-between align-items-center">
            <div class="flex-grow-1">
                <div class="d-flex align-items-center">
                    <i class="fas fa-file-csv text-success me-2"></i>
                    <div>
                        <strong>${fileItem.file.name}</strong>
                        <small class="text-muted d-block">${formatFileSize(fileItem.file.size)}</small>
                        ${fileItem.status === 'uploading' ? `
                            <div class="progress mt-1" style="height: 6px;">
                                <div class="progress-bar" style="width: ${fileItem.progress}%"></div>
                            </div>
                        ` : ''}
                        ${fileItem.error ? `<small class="text-danger">${fileItem.error}</small>` : ''}
                    </div>
                </div>
            </div>
            <div class="d-flex align-items-center">
                <span class="status-badge status-${fileItem.status} me-2">
                    ${getStatusText(fileItem.status)}
                </span>
                ${fileItem.status === 'pending' ? `
                    <button class="btn btn-sm btn-outline-danger" onclick="removeFile('${fileItem.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    fileList.innerHTML = html;
}

function updateActionButtons() {
    const hasPendingFiles = selectedFiles.some(f => f.status === 'pending');
    actionButtons.style.display = selectedFiles.length > 0 ? 'block' : 'none';
    
    const uploadBtn = actionButtons.querySelector('.btn-primary');
    uploadBtn.disabled = !hasPendingFiles || isUploading;
    uploadBtn.innerHTML = isUploading ? 
        '<i class="fas fa-spinner fa-spin me-1"></i>Subiendo...' : 
        '<i class="fas fa-upload me-1"></i>Subir Archivos';
}

function removeFile(id) {
    selectedFiles = selectedFiles.filter(f => f.id !== id);
    updateFileList();
    updateActionButtons();
}

function clearFiles() {
    selectedFiles = [];
    updateFileList();
    updateActionButtons();
    fileInput.value = '';
}

async function uploadFiles() {
    if (isUploading) return;
    
    const pendingFiles = selectedFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;
    
    isUploading = true;
    updateActionButtons();
    
    for (const fileItem of pendingFiles) {
        try {
            // Actualizar estado a subiendo
            fileItem.status = 'uploading';
            fileItem.progress = 0;
            updateFileList();
            
            // Simular progreso
            const progressInterval = setInterval(() => {
                if (fileItem.progress < 90) {
                    fileItem.progress += 10;
                    updateFileList();
                }
            }, 200);
            
            // Crear FormData
            const formData = new FormData();
            formData.append('csvFile', fileItem.file);
            
            // Realizar upload
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            clearInterval(progressInterval);
            
            if (response.ok) {
                const result = await response.json();
                fileItem.status = 'completed';
                fileItem.progress = 100;
                showAlert(`${fileItem.file.name} subido exitosamente. ${result.rowsProcessed} filas procesadas.`, 'success');
            } else {
                const error = await response.json();
                fileItem.status = 'error';
                fileItem.error = error.error || 'Error desconocido';
                showAlert(`Error subiendo ${fileItem.file.name}: ${fileItem.error}`, 'danger');
            }
            
        } catch (error) {
            fileItem.status = 'error';
            fileItem.error = error.message;
            showAlert(`Error subiendo ${fileItem.file.name}: ${error.message}`, 'danger');
        }
        
        updateFileList();
    }
    
    isUploading = false;
    updateActionButtons();
    
    // Recargar datos
    loadStats();
    loadUploads();
}

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        document.getElementById('totalRecords').textContent = stats.totalRecords.toLocaleString();
        document.getElementById('totalFiles').textContent = stats.totalFiles;
        document.getElementById('completedUploads').textContent = stats.completedUploads;
        document.getElementById('failedUploads').textContent = stats.failedUploads;
        document.getElementById('somatometriaRecords').textContent = stats.somatometriaRecords || 0;
        
        updateRecentActivity(stats.recentUploads);
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

async function loadUploads() {
    try {
        const response = await fetch('/api/uploads?limit=10');
        const uploads = await response.json();
        
        updateUploadsTable(uploads);
        
    } catch (error) {
        console.error('Error cargando uploads:', error);
    }
}

function updateRecentActivity(uploads) {
    const container = document.getElementById('recentActivity');
    
    if (!uploads || uploads.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No hay actividad reciente</p>';
        return;
    }
    
    const html = uploads.slice(0, 3).map(upload => `
        <div class="d-flex align-items-center mb-2">
            <i class="fas fa-${upload.upload_status === 'completed' ? 'check-circle text-success' : 
                upload.upload_status === 'error' ? 'exclamation-circle text-danger' : 
                'clock text-warning'} me-2"></i>
            <div class="flex-grow-1">
                <small class="d-block font-weight-bold">${upload.original_filename}</small>
                <small class="text-muted">${upload.total_rows || 0} filas • ${formatTimeAgo(upload.created_at)}</small>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function updateUploadsTable(uploads) {
    const tbody = document.querySelector('#uploadsTable tbody');
    
    if (!uploads || uploads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay datos disponibles</td></tr>';
        return;
    }
    
    const html = uploads.map(upload => `
        <tr>
            <td>
                <i class="fas fa-file-csv text-success me-2"></i>
                ${upload.original_filename}
            </td>
            <td><code>${upload.table_name}</code></td>
            <td>${(upload.total_rows || 0).toLocaleString()}</td>
            <td>
                <span class="status-badge status-${upload.upload_status}">
                    ${getStatusText(upload.upload_status)}
                </span>
            </td>
            <td>${formatDate(upload.created_at)}</td>
        </tr>
    `).join('');
    
    tbody.innerHTML = html;
}

// Funciones de utilidad
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Pendiente',
        'uploading': 'Subiendo...',
        'processing': 'Procesando...',
        'completed': 'Completado',
        'error': 'Error'
    };
    return statusMap[status] || status;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES') + ' ' + date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ahora mismo';
    if (diffInMinutes < 60) return `${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d`;
}

function showAlert(message, type = 'info') {
    // Crear alert de Bootstrap
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Agregar al inicio del container
    const container = document.querySelector('.container');
    const alertDiv = document.createElement('div');
    alertDiv.innerHTML = alertHTML;
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-dismiss después de 5 segundos
    setTimeout(() => {
        const alert = alertDiv.querySelector('.alert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

// Función para ver datos de somatometría
async function viewSomatometriaData() {
    try {
        const response = await fetch('/api/somatometria?limit=50');
        const data = await response.json();
        
        if (data.length === 0) {
            showAlert('No hay datos de somatometría disponibles. Sube un archivo CSV con datos de somatometría primero.', 'info');
            return;
        }
        
        // Crear modal para mostrar los datos
        const modalHTML = `
            <div class="modal fade" id="somatometriaModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-chart-line me-2"></i>Datos de Somatometría
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="table-responsive">
                                <table class="table table-striped table-hover">
                                    <thead class="table-dark">
                                        <tr>
                                            <th>No. Control</th>
                                            <th>Nombre</th>
                                            <th>Grupo</th>
                                            <th>Edad</th>
                                            <th>Sexo</th>
                                            <th>Peso</th>
                                            <th>Estatura</th>
                                            <th>IMC</th>
                                            <th>Clasificación</th>
                                            <th>IMP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${data.map(row => `
                                            <tr>
                                                <td>${row.no_control || '-'}</td>
                                                <td>${row.nombre || ''} ${row.paterno || ''}</td>
                                                <td>${row.grupo || '-'}</td>
                                                <td>${row.edad || '-'}</td>
                                                <td>${row.sexo || '-'}</td>
                                                <td>${row.peso ? row.peso + ' kg' : '-'}</td>
                                                <td>${row.estatura ? row.estatura + ' cm' : '-'}</td>
                                                <td>${row.imc ? row.imc.toFixed(2) : '-'}</td>
                                                <td>${row.clasificacion || '-'}</td>
                                                <td>${row.imp || '-'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            <div class="mt-3">
                                <small class="text-muted">
                                    Mostrando ${data.length} registros más recientes.
                                    Total de registros en la base de datos: ${document.getElementById('somatometriaRecords').textContent}
                                </small>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline-primary" onclick="exportSomatometriaData()">
                                <i class="fas fa-download me-1"></i>Exportar a CSV
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remover modal existente si existe
        const existingModal = document.getElementById('somatometriaModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Agregar nuevo modal
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('somatometriaModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error cargando datos de somatometría:', error);
        showAlert('Error cargando datos de somatometría', 'danger');
    }
}

// Función para exportar datos de somatometría
async function exportSomatometriaData() {
    try {
        const response = await fetch('/api/somatometria?limit=1000');
        const data = await response.json();
        
        if (data.length === 0) {
            showAlert('No hay datos para exportar', 'warning');
            return;
        }
        
        // Crear CSV
        const headers = ['No_Control', 'CURP', 'Nombre', 'Paterno', 'Materno', 'Grupo', 'Edad', 'Sexo', 'Peso', 'Estatura', 'IMC', 'Clasificacion', 'IMP'];
        const csvContent = [
            headers.join(','),
            ...data.map(row => [
                row.no_control || '',
                row.curp || '',
                row.nombre || '',
                row.paterno || '',
                row.materno || '',
                row.grupo || '',
                row.edad || '',
                row.sexo || '',
                row.peso || '',
                row.estatura || '',
                row.imc || '',
                row.clasificacion || '',
                row.imp || ''
            ].join(','))
        ].join('\n');
        
        // Descargar archivo
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `somatometria_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showAlert('Datos exportados exitosamente', 'success');
        
    } catch (error) {
        console.error('Error exportando datos:', error);
        showAlert('Error exportando datos', 'danger');
    }
}

// Función para limpiar toda la base de datos
async function clearDatabase() {
    // Mostrar confirmación con modal personalizado
    const confirmHTML = `
        <div class="modal fade" id="confirmClearModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-exclamation-triangle me-2"></i>Confirmar Limpieza
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-warning">
                            <i class="fas fa-warning me-2"></i>
                            <strong>¡ATENCIÓN!</strong> Esta acción eliminará TODOS los datos de la base de datos.
                        </div>
                        <p><strong>Se eliminarán:</strong></p>
                        <ul>
                            <li>Todos los archivos subidos</li>
                            <li>Todos los datos de somatometría</li>
                            <li>Todas las definiciones de columnas</li>
                            <li>Todos los datos CSV almacenados</li>
                        </ul>
                        <p class="text-danger"><strong>Esta acción NO se puede deshacer.</strong></p>
                        <div class="form-check mt-3">
                            <input class="form-check-input" type="checkbox" id="confirmCheck">
                            <label class="form-check-label" for="confirmCheck">
                                Confirmo que entiendo que esta acción eliminará todos los datos
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-danger" id="confirmClearBtn" disabled onclick="executeClearDatabase()">
                            <i class="fas fa-trash me-1"></i>Sí, Limpiar Base de Datos
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remover modal existente si existe
    const existingModal = document.getElementById('confirmClearModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Agregar nuevo modal
    document.body.insertAdjacentHTML('beforeend', confirmHTML);
    
    // Configurar eventos
    const checkbox = document.getElementById('confirmCheck');
    const confirmBtn = document.getElementById('confirmClearBtn');
    
    checkbox.addEventListener('change', function() {
        confirmBtn.disabled = !this.checked;
    });
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('confirmClearModal'));
    modal.show();
}

// Ejecutar la limpieza de la base de datos
async function executeClearDatabase() {
    try {
        // Cerrar modal de confirmación
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmClearModal'));
        modal.hide();
        
        // Mostrar indicador de carga
        showAlert('Limpiando base de datos...', 'info');
        
        const response = await fetch('/api/clear-database', {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const result = await response.json();
            showAlert('Base de datos limpiada exitosamente. Todos los datos han sido eliminados.', 'success');
            
            // Recargar estadísticas y datos
            loadStats();
            loadUploads();
            
            // Limpiar archivos seleccionados localmente
            clearFiles();
            
        } else {
            const error = await response.json();
            showAlert(`Error limpiando base de datos: ${error.error}`, 'danger');
        }
        
    } catch (error) {
        console.error('Error limpiando base de datos:', error);
        showAlert('Error limpiando base de datos', 'danger');
    }
}