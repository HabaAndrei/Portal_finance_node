const express = require("express");
const crypto = require("crypto");
const { Client } = require("pg");
const fs = require("fs");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const compression = require('compression');
const { off } = require("process");
require('./configPG.js')
require("./getStiri");
require('dotenv').config();
require("./real_time");
//require("./index");
const app = express();


/////////////////////////


app.use(cors());
app.use(fileUpload());
app.use(express.static("./poze"));
app.use(express.json());
app.use(compression())

//
const {client}  = require('./configPG.js');
const {client_ai_db} = require('./configDB_ai.js');
//
/*
client.query('select * from preturi order by id desc limit 1', (err, data)=>{
	if(err){
	console.log(err)
	}else{
		console.log(data.rows)
	}
})

//
*/
/////////////////////////
/*
const {HOST, USER_PG, PORT, PASSWORD, DATABASE} = process.env
console.log( HOST, USER_PG, PORT, PASSWORD, DATABASE, '------------------');
const client = new Client({
  host:HOST, user:USER, port:PORT, password:PASSWORD, database:DATABASE
});
*/

//////////////////////////////
app.get(`/test`, (req, res)=>{
		console.log('a venit cu succes!!!!!!!!!!!!!!!!!!!!!!!!!11')
	req.send('a venit cu succes!!!!!!!!!!!!!!!!!!!!!!!!!11')
})

///////////////////////////


//////////////////////////////// => upload file
app.post("/uploadFile", (req, res) => {

	

  let uid = req.query.uid;

  if (!req.files.image.data) {
    return res.send("eroare");
  }

  fs.writeFile(
    `./poze/${uid}.jpg`,
    req.files.image.data,
    (err) => {
      if (err) {
        console.log(err);
        return res.send("eroare");
      } else {
        return res.send(`ok`);
      }
    }
  );
});
////////////////////////////////////

// sterg preturile mai vechi de o zi


setInterval(() => {
  const query = `delete from realTimePrice where data < current_date  - interval '1 day';
  `;
  client.query(query, (err, data) => {
    if (err) {
      console.log(err);
    }else{
      console.log('a functionat cu stersul ', data)
    }
  });
}, 3 * 60 * 60 * 1000); // 3 h   

////////////////////////////sterg stirile mai vechi de doua saptamani
setInterval(() => {
  client.query(
    `
  delete from news where published_at < now() - interval '2 weeks'
  `,
    (err, data) => {
      if (err) {
        console.log(err);
      }
    }
  );
}, 24 * 60 * 60 * 1000); // o data pe zi

//////////////////////////////////
// => creez functie universala pt a lua date din query 
async  function iaQuery( obiect ){
  let {values, port} = obiect;
  let  rezultat = await client.query(`select query from 
  cereriPG where port = '${port}' `);
  let rezultatFinal = await client.query(rezultat.rows[0].query, values ? values : '');
  return rezultatFinal;
} 

/////////////////////////////////

app.get("/luamDate", async (req, res) => {
  try{
    const data = await iaQuery({port: 'luamdate'});
    res.json(data.rows);
  }catch(err){
    console.log(err);
    res.status(500).json();
  }
});
/////////////////////////////////////


app.get("/cautamDupaInput", async (req, res) => {
  
	console.log('am trimit date in node -----------------------------x')


  const valoareInput = req.query.input.toUpperCase();
  const values = [valoareInput + '%'];
  try{
    const data = await iaQuery({port: 'cautamDupaInput', values: values});
    res.json(data);
  }catch(err){
    console.log(err);
    res.status(500).json();
  }
});


/////////////////////////////////// => adaug in postgres useri + symbolFavorit

app.get("/adaugamInFavoriteUserSiSymbol", async (req, res) => {
  const symbol = req.query.symbol;
  const user = req.query.user;
  const values = [user, symbol];
  try{
    const data = await iaQuery({port: 'adaugamInFavoriteUserSiSymbol', values: values});
  res.json(data); 
  } catch(err){
    console.log(err);
    res.status(500).json();
  }
});

///////////////////////////////////////////

