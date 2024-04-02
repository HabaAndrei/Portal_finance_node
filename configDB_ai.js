require('dotenv').config();
const { Client } = require("pg");

const {HOST, USER_PG, PORT, PASSWORD, DATABASE_AI} = process.env;

const client = new Client({
  host:HOST, user:USER_PG, port:PORT, password:PASSWORD, database:DATABASE_AI
});

client.connect();

/*
 client.query('select * from conversatii', (err, data)=>{
     if(err){
         console.log(err)
     }else{
         console.log(data.rows);
     }
 })
*/
const client_ai_db = client;
module.exports = {client_ai_db};


