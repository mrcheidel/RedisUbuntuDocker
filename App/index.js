#!/usr/bin/env node

/*

# http://www.toptip.ca/2010/02/linux-eaddrnotavail-address-not.html
# https://blog.dekstroza.io/ulimit-shenanigans-on-osx-el-capitan/
# http://blog.caustik.com/2012/08/19/node-js-w1m-concurrent-connections/
# https://blog.jayway.com/2015/04/13/600k-concurrent-websocket-connections-on-aws-using-node-js/

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

# Check the current values

   sysctl net.inet.ip.portrange.first net.inet.ip.portrange.last

# set the new values to accept 50100 connections (65535 - 5100)

   sudo  sysctl net.inet.ip.portrange.first=15435  
   
# sudo launchctl limit maxfiles 524288 524288




*/



// Load the TCP Library
net      = require('net');
redis    = require("redis");
freeport = require("find-free-port");

// Keep track of the clients
var clients         = [];
var redis_host      = '127.0.0.1';
var redis_port      = 6379;
var serv_pfx        = 'microserv_socket_';
var serv_timeout    = 10; //seconds
var serv_channel;
var socket_timeout  = 10; //seconds
var serv_subscriber = redis.createClient(redis_port, redis_host);
var serv_publisher  = redis.createClient(redis_port, redis_host);
const fs = require('fs');


serv_subscriber.on("error", function (err) {
    console.log("serv_subscriber " + err);
	fs.appendFile('serv_subscriber.log', "\n-- Error ---\n" + e.stack || e + "\n", function (err) {
		if (err) console.log (err.toString());
	});   
});

serv_subscriber.on("error", function (err) {
    console.log("serv_publisher " + err);
	fs.appendFile('serv_publisher.log', "\n-- Error ---\n" + e.stack || e + "\n", function (err) {
		if (err) console.log (err.toString());
	});   
});


