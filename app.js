//Invocamos express
const express = require('express');
const app = express();

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
app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/panelUsuario',checkRole('Usuario'), (req, res) => {

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
    console.log(usuario);
    const query = `
    SELECT s.FolioSolicitud AS FolioSolicitud, s.Fecha AS Fecha, s.Equipo AS Equipo, s.Estado AS Estado, CASE WHEN v.FolioSolicitud IS NOT NULL THEN 'Disponible' ELSE 'No Disponible' END AS Vale, CASE WHEN d.FolioSolicitud IS NOT NULL THEN 'Disponible' ELSE 'No Disponible' END AS Dictamen FROM solicitudes s LEFT JOIN vales v ON s.FolioSolicitud = v.FolioSolicitud LEFT JOIN dictamenes d ON s.FolioSolicitud = d.FolioSolicitud WHERE s.IdUsuario = ?
    `;

    connection.query(query, [usuario], (error, result) => {
        if (error) {
            console.error(error);
        } else {
            res.render('panelUsuario', {
                login: req.session.loggedin,
                name: req.session.name,
                historial: result
            });
        }
    });
});

app.get('/panelAdmin',checkRole('Admin'), async (req, res) => {
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
    const folios = await query('SELECT FolioSolicitud FROM solicitudes');
    const usuarios = await query('SELECT Nombre from usuarios');
    const historialSoli = await query(`SELECT s.FolioSolicitud AS FolioSolicitud, s.Fecha AS Fecha, s.Hora AS Hora, u.Nombre AS NombreUsuario, s.Equipo AS Equipo, s.Estado AS Estado, CASE WHEN v.FolioSolicitud IS NOT NULL THEN 'Disponible' WHEN d.FolioSolicitud IS NOT NULL THEN 'No disponible' ELSE 'No Disponible' END AS Vale, CASE WHEN d.FolioSolicitud IS NOT NULL THEN 'Disponible' ELSE 'No Disponible' END AS Dictamen FROM solicitudes s LEFT JOIN vales v ON s.FolioSolicitud = v.FolioSolicitud LEFT JOIN dictamenes d ON s.FolioSolicitud = d.FolioSolicitud LEFT JOIN usuarios u ON s.IdUsuario = u.IdUsuario; `);
    
        res.render('panelAdmin', {
            login: req.session.loggedin,
            name: req.session.name,
            folioSolicitudes: folios,
            usuarios: usuarios,
            historial: historialSoli
            
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

function checkRole(role) {
    return (req, res, next) => {
        if (req.session.loggedin && req.session.rol === role) {
            return next();
        }
        res.redirect('/login');
    };
}

// Asumiendo que tienes una ruta como esta en tu servidor
app.get('/obtener-informacion-folio/:folioSolicitud', (req, res) => {
    const folioSolicitud = req.params.folioSolicitud;
    req.session.folioSolicitudDictamen = folioSolicitud;
    const query = 'SELECT idVale,NoSerieEquipo,MarcaEquipo,ModeloEquipo FROM vales WHERE FolioSolicitud = ?';

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
app.post('/register', async(req, res) => {
    const user = req.body.username;
    const name = req.body.name;
    const pass = req.body.password;
    const rol = req.body.rol;
    const genero = req.body.genero;
    let passwordHaash = await bcryptjs.hash(pass, 8);
    connection.query('INSERT INTO usuarios SET ?', {NombreUsuario:user, Nombre:name, Contrasena:passwordHaash, Rol:rol, Genero: genero}, async(error, results)=> {
        if(error){
            console.log(error);
        }else{
            res.render('register',{ //pasar parametros para el mensaje AlertSweet
                alert: true,
                alertTitle: "Registro",
                alertMessage: "¡Registro Exitoso!",
                alertIcon: "success",
                showConfirmButton: false,
                timer: 1500,
                ruta: 'panelAdmin'
            })
        }
    })
});


//10 Hacer solicitud de soporte
app.post('/solicitud', async(req, res) => {
    const usuario = req.session.idUsuario; //
    const fecha = obtenerFechaActual();
    const hora = obtenerHoraActual();
    const telefono = req.body.telefono;
    const edificio = req.body.edificio;
    const ubicacion = req.body.area;
    const equipo = req.body.equipos;
    const descripcion = req.body.descripcion;
    connection.query('INSERT INTO solicitudes SET ?', {IdUsuario:usuario,Fecha:fecha,Hora:hora,Telefono:telefono, Edificio:edificio, UbicacionFisica:ubicacion, Equipo:equipo, Descripcion: descripcion}, async(error, results)=> {
        if(error){
            console.log(error);
        }else{
            res.render('solicitud',{ //pasar parametros para el mensaje AlertSweet
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

app.post('/solicitudAdmin', async(req, res) => {
    const usuario = req.body.usuarios;
    const fecha = obtenerFechaActual();
    const hora = obtenerHoraActual();
    const telefono = req.body.telefono;
    const edificio = req.body.edificio;
    const ubicacion = req.body.area;
    const equipo = req.body.equipos;
    const descripcion = req.body.descripcion;
    connection.query('INSERT INTO solicitudes SET ?', {IdUsuario:usuario,Fecha:fecha,Hora:hora,Telefono:telefono, Edificio:edificio, UbicacionFisica:ubicacion, Equipo:equipo, Descripcion: descripcion}, async(error, results)=> {
        if(error){
            console.log(error);
        }else{
            res.render('solicitud',{ //pasar parametros para el mensaje AlertSweet
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
    const equipo = req.body.equipos;
    const noSerie = req.body.serie;
    const marca = req.body.marca;
    const modelo = req.body.modelo;
    const estado = req.body.estatus;
    connection.query('INSERT INTO vales SET ?', {FolioSolicitud:folioSolicitud,Fecha:fecha,Equipo:equipo, NoSerieEquipo:noSerie, MarcaEquipo:marca, ModeloEquipo:modelo, Estado: estado,NombreUsuario:usuario}, async(error, results)=> {
        if(error){
            console.log(error);
        }else{
            res.render('solicitud',{ //pasar parametros para el mensaje AlertSweet
                alert: true,
                alertTitle: "Vale",
                alertMessage: "¡Vale de Soporte Técnico Creado!",
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
//DICTAMENES
app.post('/guardar-datos', async (req, res)=>{
    const usuario = req.session.name;
    const fecha = obtenerFechaHoraActual();
    const folioSolicitudDictamen = req.session.folioSolicitudDictamen;
    const vale = req.body.valeId;
    console.log(folioSolicitudDictamen); 
    const marcaEquipo = req.body.marcaEquipo;
    const modeloEquipo = req.body.modeloEquipo;
    const noSerieEquipo = req.body.noSerieEquipo;
    const estadoDictamen = req.body.estadoDictamen;
    const tipoDictamen = req.body.tipoDictamen;
    const caractDictamen = req.body.caractDictamen;
    const observacionesDictamen = req.body.observacionesDictamen;
    const descripcionDictamen = req.body.descripcionDictamen;

    connection.query('INSERT INTO dictamenes SET ?',{Encargado:usuario,FechaDictamen: fecha,FolioSolicitud:folioSolicitudDictamen,idVale: vale ,MarcaEquipo:marcaEquipo, ModeloEquipo:modeloEquipo, NoSerieEquipo:noSerieEquipo, EstadoDictamen:estadoDictamen, DictamenFinal:tipoDictamen, caracDictamen:caractDictamen, Observaciones:observacionesDictamen, Descripcion:descripcionDictamen}, (error, results)=>{
        if(error){
            console.log(error);
        }else{
            res.render('solicitud',{ //pasar parametros para el mensaje AlertSweet
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

    function obtenerFechaHoraActual() {
        const fecha = new Date();
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');

        return `${año}-${mes}-${dia}`;
    }
})

//12 Auth page
app.get('/', (req, res)=>{
    if(req.session.loggedin){
        res.render('index',{
            login: true,
            name: req.session.name
        });
    }else{
        res.render('index',{
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
