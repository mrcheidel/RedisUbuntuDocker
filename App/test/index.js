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
    	if (data.toString().substring(0, 1) == "#"){
    		this.write('login ' + this.user + '\n');
    	} else if (data.toString().substring(0, 7) == "Welcome") {
   			setTimeout((function () {
    			this.write('msg ' + this.user +' Hola\n');
				setTimeout((function () {
					this.write('exit\n');
				}).bind(this), 180 * 1000);
    		}).bind(this), 180 * 1000);

    	} else {
    
    		console.log (data.toString());
    	}
    });

    this.socket.on('error', function(exception) {
		console.log ("\n-- Error --------------------------------------\n");
        console.log (exception.stack);
		fs.appendFile('error.log', "\n-- Error --------------------------------------\n" + exception.stack + "\n", function (err) {
  			if (err) console.log (err.toString());
		});   
    });

	this.socket.on('end', () => {
		//console.log('disconnected from server');
	});


    this.socket.connect(5000, '127.0.0.1');
}


var i = 0;
var myVar = setInterval(function () {
	if (i < 50000){
	 	clients.push(new Dummy(i));
	 	i++;
	} else {
		clearInterval(myVar);
	}
}, 4, i);

/*


// http://www.toptip.ca/2010/02/linux-eaddrnotavail-address-not.html
// https://blog.dekstroza.io/ulimit-shenanigans-on-osx-el-capitan/
// https://discuss.elastic.co/t/increasing-max-file-descriptors-osx/70482/4

# Check the current values

   sysctl net.inet.ip.portrange.first net.inet.ip.portrange.last

# set the new values
   sudo  sysctl net.inet.ip.portrange.first=35535  
   
   
// sudo launchctl limit maxfiles 1000000 200000

*/ 

/*

     The net.inet.ip.portrange.* sysctls control the port number ranges	auto-
     matically bound to	TCP and	UDP sockets.  There are	three ranges: a	low
     range, a default range, and a high	range, selectable via the IP_PORTRANGE
     setsockopt(2) call.  Most network programs	use the	default	range which is
     controlled	by net.inet.ip.portrange.first and net.inet.ip.portrange.last,
     which default to 49152 and	65535, respectively.  Bound port ranges	are
     used for outgoing connections, and	it is possible to run the system out
     of	ports under certain circumstances.  This most commonly occurs when you
     are running a heavily loaded web proxy.  The port range is	not an issue
     when running a server which handles mainly	incoming connections, such as
     a normal web server, or has a limited number of outgoing connections,
     such as a mail relay.  For	situations where you may run out of ports, we
     recommend decreasing net.inet.ip.portrange.first modestly.	 A range of
     10000 to 30000 ports may be reasonable.  You should also consider fire-
     wall effects when changing	the port range.	 Some firewalls	may block
     large ranges of ports (usually low-numbered ports)	and expect systems to
     use higher	ranges of ports	for outgoing connections.  By default
     net.inet.ip.portrange.last	is set at the maximum allowable	port number.

*/


