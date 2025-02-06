const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: './backend.env' });
const crypto = require('crypto');
const app = express();
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
RUTA_BASE_ARCHIVOS = '/home/coval/Escritorio/portalFinanzas/backend/archivos/';


//REGISTROS LOG -------------------------------------

const { createLogger, format, transports } = require('winston');

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'ddd MMM DD YYYY HH:mm:ss' }), // Fecha en formato limpio
        format.printf(({ timestamp, level, message, ...meta }) => {
            const { userName, userEmail, deviceInfo } = meta; // Extraer datos adicionales
            return `[${timestamp}] ${level.toUpperCase()}: ${message} - Nombre: ${userName || 'N/A'}, Correo: ${userEmail || 'N/A'}, Dispositivo: ${deviceInfo || 'N/A'}`;
        })
    ),
    transports: [
        new transports.Console(),
        new transports.File({
            filename: 'logs/app.log',
            maxsize: 5 * 1024 * 1024, // 5 MB
           // maxFiles: 5, // Mantiene un máximo de 5 archivos o más
        }),
    ],
});

// -------------------------------------------------







// Clase de Gestión de Sesiones
class SessionManager {
    constructor() {
        this.sessions = {}; // Almacena sesiones agrupadas por userId
        this.MAX_SESSIONS_PER_USER = 3; // Límite de sesiones por usuario
    }

    // Crear una nueva sesión
    createSession(userId, deviceInfo) {
        if (!this.sessions[userId]) {
            this.sessions[userId] = {}; // Crear almacenamiento para el usuario si no existe
        }

        const userSessions = this.sessions[userId];
        const sessionTokens = Object.keys(userSessions);

        // Si excede el límite, elimina la sesión más antigua
        if (sessionTokens.length >= this.MAX_SESSIONS_PER_USER) {
            sessionTokens.sort((a, b) => userSessions[a].createdAt - userSessions[b].createdAt);
            const oldestToken = sessionTokens[0];
            delete userSessions[oldestToken];
        }

        let sessionToken = this.generateSessionToken();
        while (userSessions[sessionToken]) {
            sessionToken = this.generateSessionToken(); // Garantizar unicidad del token
        }

        userSessions[sessionToken] = {
            deviceInfo,
            createdAt: Date.now(),
            lastActivity: Date.now(),
        };

        return sessionToken;
    }

    // Validar sesión
    validateSession(sessionToken) {
        for (const userId in this.sessions) {
            const userSessions = this.sessions[userId];
            if (userSessions[sessionToken]) {
                const session = userSessions[sessionToken];
                const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 horas
                if (Date.now() - session.createdAt > SESSION_DURATION) {
                    this.closeSession(sessionToken, userId);
                    return false;
                }

                session.lastActivity = Date.now(); // Actualizar actividad
                return { userId, ...session };
            }
        }
        return false;
    }
    // Generar un token de sesión único
    generateSessionToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Obtener sesiones activas de un usuario
    getUserSessions(userId) {
        return this.sessions[userId]
            ? Object.entries(this.sessions[userId]).map(([token, session]) => ({
                token,
                ...session,
            }))
            : [];
    }

    // Cerrar una sesión específica
    closeSession(sessionToken, userId) {
        if (this.sessions[userId]) {
            delete this.sessions[userId][sessionToken];
            if (Object.keys(this.sessions[userId]).length === 0) {
                delete this.sessions[userId]; // Eliminar el usuario si no tiene sesiones activas
            }
        }
    }

    // Limpieza de sesiones inactivas
    startSessionCleanup() {
        setInterval(() => {
            const now = Date.now();
            const INACTIVE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 horas

            for (const userId in this.sessions) {
                const userSessions = this.sessions[userId];
                Object.entries(userSessions).forEach(([token, session]) => {
                    if (now - session.lastActivity > INACTIVE_THRESHOLD) {
                        delete userSessions[token];
                    }
                });

                if (Object.keys(userSessions).length === 0) {
                    delete this.sessions[userId]; // Eliminar el usuario si no tiene sesiones activas
                }
            }
        }, 60 * 60 * 1000); // Limpieza cada hora
    }
}


// Instancia del gestor de sesiones
const sessionManager = new SessionManager();
sessionManager.startSessionCleanup();

const allowedOrigins = process.env.CLIENT_ORIGIN.split(',');

app.use(cors({
    origin: function (origin, callback) {
        // Permitir solicitudes sin origen (e.g., herramientas como Postman)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Origen no permitido por CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true, // Permitir cookies y encabezados de autenticación en solicitudes
}));
app.use(express.json());

// Configuración del pool de conexiones
const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    queueLimit: 0,
});

// Ping cada hora para mantener la conexión activa
setInterval(() => {
    pool.query('SELECT 1', (err) => {
        if (err) console.error('Error keeping the database connection alive:', err);
        else console.log('Database connection kept alive');
    });
}, 3600000);

// Middleware para verificar y autenticar el token JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const sessionToken = req.headers['x-session-token'];

    if (!token || !sessionToken) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const session = sessionManager.validateSession(sessionToken);
        if (!session || session.userId !== user.id) {
            return res.status(403).json({ message: 'Sesión inválida o expirada' });
        }

        req.user = { ...user, sessionToken }; // Vincular usuario con la sesión actual
        next();
    });
};



// Configuración de Multer para guardar archivos en la carpeta "archivos"
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname,'archivos')); // Carpeta local "archivos"
    },
    filename: function (req, file, cb) {
        // Usamos solo el nombre original del archivo
        const originalName = file.originalname;
        cb(null, originalName); // Guarda el archivo con su nombre original
    },
});

const upload = multer({ storage });

// Configurar la carpeta "archivos" como ruta pública
app.use('/uploads', express.static(path.join(__dirname, 'archivos')));



app.get('/uploads/:filename/:idProyecto', (req, res) => {
    const encryptedName = req.params.filename;
    const idProyecto = req.params.idProyecto;

    console.log('Recibido el request para descargar:', encryptedName, 'para el proyecto ID:', idProyecto);

    // Consulta a la base de datos para recuperar el nombre original y la ruta, incluyendo el filtro por idProyecto
    const query = `
        SELECT ruta, nombre
        FROM panel_finanzas_dba.archivos_proyecto 
        WHERE nombre = ? AND idproyecto = ?
    `;

    console.log('Ejecutando consulta SQL:', query, 'con parámetros:', encryptedName, idProyecto);

    pool.execute(query, [encryptedName, idProyecto], (err, results) => {
        if (err) {
            console.error('Error al consultar la base de datos:', err);
            return res.status(500).json({ message: 'Error al consultar la base de datos' });
        }

        console.log('Resultados de la consulta:', results);

        if (results.length === 0) {
            console.warn('Archivo no encontrado en la base de datos para el nombre encriptado:', encryptedName);
            return res.status(404).json({ message: 'Archivo no encontrado' });
        }

        const filePath = path.join(results[0].ruta); // Ruta física del archivo
        const originalName = results[0].nombre; // Nombre original del archivo

        console.log('Ruta física del archivo:', filePath);
        console.log('Nombre original del archivo:', originalName);

        // Verificar si el archivo existe en el sistema de archivos
        fs.exists(filePath, (exists) => {
            if (!exists) {
                console.warn('Archivo no encontrado en el sistema de archivos:', filePath);
                return res.status(404).json({ message: 'Archivo no encontrado en el sistema de archivos' });
            }

            // Descargar el archivo con su nombre original
            res.download(filePath, originalName, (err) => {
                if (err) {
                    console.error('Error al descargar el archivo:', err);
                    if (err.code === 'ENOENT') {
                        console.warn('Archivo no encontrado en el sistema de archivos:', filePath);
                        return res.status(404).json({ message: 'Archivo no encontrado en el sistema de archivos' });
                    }
                    res.status(500).json({ message: 'Error al descargar el archivo' });
                } else {
                    console.log('Archivo descargado exitosamente:', originalName);
                }
            });
        });
    });
});



