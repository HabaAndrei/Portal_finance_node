const axios = require("axios");
//const WebSocketServer = require("ws");
//const wss = new WebSocketServer.Server({ port: 8000 });
const { Client } = require("pg");
require('dotenv').config();
var fs = require('fs');
//////////////////////////////
const conexiunePG  = require('./configPG.js');
const {client} = conexiunePG;
/////////////////////////////

const {GETSTIRI} = process.env;
const clients = [];

/////////////////////////
////////

const privateKey = fs.readFileSync('/etc/letsencrypt/live/portalfinancechart.site/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/portalfinancechart.site/cert.pem', 'utf8');
//console.log({privateKey, certificate})

const credentials = { key: privateKey, cert: certificate };
const https = require('https');

//pass in your credentials to create an https server
const httpsServer = https.createServer(credentials);
httpsServer.listen(8008);

const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({
    server: httpsServer
});

////////
////////////////////////







wss.on("connection", (conex, r) => {
  clients.push(conex);
});

setInterval(() => {
  axios
    .get(
      `https://api.marketaux.com/v1/news/all?language=en&industries=Energy,Financial,Industrials,Technology,Consumer Cyclical,Consumer Defensive,Real Estate&countries=us,ca&api_token=${GETSTIRI}`
    )
    .then((data) => {
      for (const client of clients) client.send(JSON.stringify(data.data.data));
      const array = data.data.data;

      array.forEach((ob) => {
        let {
          uuid,
          title,
          description,
          url,
          image_url,
          published_at,
          source,
          language,
        } = ob;

        const values = [
          uuid,
          title,
          description,
          url,
          image_url,
          published_at,
          source,
          language,
        ];
        const query = `insert into news  (uuid, title,  description, url, impage_url, published_at, source, language) values ($1, $2, $3, $4, $5, $6, $7, $8)`;

        client.query(query, values, (err, data) => {
          if (err) {
            console.log('stire dublicata in getStiri');
          }
        });
      });
    });
}, 1000 * 60 * 17 );
