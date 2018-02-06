#!/usr/bin/env node

// sudo sysctl -w kern.maxfiles=49152
// sudo sysctl -w kern.maxfilesperproc=24576


var net = require('net');
var clients = [];

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
    			this.write('msg ' + this.user +' Hola\n');
    			//this.end();	
    		}).bind(this), 1000);
    		
    		setTimeout((function () {
    			this.end();	
    		}).bind(this), 5000);
    		
    	} else {
    		console.log (data.toString());
    	}

    });

    this.socket.on('error', function(exception) {
		console.log ("\n-- Error --------------------------------------\n");
        console.log (exception);
        console.log (exception.stack);
    });

	this.socket.on('end', () => {
		//console.log('disconnected from server');
	});

    this.socket.connect(5000, '127.0.0.1');
}

for (var i = 0; i < 15000; i++) {
    clients.push(new Dummy(i));
};
