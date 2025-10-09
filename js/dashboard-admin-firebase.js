<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel Administrativo - Bienestar APS</title>
    <link rel="stylesheet" href="../css/styles.css">
</head>
<body>
    <!-- Header Admin -->
    <header class="header admin-header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <a href="../index.html">
                      <img src="../assets/images/logo-bienestar.png" alt="Logo Bienestar APS" style="height:120px; width:auto;">
                    </a>
                    <span class="admin-badge">ADMIN</span>
                </div>
                <nav class="user-nav">
                    <div class="user-info">
                        <span class="user-name">🔐 Administrador</span>
                        <span class="user-rut">Panel de Control</span>
                    </div>
                    <button class="btn btn-logout" onclick="logout()">Cerrar Sesión</button>
                </nav>
            </div>
        </div>
    </header>

    <!-- Navegación Admin -->
    <nav class="dashboard-nav admin-nav">
        <div class="container">
            <ul class="nav-tabs">
                <li class="nav-tab active" data-tab="dashboard">📊 Dashboard</li>
                <li class="nav-tab" data-tab="afiliados">👥 Afiliados</li>
                <li class="nav-tab" data-tab="solicitudes">📝 Solicitudes</li>
                <li class="nav-tab" data-tab="beneficios">💰 Beneficios</li>
                <li class="nav-tab" data-tab="convenios">🏪 Convenios</li>
                <li class="nav-tab" data-tab="reportes">📈 Reportes</li>
            </ul>
        </div>
    </nav>

    <!-- Contenido Admin -->
    <section class="dashboard-content admin-content">
        <div class="container">
            
            <!-- Tab: Dashboard -->
            <div class="tab-content active" id="tab-dashboard">
                <h1 class="page-title">Panel de Control Administrativo</h1>
                
                <!-- Estadísticas Principales -->
                <div class="admin-stats-grid">
                    <div class="admin-stat-card card-primary">
                        <div class="stat-icon">👥</div>
                        <div class="stat-info">
                            <h3 id="total-afiliados">0</h3>
                            <p>Afiliados Activos</p>
                            <span class="stat-trend positive">+5% este mes</span>
                        </div>
                    </div>
                    <div class="admin-stat-card card-success">
                        <div class="stat-icon">💰</div>
                        <div class="stat-info">
                            <h3 id="total-beneficios">$0</h3>
                            <p>Beneficios Entregados 2025</p>
                            <span class="stat-trend positive">+12% vs 2024</span>
                        </div>
                    </div>
                    <div class="admin-stat-card card-warning">
                        <div class="stat-icon">📝</div>
                        <div class="stat-info">
                            <h3 id="solicitudes-pendientes">0</h3>
                            <p>Solicitudes Pendientes</p>
                            <span class="stat-trend negative">Requiere atención</span>
                        </div>
                    </div>
                    <div class="admin-stat-card card-info">
                        <div class="stat-icon">🏪</div>
                        <div class="stat-info">
                            <h3 id="convenios-activos">0</h3>
                            <p>Convenios Activos</p>
                            <span class="stat-trend neutral">2 por renovar</span>
                        </div>
                    </div>
                </div>

                <!-- Pendientes de Aprobación -->
                <div class="admin-section">
                    <div class="section-header">
                        <h2>⏳ Afiliados Pendientes de Aprobación</h2>
                        <span id="pendientes-count" class="badge warning">0</span>
                    </div>
                    <div id="afiliados-pendientes" class="pending-list">
                        <!-- Se carga dinámicamente -->
                    </div>
                </div>

                <!-- Actividad Reciente -->
                <div class="admin-section">
                    <div class="section-header">
                        <h2>📋 Actividad Reciente</h2>
                        <button class="btn btn-small btn-secondary">Ver Todo</button>
                    </div>
                    <div class="activity-list">
                        <div class="activity-item">
                            <div class="activity-icon success">✓</div>
                            <div class="activity-content">
                                <p><strong>Solicitud Aprobada:</strong> Asignación por Natalidad - María González</p>
                                <span class="activity-time">Hace 10 minutos</span>
                            </div>
                        </div>
                        <div class="activity-item">
                            <div class="activity-icon info">📄</div>
                            <div class="activity-content">
                                <p><strong>Nueva Solicitud:</strong> Préstamo Médico - Carlos Soto</p>
                                <span class="activity-time">Hace 25 minutos</span>
                            </div>
                        </div>
                        <div class="activity-item">
                            <div class="activity-icon warning">⚠️</div>
                            <div class="activity-content">
                                <p><strong>Alerta:</strong> Convenio por renovar - Gimnasios Energy</p>
                                <span class="activity-time">Hace 1 hora</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab: Afiliados -->
            <div class="tab-content" id="tab-afiliados">
                <div class="section-header">
                    <h2>👥 Gestión de Afiliados</h2>
                    <button class="btn btn-primary" onclick="abrirModalNuevoAfiliado()">
                        ➕ Nuevo Afiliado
                    </button>
                </div>

                <!-- Filtros y Búsqueda -->
                <div class="admin-filters">
                    <input type="text" id="search-afiliados" class="search-input" placeholder="🔍 Buscar por nombre, RUT o centro de salud...">
                    
                    <select id="filter-estado" class="filter-select">
                        <option value="">Todos los estados</option>
                        <option value="activo">Activos</option>
                        <option value="pendiente">Pendientes</option>
                        <option value="inactivo">Inactivos</option>
                    </select>
                    
                    <select id="filter-centro" class="filter-select">
                        <option value="">Todos los centros</option>
                        <option value="CESFAM Karol Wojtyla">CESFAM Karol Wojtyla</option>
                        <option value="CESFAM Padre Manuel Villaseca">CESFAM Padre Manuel Villaseca</option>
                        <option value="CESFAM Alejandro del Rio">CESFAM Alejandro del Rio</option>
                        <option value="CESFAM Bernardo Leighton">CESFAM Bernardo Leighton</option>
                        <option value="CESFAM Cardenal Raúl Silva Henríquez">CESFAM Cardenal Raúl Silva Henríquez</option>
                        <option value="CESFAM Vista Hermosa">CESFAM Vista Hermosa</option>
                        <option value="CESFAM Laurita Vicuña">CESFAM Laurita Vicuña</option>
                        <option value="Centro de Imágenes">Centro de Imágenes</option>
                        <option value="Central de Ambulancia">Central de Ambulancia</option>
                        <option value="Administración Salud">Administración Salud</option>
                        <option value="San Lázaro">San Lázaro</option>
                        <option value="CEIF">CEIF</option>
                        <option value="Laboratorio Salud">Laboratorio Salud</option>
                    </select>
                    
                    <button class="btn btn-secondary" onclick="exportarAfiliados()">
                        📊 Exportar Excel
                    </button>
                </div>

                <!-- Tabla de Afiliados -->
                <div class="admin-table">
                    <table id="tabla-afiliados">
                        <thead>
                            <tr>
                                <th>RUT</th>
                                <th>Nombre</th>
                                <th>Centro de Salud</th>
                                <th>Fecha Afiliación</th>
                                <th>Estado Civil</th>
                                <th>Email</th>
                                <th>Teléfono</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Se carga dinámicamente -->
                        </tbody>
                    </table>
                </div>

                <!-- Paginación -->
                <div class="pagination">
                    <button class="btn-small" onclick="previousPage()">← Anterior</button>
                    <span id="pagination-info">Página 1 de 1</span>
                    <button class="btn-small" onclick="nextPage()">Siguiente →</button>
                </div>
            </div>

            <!-- Tab: Solicitudes -->
            <div class="tab-content" id="tab-solicitudes">
                <div class="section-header">
                    <h2>📝 Gestión de Solicitudes</h2>
                    <div class="filter-pills">
                        <button class="pill active" data-estado="">Todas (<span id="count-todas">0</span>)</button>
                        <button class="pill" data-estado="pendiente">Pendientes (<span id="count-pendientes">0</span>)</button>
                        <button class="pill" data-estado="en_revision">En Revisión (<span id="count-revision">0</span>)</button>
                        <button class="pill" data-estado="aprobada">Aprobadas (<span id="count-aprobadas">0</span>)</button>
                    </div>
                </div>

                <!-- Lista de Solicitudes Admin -->
                <div class="admin-solicitudes">
                    <!-- Se carga dinámicamente -->
                </div>
            </div>

            <!-- Tab: Beneficios -->
            <div class="tab-content" id="tab-beneficios">
                <div class="section-header">
                    <h2>💰 Administración de Beneficios</h2>
                    <button class="btn btn-primary">➕ Crear Beneficio</button>
                </div>

                <div class="beneficios-admin-grid">
                    <!-- Se carga dinámicamente -->
                </div>
            </div>

            <!-- Tab: Convenios -->
            <div class="tab-content" id="tab-convenios">
                <div class="section-header">
                    <h2>🏪 Administración de Convenios</h2>
                    <button class="btn btn-primary">➕ Nuevo Convenio</button>
                </div>

                <div class="convenios-admin-list">
                    <!-- Se carga dinámicamente -->
                </div>
            </div>

            <!-- Tab: Reportes -->
            <div class="tab-content" id="tab-reportes">
                <h2>📈 Centro de Reportes</h2>
                
                <div class="reportes-grid">
                    <div class="reporte-card">
                        <h3>📊 Reporte de Beneficios</h3>
                        <p>Detalle de beneficios entregados por período</p>
                        <div class="reporte-form">
                            <select>
                                <option>Último mes</option>
                                <option>Último trimestre</option>
                                <option>Último año</option>
                                <option>Personalizado</option>
                            </select>
                            <button class="btn btn-primary">Generar</button>
                        </div>
                    </div>

                    <div class="reporte-card">
                        <h3>👥 Reporte de Afiliados</h3>
                        <p>Listado completo de afiliados y su estado</p>
                        <div class="reporte-form">
                            <select>
                                <option>Todos los centros</option>
                                <option>CESFAM Karol Wojtyla</option>
                                <option>CESFAM Padre Manuel Villaseca</option>
                            </select>
                            <button class="btn btn-primary">Generar</button>
                        </div>
                    </div>

                    <div class="reporte-card">
                        <h3>💰 Reporte Financiero</h3>
                        <p>Resumen de montos entregados y presupuesto</p>
                        <div class="reporte-form">
                            <select>
                                <option>2025</option>
                                <option>2024</option>
                                <option>2023</option>
                            </select>
                            <button class="btn btn-primary">Generar</button>
                        </div>
                    </div>

                    <div class="reporte-card">
                        <h3>🏪 Reporte de Convenios</h3>
                        <p>Uso y efectividad de convenios activos</p>
                        <div class="reporte-form">
                            <select>
                                <option>Todos los convenios</option>
                                <option>Salud</option>
                                <option>Educación</option>
                            </select>
                            <button class="btn btn-primary">Generar</button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </section>

    <!-- Modal Nuevo Afiliado -->
    <div id="modal-nuevo-afiliado" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>➕ Nuevo Afiliado</h2>
                <span class="close" onclick="cerrarModalNuevoAfiliado()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="form-nuevo-afiliado">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="nuevo-rut">RUT *</label>
                            <input type="text" id="nuevo-rut" required maxlength="12" placeholder="12.345.678-9">
                            <span class="error-message" id="nuevo-rut-error"></span>
                        </div>
                        <div class="form-group">
                            <label for="nuevo-nombre">Nombre Completo *</label>
                            <input type="text" id="nuevo-nombre" required placeholder="Juan Pérez Gómez">
                            <span class="error-message" id="nuevo-nombre-error"></span>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="nuevo-email">Correo Electrónico *</label>
                            <input type="email" id="nuevo-email" required placeholder="juan.perez@salud.cl">
                            <span class="error-message" id="nuevo-email-error"></span>
                        </div>
                        <div class="form-group">
                            <label for="nuevo-telefono">Número de Teléfono</label>
                            <input type="tel" id="nuevo-telefono" placeholder="+56 9 1234 5678">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="nuevo-centro">Lugar de Trabajo *</label>
                            <select id="nuevo-centro" required>
                                <option value="">Seleccione...</option>
                                <option value="CESFAM Karol Wojtyla">CESFAM Karol Wojtyla</option>
                                <option value="CESFAM Padre Manuel Villaseca">CESFAM Padre Manuel Villaseca</option>
                                <option value="CESFAM Alejandro del Rio">CESFAM Alejandro del Rio</option>
                                <option value="CESFAM Bernardo Leighton">CESFAM Bernardo Leighton</option>
                                <option value="CESFAM Cardenal Raúl Silva Henríquez">CESFAM Cardenal Raúl Silva Henríquez</option>
                                <option value="CESFAM Vista Hermosa">CESFAM Vista Hermosa</option>
                                <option value="CESFAM Laurita Vicuña">CESFAM Laurita Vicuña</option>
                                <option value="Centro de Imágenes">Centro de Imágenes</option>
                                <option value="Central de Ambulancia">Central de Ambulancia</option>
                                <option value="Administración Salud">Administración Salud</option>
                                <option value="San Lázaro">San Lázaro</option>
                                <option value="CEIF">CEIF</option>
                                <option value="Laboratorio Salud">Laboratorio Salud</option>
                            </select>
                            <span class="error-message" id="nuevo-centro-error"></span>
                        </div>
                        <div class="form-group">
                            <label for="nuevo-estado-civil">Estado Civil</label>
                            <select id="nuevo-estado-civil">
                                <option value="">Seleccione...</option>
                                <option value="Soltero/a">Soltero/a</option>
                                <option value="Casado/a">Casado/a</option>
                                <option value="Divorciado/a">Divorciado/a</option>
                                <option value="Viudo/a">Viudo/a</option>
                                <option value="Unión Civil">Unión Civil</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="nuevo-cargo">Cargo</label>
                            <input type="text" id="nuevo-cargo" placeholder="Ej: Enfermero, Técnico, etc.">
                        </div>
                        <div class="form-group">
                            <label for="nuevo-password">Contraseña Temporal *</label>
                            <input type="password" id="nuevo-password" required minlength="6" placeholder="Mínimo 6 caracteres">
                            <span class="error-message" id="nuevo-password-error"></span>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="cerrarModalNuevoAfiliado()">Cancelar</button>
                <button type="submit" form="form-nuevo-afiliado" class="btn btn-primary" id="btn-crear-afiliado">Crear Afiliado</button>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p>&copy; 2025 Servicio Bienestar APS - Panel Administrativo</p>
        </div>
    </footer>

    <script type="module" src="../js/dashboard-admin-firebase.js"></script>
</body>
</html>