app.get("/datePentruPagSymbol", async (req, res) => {
  const values = [req.query.valoare];
  async function executamQueryPreturi() {
    try {
      const result = await iaQuery({port: 'datePentruPagSymbolUnu', values: values});
      return result.rows;
    } catch (err) {
      res.status(500).json();
      console.log("Nu a mers query cu preturi:", err);
    }
  }
  async function executamQueryDetalii() {
    try {
      const result = await iaQuery({port: 'datePentruPagSymbolDoi', values: values});
      return result.rows;
    } catch (err) {
      res.status(500).json();
      console.log("nu a mers la query detalii", err);
    }
  }

  try {
    const resultPreturi = await executamQueryPreturi();
    const resultDetalii = await executamQueryDetalii();
    res.send({ resultDetalii, resultPreturi });
  } catch (err) {
    res.status(500).json();
    console.log(err);
  }

});

/////////////////////////// => date_Tabel_Impaginare

app.get("/luamDateDupaRanduri",async (req, res) => {
  const numarRand = req.query.numarRand;

  const values = [numarRand];
  try{
    const data = await iaQuery({port: 'luamDateDupaRanduri', values: values});
    res.json(data.rows); 
  }catch(err){
    res.status(500).json();
    console.log(err);
  }
});

//////////////////////////// => introducem date de la Sign Up

function criptezParola(parola) {
  const hash = crypto.createHash("sha256");
  hash.update(parola);
  return hash.digest("hex");
}

app.post("/DateUser", async (req, res) => {
  let { email, nume, prenume, parola, telefon, codulUid, oraCreare } = req.body;
  const hashParola = criptezParola(parola);
  const values = [email, nume, prenume, hashParola, telefon, codulUid, oraCreare];
  try {
    const data = await iaQuery({ port: 'DateUser', values: values });
    res.status(200).json(data); 
  } catch (error) {
    res.status(500).json();
    console.log(error, 'DateUser');
  }
});


//////////////////////////////////// =>luam date dupa symbol

app.get("/luamDateDupaSymbol",async  (req, res) => {
  const values = [req.query.symbol];
  try {
    const data = await iaQuery({ port: 'luamDateDupaSymbol', values: values });
    res.json(data.rows); 
  } catch (error) {
    console.log(error);
    res.status(500).json();
  }
});
/////////////////////////////////// => luam din postgres symbolurile pentru userul conectat

app.get("/luamSymbolDupaUid", async (req, res) => {
  const values = [req.query.uid];

  try {
    const data = await iaQuery({ port: 'luamSymbolDupaUid', values: values });
    res.json(data.rows); 
  } catch (error) {
    console.log(error);
    res.status(500).json();
  }
});
//////////////////////////////// => luam preturi si detalii

app.get("/luamDetaliisiPreturi", async (req, res) => {
  const arrayCuFavorite = req.query.symboluri;
  async function executamQueryPreturi() {
    const values = [arrayCuFavorite];

    try {
      const result = await iaQuery({ port: 'luamDetaliisiPreturiUnu', values: values });
      //console.log(result.rows);
      return result.rows;
    } catch (err) {
      res.status(500).json();
      console.log("Nu a mers query cu preturi:", err);
    }
  }
  async function executamQueryDetalii() {
    const values = [arrayCuFavorite];
    try {
      const result = await iaQuery({ port: 'luamDetaliisiPreturiDoi', values: values });
      return result.rows;
    } catch (err) {
      console.log("Nu a mers la query cu detalii:", err);
      res.status(500).json();
    }
  }

  try {
    const [rezultatPreturi, rezultatDetalii] = await Promise.all([
      executamQueryPreturi(),
      executamQueryDetalii(),
    ]);
    res.json({ rezultatPreturi, rezultatDetalii });
  } catch (err) {
    console.log("A aparut eroare a promiseAll", err);
    res.status(500).json();
  }
});

//////////////////// => stergem date din favorite