// Endpoint para archivos
app.post('/api/archivos', upload.single('archivo'), (req, res) => {
    const { idproyecto, idarea, idusuario, nombre } = req.body;
    const archivo = req.file;

    if (!nombre || !idproyecto || !idarea || !idusuario || !archivo) {
        console.log('Datos incompletos:', { nombre, idproyecto, idarea, idusuario, archivo });
        return res.status(400).send({ message: 'Datos incompletos o archivo faltante' });
    }

    // Generar hash único basado en contenido y timestamp
    const contenido = archivo.buffer || fs.readFileSync(archivo.path);
    const hash = crypto.createHash('sha256').update(contenido + Date.now()).digest('hex');

    // Crear subdirectorio por proyecto

    //RUTA_BASE_ARCHIVOS
    const subdirectorioProyecto = path.join(RUTA_BASE_ARCHIVOS, `proyecto_${idproyecto}`);
    fs.mkdir(subdirectorioProyecto, { recursive: true }, (err) => {
        if (err) {
            console.error('Error al crear el subdirectorio:', err);
            return res.status(500).send({ message: 'Error al crear el subdirectorio', error: err });
        }

        // Generar nombre único y ruta final del archivo
        const extension = path.extname(archivo.originalname);
        const nombreUnico = `${hash}${extension}`;
        const rutaFinal = path.join(subdirectorioProyecto, nombreUnico);

        // Mover el archivo al subdirectorio
        fs.rename(archivo.path, rutaFinal, (err) => {
            if (err) {
                console.error('Error al mover el archivo:', err);
                return res.status(500).send({ message: 'Error al mover el archivo', error: err });
            }

            // Insertar datos en la base de datos
            const query = `
                INSERT INTO archivos_proyecto (idproyecto, idarea, idusuario, nombre, nombre_unico, ruta, fechacreacion)
                VALUES (?, ?, ?, ?, ?, ?, NOW());
            `;
            const valores = [idproyecto, idarea, idusuario, nombre, nombreUnico, rutaFinal];

            pool.execute(query, valores, (err, result) => {
                if (err) {
                    console.error('Error al insertar en la base de datos:', err);
                    return res.status(500).send({ message: 'Error al guardar los datos en la base de datos', error: err });
                }

                // Responder al cliente
                res.status(201).send({
                    message: 'Archivo subido exitosamente',
                    idarchivo: result.insertId,
                    ruta: rutaFinal,
                });
            });
        });
    });
});



app.get('/api/archivos/:idproyecto', (req, res) => {
    const idProyecto = req.params.idproyecto;

    const query = `
        SELECT 
            ap.idarchivo,
            ap.idproyecto,
            ap.idarea,
            ap.idusuario,
            ap.nombre AS nombre_completo,
            ap.ruta,
            ap.fechacreacion,
            u.nombre AS usuario_nombre
        FROM archivos_proyecto ap
        LEFT JOIN USUARIO u ON ap.idusuario = u.idUsuario
        WHERE ap.idproyecto = ?;
    `;

    pool.execute(query, [idProyecto], (err, results) => {
        if (err) {
            console.error('Error al obtener los archivos:', err);
            return res.status(500).send({ message: 'Error al obtener los archivos', error: err });
        }

        res.status(200).json(results);
    });
});


// GET /api/archivos/:idproyecto - Obtener archivos por proyecto
app.get('/api/archivos/:id', (req, res) => {
    const { id } = req.params;

    const query = `
        SELECT idarchivo, idproyecto, idarea, idusuario, 
               nombre AS nombre_completo, ruta, fechacreacion
        FROM archivos_proyecto
        WHERE idarchivo = ?;
    `;

    pool.execute(query, [id], (err, result) => {
        if (err) {
            console.error('Error al obtener el archivo:', err);
            return res.status(500).send({ message: 'Error al obtener el archivo' });
        }

        if (result.length === 0) {
            return res.status(404).send({ message: 'Archivo no encontrado' });
        }

        // Devuelves el primer resultado (ya que debería ser único)
        res.status(200).json(result[0]);
    });
});


// GET /api/archivos/:idproyecto - Obtener archivos por proyecto
app.get('/api/archivos/:idproyecto', (req, res) => {
    const { idproyecto } = req.params;
    
    const query = `
        SELECT idarchivo, idproyecto, idarea, idusuario, 
               nombre AS nombre_completo, ruta, fechacreacion
        FROM archivos_proyecto
        WHERE idproyecto = ?;
    `;

    pool.execute(query, [idproyecto], (err, results) => {
        if (err) {
            console.error('Error al obtener archivos del proyecto:', err);
            return res.status(500).send({ message: 'Error al obtener los archivos del proyecto' });
        }
        res.status(200).json(results);
    });
});



app.get('/api/archivos', (req, res) => {
    const query = `
        SELECT idarchivo, idproyecto, idarea, idusuario, 
               nombre AS nombre_completo, ruta, fechacreacion
        FROM archivos_proyecto
        ORDER BY fechacreacion DESC;
    `;

    pool.execute(query, (err, results) => {
        if (err) {
            console.error('Error al obtener la lista de archivos:', err);
            return res.status(500).send({ message: 'Error al obtener la lista de archivos' });
        }

        if (!results) {
            return res.status(200).json([]);
        }

        res.status(200).json(results);
    });
});


