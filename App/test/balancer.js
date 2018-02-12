#!/usr/bin/env node

var net = require('net');
var rr = require('rr');
var os = require('os');




var add = {
	"from": {"host":"127.0.0.1", "port": "4500"},
	"to": [
    		{"host": "127.0.0.1", "port":5000},
    		{"host": "127.0.0.1", "port":5001},
    		{"host": "127.0.0.1", "port":5002},
		  ]};
			
console.clear();
console.log (new Date().toJSON());
console.log ("Starting CPUs Balancing: " + os.cpus().length);
console.log ("Listening on: " + add.from.host + ":" + add.from.port);
			

var server = net.createServer(function(from) {

	var t = rr(add.to);
    var to = net.createConnection({
        host: t.host,
        port: t.port
    });
    
	to.on('error', (err) => {
		console.log ("\n" + new Date().toJSON() +  "\n-- Balancer To error --\n" + e.stack || e + "\n");
		from.end();
		to.end();
	});
	
	from.on('error', (err) => {
		console.log ("\n" + new Date().toJSON() +  "\n-- Balancer From error --\n" + e.stack || e + "\n");
		from.end();
		to.end();
	});

    from.pipe(to);
    to.pipe(from);

}).listen(add.from.port, add.from.host);

