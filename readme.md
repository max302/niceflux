A simple Nicehash monitoring script that pulls API info from Nicehash and stores it to an Influx DB server. With this data, you can use Grafana or Chrongraf to create graphs, dashboards and such.

![Dashboard example]
(https://github.com/max302/niceflux/blob/master/media/samplegraphs-early-1.png)

*As of now, there is no error handling. Looping the script with a shell script (it is included) works, but is definitely hacky.*

## Data model

Where it makes sense, data is put in the database with the exact same variable names as Nicehash outputs via it's API. We use two different methods.

### stats.provider.ex

Here is the output as per [documentation](https://www.nicehash.com/doc-api)

```JSON
{"method":"stats.provider.ex",
"result":{
	"addr":"17a212wdrvEXWuipCV5gcfxdALfMdhMoqh",
	"current":[{
		"algo":3, // algorithm number (3 = X11)
		"name":"X11", // algorithm name
		"suffix":"MH", // speed suffix (kH, MH, GH, TH,...)
		"profitability":"0.00045845", // current profitability in BTC/suffix/Day
		"data":[{ // speed object can contain following fields:
			  // a (accepted), rt (rejected target), rs (rejected stale),
			  // rd (rejected duplicate) and ro (rejected other)
			  // if fields are not present, speed is 0
			"a":"23.09", // accepted speed (in MH/s for X11)
			"rs":"0.54", // rejected speed - stale
			},
			"0.0001234" // balance (unpaid)
		]},
		... // other algorithms here
	],
	"past":[{
		"algo":3,
		"data":[
			[4863234, // timestamp; multiply with 300 to get UNIX timestamp
			{"a":"28.6"}, // speed object
			"0" // balance (unpaid)
			],[4863235,{"a":"27.4"},"0.00000345"],
			... // next entries with inc. timestamps
		]},
		... // other algorithms here
	],
	"payments":[], // empty array
	}
}
```

Everything we use is a child to the `result` or deeper.

* addr  : Queried address. We know this since we're the ones who provided it.
*

### stats.provider.workers

Here is the output as per [documentation](https://www.nicehash.com/doc-api).

*Unfortunately, it is impossible to poll all the workers in one API call.* Keep this in mind if you are polling a lot, you might be rate limited if Nicehash judges that you're calling them too much.

```JSON
{
"method":"stats.provider.workers",
"result":{
	"addr":"17a212wdrvEXWuipCV5gcfxdALfMdhMoqh",
	"algo":3,
	"workers":[[
		"rigname", // name of the worker
		{"a":"11.02","rs":"0.54"}, // speed object
		15, // time connected (minutes)
		1, // 1 = xnsub enabled, 0 = xnsub disabled
		"0.1", // difficulty
		0, // connected to location (0 for EU, 1 for US, 2 for HK and 3 for JP)
	],
	... // other workers here
	]
}
}
``
