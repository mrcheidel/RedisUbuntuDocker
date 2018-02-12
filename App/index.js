#!/usr/bin/env node

/*

# Bring telnet back on macOS high Sierra
# After I’ve upgraded macOS to high Sierra (10.13) the telnet was removed. So, in this topic we’ll bring the telnet back again.
# First one you need a homebrew, if not let’s type this command to install them.
#Install Homebrew

    /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
    
#Second, install telnet using homebrew

   brew install telnet





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
   
   sudo launchctl limit maxfiles 1000000 1000000


*/

// Load the TCP Library
const net      = require('net');
const redis    = require("redis");
const freeport = require("find-free-port");
const fs       = require('fs');
const cluster  = require('cluster');
const numCPUs  = require('os').cpus().length;

// Keep track of the clients
var clients         = [];
var serv_channel;

var config = {
	"redis_host": "127.0.0.1",
	"redis_port": 6379,
	"serv_pfx"  : "microserv_socket_",
	"serv_timeout"  : 10,
	"serv_host" : "127.0.0.1",
	"serv_port_start": 5000,
	"serv_port_end": 5100,
	"socket_timeout": 10,
	"debug_mode" : true
};

if (cluster.isMaster) {
	console.clear();
	console.log (new Date().toJSON());
	for (let i = 0; i < numCPUs; i++) {
		console.log('Forking process number ' + (i+1) + '...');
		var new_worker_env = {};
		new_worker_env["FORK_NUMBER"] = i;
		cluster.fork(new_worker_env);
	}
} else {

	var serv_subscriber = redis.createClient(config.redis_port, config.redis_host);
	var serv_publisher  = redis.createClient(config.redis_port, config.redis_host);

	serv_subscriber.on("error", function (e) {
		var msg = "\n" + new Date().toJSON() +  "\n-- Redis Subscriber Error --\n" + e.stack || e + "\n";
		if (config.debug_mode) console.log(msg);
		fs.appendFile('logs/redis_subscriber_error.log', msg , function (err) {
			if (err && config.debug_mode) console.log (err.toString());
		});     
	});

	serv_publisher.on("error", function (e) {
		var msg = "\n" + new Date().toJSON() +  "\n-- Redis Publisher Error --\n" + e.stack || e + "\n";
		if (config.debug_mode) console.log(msg);
		fs.appendFile('logs/redis_publisher_error.log', msg , function (err) {
			if (err && config.debug_mode) console.log (err.toString());
		});   
	});

    serv_freeport = parseInt(process.env['FORK_NUMBER']) + config.serv_port_start;
    
	//freeport(config.serv_port_start, config.serv_port_end, config.serv_host , function(err, serv_freeport){
		// Start a TCP Server
		const server = net.createServer(newSocket);
		server.listen({
		  host: config.serv_host,
		  port: serv_freeport
		});
	
		server.on('listening', () => {
		  // handle errors here
			console.log('Socker server running at port', server.address().port);

			//  Add Data for the Discovery Process
			serv_channel = config.serv_pfx + server.address().port;
			serv_subscriber.set(serv_channel , JSON.stringify(server.address()));
			serv_subscriber.expire (serv_channel, config.serv_timeout);
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
						if (config.debug_mode) console.log('serv_subscriber->' + message + "\n");
				}
			});
	
		   // Add KeepAlive 
		   setInterval(
				function(){
					serv_publisher.set(serv_channel , JSON.stringify(server.address()));
					serv_publisher.expire (serv_channel, config.serv_timeout);
				}, (config.serv_timeout / 2) * 1000);

		});	
	}
	
	//);

//}