// Endpoint para eliminar archivo
app.delete('/api/archivos/:idArchivo/:idProyecto', (req, res) => {
    const archivoId = req.params.idArchivo;
    const proyectoId = req.params.idProyecto;

    console.log(`Iniciando eliminación del archivo con id: ${archivoId} del proyecto: ${proyectoId}`); // Depuración inicial

    const query = 'SELECT nombre_unico FROM archivos_proyecto WHERE idarchivo = ? AND idproyecto = ?';

    pool.execute(query, [archivoId, proyectoId], (err, results) => {
        if (err) {
            console.error('Error de consulta a la base de datos:', err);
            return res.status(500).send({ message: 'Error al consultar la base de datos' });
        }

        if (results.length === 0) {
            console.log(`No se encontró un archivo con id ${archivoId} en el proyecto ${proyectoId}`);
            return res.status(404).send({ message: 'Archivo no encontrado en la base de datos para el proyecto especificado' });
        }

        const nombreUnico = results[0].nombre_unico;
        console.log(`Nombre del archivo obtenido: ${nombreUnico}`);

        const rutaArchivo = path.join(RUTA_BASE_ARCHIVOS, `proyecto_${proyectoId}`, nombreUnico);
        console.log(`Ruta completa del archivo: ${rutaArchivo}`);

        // Verificar si la conexión sigue activa antes de proceder
        if (res.headersSent) {
            console.error('La conexión ya fue cerrada por el cliente.');
            return; // Detener el proceso si la conexión está cerrada
        }

        fs.unlink(rutaArchivo, (err) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    console.log(`El archivo no existe en el sistema de archivos: ${err.path}`);
                    return res.status(404).send({ message: 'El archivo no existe en el sistema de archivos' });
                } else if (err.code === 'EACCES') {
                    console.error('Error de permisos al acceder al archivo:', err);
                    return res.status(500).send({ message: 'Error de permisos al eliminar el archivo' });
                } else {
                    console.error('Error inesperado al eliminar el archivo:', err);
                    return res.status(500).send({ message: 'Error interno al eliminar el archivo' });
                }
            }

            console.log(`Archivo eliminado correctamente del sistema de archivos: ${rutaArchivo}`);

            const deleteQuery = 'DELETE FROM archivos_proyecto WHERE idarchivo = ? AND idproyecto = ?';
            pool.execute(deleteQuery, [archivoId, proyectoId], (err) => {
                if (err) {
                    console.error('Error al eliminar el registro de la base de datos:', err);
                    return res.status(500).send({ message: 'Error al eliminar el registro de la base de datos' });
                }

                console.log(`Registro eliminado de la base de datos para id: ${archivoId} en el proyecto ${proyectoId}`);
                // Verificar si la conexión sigue activa antes de enviar respuesta final
                if (!res.headersSent) {
                    res.status(200).send({ message: 'Archivo eliminado exitosamente' });
                }
            });
        });
    });

    // Manejar el cierre de la conexión del cliente
    req.on('close', () => {
        console.log(`La conexión fue cerrada por el cliente durante el proceso de eliminación del archivo id: ${archivoId}`);
    });
});

// Endpoint para obtener PROYECTOs sin autenticación JWT
app.get('/proyecto', (req, res) => {
    console.log('Ruta /PROYECTO alcanzada');  // Esto debería aparecer en la consola si la ruta se alcanza
    const query = 'SELECT * FROM PROYECTO';
    pool.execute(query, (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send('Error retrieving projects');
        }
        res.json(result);
    });
});


// Endpoint para obtener todos los proyectos de un usuario específico
app.get('/proyecto/usuario/:idUsuario', (req, res) => {
    const idUsuario = req.params.idUsuario;
    const query = `
        SELECT
            p.idProyecto,
            p.nombre AS nombreProyecto,
            p.descripcion,
            p.fechaInicio,
            p.fechaFin,
            p.fechaReal,
            p.porcentajeAvance,
            p.fechaCreacion,
            p.fechaModificacion,
            a.idArea,
            a.nombre AS nombreArea,
            e.idEstado,
            e.descripcion AS descripcionEstado
        FROM
           PROYECTO p
        JOIN
            AREA a ON p.idArea = a.idArea
        JOIN
            ESTADO e ON p.idEstado = e.idEstado
        WHERE
            p.idUsuario = ?;
    `;

    pool.execute(query, [idUsuario], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send('Error retrieving projects');
        }
        if (result.length === 0) {
            return res.status(404).send('No projects found for this user');
        }
        res.json(result);
    });
});


// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Endpoint para solicitar un cambio en un proyecto
app.put('/proyecto/:id/solicitud', (req, res) => {
    const idProyecto = req.params.id;

    //console.log('🔹 ID Proyecto recibido:', idProyecto);
    //console.log('🔹 Body recibido en Node:', req.body);

    const {
        nombre,
        descripcion,
        fechaInicio,
        fechaFin,
        fechaReal,
        porcentajeAvance,
        idSolicitante,
        idArea,
        idEstado,
        descripcionAprobacion
    } = req.body;

    //console.log('🔹 idSolicitante extraído del body:', idSolicitante);

    if (!idSolicitante) {
        console.error('⚠️ ERROR: idSolicitante no recibido en el backend.');
        return res.status(400).json({ success: false, message: 'El idSolicitante es requerido' });
    }

    pool.query('SELECT * FROM PROYECTO WHERE idProyecto = ?', [idProyecto], (err, results) => {
        if (err) {
            console.error('⚠️ Error al obtener proyecto:', err);
            return res.status(500).json({ success: false, message: 'Error al obtener proyecto' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
        }

        //console.log('✅ Proyecto encontrado, insertando solicitud...');

        const insertQuery = `
            INSERT INTO APROBACION (
                idProyecto, nombre, descripcion, fechaInicio, fechaFin, fechaReal, 
                porcentajeAvance, idSolicitante, idArea, idEstado, idEstadoSolicitud, 
                descripcionAprobacion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;

        pool.query(insertQuery, [
            idProyecto, nombre, descripcion, fechaInicio, fechaFin, fechaReal,
            porcentajeAvance, idSolicitante, idArea, idEstado, 3, // Estado inicial de la solicitud
            descripcionAprobacion
        ], (err) => {
            if (err) {
                console.error('⚠️ Error al registrar solicitud:', err);
                return res.status(500).json({ success: false, message: 'Error al registrar solicitud' });
            }

            //console.log('✅ Solicitud insertada correctamente en la BD');

            // Obtener el correo del solicitante
            pool.query('SELECT correo FROM USUARIO WHERE idUsuario = ?', [idSolicitante], (err, results) => {
                if (err) {
                    console.error('⚠️ Error al obtener correo del usuario:', err);
                    return res.status(500).json({ success: false, message: 'Error al obtener correo del usuario' });
                }

                if (results.length === 0) {
                    return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
                }

                const correoSolicitante = results[0].correo;
                //console.log('📧 Correo del solicitante:', correoSolicitante);

                // Obtener correos de todos los administradores (idRol = 1)
                pool.query('SELECT correo FROM USUARIO WHERE idRol = 1', (err, adminResults) => {
                    if (err) {
                        console.error('⚠️ Error al obtener correos de administradores:', err);
                        return res.status(500).json({ success: false, message: 'Error al obtener correos de administradores' });
                    }

                    if (adminResults.length === 0) {
                        console.warn('⚠️ No hay administradores registrados en la BD.');
                    }

                    // Extraer los correos de los administradores
                    const correosAdmins = adminResults.map(row => row.correo);
                    //console.log('📧 Correos de administradores:', correosAdmins);

                    // Crear el correo para el solicitante
                    const mailOptionsSolicitante = {
                        from: '"PortalFinanzas" <noreply@inevada.cl>',
                        to: correoSolicitante,
                        subject: 'Solicitud de Cambio en Proyecto',
                        text: `Tu solicitud de cambio para el proyecto "${nombre}" ha sido registrada y está pendiente de aprobación.`,
                        html: `<p>Tu solicitud de cambio para el proyecto "<b>${nombre}</b>" ha sido registrada y está <b>pendiente de aprobación</b>.</p>`
                    };

                    // Enviar correo al solicitante
                    transporter.sendMail(mailOptionsSolicitante, (err, info) => {
                        if (err) {
                            console.error('⚠️ Error al enviar correo al solicitante:', err);
                        } else {
                            //console.log('✅ Correo enviado al solicitante:', info.response);
                        }
                    });

                    // Crear el correo para los administradores
                    if (correosAdmins.length > 0) {
                        const mailOptionsAdmins = {
                            from: '"PortalFinanzas" <noreply@inevada.cl>',
                            to: correosAdmins.join(','), // Enviar a todos los administradores
                            subject: 'Nueva Solicitud de Cambio en Proyecto',
                            text: `Se ha registrado una nueva solicitud de cambio en el proyecto "${nombre}". Por favor, revisarla y aprobar o rechazar según corresponda.`,
                            html: `<p>Se ha registrado una nueva solicitud de cambio en el proyecto "<b>${nombre}</b>".</p>
                                   <p>Por favor, revisarla y aprobar o rechazar según corresponda.</p>`
                        };

                        // Enviar correo a los administradores
                        transporter.sendMail(mailOptionsAdmins, (err, info) => {
                            if (err) {
                                console.error('⚠️ Error al enviar correo a administradores:', err);
                            } else {
                                //console.log('✅ Correo enviado a administradores:', info.response);
                            }
                        });
                    }

                    res.json({ success: true, message: 'Solicitud de cambio registrada y correos enviados.' });
                });
            });
        });
    });
});


// Endpoint para aprobar o rechazar una solicitud de cambio
app.put('/aprobacion/:id', (req, res) => {
    const idAprobacion = req.params.id;
    const { idAprobador, estadoSolicitud } = req.body; // estadoSolicitud: 2 (Aprobado), 3 (Rechazado)

    // Obtener la solicitud pendiente
    pool.query('SELECT * FROM APROBACION WHERE idAprobacion = ?', [idAprobacion], (err, results) => {
        if (err) {
            console.error('Error al obtener solicitud:', err);
            return res.status(500).json({ success: false, message: 'Error al obtener solicitud' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
        }

        const solicitud = results[0];

        // Si se aprueba, actualizar la tabla PROYECTO
        if (estadoSolicitud === 2) { // Aprobado
            const updateQuery = `
                UPDATE PROYECTO
                SET nombre = ?, descripcion = ?, fechaInicio = ?, fechaFin = ?, fechaReal = ?, 
                    porcentajeAvance = ?, idArea = ?, idEstado = ?
                WHERE idProyecto = ?;
            `;

            pool.query(updateQuery, [
                solicitud.nombre, solicitud.descripcion, solicitud.fechaInicio, 
                solicitud.fechaFin, solicitud.fechaReal, solicitud.porcentajeAvance,
                solicitud.idArea, solicitud.idEstado, solicitud.idProyecto
            ], (err) => {
                if (err) {
                    console.error('Error al actualizar proyecto:', err);
                    return res.status(500).json({ success: false, message: 'Error al actualizar proyecto' });
                }

                // Registrar en LOG_PROYECTO
                const detalles = JSON.stringify({
                    nombre: solicitud.nombre,
                    descripcion: solicitud.descripcion,
                    fechaInicio: solicitud.fechaInicio,
                    fechaFin: solicitud.fechaFin,
                    fechaReal: solicitud.fechaReal,
                    porcentajeAvance: solicitud.porcentajeAvance,
                    idArea: solicitud.idArea,
                    idEstado: solicitud.idEstado
                });

                const logQuery = `
                    INSERT INTO LOG_PROYECTO (idProyecto, idUsuario, accion, detalles) 
                    VALUES (?, ?, 'APROBADO', ?);
                `;

                pool.query(logQuery, [solicitud.idProyecto, idAprobador, detalles], (err) => {
                    if (err) {
                        console.error('Error al registrar log:', err);
                        return res.status(500).json({ success: false, message: 'Error al registrar log' });
                    }

                    // Marcar la solicitud como aprobada
                    const updateAprobacionQuery = `
                        UPDATE APROBACION SET idAprobador = ?, idEstadoSolicitud = ? WHERE idAprobacion = ?;
                    `;

                    pool.query(updateAprobacionQuery, [idAprobador, estadoSolicitud, idAprobacion], (err) => {
                        if (err) {
                            console.error('Error al actualizar estado de aprobación:', err);
                            return res.status(500).json({ success: false, message: 'Error al actualizar estado' });
                        }

                        res.json({ success: true, message: 'Solicitud aprobada y cambios aplicados' });
                    });
                });
            });
        } else { // Rechazado
            const updateAprobacionQuery = `
                UPDATE APROBACION SET idAprobador = ?, idEstadoSolicitud = ? WHERE idAprobacion = ?;
            `;

            pool.query(updateAprobacionQuery, [idAprobador, estadoSolicitud, idAprobacion], (err) => {
                if (err) {
                    console.error('Error al actualizar estado de solicitud:', err);
                    return res.status(500).json({ success: false, message: 'Error al actualizar estado' });
                }

                res.json({ success: true, message: 'Solicitud rechazada' });
            });
        }
    });
});


// Endpoint para obtener las solicitudes pendientes con comparación de cambios
app.get('/solicitudes/cambios', (req, res) => {
    const query = `
        SELECT 
            A.idAprobacion,
            U.nombre AS nombreSolicitante,
            A.fechaSolicitud,
            A.descripcionAprobacion AS descripcionSolicitud,
            A.idEstadoSolicitud,
            E.nombre AS estadoSolicitud,
            P.* AS proyectoOriginal,
            A.* AS aprobacion
        FROM APROBACION A
        JOIN USUARIO U ON A.idSolicitante = U.idUsuario
        JOIN ESTADO_SOLICITUD E ON A.idEstadoSolicitud = E.idEstadoSolicitud
        JOIN PROYECTO P ON A.idProyecto = P.idProyecto
        WHERE A.idEstadoSolicitud = 3
    `;

    pool.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener solicitudes:', err);
            return res.status(500).json({ success: false, message: 'Error al obtener solicitudes' });
        }

        const solicitudes = results.map((row) => {
            const cambios = {};
            const camposAComparar = ['nombre', 'descripcion', 'fechaInicio', 'fechaFin', 'fechaReal', 'porcentajeAvance'];

            camposAComparar.forEach((campo) => {
                if (row[`P.${campo}`] !== row[`A.${campo}`]) {
                    cambios[campo] = {
                        anterior: row[`P.${campo}`],
                        nuevo: row[`A.${campo}`]
                    };
                }
            });

            return {
                nombreSolicitante: row.nombreSolicitante,
                fechaSolicitud: row.fechaSolicitud,
                descripcionSolicitud: row.descripcionSolicitud,
                cambios,
                estadoSolicitud: row.estadoSolicitud
            };
        });

        res.json(solicitudes);
    });
});




// Endpoint para obtener el historial de cambios
app.get('/proyecto/:id/log', (req, res) => {
    const idProyecto = req.params.id;

    // Usar el método de callbacks en el pool
    pool.query(
        `
        SELECT 
	l.*, 
	u.nombre AS usuario,
	u.correo	
        FROM LOG_PROYECTO l
        INNER JOIN USUARIO u ON l.idUsuario = u.idUsuario
        WHERE l.idProyecto = ?
        ORDER BY l.fechaAccion DESC
        `,
        [idProyecto],
        (error, results) => {
            if (error) {
                console.error('Error al obtener historial:', error);
                return res.status(500).send('Error retrieving log history');
            }

            res.json(results); // Enviar los logs como respuesta
        }
    );
});

// Endpoint para actualizar solo el porcentaje de avance de un proyecto
app.put('/proyecto/:id/porcentaje', (req, res) => {
    const idProyecto = req.params.id;
    const { porcentajeAvance } = req.body;

    // Validar que el porcentaje de avance sea proporcionado y sea un número válido
    if (porcentajeAvance === undefined || typeof porcentajeAvance !== 'number') {
        return res.status(400).send('Bad Request: porcentajeAvance es obligatorio y debe ser un número.');
    }

    const query = `
        UPDATE PROYECTO
        SET porcentajeAvance = ?
        WHERE idProyecto = ?;
    `;

    pool.execute(query, [porcentajeAvance, idProyecto], (err, result) => {
        if (err) {
            console.error('Error en la consulta a la base de datos:', err);
            return res.status(500).send('Error updating porcentajeAvance');
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('Project not found');
        }

        // Responder con un estado 200 indicando éxito
        res.status(200).json({ success: true, message: 'Porcentaje de avance actualizado correctamente' });
    });
});

// Endpoint para crear un nuevo proyecto
app.post('/proyecto', (req, res) => {
    const {
        nombre,
        descripcion,
        fechaInicio,
        fechaFin,
        fechaReal,
        porcentajeAvance,
        idUsuario,
        idArea,
        idEstado
    } = req.body;

    const query = `
        INSERT INTO PROYECTO (
            nombre,
            descripcion,
            fechaInicio,
            fechaFin,
            fechaReal,
            porcentajeAvance,
            idUsuario,
            idArea,
            idEstado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    pool.execute(query, [nombre, descripcion, fechaInicio, fechaFin, fechaReal, porcentajeAvance, idUsuario, idArea, idEstado], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ success: false, message: 'Error creating project' });
        }

        // Respuesta con un JSON que indica éxito
        res.status(201).json({ success: true, message: 'Project created successfully', projectId: result.insertId });
    });
});



// Endpoint para obtener estados sin autenticación JWT
app.get('/estado', (req, res) => {
    const query = 'SELECT * FROM ESTADO';
    pool.execute(query, (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send('Error retrieving states');
        }
        res.json(result);
    });
});