app.get("/stergemDinFavorite", async (req, res) => {
  const values = [req.query.user, req.query.symbol];
  const values2 = [req.query.user];

  try{
    const result = await iaQuery({ port: 'stergemDinFavoriteUnu', values: values });
    const rezultat = await iaQuery({ port: 'stergemDinFavoriteDoi', values: values2 })
    res.json(rezultat.rows);
  }catch(err){
    console.log(err);
    res.status(500).json();
  }
});
////////////////// => luam date despre utilizator
app.get("/luamDateleUtilizatorului", async (req, res) => {
  const values = [req.query.uid];
  try{
    const rezultat = await iaQuery({ port: 'luamDateleUtilizatorului', values: values })
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err);
  }
});
///////////////// => luamFavoritePentruTrei

app.get("/luamFavoritePentruTrei", async (req, res) => {
  const values = [req.query.uid];
 
  try{
    const rezultat = await iaQuery({ port: 'luamFavoritePentruTrei', values: values })
    res.json(rezultat.rows);
  }catch(err){
    console.log(err, 'luamFavoritePentruTrei');
    res.status(500).json();
  }
});
///////////////////////////////////
app.get("/topGainTopLostPeUltimaZi", async (req, res) => {
  const values = [ req.query.uid];
  async function topGain() {
    const rezultat = await iaQuery({ port: 'topGainTopLostPeUltimaZi', values: values })
    return rezultat.rows;
  }
  async function topLost() {
    const rezultat = await iaQuery({ port: 'topGainTopLostPeUltimaZiDoi', values: values })
    return rezultat.rows;
  }
  try {
    const topGainVar = topGain();
    const topLostVar = topLost();

    Promise.all([topGainVar, topLostVar]).then((data) => {
      res.json(data);
    });
  } catch (err) {
    console.log(err);
    res.status(500).json();
  }
});
//////////////////////////// => luam Avg group by data
app.get("/luamAvg",async (req, res) => {
  const values = [req.query.uid]
  try{
    const rezultat = await iaQuery({ port: 'luamAvg', values: values })
    res.json(rezultat.rows);
  }catch(err){
    console.log(err, 'luamAvg');
    res.status(500).json();
  }
});
////// topGainDaily =>

app.get("/topGainDaily",async  (req, res) => {
  const values = [req.query.uid];
  try{
    const rezultat = await iaQuery({ port: 'topGainDaily', values: values })
    res.json(rezultat.rows);
  }catch(err){
    console.log(err, 'topGainDaily');
    res.status(500).json();
  }
});

////// /topGainWeekli =>
app.get("/topGainWeekli", async (req, res) => {
  const values = [req.query.uid]
  try{
    const rezultat = await iaQuery({ port: 'topGainWeekli', values: values })
    res.json(rezultat.rows);
  }catch(err){
    console.log(err, 'topGainWeekli');
    res.status(500).json();
  }
});

////////// => /topGainMonthly

app.get("/topGainMonthly",async  (req, res) => {
  const values = [req.query.uid];
  try{
    const rezultat = await iaQuery({ port: 'topGainMonthly', values: values })
    res.json(rezultat.rows);
  }catch(err){
    console.log(err, 'topGainMonthly');
    res.status(500).json();
  }
});
//////////////// => top lost daily

app.get("/topLostDaily", async (req, res) => {
  const values = [req.query.uid];
  try{
    const rezultat = await iaQuery({ port: 'topLostDaily', values: values })
    res.json(rezultat.rows);
  }catch(err){
    console.log(err, 'topLostDaily');
    res.status(500).json();
  }
});
/////// => /topLostWeekli

app.get("/topLostWeekli", async (req, res) => {
  const values = [req.query.uid];
  try{
    const rezultat = await iaQuery({ port: 'topLostWeekli', values: values })
    res.json(rezultat.rows);
  }catch(err){
    console.log(err, 'topLostWeekli');
    res.status(500).json();
  }
});
//////// => /topLostMonthly
app.get("/topLostMonthly", async (req, res) => {
  const values = [req.query.uid];
  try{
    const rezultat = await iaQuery({ port: 'topLostMonthly', values: values })
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'topLostMonthly');
  }

});
//////////////////  date chart trei =>

app.get("/datePtChart", async (req, res) => {
  const values = [req.query.uid];
  try{
    const rezultat = await iaQuery({ port: 'datePtChart', values: values })
    res.json(rezultat);
  }catch(err){
    res.status(500).json();
    console.log(err, 'datePtChart');
  }
});

