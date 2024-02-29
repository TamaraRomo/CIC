const mysql = require('mysql');
const connection = mysql.createConnection({
    host: process.env.DB_HOST, // 'localhost'
    user: 'admin',
    password: 'moraazul',
    database: process.env.DB_DATABASE 
});

connection.connect((error)=>{
    if(error){
        console.log('El error de conexion es: '+error);
        return;
    }
    console.log('Conectado a la base de datos');
});

module.exports = connection;
