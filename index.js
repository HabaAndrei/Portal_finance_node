const axios = require("axios");
//const { Client } = require("pg");
const fs = require("fs");
require('dotenv').config();
const conexiunePG  = require('./configPG.js');
const {client} = conexiunePG;

const {PRET} = process.env;


//////////////////////////////
const paginaSymboluri = "./tot.txt";

(function luamPreturi(paginaSymboluri) {
  fs.readFile(paginaSymboluri, "utf-8", (err, data) => {
    if (err) {
      console.log('eroare la citire de pagina');
    } else {
      let tickers = data.split("\n");

      const intervalId = setInterval(() => {
        if (tickers.length === 0) {
          console.log('facem o rocads !!');
          clearInterval(intervalId);  
          luamPreturi(paginaSymboluri);
          // process.exit();
        }

        let simbol = tickers.shift();
        axios
          .get(
            `https://api.polygon.io/v2/aggs/ticker/${simbol}/prev?adjusted=true&apiKey=${PRET}`
          )
          .then((data) => {
            
            try {
              let symbol = data.data.ticker;
              let ob = data.data.results[0];
              let price = ob.c;
              let highest = ob.h;
              let lowest = ob.l;
              let open = ob.o;
              //let time = new Date(ob.t).toLocaleDateString("ro-RO");

              /////\
              const anul = new Date(ob.t).getFullYear();
              const luna = new Date(ob.t).getMonth() + 1; // Adăugăm 1 deoarece lunile sunt indexate de la 0 la 11
              const ziua = new Date(ob.t).getDate();
              let time = `${anul}-${luna}-${ziua}`
              //console.log({time})
              /////\
              
              if(Date.now() > ob.t){
                
                const query =
                  "insert into preturi (symbol, price, highest, lowest, open, data) values($1, $2, $3, $4, $5, $6)";
                const values = [symbol, price, highest, lowest, open, time];
  
                client.query(query, values, (err, data) => {
                  if (err) {
                    console.log("ceva nu e ok la query, insert", symbol);
                  } else {
                    console.log("totul a mers ok la query insert", symbol);
                  }
                });
                
              }
              
            } catch (err) {
              console.log("eroare la fetch data[0]   s:", simbol);
            }
          })
          .catch((err) => {
            console.log( "eroare la fetch");
          });
      }, 14 * 1000);
    }
  });
})(paginaSymboluri);

function schimbamStatus() {
  client.query(
    `
  update ordine set status  = 'e' where expiration_date < current_timestamp
  `,
    (err, data) => {
      if (err) {
        console.log(err);
      } else {
        console.log(data);
      }
    }
  );
}
//schimbamStatus();

axios.get('https://api.portalfinancechart.site/scrisulPentruLimbaDorita', {params: {pagina: 'primul_js', 
limba: 'en'}}).then((data)=>console.log(data.data))
