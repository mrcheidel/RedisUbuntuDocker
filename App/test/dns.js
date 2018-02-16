#!/usr/bin/env node

//https://github.com/tjfontaine/node-dns

// https://www.infoq.com/articles/rest-discovery-dns

var dns = require('native-dns');
var server = dns.createServer();

/*
var records = {
  "myservice.example.org" : [
    {"address":"1.2.3.1","type":"A","ttl":60},
    {"address":"1.2.3.2","type":"A","ttl":60},
    {"address":"1.2.3.3","type":"A","ttl":60},
    {"address":"1.2.3.4","type":"A","ttl":60},
    {"address":"1.2.3.5","type":"A","ttl":60},
  ]
};
console.log (records);
*/


/*
Testing

run this script as sudo and open a second console to run the follow command:

nslookup -type=SRV example.org  127.0.0.1
 
 
*/

server.on('request', function (request, response) {

	console.log("\n\n\n\n\n\n\n");
	console.log(request);

	if (request.question[0].type == 33) {
	  response.additional.push(dns.SRV({
		name: request.question[0].name,
		ttl: 600,
		priority: 0,
		weight: 0,
		port: 5001,
		target: request.question[0].name
	  }));
	} else {
	  response.answer.push(dns.A({
		name: request.question[0].name,
		address: '127.0.0.1',
		ttl: 600,
	  }));
	  response.answer.push(dns.A({
		name: request.question[0].name,
		address: '127.0.0.2',
		ttl: 600,
	  }));
	}


  response.send();
});

server.on('error', function (err, buff, req, res) {
  console.log(err.stack);
});

server.serve(53);