//////// date chart fara user
app.get("/datePtChartFaraUser", async (req, res) => {

  try{
    const rezultat = await iaQuery({ port: 'datePtChartFaraUser'})
    res.json(rezultat);
  }catch(err){
    res.status(500).json();
    console.log(err, 'datePtChartFaraUser');
  }

  /////////////////////////////////////////////////
  //res.send('a ajuns cererea');
});
///////////// date pt Home2 => interval =>
app.get("/luamFavoritePentruTreiFaraUser",async  (req, res) => {
  try{
    const rezultat = await iaQuery({ port: 'luamFavoritePentruTreiFaraUser'})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'luamFavoritePentruTreiFaraUser');
  }
});
//////// /impaginareDiv3/3FaraUser =>
app.get("/impaginareDiv3/3FaraUser",async (req, res) => {
  const values = [req.query.from];
  try{
    const rezultat = await iaQuery({ port: 'impaginareDiv3/3FaraUser', values: values})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'impaginareDiv3/3FaraUser');
  }
});

////// frecventaDailyFU
app.get("/frecventaDailyFUTopGain",async (req, res) => {
  //frecventaDailyFUTopGain
  try{
    const rezultat = await iaQuery({ port: 'frecventaDailyFUTopGain'})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'frecventaDailyFUTopGain');
  }
});
//////////// top gain weekli fara utilizator
app.get("/frecventaWeekliFUTopGain",async  (req, res) => {
  try{
    const rezultat = await iaQuery({ port: 'frecventaWeekliFUTopGain'})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'frecventaWeekliFUTopGain');
  }
});
//////////// topGainMonthlyFU
app.get("/frecventaMonthlyFUTopGain",async  (req, res) => {
  try{
    const rezultat = await iaQuery({ port: 'frecventaMonthlyFUTopGain'})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'frecventaMonthlyFUTopGain');
  }
});
//////////
app.get("/frecventaDailyFUTopLost",async (req, res) => {
  console.log('am primit cerrea  -------')
  try{
    const rezultat = await iaQuery({ port: 'frecventaDailyFUTopLost'})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'frecventaDailyFUTopLost');
  }
});
//////////////////////////
app.get("/frecventaWeekliFUTopLost",  async (req, res) => {
  try{
    const rezultat = await iaQuery({ port: 'frecventaWeekliFUTopLost'})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'frecventaWeekliFUTopLost');
  }
});
////////=>
app.get("/frecventaMonthlyFUTopLost", async (req, res) => {
  try{
    const rezultat = await iaQuery({ port: 'frecventaMonthlyFUTopLost'})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'frecventaMonthlyFUTopLost');
  }
});
//////// media grafic fara user
app.get("/luamAvgFaraUser", async  (req, res) => {

	console.log('am primit cererea deci se executa!!!!!!!!!!!!!!!!!!!!!')

  const values = [req.query.numar];
  try{
    const rezultat = await iaQuery({ port: 'luamAvgFaraUser', values: values })
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'luamAvgFaraUser');
  }
});
////// adugam bani =>
app.get("/addMoney", async (req, res) => {
  const uid = req.query.uid;
  const bani = req.query.bani;
  const values = [uid, bani];
  const values2 = [uid];

  try{
    const rez = await iaQuery({ port: 'addMoney', values: values})
    const rezultat  = await iaQuery({port: 'addMoneyDoi', values: values2})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'addMoney');
  }
  
});
////////// luam pret dupa symbol
app.get("/luamPretulDupaSymbol", async  (req, res) => {
  const symbol = req.query.symbol;
  const uid = req.query.uid;
  const values = [ symbol, uid];
  try{
    const rezultat  = await iaQuery({port: 'luamPretulDupaSymbol', values: values})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'luamPretulDupaSymbol');
  }
});
////////// adaug in portofel
app.get("/adaugamStockInPortofel", async (req, res) => {
  let { uid, symbol, cantitate, valoare } = req.query;
  let valaoreTotala = valoare * cantitate;
  const values = [uid, symbol, cantitate, valaoreTotala];

  try{
    const rezultat  = await iaQuery({port: 'adaugamStockInPortofel', values: values})
    res.json(rezultat.rows[0].adaugamstockinportofoliu);
    //console.log(rezultat.rows[0].adaugamstockinportofoliu, '------ rezultatul');
  }catch(err){
    res.status(500).json();
    console.log(err, 'adaugamStockInPortofel');
  }
});
/////////// luam date din portofoliu
app.get("/luamDateDesprePortofoliu", async  (req, res) => {
  const values = [ req.query.uid];
  
  try{
    const rezultat  = await iaQuery({port: 'luamDateDesprePortofoliu', values: values})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'luamDateDesprePortofoliu');
  }
});
/////
app.get("/iauCantitateaSiPretulDupaSymbol",async  (req, res) => {
  const symbol = req.query.symbol;
  const uid = req.query.uid;
  const values = [uid, symbol];
  try{
    const rezultat  = await iaQuery({port: 'iauCantitateaSiPretulDupaSymbol', values: values})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'iauCantitateaSiPretulDupaSymbol');
  }
});
//////// vindem si incasam
app.get("/sesiuneaDeVanzare", async (req, res) => {
  const { symbol, cantitate, baniPtIncasare, uid } = req.query;
  //console.log(symbol, cantitate, baniPtIncasare, uid);
  const values = [uid, symbol, cantitate, baniPtIncasare];
  try{
    const rezultat  = await iaQuery({port: 'sesiuneaDeVanzare', values: values})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'sesiuneaDeVanzare');
  }
});
///////////////////////////////////