// Endpoint para obtener áreas sin autenticación JWT
app.get('/area', (req, res) => {
    const query = 'SELECT * FROM AREA';
    pool.execute(query, (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send('Error retrieving areas');
        }
        res.json(result);
    });
});

// Usando async/await para trabajar con promesas.
app.get('/rol', async (req, res) => {
    try {
        const [rows, fields] = await connection.execute('SELECT * FROM rol');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error en la consulta', error: err.message });
    }
});

// Endpoint para obtener tareas sin autenticación JWT
app.get('/tarea', (req, res) => {
    const query = 'SELECT * FROM tarea';
    pool.execute(query, (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send('Error retrieving tasks');
        }
        res.json(result);
    });
});


app.get('/tarea', async (req, res) => {
    const query = 'SELECT * FROM tarea';
    try {
        const [result] = await pool.execute(query);  // Usando async/await
        res.json(result);
    } catch (err) {
        console.error('Database query error:', err);
        res.status(500).send('Error retrieving tasks');
    }
});



// Endpoint para obtener proyectos con detalles completos
app.get('/proyectos-completos', (req, res) => {
    const query = `
        SELECT
            p.idProyecto,
            p.nombre AS nombreProyecto,
            p.descripcion,
            p.fechaInicio,
            p.fechaFin,
            p.fechaReal,
            p.porcentajeAvance,
            p.fechaCreacion,
            p.fechaModificacion,
            u.idUsuario,
            u.nombre AS nombreUsuario,
            u.correo AS correoUsuario,
            a.idArea,
            a.nombre AS nombreArea,
            e.idEstado,
            e.descripcion AS descripcionEstado
        FROM
            PROYECTO p
        JOIN
            USUARIO u ON p.idUsuario = u.idUsuario
        JOIN
            AREA a ON p.idArea = a.idArea
        JOIN
            ESTADO e ON p.idEstado = e.idEstado;
    `;

    pool.execute(query, (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send('Error retrieving project data');
        }
        res.json(result);
    });
});

// Endpoint para obtener áreas con sus proyectos
app.get('/areas-proyectos', (req, res) => {
    const query = `
        SELECT
            a.idArea,
            a.nombre AS nombreArea,
            a.descripcion AS descripcionArea,
            p.idProyecto,
            p.nombre AS nombreProyecto,
            p.descripcion AS descripcionProyecto,
            p.fechaInicio,
            p.fechaFin,
	        p.fechaReal,
	        p.porcentajeAvance
        FROM
            AREA a
        LEFT JOIN
            PROYECTO p ON a.idArea = p.idArea;
    `;

    pool.execute(query, (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send('Error retrieving areas with projects');
        }
        res.json(result);
    });
});


// Endpoint para eliminar todas las tareas de un proyecto específico
app.delete('/proyecto/:id/tareas', (req, res) => {
    const idProyecto = req.params.id;
    const query = `DELETE FROM TAREA WHERE idProyecto = ?`;

    executeQueryWithRetry(query, [idProyecto])
        .then(result => {
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'No tasks found for this project' });
            }
            res.status(200).json({ success: true, message: 'Tasks deleted successfully' });
        })
        .catch(err => {
            console.error('Database query error:', err);
            res.status(500).json({ success: false, message: 'Error deleting tasks' });
        });
});


function executeQueryWithRetry(query, params, retryCount = 15) {
    return new Promise((resolve, reject) => {
        function attemptQuery(remainingRetries) {
            pool.execute(query, params, (err, result) => {
                if (err) {
                    if (err.code === 'ER_LOCK_DEADLOCK' && remainingRetries > 0) {
                        console.warn('Deadlock detected. Retrying transaction...');
                        setTimeout(() => attemptQuery(remainingRetries - 1), 100); // Reintenta después de un breve retraso
                    } else {
                        console.error('Database query error:', err);
                        reject(err);
                    }
                } else {
                    resolve(result);
                }
            });
        }
        attemptQuery(retryCount);
    });
}


// Endpoint para obtener todas las tareas de un proyecto específico con JOIN a la tabla de estado
app.get('/proyecto/:id/tareas', (req, res) => {
    const idProyecto = req.params.id;
    const query = `SELECT t.*, e.descripcion AS descripcionEstado FROM TAREA t JOIN  ESTADO e ON t.idEstado = e.idEstado WHERE idProyecto = ?`;

    pool.execute(query, [idProyecto], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send('Error fetching tasks');
        }
        res.status(200).json(results.length > 0 ? results : []);
    });
});


