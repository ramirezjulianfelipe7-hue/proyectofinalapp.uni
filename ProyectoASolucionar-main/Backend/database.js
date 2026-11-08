const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Ruta del archivo físico de la base de datos SQLite
const DB_PATH = path.join(__dirname, 'pokedex.db');

// Conexión al motor SQLite
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('[ERROR] Error al abrir la base de datos SQLite:', err.message);
    } else {
        console.log(`\n[SQLite] Base de datos conectada en: ${DB_PATH}`);
        inicializarEsquema();
    }
});

// Helper para ejecutar sentencias SQL con Promesas (INSERT, UPDATE, DELETE, PRAGMA)
function runSQL(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

// Helper para obtener una sola fila (SELECT ... LIMIT 1)
function getSQL(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

// Helper para obtener múltiples filas (SELECT)
function allSQL(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

// ============================================================================
// ACTIVIDAD DEL ESTUDIANTE (MÓDULO 2): DISEÑO LÓGICO, PRAGMAS, TABLAS E ÍNDICES
// ============================================================================
async function inicializarEsquema() {
    try {
         // 1. Directivas PRAGMA para optimización y concurrencia en entornos móviles (Módulo 2 - Tema 5)
        await runSQL('PRAGMA foreign_keys = ON;');
        await runSQL('PRAGMA journal_mode = WAL;');
        await runSQL('PRAGMA synchronous = NORMAL;');

        // 2. Tabla de Usuarios / Entrenadores (3NF - Entidad Principal)
        await runSQL(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                region TEXT DEFAULT 'Kanto',
                preferencias_json TEXT DEFAULT '{"tema":"oscuro","notificaciones":true}',
                fecha_registro TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Tabla de Capturas Pokémon (Relación 1:N con usuarios + Diseño Híbrido JSON1)
        // Nota de almacenamiento eficiente: guardamos sprite_url como TEXT (ruta/URL) y NO como BLOB binario.
        await runSQL(`
            CREATE TABLE IF NOT EXISTS capturas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL,
                poke_id INTEGER NOT NULL,
                nombre TEXT NOT NULL,
                apodo TEXT DEFAULT '',
                peso_kg REAL NOT NULL,
                sprite_url TEXT NOT NULL,
                datos_json TEXT NOT NULL,
                favorito INTEGER DEFAULT 0,
                notas TEXT DEFAULT '',
                is_deleted INTEGER DEFAULT 0,
                fecha_captura TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            );
        `);

        // 4. Creación de Índices B-Tree para acelerar búsquedas frecuentes (Módulo 2 - Tema 4)
        await runSQL(`
            CREATE INDEX IF NOT EXISTS idx_capturas_usuario_activo
            ON capturas(usuario_id, is_deleted);
        `);

        await runSQL(`
            CREATE INDEX IF NOT EXISTS idx_capturas_nombre
            ON capturas(nombre);
        `);

        console.log('[SQLite] Esquema relacional (3NF), directivas PRAGMA (WAL) e índices B-Tree inicializados.');
    } catch (error) {
        console.error('[ERROR] Error al inicializar el esquema:', error.message);

    }
}

module.exports = {
    db,
    DB_PATH,
    runSQL,
    getSQL,
    allSQL
};