app.get("/topGainDailyPortofoliu",async  (req, res) => {
  const values = [req.query.uid]
  try{
    const rezultat  = await iaQuery({port: 'topGainDailyPortofoliu', values: values})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'topGainDailyPortofoliu');
  }
  
});

app.get("/topLostDailyPortofoliu", async (req, res) => {
  const values = [req.query.uid]
  try{
    const rezultat  = await iaQuery({port: 'topLostDailyPortofoliu', values: values})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'topLostDailyPortofoliu');
  }
});

/// => top gain weekly portofoliu
app.get("/topGainWeeklyPortofoliu", async (req, res) => {
  const values = [req.query.uid]
  try{
    const rezultat  = await iaQuery({port: 'topGainWeeklyPortofoliu', values: values})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'topGainWeeklyPortofoliu');
  }
});
////////////////////////////////////////////
app.get("/topLostWeeklyPortofoliu", async (req, res) => {
  const values = [req.query.uid]
  try{
    const rezultat  = await iaQuery({port: 'topLostWeeklyPortofoliu', values: values})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'topLostWeeklyPortofoliu');
  }
});
//////////////////////////////////
app.get("/topGainMonthlyPortofoliu",async (req, res) => {
  const values = [req.query.uid]
  try{
    const rezultat  = await iaQuery({port: 'topGainMonthlyPortofoliu', values: values})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'topGainMonthlyPortofoliu');
  }
});
///////////////

app.get("/topLostMonthlyPortofoliu", async (req, res) => {
  const values = [req.query.uid];
  try{
    const rezultat  = await iaQuery({port: 'topLostMonthlyPortofoliu', values: values})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'topLostMonthlyPortofoliu');
  }
});
////////////////// istoric tranzactii

app.get("/istoricTranzactii", async (req, res) => {
  const uid = req.query.uid;
  const limita = req.query.limita;
  const values = [uid, limita]
  try{
    const rezultat  = await iaQuery({port: 'istoricTranzactii', values: values})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'istoricTranzactii');
  }
});
/////////////////////////////////// => luam news
app.get("/luamNews", async (req, res) => {
  const {valoare, offset, limit} = req.query;
  const values = [valoare, offset, limit];
  try{
    const rezultat  = await iaQuery({port: 'luamNews', values: values})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'luamNews');
  }
});

//////////////////////////////////////////
// => testez sa iau preturile pentru a completa ulterior cu ws
app.get(`/luamDatePeJumate`, async (req, res) => {
  const { symbol } = req.query;
  const value = [symbol];
  try{
    const rezultat  = await iaQuery({port: 'luamDatePeJumate', values: value})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'luamDatePeJumate');
  }
});