// Endpoint para agregar una nueva tarea a un proyecto específico
app.post('/proyecto/:id/tareas', async (req, res) => {
    const idProyecto = req.params.id;
    const tasks = Array.isArray(req.body) ? req.body : [req.body]; // Aseguramos que siempre sea un array

    // Validación de datos requeridos
    if (tasks.some(task => !task.nombre || !task.idEstado)) {
        return res.status(400).json({ success: false, message: 'Invalid task data' });
    }

    const queryInsert = `
      INSERT INTO TAREA (
        nombre, descripcion, porcentajeAvance, fechaCompromiso, 
        fechaInicio, fechaFin, idEstado, idProyecto
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const querySelect = `
      SELECT AVG(porcentajeAvance) AS promedioAvance
      FROM TAREA
      WHERE idProyecto = ?
    `;

    const queryUpdate = `
      UPDATE PROYECTO
      SET porcentajeAvance = ?
      WHERE idProyecto = ?
    `;

    // Preparar datos con los parámetros correctos
    const taskParams = tasks.map(task => [
        task.nombre,
        task.descripcion || null,
        task.porcentajeAvance || 0.00,
        task.fechaCompromiso,
        task.fechaInicio,
        task.fechaFin || null,
        task.idEstado,
        idProyecto,
    ]);

    try {
        // Procesar las tareas en lotes de 10
        const batchSize = 10;
        for (let i = 0; i < taskParams.length; i += batchSize) {
            const batch = taskParams.slice(i, i + batchSize);
            await Promise.all(batch.map(params => executeQueryWithRetry(queryInsert, params)));
        }

        // Calcular el promedio del porcentaje de avance
        const [rows] = await pool.promise().execute(querySelect, [idProyecto]);
        const promedioAvance = Math.round(rows[0]?.promedioAvance || 0); // Redondear al número entero más cercano

        // Actualizar el proyecto con el nuevo promedio
        await pool.promise().execute(queryUpdate, [promedioAvance, idProyecto]);

        // Responder con éxito y el nuevo porcentaje de avance
        res.status(201).json({
            success: true,
            message: 'Tasks added and project progress updated successfully',
            nuevoPorcentajeAvance: promedioAvance, // Devolver el nuevo porcentaje actualizado
        });
    } catch (err) {
        console.error('Error processing tasks or updating project progress:', err);
        res.status(500).json({ success: false, message: 'Error processing tasks or updating project progress' });
    }
});

// Endpoint para obtener los detalles de un proyecto específico, incluyendo el nombre del área
app.get('/proyecto/:id', (req, res) => {
    const idProyecto = req.params.id;
    const query = `
        SELECT 
            p.idProyecto,
            p.nombre AS nombreProyecto,
            p.descripcion,
            p.fechaInicio,
            p.fechaFin,
            p.fechaReal,
            p.porcentajeAvance,
            p.fechaCreacion,
            p.fechaModificacion,
            p.idUsuario,
            p.idArea,
            a.nombre AS nombreArea,
            p.idEstado
        FROM PROYECTO p
        JOIN AREA a ON p.idArea = a.idArea
        WHERE p.idProyecto = ?`;

    pool.execute(query, [idProyecto], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send('Error fetching project details');
        }
        if (results.length === 0) {
            return res.status(404).send('Project not found');
        }
        res.status(200).json(results); // Devuelve solo el proyecto encontrado
    });
});

// Limitar solicitudes solo en la ruta /recuperar
const recuperarLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Ventana de tiempo de 15 minutos
    max: 5, // Solo 5 solicitudes permitidas por IP en este endpoint
    message: {
        message: 'Has superado el límite de intentos para recuperar tu contraseña. Inténtalo más tarde.',
    },
});

// Enviar correo con código de recuperación
app.post('/recuperar', recuperarLimiter, (req, res) => {
    const { correo } = req.body;

    // Validar que el correo esté presente en la solicitud
    if (!correo) {
        return res.status(400).send({ message: 'Correo es obligatorio' });
    }

    // Query para validar si el correo existe en la tabla USUARIO
    const validateQuery = `SELECT COUNT(*) AS count FROM USUARIO WHERE correo = ?`;

    pool.execute(validateQuery, [correo], (err, results) => {
        if (err) {
            console.error('Error al validar el correo:', err);
            return res.status(500).send({ message: 'Error al validar el correo' });
        }

        const count = results[0].count;

        // Verificar si el correo no existe en la base de datos
        if (count === 0) {
            console.log(`Correo no encontrado: ${correo}`);
            return res.status(404).send({ message: 'Correo no encontrado en la base de datos' });
        }

        // Generar código de recuperación si el correo es válido
        const codigo = Math.floor(100000 + Math.random() * 900000); // Código de 6 dígitos
        const insertQuery = `
            INSERT INTO CODIGOS_RECUPERACION (correo, codigo, fechaCreacion)
            VALUES (?, ?, NOW());
        `;

        pool.execute(insertQuery, [correo, codigo], (err, result) => {
            if (err) {
                console.error('Error al guardar el código en la base de datos:', err);
                return res.status(500).send({ message: 'Error al generar el código' });
            }

            // Configuración de Nodemailer
            const transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });

            // Configuración del correo
            const mailOptions = {
                from: '"PortalGRC" <noreply@inevada.cl>',
                to: correo,
                subject: 'Código de Recuperación de Contraseña',
                text: `Tu código de recuperación es: ${codigo}`,
                html: `<p>Tu código de recuperación es: <b>${codigo}</b></p>`,
            };

            // Enviar el correo
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error al enviar el correo:', error);
                    return res.status(500).send({ message: 'Error al enviar el correo' });
                }
                console.log('Correo enviado:', info.response);
                res.status(200).send({ message: 'Código enviado correctamente' });
            });
        });
    });
});


// Limitar solicitudes solo en la ruta /verificar
const verificarLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Ventana de tiempo de 15 minutos
    max: 10, // Hasta 10 solicitudes permitidas por IP en este endpoint
    message: {
        message: 'Demasiados intentos de verificación. Por favor, inténtalo más tarde.',
    },
});

// Verificar el código
app.post('/verificar', verificarLimiter, (req, res) => {
    const { correo, codigo } = req.body;

    if (!correo || !codigo) {
        return res.status(400).send({ message: 'Correo y código son obligatorios' });
    }

    // Verificar si el código es válido
    const queryVerificar = `
        SELECT * FROM CODIGOS_RECUPERACION
        WHERE correo = ? AND codigo = ? AND TIMESTAMPDIFF(MINUTE, fechaCreacion, NOW()) <= 15;
    `;

    pool.execute(queryVerificar, [correo, codigo], (err, results) => {
        if (err) {
            console.error('Error al verificar el código:', err);
            return res.status(500).send({ message: 'Error al verificar el código' });
        }

        if (results.length === 0) {
            return res.status(400).send({ message: 'Código inválido o expirado' });
        }

        // Si el código es válido, responder éxito
        res.status(200).send({ message: 'Código verificado correctamente' });
    });
});

// Actualizar la contraseña
app.post('/actualizarContrasena', (req, res) => {
    const { correo, nuevaContrasena } = req.body;

    if (!correo || !nuevaContrasena) {
        return res.status(400).send({ message: 'Correo y nueva contraseña son obligatorios' });
    }

    // Encriptar la nueva contraseña usando bcrypt
    const bcrypt = require('bcrypt');
    bcrypt.hash(nuevaContrasena, 10, (err, hash) => {
        if (err) {
            console.error('Error al encriptar la contraseña:', err);
            return res.status(500).send({ message: 'Error al restablecer la contraseña' });
        }

        // Actualizar la contraseña en la base de datos
        const queryActualizar = `
            UPDATE USUARIO SET passHash = ? WHERE correo = ?;
        `;
        pool.execute(queryActualizar, [hash, correo], (err) => {
            if (err) {
                console.error('Error al actualizar la contraseña:', err);
                return res.status(500).send({ message: 'Error al restablecer la contraseña' });
            }

            res.status(200).send({ message: 'Contraseña restablecida correctamente' });
        });
    });
});


app.put('/usuarios/actualizarPerfilCompleto', (req, res) => {
    const { idUsuario, nombre, correo, contrasenaActual, nuevaContrasena } = req.body;

    if (!idUsuario || !nombre || !correo || !contrasenaActual) {
        return res.status(400).send({ message: 'Todos los campos son obligatorios' });
    }

    const queryObtenerUsuario = `SELECT passHash FROM USUARIO WHERE idUsuario = ?`;
    pool.execute(queryObtenerUsuario, [idUsuario], (err, results) => {
        if (err) {
            console.error('Error al consultar el usuario:', err);
            return res.status(500).send({ message: 'Error al consultar el usuario' });
        }

        if (results.length === 0) {
            return res.status(404).send({ message: 'Usuario no encontrado' });
        }

        const passHash = results[0].passHash;

        bcrypt.compare(contrasenaActual, passHash, (err, match) => {
            if (err || !match) {
                return res.status(401).send({ message: 'La contraseña actual es incorrecta' });
            }

            const tareas = [
                new Promise((resolve, reject) => {
                    const queryActualizarPerfil = `UPDATE USUARIO SET nombre = ?, correo = ? WHERE idUsuario = ?`;
                    pool.execute(queryActualizarPerfil, [nombre, correo, idUsuario], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                }),
            ];

            // Si hay una nueva contraseña, agregar la tarea para actualizarla
            if (nuevaContrasena) {
                tareas.push(
                    new Promise((resolve, reject) => {
                        bcrypt.hash(nuevaContrasena, 10, (err, hash) => {
                            if (err) reject(err);
                            else {
                                const queryActualizarContrasena = `UPDATE USUARIO SET passHash = ? WHERE idUsuario = ?`;
                                pool.execute(queryActualizarContrasena, [hash, idUsuario], (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                });
                            }
                        });
                    })
                );
            }

            Promise.all(tareas)
                .then(() => res.status(200).send({ message: 'Perfil actualizado correctamente' }))
                .catch((err) => {
                    console.error('Error al actualizar el perfil:', err);
                    res.status(500).send({ message: 'Error al actualizar el perfil' });
                });
        });
    });
});

app.get('/usuarios/detalles', (req, res) => {
    const query = `
        SELECT 
            u.idUsuario, 
            u.nombre,
            u.passHash,
            u.correo,
            u.habilitado,
            u.idRol,
            r.descripcion AS descripcionRol,
            u.idArea,
            a.nombre AS nombreArea
        FROM USUARIO u
        JOIN AREA a ON u.idArea = a.idArea
        JOIN ROL r ON u.idRol = r.idRol
    `;

    pool.execute(query, (err, results) => {
        if (err) {
            console.error('Error al ejecutar la consulta:', err);
            return res.status(500).json({ error: 'Error al obtener los detalles de los usuarios' });
        }

        if (!Array.isArray(results) || results.length === 0) {
            return res.status(404).json({ error: 'No se encontraron usuarios' });
        }

        res.status(200).json(results);
    });
});


app.post('/usuarios', (req, res) => {
    const { nombre, correo, password, idRol, idArea, habilitado } = req.body;
    console.log('Valor recibido para habilitado:', habilitado);


    // Validación básica
    if (!nombre || !correo || !password || !idRol || !idArea) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Validación adicional para idRol e idArea
    if (isNaN(idRol) || isNaN(idArea)) {
        return res.status(400).json({ error: 'idRol e idArea deben ser números válidos' });
    }

    // Conversión explícita de habilitado
    const habilitadoBinario = habilitado === 1 || habilitado === true ? 1 : 0;

    // Verificar si ya existe un usuario con el mismo correo
    const verificarCorreoQuery = `SELECT * FROM USUARIO WHERE correo = ?`;

    pool.execute(verificarCorreoQuery, [correo], (error, results) => {
        if (error) {
            console.error('Error al verificar el correo:', error);
            return res.status(500).json({ error: 'Error al procesar la solicitud' });
        }

        // Si el correo ya existe
        if (results.length > 0) {
            return res.status(409).json({ error: 'El correo ya está registrado' });
        }

        // Encriptar la contraseña
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                console.error('Error al encriptar la contraseña:', err);
                return res.status(500).json({ error: 'Error al procesar la solicitud' });
            }

            const query = `
                INSERT INTO USUARIO (nombre, correo, passHash, idRol, idArea, habilitado) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            pool.execute(query, [nombre, correo, hash, idRol, idArea, habilitadoBinario], (error, results) => {
                if (error) {
                    console.error('Error al insertar el usuario:', error);
                    return res.status(500).json({ error: 'Error al crear el usuario' });
                }

                res.status(201).json({ 
                    message: 'Usuario creado con éxito', 
                    usuario: { nombre, correo, idRol, idArea }
                });
            });
        });
    });
});


