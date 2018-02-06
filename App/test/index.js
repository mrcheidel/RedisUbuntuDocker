#!/usr/bin/env node

// sudo sysctl -w kern.maxfiles=49152
// sudo sysctl -w kern.maxfilesperproc=24576


var net     = require('net');
var clients = [];
var fs      = require('fs');

function Dummy(i){
    this.socket = require('net').Socket();
    this.socket.user = 'User' + i;
    this.socket.on('connect', function () {
		console.log (this.user);
    });

    
    this.socket.on('data', function (data) {
    	
    	if (data.toString() == "#\n"){
    		this.write('login ' + this.user +'\n');
    		setTimeout((function () {
    			this.write('msg Claudio Hola\n');
    		}).bind(this), 2000);
    	} else if (data.toString().substring(0, 7) == "Welcome") {
    		setTimeout((function () {
    			this.write('exit\n');
    		}).bind(this), 2000);
    		
    	} else {
    		console.log (data.toString());
    	}
    });

    this.socket.on('error', function(exception) {
		console.log ("\n-- Error --------------------------------------\n");
        console.log (exception.stack);
		fs.appendFile('error.log', "\n-- Error --------------------------------------\n" + exception.stack + "\n", function (err) {
  			if (err) throw err;
		});   
    });

	this.socket.on('end', () => {
		//console.log('disconnected from server');
	});

    this.socket.connect(5000, '127.0.0.1');
}

for (var i = 0; i < 20000; i++) {
    clients.push(new Dummy(i));
};
