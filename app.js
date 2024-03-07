//Invocamos express
const express = require('express');
const app = express();
const pdf = require('html-pdf');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');
const puppeteer = require('puppeteer');
const {authPage,authSub} = require('./middleware')
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

//8.- Invocar conexion a DB
const connection = require('./database/db');
console.log(__dirname);

//9.- Estableciendo las rutas
app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/registerP',authPage('Admin'), (req, res) => {
    res.render('register');
});
app.get('/generarDictamen',authPage('Admin'), (req, res) => {
    res.render('generarDictamen');
});
app.get('/alerta', (req, res) => {
    res.render('alerta');
});
app.get('/panelUsuario',authPage(["Usuario","Admin"]), async (req, res) => {

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
    const edificios = await query('SELECT * FROM edificios');
    const folios = await query('SELECT FolioSolicitud FROM solicitudes WHERE NOT EXISTS ( SELECT 1 FROM vales WHERE vales.FolioSolicitud = solicitudes.FolioSolicitud )');
    const usuarios = await query('SELECT IdUsuario,Nombre from usuarios');
    const historialSoli = await query(`SELECT s.FolioSolicitud AS FolioSolicitud,s.Fecha AS Fecha,s.Hora AS Hora,u.Nombre AS NombreUsuario,s.Equipo AS Equipo,s.Estado AS Estado,CASE WHEN v.FolioSolicitud IS NOT NULL THEN 'Disponible' WHEN d.FolioSolicitud IS NOT NULL THEN 'No disponible' ELSE 'No Disponible' END AS Vale,CASE WHEN d.FolioSolicitud IS NOT NULL THEN 'Disponible' ELSE 'No Disponible' END AS Dictamen FROM solicitudes s LEFT JOIN vales v ON s.FolioSolicitud = v.FolioSolicitud LEFT JOIN dictamenes d ON s.FolioSolicitud = d.FolioSolicitud LEFT JOIN usuarios u ON s.IdUsuario = u.IdUsuario ORDER BY FolioSolicitud DESC; `);
    const soloAbiertas = await query('SELECT * FROM solicitudes WHERE Estado = "Abierto"')
    const soliPendiente = await query('SELECT * FROM solicitudes WHERE Estado = "Pendiente"')
    const soliCerradas = await query('SELECT * FROM solicitudes WHERE Estado = "Cerrado"')
    const inforVales = await query("SELECT v.*, COALESCE(d.idDictamen, 'No existe') AS IdDictamen, u.Nombre AS NombreUsuario FROM vales v LEFT JOIN dictamenes d ON v.idVale = d.idVale LEFT JOIN solicitudes s ON v.folioSolicitud = s.folioSolicitud LEFT JOIN usuarios u ON s.IdUsuario = u.IdUsuario ORDER BY v.idVale DESC;");
    res.render('panelAdmin', {
            login: req.session.loggedin,
            name: req.session.name,
            folioSolicitudes: folios,
            usuarios: usuarios,
            historial: historialSoli,
            edificios: edificios,
            abierto: soloAbiertas,
            pendiente:  soliPendiente,
            cerrado: soliCerradas,
            vales:inforVales
        });
        console.log(historialSoli);
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
    const query = 'SELECT idVale,Equipo,NoSerieEquipo,MarcaEquipo,ModeloEquipo FROM vales WHERE FolioSolicitud = ?';

    connection.query(query, [folioSolicitud], (error, results) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'Error al obtener la información del folio' });
        } else {
            if (results.length > 0) {
                // Si se encontraron resultados, devuelve la información como JSON al cliente
                console.log(results);
                req.session.idValeDictamen = results[0].idVale;
                res.json(results[0]); // Suponiendo que solo necesitas el primer resultado
            } else {
                // Si no se encontraron resultados, puedes devolver un objeto vacío o un mensaje
                res.json({ message: 'No se encontró información para el folio proporcionado' });
            }
        }
    });
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
    connection.query('INSERT INTO solicitudes SET ?', {IdUsuario:usuario,Fecha:fecha,Hora:hora,Telefono:telefono, IdEdificio:edificio, UbicacionFisica:ubicacion, Equipo:equipo, Descripcion: descripcion}, async(error, results)=> {
        if(error){
            console.log(error);
        }else{
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
    connection.query('INSERT INTO solicitudes SET ?', {IdUsuario:usuario,Fecha:fecha,Hora:hora,Telefono:telefono, IdEdificio:edificio, UbicacionFisica:ubicacion, Equipo:equipo, Descripcion: descripcion}, async(error, results)=> {
        if(error){
            console.log(error);
        }else{
            const idSolicitud = results.insertId;
            console.log(idSolicitud);
            const logQuery = `INSERT INTO solicitudes_log (IdUsuario, FolioSolicitud, NuevoEstado, Fecha, Hora) VALUES (${usuario},${idSolicitud},"Abierto","${fecha}","${hora}")`;

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
    const folioSolicitud = req.body.folios;
    let equipo = req.body.listaEquiposCheck || '';
    const otroInput = req.body.otroInput2 || '';  
    const noSerie = req.body.serie;
    const marca = req.body.marca;
    const modelo = req.body.modelo;
    const estado = req.body.estatus;
    const caracteris = req.body.caracteristicas;
    
    // Añadir el valor de otroInput a la cadena de equipos
    if (otroInput) {
        equipo += (equipo ? ':' : '') + otroInput;
    }
    console.log("EYYYYY"+req.body.listaEquiposCheck);
    
    const { folios, equipos, serie, marcaE, modeloE, caracteristicas, estatus, revision } = req.body;
    const fechaHoraActual = new Date().toLocaleString();
    const folioSeleccionado = folios;
    const templatePath = path.join(__dirname, 'views', 'generarVale.ejs');
    fs.readFile(templatePath, 'utf8', async (err, data) => {
        if (err) {
            console.error('Error al leer la plantilla HTML:', err);
            return res.status(500).send('Error interno del servidor');
        }
    const htmlContent = ejs.render(data, {
            folio: folioSeleccionado,
            equipos,
            serie,
            marca,
            modelo,
            caracteristicas,
            estatus,
            revision,
            fechaHoraActual
        });
                // Crear una instancia de Puppeteer
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        const pdfPath = path.join(__dirname, 'docs', `ValeST24-${folioSeleccionado}.pdf`);
        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
        await page.pdf({ path: pdfPath, format: 'A4' });
        await browser.close();
        app.get('/:filename', (req, res) => {
            const { filename } = req.params;
            const filePath = path.join(__dirname,'docs',filename);
            res.download(filePath, (err) => {
                if (err) {
                    console.error('Error al descargar el archivo PDF:', err);
                    return res.status(500).send('Error interno del servidor');
                } else {
                    console.log('Archivo PDF descargado correctamente');
                    res.render('vales', {
                        folioSolicitudes: [{ folioSeleccionado }],
                        alert: {
                            alertTitle: 'Ã‰xito',
                            alertMessage: 'PDF generado y descargado correctamente',
                            alertIcon: 'success',
                            showConfirmButton: true,
                            timer: 5000,
                            ruta: 'panelAdmin'
                        }
                    });
                }
            });
        })
    })
    console.log(caracteris);
    connection.query('INSERT INTO vales SET ?', {FolioSolicitud:folioSolicitud,Fecha:fecha,Equipo:equipo, NoSerieEquipo:noSerie, MarcaEquipo:marca, ModeloEquipo:modelo,Caracteristicas: caracteris ,Estado: estado,NombreUsuario:usuario}, async(error, results)=> {
        if(error){
            console.log(error);
        }else{
            res.render('alerta',{ //pasar parametros para el mensaje AlertSweet
                alert: true,
                alertTitle: "Vale",
                alertMessage: "¡Vale y PDF creado corractamente!",
                alertIcon: "success",
                showConfirmButton: false,
                timer: 1500,
                ruta: 'panelAdmin'
            })
        }
    })
    // Función para obtener la fecha y hora actual en formato MySQL
    function obtenerFechaHoraActual() {
        const fecha = new Date();
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');

        return `${año}-${mes}-${dia}`;
    }
});

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
    const estadoDictamen = req.body.estadoDictamen;
    const tipoDictamen = req.body.tipoDictamen;
    const caracDictamen = req.body.caracDictamen;
    const observacionesDictamen = req.body.observacionesDictamen;
    const descripcionDictamen = req.body.descripcionDictamen;

    connection.query('INSERT INTO dictamenes SET ?', {
        Encargado: usuario,
        FechaDictamen: fecha,
        FolioSolicitud: folioSolicitudDictamen,
        idVale: vale,
        Equipo: equipoDictamen,
        MarcaEquipo: marcaEquipo,
        ModeloEquipo: modeloEquipo,
        NoSerieEquipo: noSerieEquipo,
        EstadoDictamen: estadoDictamen,
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
                    FechaDictamen: fecha,
                    Equipo: equipoDictamen,
                    MarcaEquipo: marcaEquipo,
                    ModeloEquipo: modeloEquipo,
                    NoSerieEquipo: noSerieEquipo,
                    EstadoDictamen: estadoDictamen,
                    DictamenFinal: tipoDictamen,
                    caracDictamen: caracDictamen,
                    Observaciones: observacionesDictamen,
                    Descripcion: descripcionDictamen
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
            res.render('alerta', {
                alert: true,
                alertTitle: 'Éxito',
                alertMessage: 'PDF generado y guardado correctamente',
                alertIcon: 'success',
                showConfirmButton: false,
                timer: 5000,
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
    const obtenerEstadoOriginal = 'SELECT Estado FROM solicitudes WHERE FolioSolicitud = ?';

    connection.query(obtenerEstadoOriginal, [folio], async (error, results) => {
        if (error) {
            console.error('Error al obtener el estado original:', error);
            res.status(500).json({ error: 'Error al obtener el estado original' });
        } else {
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


//12 Auth page
app.get('/', (req, res)=>{
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