// Endpoint para modificar un usuario
app.put('/modificarUsuario', (req, res) => {
    const { idUsuario, nombre, correo, idRol, idArea, habilitado } = req.body;

    // Validar que todos los campos obligatorios estén presentes
    if (!idUsuario || !nombre || !correo || idRol === undefined || !idArea || habilitado === undefined) {
        return res.status(400).send({ message: 'Todos los campos son obligatorios' });
    }

    // Actualizar los datos del usuario en la base de datos
    const queryActualizar = `
        UPDATE USUARIO 
        SET nombre = ?, correo = ?, idRol = ?, idArea = ?, habilitado = ? 
        WHERE idUsuario = ?;
    `;

    // Ejecutar la consulta con los datos proporcionados
    pool.execute(queryActualizar, [nombre, correo, idRol, idArea, habilitado, idUsuario], (err, results) => {
        if (err) {
            console.error('Error al modificar el usuario:', err);
            return res.status(500).send({ message: 'Error al modificar el usuario' });
        }

        // Comprobar si se actualizó algún registro
        if (results.affectedRows === 0) {
            return res.status(404).send({ message: 'Usuario no encontrado' });
        }

        // Solo enviar un código de éxito sin mensaje
        return res.status(200).send();  // Sin mensaje en el cuerpo de la respuesta
    });
});


app.get('/roles', (req, res) => {
    const query = 'SELECT idRol, descripcion FROM ROL';

    pool.execute(query, (err, results) => {
        if (err) {
            console.error('Error al obtener roles:', err);
            return res.status(500).json({ error: 'Error al obtener los roles' });
        }

        res.status(200).json(results);
    });
});

