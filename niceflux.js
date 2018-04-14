// Includes
const Influx = require("influx");
const FieldType = require('influx').FieldType;
const restify = require('restify-clients');
const assert = require('assert');
var sleep = require('sleep');

// Configuration object
var conf = {
  influx    : {
    host        : "10.1.6.2",
    port        : "8086",
    database    : "nicehash",
    username    : "",
    password    : ""
  },
  nicehash  : {
    addr  : "3KMDFNd7uVvE8Juczuk16uNnQccNCuapEb"
  }
}
// End Configuration

var algo_info = [   // Array index corresponds to algo as documented here: https://www.nicehash.com/doc-api
  { name : "Scrypt", suffix : "", active : 0 },
  { name : "SHA256", suffix : "", active : 0 },
  { name : "ScryptNf", suffix : "", active : 0 },
  { name : "X11", suffix : "", active : 0 },
  { name : "X13", suffix : "", active : 0 },
  { name : "Keccak", suffix : "", active : 0 },
  { name : "X15", suffix : "", active : 0 },
  { name : "Nist5", suffix : "", active : 0 },
  { name : "NeoScrypt", suffix : "", active : 0 },
  { name : "Lyra2RE", suffix : "", active : 0 },
  { name : "WhirlpoolX", suffix : "", active : 0 },
  { name : "Qubit", suffix : "", active : 0 },
  { name : "Quark", suffix : "", active : 0 },
  { name : "Axiom", suffix : "", active : 0 },
  { name : "Lyra2REv2", suffix : "", active : 0 },
  { name : "ScryptJaneNf16", suffix : "", active : 0 },
  { name : "Blake256r8", suffix : "", active : 0 },
  { name : "Blake256r14", suffix : "", active : 0 },
  { name : "Blake256r8vnl", suffix : "", active : 0 },
  { name : "Hodl", suffix : "", active : 0 },
  { name : "DaggerHashimoto", suffix : "", active : 0 },
  { name : "Decred", suffix : "", active : 0 },
  { name : "CryptoNight", suffix : "", active : 0 },
  { name : "Lbry", suffix : "", active : 0 },
  { name : "Equihash", suffix : "", active : 0 },
  { name : "Pascal", suffix : "", active : 0 },
  { name : "X11Gost", suffix : "", active : 0 },
  { name : "Sia", suffix : "", active : 0 },
  { name : "Blake2s", suffix : "", active : 0 },
  { name : "Skunk", suffix : "", active : 0 },
  { name : "CryptoNightV7", suffix : "", active : 0 },
];

//Init Influxdb instance
const influx = new Influx.InfluxDB(conf.influx);

function get_data(method,algo,callback) {
  var args = { url : "https://api.nicehash.com", query : { method : method, addr : conf.nicehash.addr}}
  if (algo){
    args.query.algo = algo;
  }
  var client  = restify.createJsonClient(args);
  return new Promise(function(resolve, reject) {
    client.get("/api", function(err, req, res, obj) {
      if (err){
        reject(err);
      }
      else {
        callback(obj);  // Is callback called in async manner?  Seems to work, but TODO
        resolve(1);
      }

    });
  });
}


function log_worker(results) {
  results.result.workers.forEach(function(i) {
    //Normalized values to the proper types. Maybe this can be done with the influx schema?
    speed_object = Object.keys(i[1])[0];
    speed = Object.values(i[1])[0];
    console.log("Worker " + i[0] + ": " + speed + " " + speed_object);

    influx.writePoints([
      {
        measurement: 'worker',
        tags: { addr: [results.result.addr], rigname : [i[0]], algo : [results.result.algo] },
        fields: {
          [speed_object] : [speed],
          contime : i[2],
          xnsub : i[3],
          diff : i[4],
          loc : i[5]
        },
      }
    ]);
  } );

}

function log_global(results) {
  results.result.current.forEach(function(i){ // i is a stand-in for algo...
    var profitability = parseFloat(i.profitability);
    var balance = parseFloat(i.data[1]);
    console.log("Stats for algo" + i.name);
    console.log("Profitability: " + profitability);
    console.log("Balance:" + balance)
    console.log("");
    influx.writePoints([
      {
        measurement: 'global',
        tags: { addr : results.result.addr, algo : i.name },
        fields: {
          //suffix : i.suffix,
          profitability : [profitability],
          //accepted : i.data[0].a,
          //reject_target : i.data[0].rt,
          //reject_duplicate : i.data[0].rd,
          //reject_other : i.data[0].ro,
          balance :  [balance]
        },
      }
    ])

    algo_info[i.algo].active = 1;
  })
  console.log("--------------------------")
}

function get_active(){
  algo_info.forEach(function(algo,i){
    if (algo.active == 1) {
      get_data("stats.provider.workers", i , log_worker);
    }
  });
}

const asyncloop  = async () => {
  await get_data("stats.provider.ex","", log_global);
  get_active();
}
asyncloop();
