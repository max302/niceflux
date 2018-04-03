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

// Schema information
/*
conf.influx.schema = [
  {
    measurement : "worker",
    tags  : "name",
    fields : {
      // Fields listed in stats.provider.workers provider in Nicehash API
      addr : FieldType.STRING,
      a : FieldType.FLOAT,
      rs : FieldType.FLOAT,
      contime : FieldType.INTEGER,
      xnsub : FieldType.BOOL,
      diff : FieldType.FLOAT,
      loc : FieldType.STRING,
    }
  },
  {
    measurement : "balance",
    tags  : "address",
    fields : {
      // Fields listed in stats.provider.ex. Not all fields are used.
      balance : FieldType.FLOAT,
      profitability : FieldType.FLOAT
  }
}]
*/

var algo_info = [   // Array index corresponds to algo as documented here: https://www.nicehash.com/doc-api
  { name : "Scrypt", suffix : ""},
  { name : "SHA256", suffix : ""},
  { name : "ScryptNf", suffix : ""},
  { name : "X11", suffix : ""},
  { name : "X13", suffix : ""},
  { name : "Keccak", suffix : ""},
  { name : "X15", suffix : ""},
  { name : "Nist5", suffix : ""},
  { name : "NeoScrypt", suffix : ""},
  { name : "Lyra2RE", suffix : ""},
  { name : "WhirlpoolX", suffix : ""},
  { name : "Qubit", suffix : ""},
  { name : "Quark", suffix : ""},
  { name : "Axiom", suffix : ""},
  { name : "Lyra2REv2", suffix : ""},
  { name : "ScryptJaneNf16", suffix : ""},
  { name : "Blake256r8", suffix : ""},
  { name : "Blake256r8vnl", suffix : ""},
  { name : "Hodl", suffix : ""},
  { name : "DaggerHashimoto", suffix : ""},
  { name : "Decred", suffix : ""},
  { name : "CryptoNight", suffix : ""},
  { name : "Lbry", suffix : ""},
  { name : "Equihash", suffix : ""},
  { name : "Pascal", suffix : ""},
  { name : "X11Gost", suffix : ""},
  { name : "Sia", suffix : ""},
  { name : "Blake2s", suffix : ""},
  { name : "Skunk", suffix : ""},
  { name : "CryptoNightV7", suffix : ""},
]

//Init Influxdb instance
const influx = new Influx.InfluxDB(conf.influx);

function get_data(method, callback) {
  var client = restify.createJsonClient({ url : "https://api.nicehash.com", query : { method : method, addr : conf.nicehash.addr }});
  client.get("/api", function(err, req, res, obj) {
    assert.ifError(err);
    callback(obj);
    return 0;
  });
}


function log_workers(results) {
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
    ])
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
  })
  console.log("--------------------------")
}

  get_data("stats.provider.workers", log_workers);
  get_data("stats.provider.ex", log_global);

/*

printres(var results) {
  console.log(JSON.stringify(results));
}
*/
