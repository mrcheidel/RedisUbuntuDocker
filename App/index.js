#!/usr/bin/env node

// Load the TCP Library
net      = require('net');
redis    = require("redis");
freeport = require("find-free-port");


// Keep track of the clients
var clients        = [];
var redis_host     = 'localhost';
var redis_port     = 6379;
var serv_pfx       = 'microserv_socket_';
var serv_timeout   = 10; //seconds
var serv_channel;
var socket_timeout = 10; //seconds
var serv_subcriber = redis.createClient(redis_port, redis_host);
var serv_publisher = redis.createClient(redis_port, redis_host);
 

freeport(5000, 5100, function(err, freePort){

//clear screen
console.log('\033[2J');

// Start a TCP Server
const server = net.createServer(function(socket) {


    // Identify this client
    socket.name = socket.remoteAddress + ":" + socket.remotePort;
    socket.username = null;

    // Put this new client in the list
    clients.push(socket);
    
	socket.setTimeout(socket_timeout * 1000);
	
	socket.on('timeout', () => {
		if (socket.username!== null) {
			serv_publisher.expire (socket.username, socket_timeout * 2);
		}
	});

    //socket.sub.on("message", function(channel, message) {
    //    socket.write("sub channel " + channel + ": " + message + '\n');
    //});

    socket.on('error', function(exception) {
        console.log ("\n-- Error --------------------------------------\n");
         console.log (exception);
         console.log (exception.stack);
    });

    // Handle incoming messages from clients.
    socket.on('data', function(data) {
        if (data !== null) {

            var d = csplit(data.toString('ascii'), ' ', 2);
            if (d.length == 0) return;

            switch (d[0].toLowerCase()) {
                case 'publish':
                    if (d.length > 2) {
                        var channel = d[1].trim();
                        var msg = d[2];
                        serv_publisher.publish(channel, msg, function(err, res) {
                            if(err!==null) {
                            	socket.write(err.toString() + "\n");
                            } else {
                            	socket.write(res.toString() + "\n");
                            }
                        });
                    }
                    break;

                case 'subscribe':
                    if (d.length > 1) {
                        if (socket.sub) {
                            var channel = d[1].trim();
                            serv_subscriber.subscribe(channel, function(err, res) {
								if(err!==null) {
									socket.write(err.toString() + "\n");
								} else {
									socket.write(res.toString() + "\n");
								}
							});
                        }
                    }
                    break;

                case 'unsubscribe':
                    if (d.length > 1) {
                        if (socket.sub) {
                            var channel = d[1].trim();
                            serv_subscriber.unsubscribe(channel, function(err, res) {
								if(err!==null) {
									socket.write(err.toString() + "\n");
								} else {
									socket.write(res.toString() + "\n");
								}
							});
                        }
                    }
                    break;

                case 'login':
                    if (d.length > 1) {
                    	if (socket.username != null) {
                    		serv_publisher.del(socket.username);
                    		socket.username = null;
                    	}
                        socket.username = d[1].trim();
                        serv_publisher.set(d[1].trim() , JSON.stringify ({"instance" : serv_channel , "name": socket.name}));
						serv_publisher.expire (d[1].trim(), socket_timeout * 2);
                        socket.write('Welcome ' + socket.username + "\n");     
                    }
                    break;

                case 'logout':
                    if (socket.username != null) {
                    	serv_publisher.del(socket.username);
                    	socket.username = null;
                    	socket.write('Logout OK\n');
                    }
                    break;

                case 'exit':
                    socket.write('Good bye!\n');
                    socket.end();
                    break;

                case 'msg':
                    if (d.length == 3) {
						var username = d[1].trim();
						var msgdata  = d[2];
						serv_publisher.get (username, function(err, userdata) {
							if(!err) {
								if (userdata!=null) {
									userdata = JSON.parse(userdata);
        							msgto (msgdata , username, socket.username, userdata.instance);
        						} else {
        							socket.write(username + ' - User not found\n');
        						}
        					}
   						 });
                    } else {
                    	socket.write('bad syntax: msg <target_username> <text_message>\n');
                    }
                    break;

                case 'broadcast':
                    d = csplit(data.toString('ascii'), ' ', 1);
                    var msgdata = d[1];
                    broadcast(msgdata + "\n", socket);
                    break;

                case 'whoami':
                    socket.write(socket.username + "\n");
                    break;

                case 'kill':
                	var username = d[1];
					serv_publisher.get (username, function(err, userdata) {
						if(!err) {
							if (userdata!=null) {
								userdata = JSON.parse(userdata);
								kill (username, userdata.instance);
							} else {
								socket.write(username + ' - User not found\n');
							}
						}
					 });
                    break;

                case 'whoishere':
                    socket.write(userlist().join('\n') + '\n');
                    break;
                    
                case 'listinstances':
					serv_publisher.keys(serv_pfx + '*', function (err, keys) {
						if (err) return process.stdout.write(err);
						socket.write(keys.join('\n') + '\n');
					});
                    break;

                default:
                    process.stdout.write('data->' + data);
                    // ToDo. Put here your code
            }
        }
    });

    // Remove the client from the list when it leaves
    socket.on('end', function() {
        if (socket.username != null) serv_publisher.del(socket.username);
        clients.splice(clients.indexOf(socket), 1);
        broadcast(socket.name + " left the server.\n");
    });
    
	socket.write ("#\n");

}).on('listening', () => {
  // handle errors here
   console.log('Socker server running at port', server.address().port);
   
   //  Add Data for the Discovery Process
   serv_channel = serv_pfx + server.address().port;
   serv_subcriber.set(serv_channel , JSON.stringify(server.address()));
   serv_subcriber.expire (serv_channel, serv_timeout);

   // Add KeepAlive 
   setInterval(
   		function(){
			var serv_subcriber = redis.createClient(redis_port, redis_host);
			serv_subcriber.set(serv_channel , JSON.stringify(server.address()));
			serv_subcriber.expire (serv_channel, serv_timeout);
   		}, (serv_timeout / 2) * 1000);


   	serv_subcriber.subscribe(serv_channel); 
   	serv_subcriber.on("message", function(channel, message) {
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
				process.stdout.write('serv_subcriber->' + message + "\n");
		}
    });
	

}).listen({
  host: 'localhost',
  port: freePort
});


});


    // Send to a specific username
    function msgto(message, to, from, instance) {
        if (instance!=serv_channel) {
        	serv_subcriber = redis.createClient(redis_port, redis_host);
        	serv_subcriber.publish(instance, 'msg ' + from + ' ' + to + ' ' + message);
        } else {
			clients.forEach(function(client) {
				// Don't want to send it to sender
				if (client.username == to) {
					if (client.writable) {
						client.write("from " + instance + "." + from + ": " + message + "\n");
					}
					return;	
				}
			});
        }
    }
    
    // kill all sockets for an username
    function kill(username, instance) {
        if (instance!=serv_channel) {
        	serv_subcriber = redis.createClient(redis_port, redis_host);
        	serv_subcriber.publish(instance, 'kill ' + username);
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
    
    
