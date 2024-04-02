require('dotenv').config();
const { Client } = require("pg");

const {HOST, USER_PG, PORT, PASSWORD, DATABASE} = process.env;
const client = new Client({
  host:HOST, user:USER_PG, port:PORT, password:PASSWORD, database:DATABASE
});




try{
	client.connect();
}catch (err){
	console.log(err)
}
//client.connect();



module.exports = {client};

/*
console.log('Trei');
//console.log({  host:HOST, user:USER_PG, port:PORT, password:PASSWORD, database:DATABASE})
setInterval(()=>{
//console.log('ma execut', client.query)
console.log('Patru')
  try{
    client.query('select * from preturi order by id limit 1', (err, data)=>{
    if(err){
      console.log(err, 'eroarea -----------------------------------')
    }else{
      console.log(data.rows, 'sper ca au veni datele 555555555555555555555555');
    }
  })
  }catch (err) {
      console.error(err, 'eroarea din catch ');

  }
	console.log('Cinci')
}, 2000)
*/
