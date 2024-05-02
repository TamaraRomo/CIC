const mysql = require('mysql');
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'cic_assistance' 
});

connection.connect((error)=>{
    if(error){
        console.log('El error de conexion es: '+error);
        return;
    }
    console.log('Conectado a la base de datos');
});

module.exports = connection;