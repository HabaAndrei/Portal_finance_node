const axios = require("axios");
const fs = require("fs");


//////////////////////////////
const conexiunePG  = require('./configPG.js');
const {client} = conexiunePG;
//////////////////////////////

function luamDetalii() {
  fs.readFile("./tot.txt", "utf-8", (err, data) => {
    if (err) {
      console.log(err);
    } else {
      let tickers = data.split("\n");

      setInterval(() => {
        if (tickers.length === 0) {
          process.exit();
        }
        let simbol = tickers.shift();

        axios
          .get(
            `https://api.polygon.io/v3/reference/tickers/${simbol}?apiKey=${DETALII}`
          )
          .then((data) => {
            try {
              console.log("a mers ok fetch", data.data.results.ticker);
              let symbol = data.data.results.ticker;
              let name = data.data.results.name;
              let market_cap = data.data.results.market_cap;
              let description = data.data.results.description;
              let list_date = data.data.results.list_date;

              let logo_url = data.data.results.branding.icon_url;
              if (typeof logo_url === "undefined") {
                logo_url = null;
              }
              let homepage_url = data.data.results.homepage_url;

              const query =
                "insert into detalii (symbol, name, market_cap, description, list_date, logo_url, home_page) values ($1, $2, $3, $4, $5, $6, $7)";
              const values = [
                symbol,
                name,
                market_cap,
                description,
                list_date,
                logo_url,
                homepage_url,
              ];

              client.query(query, values, (err, data) => {
                if (err) {
                  console.log("ceva nu e ok la query, insert", err);
                } else {
                  console.log("totul a mers ok la query, insert");
                }
              });
            } catch (err) {
              console.log("eroare la try din interval", err);
            }
          })
          .catch((err) => {
            console.log("eroare la fetch", err);
          });
      }, 12500);
    }
  });
}
luamDetalii();
