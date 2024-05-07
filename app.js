//Invocamos express
const express = require('express');
const rateLimit = require('express-rate-limit');//Para proteger ataques ddos o limitar la cantidad de solicitudes
const app = express();
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');
const puppeteer = require('puppeteer');
const {authPage,authSub} = require('./middleware');
const nodemailer = require('nodemailer');

//seteamos urlencoded para capturar los datos del formulario
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//Invocar a dotenv
const dotenv = require('dotenv');
dotenv.config({path: './env/.env'})

//Setear el directorio public
app.use('/resources', express.static('public'));
app.use('/resources', express.static(__dirname + '/public'));

///Establecer el motor de plantillas
app.set('view engine', 'ejs');

//6.- invocar a bcrypt
const bcryptjs = require('bcryptjs');

//7.- Var de sesion
const session = require('express-session');
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized:true
}));

//Invocar a rate-limit para proteger contra ataques de muchas solicitudes al mismo tiempo
 const limiter = rateLimit({
 windowMs: 15 * 60 * 1000, // 15 minutes
 max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

//8.- Invocar conexion a DB
const connection = require('./database/db');
const { assign } = require('nodemailer/lib/shared');
console.log(__dirname);

//FUNCION PARA ENVIAR NOTIFICACIONES POR EMAIL
enviarMail = async(opcion,correoObjetivo)=>{
    const config = {
        host : 'smtp.gmail.com',
        port : 587,
        auth : {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    }

    let textoCorreo;
    let textAsunto;
    if (opcion === 1) {
        textAsunto = 'Solicitud de soporte creada'
        textoCorreo = 'Ha realizado una solicitud de soporte técnico al sistema CIC Assistance, puede checar el estatus de su solicitud en su historial de solicitudes a traves de la misma página donde realizó la solicitud';
    } else if (opcion === 2) {
        textAsunto = 'Actualización estatus en solicitud'
        textoCorreo = 'Ha cambiado el estatus de tu solicitud de soporte técnico, revisa tu portal cic assistance para obtener mas información';
    } else if(opcion === 3){
        textAsunto = 'Vale creado'
        textoCorreo = 'Se ha creado el vale a su solicitud de soporte técnico puede descargarlo a traves del portal cic assistance en su navegador web';
    }else if(opcion === 4){
        textAsunto = 'Dictamen sobre solicitud'
        textoCorreo = 'Se ha determinado el dictamen a su solicitud de soporte técnico, puede revisar mas detalles del dictamen en su portal cic assistance y puede pasar por su equipo al Centro de Computo';
    }else if(opcion === 5){
        textAsunto = 'Solicitud Asignada'
        textoCorreo = 'Se le ha asignado una nueva solicitud de soporte técnico porfavor entre a su portal CIC Assitance para poder ver mas información';
   
    }
    const mensaje = {
        from: 'cic.assistance2024@gmail.com',
        to: correoObjetivo,
        subject: textAsunto,
        text: textoCorreo
    }
    const transport = nodemailer.createTransport(config);
    const info = await transport.sendMail(mensaje);
}



//9.- Estableciendo las rutas
app.get('/login', (req, res) => {
    res.render('login');
});


app.get('/acercaDe', (req, res) => {
    res.render('acerca_de');
});

app.get('/registerP',authPage('Admin'), (req, res) => {
    res.render('register');
});
app.get('/registerT',authPage('Admin'), (req, res) => {
    res.render('registerT');
});
app.get('/generarDictamen',authPage('Admin'), (req, res) => {
    res.render('generarDictamen');
});
app.get('/alerta', (req, res) => {
    res.render('alerta');
});
// Ruta GET para renderizar la vista de estadísticas ESTADISTICAS
app.get('/estadisticas', async (req, res) => {
    const { tipo, desdeFecha, hastaFecha } = req.session.estadisticas || {};
    try {
        // Realizar la consulta SQL para obtener las solicitudes con la fecha desdeFecha
        const fecha = desdeFecha
        const fechaFinal = hastaFecha
        console.log(fecha);
        const folios = await query(`SELECT * FROM ${tipo} WHERE Fecha BETWEEN '${fecha}' AND '${fechaFinal}'`);
        const conteoEstados = await query(`SELECT Estado AS estado, COUNT(*) AS total FROM ${tipo} WHERE Fecha BETWEEN '${fecha}' AND '${fechaFinal}' GROUP BY Estado`);

        const usuariosPorSoli = await query(`SELECT u.Nombre AS NombreUsuario, COUNT(a.FolioSolicitud) AS NumeroSolicitudes
                                                FROM usuarios u
                                                JOIN solicitudes s ON u.IdUsuario = s.IdUsuario
                                                JOIN ${tipo} a ON s.FolioSolicitud = a.FolioSolicitud
                                                WHERE s.Fecha BETWEEN '${fecha}' AND '${fechaFinal}'
                                                GROUP BY u.NombreUsuario`);
        const asignacionesTecnicos = await query(`SELECT t.Nombre AS Tecnico, COUNT(a.IdSolicitud) AS NumeroSolicitudesTecnico
                                                FROM tecnicos t
                                                JOIN asignaciones a ON t.IdTecnico = a.IdTecnico 
                                                JOIN solicitudes s ON s.FolioSolicitud = a.IdSolicitud WHERE s.Fecha BETWEEN '${fecha}' AND '${fechaFinal}'
                                                GROUP BY t.Nombre`);
        const solucionesDictamen = await query(`SELECT d.DictamenFinal AS DictamenFinal, COUNT(a.FolioSolicitud) AS NumeroSolicitudesDictamen
                                                FROM dictamenes d
                                                JOIN ${tipo} a ON d.FolioSolicitud = a.FolioSolicitud
                                                WHERE d.Fecha BETWEEN '${fecha}' AND '${fechaFinal}'
                                                GROUP BY d.DictamenFinal`);
        const solicitudesSinDictamen = await query(`SELECT COUNT(s.FolioSolicitud) AS NumSolicitudesCerradasSinDictamen
                                                        FROM solicitudes s
                                                        LEFT JOIN dictamenes d ON s.FolioSolicitud = d.FolioSolicitud
                                                        JOIN vales v ON s.FolioSolicitud = v.FolioSolicitud
                                                        WHERE s.Estado = 'Cerrado' AND d.FolioSolicitud IS NULL 
                                                        AND s.Fecha BETWEEN '${fecha}' AND '${fechaFinal}'`);
        const solicitudesConDictamen = await query(`SELECT COUNT(s.FolioSolicitud) AS NumSolicitudesCerradasConDictamenYVales
                                                    FROM solicitudes s
                                                    JOIN dictamenes d ON s.FolioSolicitud = d.FolioSolicitud
                                                    JOIN vales v ON s.FolioSolicitud = v.FolioSolicitud
                                                    WHERE s.Estado = 'Cerrado'
                                                    AND s.Fecha BETWEEN '${fecha}' AND '${fechaFinal}'`);
        console.log(folios);
        console.log(conteoEstados);
        console.log(usuariosPorSoli);
        console.log(asignacionesTecnicos);
        console.log(solucionesDictamen);
        console.log(solicitudesSinDictamen);
        console.log(solicitudesConDictamen);
        // Renderizar la vista de estadísticas y pasar los datos
        res.render('estadisticas', { tipo, desdeFecha, hastaFecha, objetos: folios, conteo:conteoEstados, usuariosPorSoli:usuariosPorSoli, asignacionesTecnicos:asignacionesTecnicos, solucionesDictamen:solucionesDictamen, solicitudesSinDictamen:solicitudesSinDictamen, solicitudesConDictamen:solicitudesConDictamen});
    } catch (error) {
        console.error('Error al ejecutar la consulta SQL:', error);
        // Manejar el error adecuadamente, por ejemplo, renderizando una página de error
        res.render('error', { message: 'Error al obtener las solicitudes', error });
    }
});

app.get('/reportes', async (req, res) => {
    const { tipo, desdeFecha, hastaFecha, titulo, nombre, oficio, exp, area } = req.session.estadisticas || {};
    try {
        // Realizar la consulta SQL para obtener las solicitudes con la fecha desdeFecha
        const fecha = desdeFecha
        const fechaFinal = hastaFecha
        console.log(fecha);
        const queryParaReportes = await query(`SELECT * FROM ${tipo} WHERE Fecha BETWEEN '${fecha}' AND '${fechaFinal}'`)
        console.log("-----------------aaaaaaaaaaaaaaaaaaa--------------------");
        console.log(queryParaReportes)
        // Renderizar la vista de estadísticas y pasar los datos
        res.render('reportes', { tipo, desdeFecha, hastaFecha, objetos: queryParaReportes, titulo, nombre, oficio, exp, area });
    } catch (error) {
        console.error('Error al ejecutar la consulta SQL:', error);
        // Manejar el error adecuadamente, por ejemplo, renderizando una página de error
        res.render('error', { message: 'Error al obtener las solicitudes', error });
    }
});

//Panel de técnicos
app.get('/panelTecnicos', authPage(["Tecnico", "Admin"]), async (req, res) => {
    if (!req.session.loggedin) {
        // Si no ha iniciado sesión, redirigir al login con un mensaje de advertencia
        return res.render('login', {
            alert: true,
            alertTitle: "Advertencia",
            alertMessage: "Debes iniciar sesión antes de llenar el formulario.",
            alertIcon: "warning",
            showConfirmButton: true,
            timer: 3000,
            ruta: 'login'
        });
    }

    try {
        const usuario = req.session.idUsuario;
        const asignaciones = await query(`SELECT DISTINCT s.FolioSolicitud,s.Fecha,s.Descripcion, v.Equipo,v.NoSerieEquipo,v.MarcaEquipo,v.ModeloEquipo, u.IdUsuario as IdUsuarioTecnico, us.IdUsuario as IdUsuarioSolicitante, us.Nombre as NombreSolicitante FROM solicitudes s JOIN vales v ON s.FolioSolicitud = v.FolioSolicitud JOIN asignaciones a ON s.FolioSolicitud = a.IdSolicitud JOIN tecnicos t ON a.IdTecnico = t.IdTecnico JOIN usuarios u ON t.IdUsuario = u.IdUsuario JOIN usuarios us ON s.IdUsuario = us.IdUsuario WHERE u.IdUsuario = ${usuario}`);
        
        res.render('panelTecnicos', {
            login: req.session.loggedin,
            name: req.session.name,
            asignaciones: asignaciones // Pasando las asignaciones como variable local
        });
    } catch (error) {
        console.error("Error al obtener las asignaciones:", error);
        res.status(500).send('Error interno del servidor');
    }
});

// Panel de usuarios
app.get('/panelUsuario',authPage(["Usuario","Admin","Tecnico"]), async (req, res) => {

    if (!req.session.loggedin) {
        // Si no ha iniciado sesión, redirigir al login con un mensaje de advertencia
        return res.render('login', {
            alert: true,
            alertTitle: "Advertencia",
            alertMessage: "Debes iniciar sesión antes de llenar el formulario.",
            alertIcon: "warning",
            showConfirmButton: true,
            timer: 3000,  
            ruta: 'login'
        });
    }
    const usuario = req.session.idUsuario;
    const edificios = await query('SELECT * FROM edificios');
    const historialUsuario = `
    SELECT s.FolioSolicitud AS FolioSolicitud, s.Fecha AS Fecha, s.Equipo AS Equipo, s.Estado AS Estado, CASE WHEN v.FolioSolicitud IS NOT NULL THEN 'Disponible' ELSE 'No Disponible' END AS Vale, CASE WHEN d.FolioSolicitud IS NOT NULL THEN 'Disponible' ELSE 'No Disponible' END AS Dictamen FROM solicitudes s LEFT JOIN vales v ON s.FolioSolicitud = v.FolioSolicitud LEFT JOIN dictamenes d ON s.FolioSolicitud = d.FolioSolicitud WHERE s.IdUsuario = ${usuario} ORDER BY FolioSolicitud DESC;
    `;
    const historial = await query(historialUsuario);
    console.log(edificios);
    res.render('panelUsuario', {
        edificios: edificios,
        login: req.session.loggedin,
        name: req.session.name,
        historial: historial,
    });
});


//Panel de administradores
app.get('/panelAdmin',authPage('Admin'), async (req, res) => {
    if (!req.session.loggedin) {
        // Si no ha iniciado sesión, redirigir al login con un mensaje de advertencia
        return res.render('login', {
            alert: true,
            alertTitle: "Advertencia",
            alertMessage: "Debes iniciar sesión antes de llenar el formulario.",
            alertIcon: "warning",
            showConfirmButton: true,
            timer: 3000,  
            ruta: 'login'
        });
    }
    const tecnicos = await query('SELECT * FROM tecnicos');
    const edificios = await query('SELECT * FROM edificios');
    const folios = await query('SELECT solicitudes.FolioSolicitud, solicitudes.IdUsuario, usuarios.Correo FROM solicitudes JOIN usuarios ON solicitudes.IdUsuario = usuarios.IdUsuario WHERE NOT EXISTS ( SELECT 1 FROM vales WHERE vales.FolioSolicitud = solicitudes.FolioSolicitud )');
    const usuarios = await query('SELECT * from usuarios');
    const usuariosTecnicos = await query('SELECT * FROM usuarios WHERE rol = "Tecnico" AND NOT EXISTS ( SELECT 1 FROM tecnicos WHERE tecnicos.IdUsuario = usuarios.IdUsuario )');
    const historialSoli = await query(`SELECT s.FolioSolicitud AS FolioSolicitud,s.Fecha AS Fecha,s.Hora AS Hora,u.Nombre AS NombreUsuario,s.Equipo AS Equipo,s.Estado AS Estado,CASE WHEN v.FolioSolicitud IS NOT NULL THEN 'Disponible' WHEN d.FolioSolicitud IS NOT NULL THEN 'No disponible' ELSE 'No Disponible' END AS Vale,CASE WHEN d.FolioSolicitud IS NOT NULL THEN 'Disponible' ELSE 'No Disponible' END AS Dictamen FROM solicitudes s LEFT JOIN vales v ON s.FolioSolicitud = v.FolioSolicitud LEFT JOIN dictamenes d ON s.FolioSolicitud = d.FolioSolicitud LEFT JOIN usuarios u ON s.IdUsuario = u.IdUsuario ORDER BY FolioSolicitud DESC; `);
    const soloAbiertas = await query('SELECT solicitudes.*, usuarios.Correo,usuarios.Nombre FROM solicitudes JOIN usuarios ON solicitudes.IdUsuario = usuarios.IdUsuario WHERE solicitudes.Estado = "Abierto"')
    const soliPendiente = await query('SELECT solicitudes.*, usuarios.Correo,usuarios.Nombre FROM solicitudes JOIN usuarios ON solicitudes.IdUsuario = usuarios.IdUsuario WHERE solicitudes.Estado = "Proceso"')
    const soliCerradas = await query('SELECT solicitudes.*, usuarios.Correo,usuarios.Nombre FROM solicitudes JOIN usuarios ON solicitudes.IdUsuario = usuarios.IdUsuario WHERE solicitudes.Estado =  "Cerrado"')
    const soliEspera = await query('SELECT solicitudes.*, usuarios.Correo,usuarios.Nombre FROM solicitudes JOIN usuarios ON solicitudes.IdUsuario = usuarios.IdUsuario WHERE solicitudes.Estado =  "Espera"')
    const soliAsignada = await query('SELECT solicitudes.*,u.Correo, u.Nombre as UsuarioNombre, tecnicos.Nombre, tecnicos.IdTecnico FROM solicitudes LEFT JOIN usuarios u ON solicitudes.IdUsuario = u.IdUsuario LEFT JOIN asignaciones ON solicitudes.IdAsignacion = asignaciones.IdAsignacion LEFT JOIN tecnicos ON asignaciones.IdTecnico = tecnicos.IdTecnico LEFT JOIN usuarios ON tecnicos.IdUsuario = usuarios.IdUsuario WHERE solicitudes.Estado = "Asignada"')
    const inforVales = await query("SELECT v.*, COALESCE(d.idDictamen, 'No existe') AS IdDictamen, u.Nombre AS NombreUsuario, COALESCE(a.Diagnostico, 'No disponible') AS Diagnostico, COALESCE(a.Solucion, 'No disponible') AS Solucion FROM vales v LEFT JOIN dictamenes d ON v.idVale = d.idVale LEFT JOIN solicitudes s ON v.folioSolicitud = s.FolioSolicitud LEFT JOIN usuarios u ON s.IdUsuario = u.IdUsuario LEFT JOIN asignaciones a ON s.FolioSolicitud = a.IdSolicitud ORDER BY v.idVale DESC;");
    
    res.render('panelAdmin', {
            login: req.session.loggedin,
            name: req.session.name,
            folioSolicitudes: folios,
            usuarios: usuarios,
            historial: historialSoli,
            edificios: edificios,
            abierto: soloAbiertas,
            pendiente:  soliPendiente,
            asignada: soliAsignada,
            espera: soliEspera,
            cerrado: soliCerradas,
            vales:inforVales,
            tecnicos: tecnicos,
            usuariosTecnicos: usuariosTecnicos,
            
        });
        console.log(historialSoli);
        console.log('jfnarjfnarfiarnfgnrafgnajkrnjarnjkfnkarjnfjanr');
        console.log(tecnicos);
});
function query(sql) {
    return new Promise((resolve, reject) => {
        connection.query(sql, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}



// BUSQUEDA DE FOLIO PARA RELLENO AUTOMATICO DE INFO EN DICTAMENES
app.get('/obtener-informacion-folio/:folioSolicitud',authPage('Admin'), (req, res) => {
    const folioSolicitud = req.params.folioSolicitud;
    req.session.folioSolicitudDictamen = folioSolicitud;
    const query = 'SELECT v.idVale, v.Equipo, v.NoSerieEquipo, v.MarcaEquipo, v.ModeloEquipo, u.Correo FROM vales v JOIN solicitudes s ON v.FolioSolicitud = s.FolioSolicitud JOIN usuarios u ON s.IdUsuario = u.IdUsuario WHERE v.FolioSolicitud = ?';

    connection.query(query, [folioSolicitud], (error, results) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Error al obtener la información del folio' });
        } else {
            if (results.length > 0) {
                // Si se encontraron resultados, devuelve la información como JSON al cliente
                console.log(results);
                req.session.correoDictamen = results[0].Correo;
                req.session.idValeDictamen = results[0].idVale;
                res.json(results[0]); // Suponiendo que solo necesitas el primer resultado
            } else {
                // Si no se encontraron resultados, puedes devolver un objeto vacío o un mensaje
                res.json({ message: 'No se encontró información para el folio proporcionado' });
            }
        }
    });
});

//estadisticas
app.post('/generarEstadisticas', (req, res, next) => {
    const { tipo, desdeFecha, hastaFecha } = req.body;
    req.session.estadisticas = { tipo, desdeFecha, hastaFecha };
    res.redirect('/estadisticas');
});

//reportes
app.post('/generarReportes', (req, res, next) => {
    const { tipo, desdeFecha, hastaFecha, titulo, nombre, oficio, exp, area } = req.body;
    req.session.estadisticas = { tipo, desdeFecha, hastaFecha, titulo, nombre, oficio, exp, area };
    res.redirect('/reportes');
});

// Define la ruta de la plantilla
const plantillaPath = path.join(__dirname, 'views', 'plantillaReportes.ejs');

// Ruta para generar el PDF
app.post('/generarPDF', async (req, res, next) => {
    try {
        // Obtén los datos de la sesión
        const { tipo, desdeFecha, hastaFecha, titulo, nombre, oficio, exp, area } = req.session.estadisticas;

        // Realizar la consulta SQL para obtener los datos de la base de datos
        const fecha = desdeFecha;
        const fechaFinal = hastaFecha;
        const queryParaReportes = await query(`SELECT * FROM ${tipo} WHERE Fecha BETWEEN '${fecha}' AND '${fechaFinal}'`);

        // Renderiza la plantilla con los datos de la sesión y los datos de la base de datos
        const htmlContent = await ejs.renderFile(plantillaPath, {
            tipo,
            desdeFecha,
            hastaFecha,
            titulo,
            nombre,
            oficio,
            exp,
            area,
            objetos: queryParaReportes
        });

        // Crea una instancia de Puppeteer
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Establece el tamaño de la página y carga el contenido HTML
        await page.setViewport({ width: 1200, height: 800 });
        await page.setContent(htmlContent);

        // Genera el PDF
        const pdf = await page.pdf({ format: 'A4', landscape: true });

        // Cierra el navegador de Puppeteer
        await browser.close();

        // Envía el PDF como respuesta
        res.contentType('application/pdf');
        res.send(pdf);
    } catch (error) {
        // Maneja cualquier error que ocurra
        console.error('Error al generar el PDF:', error);
        res.status(500).send('Error al generar el PDF');
    }
});

//10 Hacer registro
app.post('/registerP',authPage('Admin'),async(req, res) => {
    const user = req.body.username;
    const name = req.body.name;
    const pass = req.body.password;
    const rol = req.body.rol;
    const genero = req.body.genero;
    const correo  = req.body.correo;
    let passwordHaash = await bcryptjs.hash(pass, 8);
    
    connection.query('INSERT INTO usuarios SET ?', { NombreUsuario: user, Nombre: name, Contrasena: passwordHaash, Rol: rol, Genero: genero, Correo: correo }, (error, results) => {
        if (error) {
            console.log(error);
            if (error.code === 'ER_DUP_ENTRY') {
                res.render('alerta', {
                    alert: true,
                    alertTitle: "Error",
                    alertMessage: "¡Debe elegir otro nombre de usuario!",
                    alertIcon: "error",
                    showConfirmButton: false,
                    timer: 1500,
                    ruta: 'panelAdmin'
                });
            }
        } else {
            res.render('alerta', {
                alert: true,
                alertTitle: "Registro",
                alertMessage: "¡Registro Exitoso!",
                alertIcon: "success",
                showConfirmButton: false,
                timer: 1500,
                ruta: 'panelAdmin'
            });
        }
    });
})

app.post('/registerT',authPage('Admin'),async(req, res) => { ///SEPARAR EN OTRA PESTAÑA
    const nombre = req.body.nombreT;
    const apellidos = req.body.apellidos;
    const numeroT = req.body.noTrabajador;
    const email = req.body.email;
    const telefono = req.body.telef;
    const IdUsuario  = req.body.IdUsuario;
    const fecha = obtenerFechaActual();  
    connection.query('INSERT INTO tecnicos SET ?', { Nombre: nombre, Apellidos: apellidos, NoTrabajador: numeroT, Correo: email, Telefono: telefono, IdUsuario: IdUsuario,FechaRegistro: fecha }, (error, results) => {
        if (error) {
            console.log(error);
        }
             else {
            res.render('alerta', {
                alert: true,
                alertTitle: "Registro",
                alertMessage: "¡Registro Exitoso!",
                alertIcon: "success",
                showConfirmButton: false,
                timer: 1500,
                ruta: 'panelAdmin'
            });
        }
    });
    function obtenerFechaActual() {
        const fecha = new Date();
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        return `${año}-${mes}-${dia}`;
    }
})

//10 Hacer solicitud de soporte
app.post('/solicitud', async(req, res) => {
    const usuario = req.session.idUsuario; //
    const fecha = obtenerFechaActual();
    const hora = obtenerHoraActual();
    const telefono = req.body.telefono;
    const edificio = req.body.edificio;
    const ubicacion = req.body.area;
    let equipo = req.body.equiposSeleccionados || '';
    const descripcion = req.body.descripcion;
    const otroInput = req.body.otroInput || '';

    // Añadir el valor de otroInput a la cadena de equipos
    if (otroInput) {
        equipo += (equipo ? ':' : '') + otroInput;
    }
    console.log(otroInput);
    connection.query('INSERT INTO solicitudes SET ?', {IdUsuario:usuario,Fecha:fecha,Hora:hora,Telefono:telefono, IdEdificio:edificio, UbicacionFisica:ubicacion, Equipo:equipo, Descripcion: descripcion,IdAsignacion:0}, async(error, results)=> {
        if(error){
            console.log(error);
        }else{
            enviarMail(1,req.session.correoUser);
            const idSolicitud = results.insertId;
            console.log(idSolicitud);
            const logQuery = `INSERT INTO solicitudes_log (IdUsuario, FolioSolicitud, NuevoEstado, Fecha, Hora) VALUES (${req.session.idUsuario},${idSolicitud},"Abierto","${fecha}","${hora}")`;

            connection.query(logQuery, (error, cambioResults) => {
                if (error) {
                    console.log(error);
                } else {
                res.render('alerta',{ //pasar parametros para el mensaje AlertSweet
                alert: true,
                alertTitle: "Solicitud",
                alertMessage: "¡Solicitud de Soporte Técnico Enviada!",
                alertIcon: "success",
                showConfirmButton: false,
                timer: 1500,
                ruta: 'panelUsuario'
                })
            }
            })
        }
    })
    // Función para obtener la fecha y hora actual en formato MySQL
    function obtenerFechaActual() {
        const fecha = new Date();
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        return `${año}-${mes}-${dia}`;
    }
    function obtenerHoraActual() {
        const fecha = new Date();
        const horas = String(fecha.getHours()).padStart(2, '0');
        const minutos = String(fecha.getMinutes()).padStart(2, '0');
        const segundos = String(fecha.getSeconds()).padStart(2, '0');

        return `${horas}:${minutos}:${segundos}`;

    }
});

app.post('/solicitudAdmin',authPage('Admin'), async(req, res) => {
    const usuario = req.body.usuarios;
    const [idUsuario, correoUsuario] = usuario.split('|');
    const fecha = obtenerFechaActual();
    const hora = obtenerHoraActual();
    const telefono = req.body.telefono;
    const edificio = req.body.edificio;
    const ubicacion = req.body.area;
    let equipo = req.body.equiposSeleccionados || '';
    const descripcion = req.body.descripcion;
    const otroInput = req.body.otroInput || '';

    // Añadir el valor de otroInput a la cadena de equipos
    if (otroInput) {
        equipo += (equipo ? ':' : '') + otroInput;
    }
    connection.query('INSERT INTO solicitudes SET ?', {IdUsuario:idUsuario,Fecha:fecha,Hora:hora,Telefono:telefono, IdEdificio:edificio, UbicacionFisica:ubicacion, Equipo:equipo, Descripcion: descripcion,IdAsignacion:0}, async(error, results)=> {
        if(error){
            console.log(error);
        }else{
            enviarMail(1,correoUsuario);
            const idSolicitud = results.insertId;
            console.log(idSolicitud);
            const logQuery = `INSERT INTO solicitudes_log (IdUsuario, FolioSolicitud, NuevoEstado, Fecha, Hora) VALUES (${idUsuario},${idSolicitud},"Abierto","${fecha}","${hora}")`;

            connection.query(logQuery, (error, cambioResults) => {
                if (error) {
                    console.log(error);
                } else {
                res.render('alerta',{ //pasar parametros para el mensaje AlertSweet
                alert: true,
                alertTitle: "Solicitud",
                alertMessage: "¡Solicitud de Soporte Técnico Enviada!",
                alertIcon: "success",
                showConfirmButton: false,
                timer: 1500,
                ruta: 'panelAdmin'
                })
            }
            })
        }
    })
    // Función para obtener la fecha y hora actual en formato MySQL
    function obtenerFechaActual() {
        const fecha = new Date();
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        return `${año}-${mes}-${dia}`;
    }
    function obtenerHoraActual() {
        const fecha = new Date();
        const horas = String(fecha.getHours()).padStart(2, '0');
        const minutos = String(fecha.getMinutes()).padStart(2, '0');
        const segundos = String(fecha.getSeconds()).padStart(2, '0');

        return `${horas}:${minutos}:${segundos}`;

    }
});

//11 Autenticacion
app.post('/auth', async (req,res)=> {
    const user = req.body.username;
    const pass = req.body.password;
    let passwordHaash = await bcryptjs.hash(pass, 8);
    if(user && pass){
        connection.query('SELECT * FROM usuarios WHERE NombreUsuario = ?', [user], async (error, results)=>{
            if(results.length == 0 || !(await bcryptjs.compare(pass, results[0].Contrasena))){ 
                //si es igual a 0 o no coincide la contraseña, en la comparacion de bcrypt se debe poner el nombre de la variable y despues [0]. el nombre del campo contraseña en la db
                res.render('login', {
                    alert: true,
                    alertTitle: "Error",
                    alertMessage: "Usuario y/o contrseña incorrectas",
                    alertIcon: "error",
                    showConfirmButton: true,
                    timer: false,
                    ruta :'login'
                });
            }else{
                req.session.loggedin = true;
                req.session.correoUser = results[0].Correo;
                req.session.idUsuario = results[0].IdUsuario;
                req.session.name = results[0].Nombre;
                req.session.rol = results[0].Rol;
                if (results[0].Rol === 'Admin') {
                    res.render('login', {
                        alert: true,
                        alertTitle: "Conexión exitosa",
                        alertMessage: "¡LOGIN CORRECTO!",
                        alertIcon: "success",
                        showConfirmButton: false,
                        timer: 1500,
                        ruta: 'panelAdmin'  // Redirigir a la página de panelAdmin
                    });
                } else if (results[0].Rol === 'Tecnico') {
                    res.render('login', {
                        alert: true,
                        alertTitle: "Conexión exitosa",
                        alertMessage: "¡LOGIN CORRECTO!",
                        alertIcon: "success",
                        showConfirmButton: false,
                        timer: 1500,
                        ruta: 'panelTecnicos'  // Redirigir a la página de panelTecnico
                    });
                } else {
                    res.render('login', {
                        alert: true,
                        alertTitle: "Conexión exitosa",
                        alertMessage: "¡LOGIN CORRECTO!",
                        alertIcon: "success",
                        showConfirmButton: false,
                        timer: 1500,
                        ruta: 'panelUsuario'  // Redirigir a la página de solicitud
                    });
                }
            }
        });
    }else{
        res.render('login', {
            alert: true,
            alertTitle: "Advertencia",
            alertMessage: "¡Porfavor ingrese un usuario y/o contraseña!",
            alertIcon: "warning",
            showConfirmButton: true,
            timer: 1500,
            ruta :'login'
        });
    }
});

//VALES
app.post('/vales', async(req, res) => {
    const usuario = req.session.name;
    const fecha = obtenerFechaHoraActual();
    const folioS = req.body.folios;
    const [folioSolicitud, correoUsuarioFolio] = folioS.split('|');
    let equipo = req.body.listaEquiposCheck || '';
    const otroInput = req.body.otroInput2 || '';  
    const noSerie = req.body.serie;
    const marca = req.body.marca;
    const modelo = req.body.modelo;
    const estado = req.body.estatus;
    const caracteris = req.body.caracteristicas;
    const [idTecnico, correoTecnico] = req.body.tecnico.split('|');
    console.log('ABAJO DEBE APARECER EL ID DEL TECNICO')
    console.log(idTecnico) 
    console.log(correoTecnico)
    // Añadir el valor de otroInput a la cadena de equipos
    if (otroInput) {
        equipo += (equipo ? ':' : '') + otroInput;
    }
    
    const fechaHoraActual = new Date().toLocaleString();
    const folioSeleccionado = folioSolicitud;
    const templatePath = path.join(__dirname, 'views', 'generarVale.ejs');
    
    // Renderizar la plantilla HTML
    const htmlContent = await ejs.renderFile(templatePath, {
        folio: folioSeleccionado,
        equipos: req.body.equipos,
        serie: req.body.serie,
        marca: req.body.marca,
        modelo: req.body.modelo,
        caracteristicas: req.body.caracteristicas,
        estatus: req.body.estatus,
        revision: req.body.revision,
        fechaHoraActual: fechaHoraActual
    });

    // Crear una instancia de Puppeteer y generar el PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const pdfPath = path.join(__dirname, 'docs', `ValeST24-${folioSeleccionado}.pdf`);

    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    await page.pdf({ path: pdfPath, format: 'A4' });
    await browser.close();

    // Enviar respuesta al cliente

    res.render('alerta', {
        alert: true,
        alertTitle: 'Éxito',
        alertMessage: 'PDF generado y guardado correctamente',
        alertIcon: 'success',
        showConfirmButton: false,
        timer: 1500,
        ruta: 'panelAdmin'
    });   

    // Actualizar el estado de la solicitud en la base de datos
    const cambioEstado = "Asignada";
    connection.query('UPDATE solicitudes SET Estado = ? WHERE FolioSolicitud = ? ', [cambioEstado, folioSolicitud], async(error, results)=> {
        if (error) {
            console.log(error);
        } else {
            // Insertar registros en la base de datos
            connection.query('INSERT INTO asignaciones SET ?', { IdSolicitud: folioSolicitud, IdTecnico: idTecnico,DIagnostico:"", Solucion:"", Mensaje:"" }, async(error, results)=> {
                if (error) {
                    console.log(error);
                } else {
                    const IdAsignacion = results.insertId;
                    await query(`UPDATE solicitudes SET IdAsignacion = ${IdAsignacion} WHERE FolioSolicitud = ${folioSolicitud}`);
                    connection.query('INSERT INTO vales SET ?', {FolioSolicitud:folioSolicitud,Fecha:fecha,Equipo:equipo, NoSerieEquipo:noSerie, MarcaEquipo:marca, ModeloEquipo:modelo,Caracteristicas: caracteris ,Estado: estado,NombreUsuario:usuario}, async(error, results)=> {
                        if (error) {
                            console.log(error);
                        } else {
                            enviarMail(3,correoUsuarioFolio);
                            enviarMail(5,correoTecnico);
                        }
                    });
                }
            });
        }
    });

});

// Función para obtener la fecha y hora actual en formato MySQL
function obtenerFechaHoraActual() {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${año}-${mes}-${dia}`;
}

// DICTAMENES
app.post('/guardar-datos-y-generar-pdf', async (req, res) => {
    const usuario = req.session.name;
    const fecha = obtenerFechaHoraActual();
    const folioSolicitudDictamen = req.session.folioSolicitudDictamen;
    const vale = req.body.valeId;
    console.log(folioSolicitudDictamen);
    const equipoDictamen = req.body.equipoDictamen;
    const marcaEquipo = req.body.marcaEquipo;
    const modeloEquipo = req.body.modeloEquipo;
    const noSerieEquipo = req.body.noSerieEquipo;
    const estado = req.body.estado;
    const tipoDictamen = req.body.tipoDictamen;
    const caracDictamen = req.body.caracDictamen;
    const observacionesDictamen = req.body.observacionesDictamen;
    const descripcionDictamen = req.body.descripcionDictamen;
    const dirigidoA = req.body.dirigidoA;
    console.log(dirigidoA);
    connection.query('INSERT INTO dictamenes SET ?', {
        Encargado: usuario,
        Fecha: fecha,
        FolioSolicitud: folioSolicitudDictamen,
        idVale: vale,
        Equipo: equipoDictamen,
        MarcaEquipo: marcaEquipo,
        ModeloEquipo: modeloEquipo,
        NoSerieEquipo: noSerieEquipo,
        Estado: estado,
        DictamenFinal: tipoDictamen,
        caracDictamen: caracDictamen,
        Observaciones: observacionesDictamen,
        Descripcion: descripcionDictamen
    }, async (error, results) => {
        if (error) {
            console.log(error);
            res.status(500).send('Error al guardar los datos en la base de datos');
        } else {
            const idDictamen = results.insertId;

            // Crear una instancia de Puppeteer
            const browser = await puppeteer.launch();
            const page = await browser.newPage();

            // Ruta de la plantilla HTML
            const templatePath = path.join(__dirname, 'views', 'generarDictamen.ejs');
            console.log('Fecha a renderizar en la plantilla:', fecha);
            const htmlContent = await ejs.renderFile(templatePath, {
                dictamenes: [{
                    idDictamen,
                    FolioSolicitud: folioSolicitudDictamen,
                    Fecha: fecha,
                    Equipo: equipoDictamen,
                    MarcaEquipo: marcaEquipo,
                    ModeloEquipo: modeloEquipo,
                    NoSerieEquipo: noSerieEquipo,
                    Estado: estado,
                    DictamenFinal: tipoDictamen,
                    caracDictamen: caracDictamen,
                    Observaciones: observacionesDictamen,
                    Descripcion: descripcionDictamen,
                    dirigidoA: dirigidoA
                }],
                fecha: fecha


            });

            await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

            // Ruta y nombre del archivo PDF
            const pdfFileName = `DT24-${folioSolicitudDictamen}.pdf`;
            const pdfFilePath = path.join(__dirname, './docs/', pdfFileName);

            // Configurar la orientación a horizontal
            const options = {
                format: 'A4',
                landscape: true 
            };


            // Generar el PDF
            await page.pdf({ path: pdfFilePath, ...options });

            // Cerrar el navegador Puppeteer
            await browser.close();

            console.log('Archivo PDF generado y guardado correctamente');
            console.log(req.session.correoDictamen)
            enviarMail(4,req.session.correoDictamen);
            res.render('alerta', {
                alert: true,
                alertTitle: 'Éxito',
                alertMessage: 'PDF generado y guardado correctamente',
                alertIcon: 'success',
                showConfirmButton: false,
                timer: 1500,
                ruta: 'panelAdmin'
            });
        }
    });

    function obtenerFechaHoraActual() {
        const fecha = new Date();
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        return `${año}-${mes}-${dia}`;
    }
});

//ACTUALIZAR ESTADO DE LAS SOLICITUDES
app.post('/actualizar-estado', async (req, res) => {
    const { folio, nuevoEstado } = req.body;
    const fecha = obtenerFechaActual().toString();
    const hora = obtenerHoraActual().toString();

    // Consulta para actualizar el estado en la tabla solicitudes
    const cambiarEstado = 'UPDATE solicitudes SET Estado = ? WHERE FolioSolicitud = ?';
    // Consulta para insertar el cambio en el log, solo si hay un cambio en el estado
    const logQuery = 'INSERT INTO solicitudes_log (IdUsuario, FolioSolicitud, NuevoEstado, Fecha, Hora) VALUES (?, ?, ?, ?, ?)';
    // Consulta para obtener el estado original antes de la actualización
    const obtenerEstadoOriginal = 'SELECT s.Estado, s.IdUsuario, u.Correo FROM solicitudes s INNER JOIN usuarios u ON s.IdUsuario = u.IdUsuario WHERE s.FolioSolicitud = ?';

    connection.query(obtenerEstadoOriginal, [folio], async (error, results) => {
        if (error) {
            console.error('Error al obtener el estado original:', error);
            res.status(500).json({ error: 'Error al obtener el estado original' });
        } else {
            const usuarioEmail = results[0].Correo;
            console.log(usuarioEmail);
            console.log('ARRRIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
            const estadoOriginal = results[0].Estado;
            // Ejecuta la consulta para cambiar el estado
            connection.query(cambiarEstado, [nuevoEstado, folio], (updateError, updateResults) => {
                if (updateError) {
                    console.error('Error al actualizar la base de datos:', updateError);
                    res.status(500).json({ error: 'Error al actualizar el estado en la base de datos' });
                } else {
                    console.log('Estado actualizado en la base de datos:', updateResults);
                    // Inserta en el log solo si hay un cambio en el estado
                    if (estadoOriginal !== nuevoEstado) {
                        connection.query(logQuery, [req.session.idUsuario, folio, nuevoEstado, fecha, hora], (logError, logResults) => {
                            if (logError) {
                                console.error('Error al insertar en el log:', logError);
                            } else {
                                enviarMail(2,usuarioEmail);
                                console.log('Cambio registrado en el log:', logResults);
                            }
                        });
                    }
                    res.json({ success: true, mensaje: 'Estado actualizado exitosamente' });
                }
            });
        }
    });
    function obtenerFechaActual() {
        const fecha = new Date();
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        return `${año}-${mes}-${dia}`;
    }
    function obtenerHoraActual() {
        const fecha = new Date();
        const horas = String(fecha.getHours()).padStart(2, '0');
        const minutos = String(fecha.getMinutes()).padStart(2, '0');
        const segundos = String(fecha.getSeconds()).padStart(2, '0');

        return `${horas}:${minutos}:${segundos}`;

    }
});

//DESCARGAR PDF DESDE EL HISTORIAL
//DESCARGAR VALE
app.get('/descargarPDFvale', (req, res) => {
    const folioSolicitud = req.query.folioSolicitud;
    const pdfFileName = `ValeST24-${folioSolicitud}.pdf`; // Asegúrate de que el nombre del archivo refleje tu estructura
    const pdfFilePath = path.join(__dirname, 'docs', pdfFileName);

    res.download(pdfFilePath, (err) => {
        if (err) {
            console.error('Error al descargar el archivo PDF:', err);
            console.log('Vale no encontrado');
        }
    });
});

//DESCARGAR DICTAMEN
app.get('/descargarPDFdictamen', (req, res) => {
    const folioSolicitud = req.query.folioSolicitud;
    const pdfFileName = `DT24-${folioSolicitud}.pdf`; // Asegúrate de que el nombre del archivo refleje tu estructura
    const pdfFilePath = path.join(__dirname, 'docs', pdfFileName);

    res.download(pdfFilePath, (err) => {
        if (err) {
            console.error('Error al descargar el archivo PDF:', err);
            console.log('Dictamen no encontrado');
        }
    });
});

//Actualizar el estado de las asignaciones
app.post('/actualizarEstadoSolicitud', async (req, res) => {
    const folioSolicitud = req.body.folioSolicitud;
    const nuevoEstado = req.body.nuevoEstado;

    // Actualiza el estado de la solicitud en la base de datos
    connection.query('UPDATE solicitudes SET Estado = ? WHERE FolioSolicitud = ?', [nuevoEstado, folioSolicitud], (error, results) => {
        if (error) {
            console.error('Error al actualizar el estado de la solicitud:', error);
            res.status(500).send('Error interno del servidor');
        } else {
            // Si se actualizó correctamente, muestra un mensaje de éxito con SweetAlert2
            res.status(200).send('Estado actualizado correctamente');
        }
    });
});

// Creación de diagnósticos técnicos y soluciones aplicadas
app.post('/crearDiagnostico', async (req, res) => {
    const folioSeleccionado = req.body.folios; // Obtener el folio seleccionado del cuerpo de la solicitud
    const diagnosticoT = req.body.diagnosticoT;
    const solucion = req.body.solucion;

    // Consulta para obtener el IdTecnico de la tabla asignaciones
    connection.query('SELECT IdTecnico FROM asignaciones WHERE IdSolicitud = ?', [folioSeleccionado], (error, results) => {
        if (error) {
            console.error('Error al obtener el IdTecnico:', error);
            // Mostrar un mensaje de error utilizando SweetAlert2
            res.render('panelTecnicos', {
                alert: {
                    alertTitle: 'Error',
                    alertMessage: 'Error interno del servidor',
                    alertIcon: 'error',
                    showConfirmButton: true,
                    timer: null,
                    ruta: 'panelTecnicos' // Redirige a la misma página
                }
            });
        } else {
            const idTecnico = results[0].IdTecnico; // Se obtiene el IdTecnico de los resultados de la consulta
            console.log('IdTecnico obtenido:', idTecnico);

            // Inserción del diagnóstico y solución en la tabla asignaciones
            connection.query('UPDATE asignaciones SET Diagnostico = ?, Solucion = ? WHERE IdSolicitud = ?',
                [diagnosticoT, solucion, folioSeleccionado], (error, results) => {
                    if (error) {
                        console.error('Error al actualizar la tabla de asignaciones:', error);
                        // Mostrar un mensaje de error utilizando SweetAlert2
                        res.render('panelTecnicos', {
                            alert: {
                                alertTitle: 'Error',
                                alertMessage: 'Error al actualizar la tabla de asignaciones',
                                alertIcon: 'error',
                                showConfirmButton: false,
                                timer: 1500,
                                ruta: 'panelTecnicos' // Redirige a la misma página
                            }
                        });
                    } else {
                        console.log('Diagnóstico y solución actualizados correctamente');

                        // Consulta para obtener las asignaciones actualizadas
                        connection.query('SELECT * FROM asignaciones WHERE IdTecnico = ?', [idTecnico], (error, asignaciones) => {
                            if (error) {
                                console.error('Error al obtener las asignaciones:', error);
                                // Mostrar un mensaje de error utilizando SweetAlert2
                                res.render('panelTecnicos', {
                                    alert: {
                                        alertTitle: 'Error',
                                        alertMessage: 'Error al obtener las asignaciones',
                                        alertIcon: 'error',
                                        showConfirmButton: false,
                                        timer: 1500,
                                        ruta: 'panelTecnicos' // Redirige a la misma página
                                    }
                                });
                            } else {
                                console.log('Asignaciones obtenidas correctamente');
                                // Mostrar un mensaje de éxito utilizando SweetAlert2
                                res.render('panelTecnicos', {
                                    alert: {
                                        alertTitle: 'Éxito',
                                        alertMessage: 'Diagnóstico y solución actualizados correctamente',
                                        alertIcon: 'success',
                                        showConfirmButton: false,
                                        timer: 1500,
                                        ruta: 'panelTecnicos' // Redirige a la misma página
                                    },
                                    asignaciones: asignaciones // Pasar las asignaciones al archivo EJS
                                });
                            }
                        });
                    }
                });
        }
    });

});

//12 Auth page
app.get('/',(req, res)=>{

    if(req.session.loggedin){
        res.render('login',{
            login: true,
            name: req.session.name
        });
    }else{
        res.render('login',{
            login: false,
            name: 'Debe iniciar sesión'
        })
    }
})

//13 Logout
app.get('/logout', (req, res)=>{
    req.session.destroy(()=>{
        res.redirect('/login'); //Redirige al index
    });
})

//Hacemos que funcione el servidor local en el puerto
app.listen(3000, (req, res)=> {
    console.log('SERVER RUNNING IN http://localhost:3000');
});