// = > iau pretul din realtime pentru a vedea pretul dar si valoare portofelului pt fiecare user
app.get("/luamPretulDupaSymbolRealTime",async  (req, res) => {
  const { uid, symbol } = req.query;

  const valoare = [uid, symbol];
  try{
    const rezultat  = await iaQuery({port: 'luamPretulDupaSymbolRealTime', values: valoare})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'luamPretulDupaSymbolRealTime');
  }
});
// iau date din tabela real time deoarece adaug si OHLC in pagina symbol
app.get("/luamPreturiOHLCdinRealTime", async (req, res) => {
  const symbol = req.query.s;

  const value = [symbol];
  try{
    const rezultat  = await iaQuery({port: 'luamPreturiOHLCdinRealTime', values: value})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'luamPreturiOHLCdinRealTime');
  }
  
});

////// => cand primesc o eroare de la client o bag in eroriDinClint.js
app.get("/trimitemEroareaInServer", (req, res) => {
  const { uid, err } = req.query;

  let continut = JSON.stringify({ uid, err });

  fs.appendFileSync("eroriDinClint.txt", continut);
});

//////////// => iau scrisul pentr limba dorita de client
app.get("/scrisulPentruLimbaDorita", async (req, res) => {
  const { pagina, limba } = req.query;
  client.query(
    `select text , ${limba} as scris from scris_limbi where pagina = '${pagina}'`,
    (err, data) => {
      if (err) {
        res.status(500).json();
        //console.log(err, "scrisulPentruLimbaDorita");
      } else {
        res.json(data.rows);
      }
    }
  );
  
});
//////////////// => iau toate tranzactiile dar fara codul uid 
app.get('/toateTranzactiileFaraUid',async  (req, res)=>{
  try{
    const rezultat  = await iaQuery({port: 'toateTranzactiileFaraUid'})
    res.json(rezultat.rows);
  }catch(err){
    res.status(500).json();
    console.log(err, 'toateTranzactiileFaraUid');
  }
}) 


// // => cod pag ai 
// /// //
// // //
// // / //\\


app.post('/stocamConversatiaInDB', (req, res)=>{
  const {user_uid, id_conversatie, data} = req.body;
  const query = `insert into conversatii (user_uid, id_conversatie, data) values ($1, $2, $3) `
  const values = [user_uid, id_conversatie, data];
  client_ai_db.query(query, values, (err, data)=>{
    if(err){
      console.log(err)
    }else{
      res.send('totul este ok la insert conversatii')
    }
  })
})


// id_conversatie, mesaj, tip_mesaj
app.post('/stocamMesajeInDB', (req, res)=>{
  const {mesaje, id_conversatie, data} = req.body;
  let arPtDB = [];
  for(ob of mesaje){
    ob.id_conversatie = id_conversatie;
    ob.data = data;
    arPtDB.push(ob);
  }
  
  
  const query = `INSERT INTO mesaje (mesaj, tip_mesaj, id_conversatie, data)
  SELECT (json_data->>'mesaj')::text, (json_data->>'tip_mesaj')::text, (json_data->>'id_conversatie')::text,
  (json_data->>'data')::numeric 
  FROM json_array_elements($1::json) AS json_data`;
  client_ai_db.query(query, [JSON.stringify(arPtDB)], (err, data)=>{
    if(err){
      console.log(err)
    }else{
      res.send('am stocat cu bine')
    }
  })
})


app.get('/iauToateConversatiileDupaUid', (req, res)=>{
  const {uid} = req.query;
  const query = `
  with mesg as (
  select mes.mesaj as mesaj, mes.id as id, mes.id_conversatie as id_conv from mesaje mes
    join ( select min(id) , id_conversatie from mesaje group by id_conversatie ) msg on mes.id = msg.min )
  select conv.id_conversatie  as id_conversatie, conv.data as data, mess.mesaj as mesaj from conversatii conv
    join (select mesg.mesaj, mesg.id_conv as id_conv from mesg) mess on mess.id_conv = conv.id_conversatie
  where conv.user_uid = $1  order by conv.id desc`;
  const values = [uid];
  client_ai_db.query(query, values, (err, data)=>{
    if(err){
      console.log(err)
    }else{
      res.send(data.rows);
      // console.log(data, '-------------------');
    }
  })
})

