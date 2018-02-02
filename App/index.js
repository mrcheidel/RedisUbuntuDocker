#!/usr/bin/env node

// Load the TCP Library
net   = require('net');
redis = require("redis");

// Keep track of the clients
var clients = [];
var redis_host   = 'localhost';
var redis_port   = 6379;
var serv_pfx     = 'microserv_socket_';
var serv_timeout = 30; //seconds
var serv_channel;
var serv_subcriber;
var socket_timeout = 30000; //seconds

// Start a TCP Server
const server = net.createServer(function(socket) {

    // Identify this client
    socket.name = socket.remoteAddress + ":" + socket.remotePort;
    socket.username = null;

    //broadcast(socket.name + " joined \n", socket);

    socket.sub = redis.createClient(redis_port, redis_host);
    socket.pub = redis.createClient(redis_port, redis_host);
 
    // Put this new client in the list
    clients.push(socket);
    
	socket.setTimeout(socket_timeout);
	
	socket.on('timeout', () => {
		if (socket.username!== null) {
			socket.sub.expire (socket.username, socket_timeout * 2);
		}
	});

    socket.sub.on("message", function(channel, message) {
        socket.write("sub channel " + channel + ": " + message + '\n');
    });

    socket.on('error', function(err) {
        process.stdout.write(err.stack);
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
                        socket.pub.publish(channel, msg, function(err, res) {
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
                            socket.sub.subscribe(channel, function(err, res) {
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
                            socket.sub.unsubscribe(channel, function(err, res) {
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
                    		socket.sub.del(socket.username);
                    		socket.username = null;
                    	}
                        socket.username = d[1].trim();
                        socket.sub.set(d[1].trim() , JSON.stringify ({"instance" : serv_channel }));
						socket.sub.expire (d[1].trim(), socket_timeout * 2);
                        socket.write('Welcome ' + socket.username + "\n");
                    }
                    break;

                case 'logout':
                    if (socket.username != null) {
                    	socket.sub.del(socket.username);
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
						socket.write(msgto(msgdata , username, socket.username) + "\n");
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
                    if (kill(username)) {
                        socket.write('OK\n');
                    } else {
                        socket.write('KO\n');
                    }
                    break;

                case 'whoishere':
                    socket.write(userlist().join('\n') + '\n');
                    break;
                    
                case 'listinstances':
					socket.pub.keys(serv_pfx + '*', function (err, keys) {
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
        if (socket.username != null) socket.sub.del(socket.username);
        socket.sub.unsubscribe();
        socket.sub.quit();
        socket.pub.quit();
        clients.splice(clients.indexOf(socket), 1);
        broadcast(socket.name + " left the server.\n");
    });

}).on('listening', () => {
  // handle errors here
   console.log('Socker server running at port', server.address().port);
   
   //  Add Data for the Discovery Process
   serv_subcriber = redis.createClient(redis_port, redis_host);
   serv_channel = serv_pfx + server.address().port;
   serv_subcriber.set(serv_channel , JSON.stringify(server.address()));
   serv_subcriber.expire (serv_channel, serv_timeout);

   // Add KeepAlive 
   setInterval(
   		function(){
			var serv_subcriber = redis.createClient(redis_port, redis_host);
			serv_subcriber.set(serv_channel , JSON.stringify(server.address()));
			serv_subcriber.expire (serv_channel, serv_timeout);
   		}, 
   		(serv_timeout / 2) * 1000);

   	serv_subcriber.subscribe(serv_channel); 
   	serv_subcriber.on("message", function(channel, message) {
		var d = csplit(message.toString('ascii'), ' ', 3);
		if (d.length == 0) return;
		switch (d[0].toLowerCase()) {
			case 'msg':  // publish microserv_socket_49669 msg Pedro Claudio Hola amigo
				var from = d[1].trim();
				var to   = d[2];
				var msg  = d[3];
				msgto(msg , to, from);
				break;
				
			case 'kill':
				kill(d[1]);
				break;
				
			default:
				process.stdout.write('serv_subcriber->' + message + "\n");
		}
    });
   	
   	

}).listen();


    // Send to a specific username
    function msgto(message, to, from) {
        var res = 0;
        clients.forEach(function(client) {
            // Don't want to send it to sender
            if (client.username == to) {
                client.write("from " + from + ": " + message);
                res = 1;
                return;
            }
        });
        
        if(res == 0) {
            // TODO
        	// This username isn't on the this instance, try to send in other instances.
        }
        return res;
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

    // kill all sockets for an username
    function kill(username) {
        var res = false;
        clients.forEach(function(client) {
            // Don't want to send it to sender
            if (client.username == username) {
                client.end();
            }
        });
        // Log it to the server output too
        process.stdout.write('kill->' + username);
        return res;
    }

    // Send a message to all clients
    function broadcast(message, sender) {
        clients.forEach(function(client) {
            // Don't want to send it to sender
            if (client === sender) return;
            client.write(message);
        });
        // Log it to the server output too
        process.stdout.write(message)
    }
    
