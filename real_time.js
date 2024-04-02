//////////////////////////////// => cod conectat cu client
const uuid = require('uuid');
const symbols = require("./arraySymbols");
var fs = require('fs');
const WebSocketServer = require("ws");
//const wss = new WebSocketServer.Server({ port: 8003 });

const conexiunePG  = require('./configPG.js');
const {client} = conexiunePG;

let obiectSubscribeSymbols = [];

let clienti = [];

///////////////////////////////////////
//////////


const privateKey = fs.readFileSync('/etc/letsencrypt/live/portalfinancechart.site/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/portalfinancechart.site/cert.pem', 'utf8');
//console.log({privateKey, certificate})

const credentials = { key: privateKey, cert: certificate };
const https = require('https');


const httpsServer = https.createServer(credentials);
httpsServer.listen(8003);

//const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer.Server({
    server: httpsServer
});

//////////
//////////////////////////////////////


wss.on("connection", (conex) => {
 
 const idulConexiunii = uuid.v4();
 
  conex.ID_UNIC = idulConexiunii;
  clienti.push(conex);

  /////////////////// trimit idul Conexiunii in client 
  conex.send(
    JSON.stringify([{ type: "idulConexiunii" },{idulConexiunii}])
  );

  ////////////////////      <===   //////
  conex.on("message", (message) => {
    const mesaj = JSON.parse(message);
    const id = mesaj.id;
    console.log(id, 'idul ----');
    if (mesaj?.type === "arraySubscribe") {
  	//console.log(conex.ID_UNIC, 'exista in ar');    
      if(!mesaj?.array?.length)return ;
      for (let sy of mesaj.array) {
        if(obiectSubscribeSymbols[conex.ID_UNIC]){
          let array = obiectSubscribeSymbols[conex.ID_UNIC];
          if(!array.includes(sy)){
            array.push(sy);
          }
        }else{
          obiectSubscribeSymbols[conex.ID_UNIC] = []
          obiectSubscribeSymbols[conex.ID_UNIC].push(sy);
        }
      }
      
    }

    console.log(obiectSubscribeSymbols, clienti[0].ID_UNIC);
  });

  conex.on("error", (error) => {
    console.error("Eroare la conexiune, wss client:", error);
  });
  conex.on("close", (code, reason) => {

    // scot id-ul din obiectSymbolSubscribe
    let id = conex.ID_UNIC;
    delete obiectSubscribeSymbols[id];
    ////////////////
    clienti.splice(clienti.indexOf(conex), 1);
  });
});

///////////////// ws preturi
const {REALTIME} = process.env;
const apiKey = REALTIME;

function conexiuniWSpreturi() {
  let wsPreturi = new WebSocketServer(`wss://ws.finnhub.io?token=${apiKey}`);
  
  wsPreturi.on("open", () => {
    console.log("wsPreturi functioneaza");
    // fac subscribe cu datele care sunt deja in array la deschiderea serverului
    // pot muta cu cu arraySubscribeSymbols   daca vreau sa fac subscrieb doar cu datele de pe care se uita clientul
    if (symbols.length) {
      for (let i of symbols) {
        setTimeout(()=>{wsPreturi.send(JSON.stringify({ type: "subscribe", symbol: i }))}, 400 ); //o data la 0,2 secunde sa faca subscribe
      }
    }
  });
  wsPreturi.on("error", (err) => {
    console.log(err, "avem eroare la preturi din ws");
  });

  wsPreturi.on("message", (data) => {
    const date = JSON.parse(data);
// console.log("vin date noi,", date);

    if (date.type === "trade" && typeof date === "object") {
      for (let ob of date.data) {
        //console.log(ob);
        if ("c" in ob) {
          delete ob["c"];
        }
        if ("v" in ob) {
          delete ob["v"];
        }

        arrayTabelaSchimb.push(ob);
      }
    }

    if (date.type === "trade") {
      const { s, p, t } = date.data[0];
      
      for (let client of clienti) {
        if(obiectSubscribeSymbols[client.ID_UNIC]){
		
          if(obiectSubscribeSymbols[client.ID_UNIC].includes(s)){
            
            client.send(
              JSON.stringify([{ type: "trade" }, { s }, { p }, { t: t }])
            );
          }
        }
      }
    }
  });

  wsPreturi.on("close", (c, r) => {
    console.log("wsPreturi este inchis", c, r);
    setTimeout(() => {
      conexiuniWSpreturi();
      console.log("WSS preturi incercam se ne reconectam");
    }, 5000);
  });
}
conexiuniWSpreturi();

// o data pe minut sa trimit datele in postgreSQL
let arrayTabelaSchimb = [];
let arrayTabela = [];
setInterval(() => {
  //console.log("adaugam in tabela", arrayTabelaSchimb.length);

  arrayTabela = arrayTabelaSchimb;
  arrayTabelaSchimb = [];
  // fac array care nu are dubluri

  //return; //console.log("facem console log, merge");
  let arrayUnic = [];

  let obictCuPreturi = {};
  for (let i = 0; i < arrayTabela.length; i++) {
    let ob = arrayTabela[i];
    let s = ob.s;
    let p = ob.p;
    let t = ob.t;

    obictCuPreturi[s + t] = { p, s, t };
  }

  arrayUnic = Object.values(obictCuPreturi);

  //console.log(arrayUnic.length, "acesta este array ul unic", arrayUnic);

  const query = `INSERT INTO realtime (p, s, t)
  SELECT (json_data->>'p')::numeric, (json_data->>'s')::text, (json_data->>'t')::numeric
  FROM json_array_elements($1::json) AS json_data`;

  
  //console.log(query, 'acesta este queryul')
  client.query(query, [JSON.stringify(arrayUnic)], (err, data) => {
    if (err) {
      console.log(err);
    } else {
      arrayTabela = [];
      console.log("am adaudat in baza de date", data.rowCount);
    }
  });
  
  
}, 60 * 1000);

/////////////////////////////
wss.on("error", (err) => {
  console.log("eroare la wss ------", err);
});