app.get('/areas', (req, res) => {
    const query = 'SELECT idArea, nombre FROM AREA';

    pool.execute(query, (err, results) => {
        if (err) {
            console.error('Error al obtener áreas:', err);
            return res.status(500).json({ error: 'Error al obtener las áreas' });
        }

        res.status(200).json(results);
    });
});

// Endpoint para eliminar un proyecto por ID 
app.delete('/proyectos/:idProyecto', (req, res) => {
    const idProyecto = req.params.idProyecto;
    console.log(`Iniciando eliminación del proyecto: ${idProyecto}`);

    // Primer paso: Verificar que el proyecto existe
    pool.query(
        'SELECT * FROM PROYECTO WHERE idProyecto = ?',
        [idProyecto],
        (err, resultados) => {
            if (err) {
                console.error('Error al consultar el proyecto:', err);
                return res.status(500).send({ message: 'Error interno del servidor' });
            }

            if (resultados.length === 0) {
                console.log(`No se encontró el proyecto ${idProyecto}`);
                return res.status(404).send({ message: 'Proyecto no encontrado' });
            }

            // Segundo paso: Obtener todos los archivos asociados al proyecto
            pool.query(
                'SELECT idarchivo, nombre_unico FROM archivos_proyecto WHERE idproyecto = ?',
                [idProyecto],
                (err, archivos) => {
                    if (err) {
                        console.error('Error al consultar archivos del proyecto:', err);
                        return res.status(500).send({ message: 'Error al consultar archivos del proyecto' });
                    }

                    // Función para eliminar un archivo
                    const eliminarArchivo = (archivo, callback) => {
                        const rutaArchivo = path.join(RUTA_BASE_ARCHIVOS, `proyecto_${idProyecto}`, archivo.nombre_unico);
                        console.log(`Intentando eliminar archivo: ${rutaArchivo}`);

                        fs.unlink(rutaArchivo, (err) => {
                            if (err && err.code !== 'ENOENT') {
                                console.error(`Error al eliminar archivo ${rutaArchivo}:`, err);
                            }
                            callback();
                        });
                    };

                    // Tercer paso: Eliminar todos los archivos
                    let archivosEliminados = 0;
                    const totalArchivos = archivos.length;

                    const eliminarCarpetaYProyecto = () => {
                        // Intentar eliminar la carpeta del proyecto
                        const rutaCarpetaProyecto = path.join(RUTA_BASE_ARCHIVOS, `proyecto_${idProyecto}`);
                        fs.rmdir(rutaCarpetaProyecto, (err) => {
                            if (err && err.code !== 'ENOENT') {
                                console.error('Error al eliminar carpeta del proyecto:', err);
                            }

                            // Cuarto paso: Eliminar registros de archivos de la base de datos
                            pool.query(
                                'DELETE FROM archivos_proyecto WHERE idproyecto = ?',
                                [idProyecto],
                                (err) => {
                                    if (err) {
                                        console.error('Error al eliminar registros de archivos:', err);
                                        return res.status(500).send({ message: 'Error al eliminar registros de archivos' });
                                    }

                                    // Quinto paso: Eliminar el proyecto
                                    pool.query(
                                        'DELETE FROM PROYECTO WHERE idProyecto = ?',
                                        [idProyecto],
                                        (err) => {
                                            if (err) {
                                                console.error('Error al eliminar el proyecto:', err);
                                                return res.status(500).send({ message: 'Error al eliminar el proyecto' });
                                            }

                                            console.log(`Proyecto ${idProyecto} eliminado exitosamente`);
                                            res.status(200).send({ message: 'Proyecto eliminado exitosamente' });
                                        }
                                    );
                                }
                            );
                        });
                    };

                    if (totalArchivos === 0) {
                        // Si no hay archivos, proceder directamente a eliminar la carpeta y el proyecto
                        eliminarCarpetaYProyecto();
                    } else {
                        // Eliminar cada archivo
                        archivos.forEach(archivo => {
                            eliminarArchivo(archivo, () => {
                                archivosEliminados++;
                                if (archivosEliminados === totalArchivos) {
                                    eliminarCarpetaYProyecto();
                                }
                            });
                        });
                    }
                }
            );
        }
    );
});

// Endpoint de inicio de sesión
app.post('/login', (req, res) => {
    const { correo, password, deviceInfo } = req.body;
    const query = `SELECT u.*, a.nombre AS nombreArea 
                   FROM USUARIO u 
                   JOIN AREA a ON u.idArea = a.idArea 
                   WHERE u.correo = ?`;

    pool.execute(query, [correo], (err, results) => {
        if (err) {
            logger.error(`Error en base de datos al iniciar sesión: ${err.message}`, { timestamp: new Date() });
            return res.status(500).json({ message: 'Error en la base de datos' });
        }

        if (results.length === 0) {
            logger.warn(`Intento de inicio de sesión fallido para el correo: ${correo}`, { timestamp: new Date() });
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const usuario = results[0];
        if (!usuario.habilitado) {
            logger.warn(`Usuario no habilitado intentó iniciar sesión: ${correo}`, { timestamp: new Date() });
            return res.status(403).json({ message: 'Usuario no habilitado. Contacte al administrador.' });
        }

        bcrypt.compare(password, usuario.passHash, (err, match) => {
            if (err || !match) {
                logger.warn(`Contraseña incorrecta para el correo: ${correo}`, { timestamp: new Date() });
                return res.status(401).json({ message: 'Credenciales inválidas' });
            }
        
            const sessionToken = sessionManager.createSession(
                usuario.idUsuario,
                deviceInfo || 'Unknown Device'
            );
        
            const token = jwt.sign(
                {
                    id: usuario.idUsuario,
                    nombre: usuario.nombre,
                    idRol: usuario.idRol,
                    idArea: usuario.idArea,
                    nombreArea: usuario.nombreArea,
                    correo: usuario.correo,
                },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
        
            // Log con el nombre, correo y dispositivo
            logger.info(`Inicio de sesión exitoso para el usuario`, {
                userName: usuario.nombre,
                userEmail: usuario.correo,
                deviceInfo: deviceInfo || 'Unknown Device'
            });
        
            res.status(200).json({
                message: 'Inicio de sesión exitoso',
                token,
                sessionToken,
                usuario: {
                    id: usuario.idUsuario,
                    nombre: usuario.nombre,
                    idRol: usuario.idRol,
                    idArea: usuario.idArea,
                    nombreArea: usuario.nombreArea,
                    correo: usuario.correo,
                },
            });
        });
    });
});


// Endpoint para cerrar sesión
app.post('/logout', authenticateToken, (req, res) => {
    const sessionToken = req.headers['x-session-token'];

    if (sessionToken) {
        sessionManager.closeSession(sessionToken);
        res.json({ message: 'Sesión cerrada exitosamente' });
    } else {
        res.status(400).json({ message: 'Token de sesión no proporcionado' });
    }
});

// Endpoint para listar sesiones activas
app.get('/active-sessions', authenticateToken, (req, res) => {
    const activeSessions = sessionManager.getUserSessions(req.user.id);
    res.json(activeSessions);
});

// Inicio del servidor en el puerto definido en variables de entorno
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    
    
});
