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
    speed_unit = Object.keys(i[1])[0];
    speed = Object.values(i[1])[0];
    influx.writePoints([
      {
        measurement: 'worker',
        tags: { addr: results.result.addr, rigname : i[0], algo : results.result.algo},
        fields: {
          [speed_unit] : [speed],
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
    console.log(profitability);
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
          balance :  balance
        },
      }
    ])
  })
}

  get_data("stats.provider.workers", log_workers);
  get_data("stats.provider.ex", log_global);

/*

printres(var results) {
  console.log(JSON.stringify(results));
}
*/