freeport(5000, 5100, function(err, freePort){

//clear screen
console.log('\033[2J');

// Start a TCP Server
const server = net.createServer(function(socket) {

    // Identify this client
    socket.name = socket.remoteAddress + ":" + socket.remotePort;
    
/* 
	socket.sub  = redis.createClient(redis_port, redis_host);
   	socket.sub.on("message", function(channel, message) {
   		if (socket.writable) {
   			socket.write('socket.sub-> channer:' + channel + ", message: " + message + "\n");
   		}
    });
*/
    socket.username = null;
    
    // Put this new client in the list
    clients.push(socket);
	socket.setTimeout(socket_timeout * 1000);
	
    socket.write ("#\n");

	socket.on('timeout', () => {
		if (socket.username!== null) {
			serv_publisher.expire (socket.username, socket_timeout * 2);
			socket.setTimeout(socket_timeout * 1000);
		}
	});

    socket.on('error', function(e) {
		console.log ("\n-- Error --------------------------------------\n");
		console.log (e.stack || e);
		fs.appendFile('error.log', "\n-- Error --------------------------------------\n" + e.stack || e + "\n", function (err) {
  			if (err) console.log (err.toString());
		});     
    });
    
    // Remove the client from the list when it leaves
    socket.on('end', function() {
        if (socket.username != null) serv_publisher.del(socket.username);
        if (socket.sub) socket.sub.quit();
        clients.splice(clients.indexOf(socket), 1); 
        console.log (socket.name + " left the server.");
    });

    // Handle incoming messages from clients.
    socket.on('data', function(data) {
        if (data !== null) {

            var d = csplit(data.toString('ascii'), ' ', 2);
            if (d.length == 0) return;
            switch (d[0].toLowerCase()) {     
                case 'pub':
                    if (d.length > 2) {
                        var channel = d[1].trim();
                        var msgdata = d[2];
                        if (socket.username != null) {
							serv_publisher.smembers(channel, function(err, res) {
								if(err!==null) {
									if (socket.writable) socket.write(err.toString() + "\n");
								} else {
									res.forEach(function(username) {
										serv_publisher.get (username, function(err, userdata) {
											if(!err) {
												if (userdata!=null) {
													userdata = JSON.parse(userdata);
													msgto (msgdata , username, socket.username, userdata.instance);
												} 
											}
										 });
									});
								
									if (socket.writable) socket.write(res.length + "\n");
								}
							}); 
                        } else {
                        	if (socket.writable) socket.write("You must be login first\n");
                        }
                    }
                    break;
                    
            	case 'sub':
                    if (d.length > 1) {
                        var channel  = d[1].trim();
                        if (socket.username != null) {
							serv_publisher.sadd(channel, socket.username, function(err, res) {
								if(err!==null) {
									if (socket.writable) socket.write(err.toString() + "\n");
								} else {
									if (socket.writable) socket.write(res.toString() + "\n");
								}
							});
                        } else {
                        	if (socket.writable) socket.write("You must be login first\n");
                        }
                    }
                    break;
                    
             	case 'usub':
                    if (d.length > 1) {
                        var channel  = d[1].trim();
                        if (socket.username != null) {
							serv_publisher.srem(channel, socket.username, function(err, res) {
								if(err!==null) {
									if (socket.writable) socket.write(err.toString() + "\n");
								} else {
									if (socket.writable) socket.write(res.toString() + "\n");
								}
							});
                        } else {
                        	if (socket.writable) socket.write("You must be login first\n");
                        }
                    }
                    break;
                    
            	case 'mem':
                    if (d.length > 2) {
                        var channel = d[1].trim();
            			serv_publisher.smembers(channel, function(err, res) {
                            if(err!==null) {
                            	if (socket.writable) socket.write(err.toString() + "\n");
                            } else {
                            	if (socket.writable) socket.write(res.toString() + "\n");
                            }
                        });
                    }
                    break;

                case 'lgn':
                    if (d.length > 1) {
                    	if (socket.username != null) {
                    		serv_publisher.del(socket.username);
                    		socket.username = null;
                    	}
                        socket.username = d[1].trim();
                        serv_publisher.set(d[1].trim() , JSON.stringify ({"instance" : serv_channel , "name": socket.name}));
						serv_publisher.expire (d[1].trim(), socket_timeout * 2);
                        if (socket.writable) socket.write('Welcome ' + socket.username + "\n");  
                        
                        /*
						fs.appendFile('login.log', 'Welcome ' + socket.username + '\n' , function (err) {
							if (err) throw err;
						});  
						*/
     
                    }
                    break;

                case 'out':
                    if (socket.username != null) {
                    	serv_publisher.del(socket.username);
                    	if (socket.writable) socket.write('Logout ' + socket.username + '\n');
                    	socket.username = null;
                    }
                    break;

                case 'exit':
                    if (socket.writable) socket.write('Good bye ' + socket.name + '!\n');
                    socket.end();
                    break;

                case 'msg':
                    if (d.length == 3) {
						var username = d[1].trim();
						var msgdata  = d[2];
                        if (socket.username != null) {
							serv_publisher.get (username, function(err, userdata) {
								if(!err) {
									if (userdata!=null) {
										userdata = JSON.parse(userdata);
										msgto (msgdata , username, socket.username, userdata.instance);
									} else {
										if (socket.writable) socket.write(username + ' - User not found\n');
									}
								} else {
									console.log ("msg error " + err.toString());
								}
							});
                        } else {
                        	if (socket.writable) socket.write("You must be login first\n");
                        }
                    } else {
                    	if (socket.writable) socket.write('bad syntax: msg <target_username> <text_message>\n');
                    }
                    break;

                case 'bcst': //broadcast
                    d = csplit(data.toString('ascii'), ' ', 1);
                    var msgdata = d[1];
                    broadcast(msgdata + "\n", socket);
                    break;

                case 'whoami':
                    if (socket.writable) socket.write(socket.username + "\n");
                    break;

                case 'kill':
                	var username = d[1];
					serv_publisher.get (username, function(err, userdata) {
						if(!err) {
							if (userdata!=null) {
								userdata = JSON.parse(userdata);
								kill (username, userdata.instance);
							} else {
								if (socket.writable) socket.write(username + ' - User not found\n');
							}
						}
					 });
                    break;

                case 'whois':
                    socket.write(userlist().join('\n') + '\n');
                    break;
                    
                case 'ucount': //users count
                    socket.write(userlist().length + '\n');
                    break;
                    
                case 'ccount': //connections count
                    socket.write(clients.length + '\n');
                    break;
                    
                    
                case 'linst': // list intances
					serv_publisher.keys(serv_pfx + '*', function (err, keys) {
						if (err) return console.log(err);
						if (socket.writable) socket.write(keys.join('\n') + '\n');
							
					});
                    break;

                default:
                    console.log('data->' + data);
                    // ToDo. Put here your code
            }
        }
    });



}).on('listening', () => {
  // handle errors here
   console.log('Socker server running at port', server.address().port);
   
   //  Add Data for the Discovery Process
   serv_channel = serv_pfx + server.address().port;
   serv_subscriber.set(serv_channel , JSON.stringify(server.address()));
   serv_subscriber.expire (serv_channel, serv_timeout);

   	serv_subscriber.subscribe(serv_channel); 
   	serv_subscriber.on("message", function(channel, message) {
		var d = csplit(message.toString('ascii'), ' ', 3);
		if (d.length == 0) return;
		switch (d[0].toLowerCase()) {
			case 'msg':  // publish microserv_socket_49669 msg Pedro Claudio Hola amigo
				var from = d[1].trim();
				var to   = d[2];
				var msg  = d[3];
				msgto(msg , to, from, channel);
				break;
				
			case 'kill':
				kill(d[1], channel);
				break;
				
			default:
				console.log('serv_subscriber->' + message + "\n");
		}
    });
    
   // Add KeepAlive 
   setInterval(
   		function(){
			serv_publisher.set(serv_channel , JSON.stringify(server.address()));
			serv_publisher.expire (serv_channel, serv_timeout);
   		}, (serv_timeout / 2) * 1000);

}).listen({
  host: '127.0.0.1',
  port: freePort
});




});


    // Send to a specific username
    function msgto(message, to, from, instance) {
    

        if (instance!=serv_channel) {
        	serv_publisher.publish(instance, 'msg ' + from + ' ' + to + ' ' + message);
        } else {
			clients.forEach(function(client) {
				// Don't want to send it to sender
				if (client.username == to) {
					var msg = "from " + instance + "." + from + ": " + message + "\n";
					if (client.writable) {
						client.write(msg);
					}
					return;	
				}
			});
        }
    }
    
	// kill all sockets for an username
	function kill(username, instance) {
		if (instance!=serv_channel) {
			serv_publisher.publish(instance, 'kill ' + username);
		} else {
			clients.forEach(function(client) {
				// Don't want to send it to sender
				if (client.username == username) {
					client.end();
				}
			});
		}
	}
    
	function csplit(data, delimiter, counter) {
		var d = data.split(delimiter);
		var r = [];

		for (var i = 0; i < d.length; i++) {
			if (d[i].trim() !== '') r.push(d[i].trim());
			if (r.length == counter) {
				r.push(d.slice(i + 1).join(delimiter));
				break;
			}
		}
		return r;
	}

	// Send to a specific username
	function userlist() {
		var res = [];
		clients.forEach(function(client) {
			if (client.username) res.push(client.username);
		});
		return res;
	}

	// Send a message to all clients
	function broadcast(message, sender) {
		clients.forEach(function(client) {
			// Don't want to send it to sender
			if (client === sender) return;
			if (client.writable) client.write(message);
		});
	}

	function getPort (cb) {
		var port = socket_port
		socket_port += 1

		var server = net.createServer()
			server.listen(port, function (err) {
			server.once('close', function () {
			cb(port)
		})
		server.close()
		})
		server.on('error', function (err) {
			getPort(cb)
		})
	}
    
    