app.get('/apasamPeConversatiaDorita', (req, res)=>{
  const {idConv} = req.query;
  const values = [idConv];
  const query = `select mesaj, tip_mesaj, data from mesaje where id_conversatie = $1 order by id `
  client_ai_db.query(query, values, (err, data)=>{
    if(err){
      console.log(err)
    }else{
      res.send(data.rows);
    }
  })
})


app.get('/stergemConversatia', (req, res)=>{
  const {id_conversatie} = req.query;
  const query = `
  BEGIN;
  delete from conversatii where id_conversatie = '${id_conversatie}';
  delete  from mesaje where id_conversatie = '${id_conversatie}';
  COMMIT;
  `;
  client_ai_db.query(query, (err, data)=>{
    if(err){
      console.log(err)
    }else{
      res.send('am sters corect peste tot')
    }
  })
})

app.get(`/luamBaniiDinDB`, (req, res)=>{
  const {uid} = req.query;
  const values = [uid];
  const query = 'select sum(bani) from cash where useruid = $1 '
  client.query(query, values, (err, data)=>{
    if(err){
      console.log(err)
    }else{
      res.send(data.rows);
    }
  })
})
app.post(`/luamTokeniDupaUser`, (req, res)=>{
  const {uid} = req.body;
  const values = [uid];
  const query = `select sum(tokeni) from tokeni_ai where uid = $1 `;
  client_ai_db.query(query, values, (err,data)=>{
    if(err){
      console.log(err)
    }else{
      res.send(data.rows);
    }
  })
})

app.post(`/scademTokeniSiAdaugamLaIstoric`, (req, res)=>{
  const { uid, tokeni, data, id_conversatie, nume_conversatie} = req.body;
  const query = `
  BEGIN;
  insert into tokeni_ai (uid, tokeni) values ('${uid}', ${tokeni});
  insert into istoric_tokeni_ai (uid, tokeni, data, id_conversatie, nume_conversatie) values ('${uid}', ${tokeni}, ${data}, '${id_conversatie}', '${nume_conversatie}');
  COMMIT;
  `;
  client_ai_db.query(query, (err, data)=>{
    if(err){
      console.log(err)
    }else{
      res.send('ok');
    }
  })
})

app.post(`/adaugamTokeniScademBani`, (req, res)=>{
  const {uid} = req.body;
  const {bani, tokeni} = req.body.alegere;
  // console.log(bani, tokeni, uid);
  const valUnu = [uid, bani];
  const queryUnu = `insert into cash (useruid, bani) values ( $1, $2)`;
  
  
  client.query(queryUnu, valUnu, (err, data)=>{
    if(err){
      console.log(err)
    }else{
      client_ai_db.query(`insert into tokeni_ai (uid, tokeni) values ( '${uid}' ,  ${tokeni} ); select sum(tokeni) from tokeni_ai where uid = '${uid}'`
        ,(eroare, rezolvare)=>{
        if(eroare){
          console.log(eroare)
        }else{
          res.send(rezolvare[1].rows);
        }
      })
    }
  })
})
app.post('/aratamIstoricTokeni', (req, res)=>{
  const {uid} = req.body;
  const values = [uid];
  const query = `select tokeni, data, nume_conversatie, id_conversatie from istoric_tokeni_ai where uid = $1  order by id desc limit 20  `;
  client_ai_db.query(query, values, (err, data)=>{
    if(err){
      console.log(err)
    }else{
      res.send(data.rows);
    }
  })

})


//////////////////////////////////
app.listen(5000, () => {
  console.log("rulam la localhost 5000");
});