function newSocket(socket) {

    // Identify this client
    socket.name = socket.remoteAddress + ":" + socket.remotePort;
    socket.username = null;
    socket.setKeepAlive(true, config.socket_timeout * 1000);
	socket.setTimeout(config.socket_timeout * 1000);
	
    // Put this new client in the list
    clients.push(socket);
    socket.write ("#\n");

	socket.on('timeout', () => {
		if (socket.username!== null) {
			serv_publisher.expire (socket.username, config.socket_timeout * 10);
			socket.setTimeout(config.socket_timeout * 1000);
		}
	});

    socket.on('error', function(e) {
        var msg = "\n" + new Date().toJSON() +  "\n-- Socket Error --\nUsername: " + socket.username + "\n" + e.stack || e + "\n";
		fs.appendFile('logs/socket_error.log', msg , function (err) {
  			if (err && config.debug_mode) console.log (err.toString());
		});  
  		socket.end();
    });
    
    // Remove the client from the list when it leaves
    socket.on('end', function() {
        if (socket.username != null) serv_publisher.del(socket.username);
		for (var i = clients.length - 1; i >= 0; --i) {
			if (clients[i].name == socket.name) {
				clients.splice(i,1);
			}
		}
        //clients.splice(clients.indexOf(socket), 1); 
        if (config.debug_mode) console.log (socket.name + " left the server.");
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
									var pr = res.map (
										function(username) {
											return  new Promise(function(resolve, reject){
												serv_publisher.get (username, function(err, userdata) {
													if(!err) {
														if (userdata!=null) {
															userdata = JSON.parse(userdata);
															msgto (msgdata , username, socket.username, userdata.instance);
															resolve (1);
														} else {
															resolve (0);
														}
													} else {
														reject(0);
													}
												})
											});
										}
									);

									Promise.all(pr).then(values => {
										var qty = values.reduce(function(a, b) { return a + b; }, 0);
										if (socket.writable) socket.write(qty + "\n");
									});

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
                    if (d.length > 1) {
                        var channel = d[1].trim();
						serv_publisher.smembers(channel, function(err, res) {
							if(err!==null) {
								if (socket.writable) socket.write(err.toString() + "\n");
							} else {
								if (socket.writable) socket.write(res.toString() + "\n");
							}
						});
                    } else {
                        if (socket.writable) socket.write("Use: <mem> [channel]\n");
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
						serv_publisher.expire (d[1].trim(), config.socket_timeout * 10);
                        if (socket.writable) socket.write('Welcome ' + socket.username + "\n");  
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
									if (config.debug_mode) console.log ("msg error " + err.toString());
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
                    var result = broadcast(msgdata + "\n", socket);
                    if (socket.writable) socket.write(result + "\n");
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
                    if (socket.writable) socket.write(userlist().join('\n') + '\n');
                    break;
                    
                case 'ucount': //users count
                    if (socket.writable) socket.write(userlist().length + '\n');
                    break;
                    
                case 'ccount': //connections count
                    if (socket.writable) socket.write(clients.length + '\n');
                    break;

                case 'linst': // list intances
					serv_publisher.keys(config.serv_pfx + '*', function (err, keys) {
						if (err && config.debug_mode) return console.log(err);
						if (socket.writable) socket.write(keys.join('\n') + '\n');
							
					});
                    break;
                    
                case 'hlth':
                	var msg = 'This Server uses approximately :' + (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB\n';
                	if (socket.writable) socket.write(msg); 
                	break;

                case 'help': //connections count
                	var msg = 'List available commands:\n';
                	msg+= '  - <help> Show this message\n';
                	msg+= '  - <linst> List Socket Servers Instances\n';
                	msg+= '  - <ccount> Current connections count on the this server\n';
                	msg+= '  - <ucount> Current users count on the this server\n';
                	msg+= '  - <whois> Current users logged list on the this server\n';
                	msg+= '  - <kill> [username] Kill the active connection an logged username\n';
                	msg+= '  - <whoami> Show the logged username\n';
                	msg+= '  - <bcst> [message] Broadcast a message on this server\n';
                	msg+= '  - <msg> [username] [message] Send a message to an username\n';
                	msg+= '  - <lgn> [username] Login as username\n';
                	msg+= '  - <out> Logout\n';
                	msg+= '  - <exit> Logout and leave the current connection\n';
					msg+= '  - <mem> [channel] List all the users on an channel\n';
					msg+= '  - <sub> [channel] Subscribe the current username to on an channel\n';
                	msg+= '  - <pub> [channel] [message] Publish a message on an channel\n';
                	msg+= '  - <usub> [channel] Unsubscribe the current username to on an channel\n';
                	msg+= '  - <hlth> Show the memory used by the serverl\n';
                    if (socket.writable) socket.write(msg);
                    break;

                default:
                	var msg = 'bad command [' + data.toString().trim() + ']: Use "help" to list all available commands\n';
                	if (socket.writable) socket.write(msg);
                    if (config.debug_mode) console.log(msg);
            }
        }
    });
}


// Send to a specific username
function msgto(message, to, from, instance) {
	if (instance!=serv_channel) {
		serv_publisher.publish(instance, 'msg ' + from + ' ' + to + ' ' + message);
	} else {
		clients.forEach(function(client) {
			// Don't want to send it to sender
			if (client.username == to) {
				var msg = "from " + instance + "." + from + ": " + message;
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
				serv_publisher.del(username);
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
	var result=0;
	clients.forEach(function(client) {
		// Don't want to send it to sender
		if (client !== sender){
			if (client.writable) client.write(message);
			result++;
		}
	});
	return result;
}

