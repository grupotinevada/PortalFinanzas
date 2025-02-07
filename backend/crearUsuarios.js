const mysql = require('mysql2');
const bcrypt = require('bcrypt');

require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST || '192.168.195.89',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'NEVada--3621',
    database: process.env.DB_NAME || 'panel_finanzas_dba'
});


// Datos del usuario de prueba
const nombre = 'Ignacio Salazar'; //nombre 
const correo = 'isalazar.practica@inevada.cl'; //correo
const password = 'Nacho123'; //pass
const idRol = 2; // o 'usuario' según el rol que desees asignar    1-Admin, 2-Editor 3-Viewer
const idArea = 1;   // 1-Cumplimiento 2-Finanzas 3-Contraloria 4-CISO 

// Encriptar la contraseña y luego insertar en la base de datos
bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error('Error hashing password:', err);
        return;
    }

    const query = 'INSERT INTO USUARIO (nombre, correo, passHash, idRol, idArea) VALUES (?, ?, ?, ?,?)';
    db.execute(query, [nombre, correo, hash, idRol, idArea], (err, results) => {
        if (err) {
            console.error('Error inserting user:', err);
            return;
        }
        console.log('Usuario creado con éxito:', results);
        db.end();
    });
});