/*

CREATE OR REPLACE FUNCTION adaugamStockInPortofoliu( uid text, symbol text, cantitate numeric, valoareTotala numeric)
RETURNS numeric AS $$
DECLARE
  bani_portofel numeric;
BEGIN
  -- Verificați dacă suma în cash este mai mare sau egală cu valoarea totală
  SELECT sum(bani) INTO bani_portofel FROM cash WHERE useruid = uid;
  IF bani_portofel >= valoareTotala THEN
    -- Actualizați tabela portofoliu și cash
    INSERT INTO portofoliu (uid, symbol, cantitate, bani) VALUES (uid, symbol, cantitate, -valoareTotala);
    INSERT INTO cash (useruid, bani) VALUES (uid, -valoareTotala);
  ELSE
    RAISE EXCEPTION 'Eroare: Fonduri insuficiente în cont';
  END IF;
  -- Returnați noul sold în cash
  RETURN bani_portofel - valoareTotala;
END;
$$ LANGUAGE plpgsql;

*
/*
SELECT subquery.symbol  as returned_symbol, subquery.cantitate  as returned_cantitate , cash.sum AS returned_cash	FROM (
	  SELECT symbol, SUM(cantitate) AS cantitate
	  FROM portofoliu
	  WHERE uid = uid_param
	  GROUP BY symbol
	  HAVING SUM(cantitate) > 0
	) AS subquery
	CROSS JOIN (SELECT SUM(bani) FROM cash WHERE useruid = uid_param) AS cash(sum);
*/


/*


DROP FUNCTION IF EXISTS sesiunedevanzare(text, text, numeric, numeric);

------------------------------------------------------
CREATE OR REPLACE FUNCTION sesiunedevanzare(uid__uid text, symbol__symbol text , cantitate__cantitate numeric , val__val numeric )
RETURNS TABLE (returned_symbol text, returned_cantitate numeric, returned_cash numeric) AS $$
BEGIN
	-- creez o tabela temporar si aduga valoarea de cantitate si symbolul 
	DROP TABLE IF EXISTS verificCantitate;
	CREATE TEMPORARY TABLE verificCantitate (cantitate numeric, symbol text, uid text, bani numeric);
	INSERT INTO verificCantitate (cantitate, symbol, uid, bani) VALUES (cantitate__cantitate, symbol__symbol, uid__uid, val__val ); --- suma pe care doresc sa o scad 

	-- codul care scade doar daca avem cantitate
	drop table  if exists cantitateAvuta;
	create temporary table cantitateAvuta (cantitate numeric, symbol text);
	insert into cantitateAvuta (cantitate, symbol) 
	  select  sum(cantitate), symbol from portofoliu where symbol = symbol__symbol and uid = uid__uid
	group by symbol;

	

	insert into cash (useruid, bani) 
		select uid__uid, val__val 
	  from verificCantitate  
	  join cantitateAvuta on cantitateAvuta.symbol = verificCantitate.symbol
	  join ( select max(data), symbol from preturi where symbol = symbol__symbol group by symbol ) dataMaxima on dataMaxima.symbol = verificCantitate.symbol
	  join preturi on preturi.symbol = verificCantitate.symbol and preturi.data = dataMaxima.max
	  where verificCantitate.cantitate <= cantitateAvuta.cantitate
	  limit 1;
	--commit;
	
	-----------------------------------------------------
	insert into portofoliu (uid, symbol, cantitate, bani)
	select verificCantitate.uid, verificCantitate.symbol, 
	  -verificCantitate.cantitate, verificCantitate.bani
	  from verificCantitate where verificCantitate.cantitate <= (SELECT cantitate FROM cantitateAvuta WHERE symbol = symbol__symbol);
	  --------------------------------------------------
	
	  RETURN QUERY
    SELECT subquery.symbol AS returned_symbol, subquery.cantitate AS returned_cantitate, cash.sum AS returned_cash
    FROM (
      SELECT symbol, SUM(cantitate) AS cantitate
      FROM portofoliu
      WHERE uid = uid__uid
      GROUP BY symbol
      HAVING SUM(cantitate) > 0
    ) AS subquery
    CROSS JOIN (SELECT SUM(bani) FROM cash WHERE useruid = uid__uid) AS cash(sum);

END;
$$ LANGUAGE plpgsql;


*/
