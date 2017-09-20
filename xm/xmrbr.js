#!/usr/bin/env node
// Evaluated from: https://pr0gramm.com/new/2048864:comment16451878
// Thanks to: Fusl

const username = process.env["PR0GRAMM_USER"] || "holzmaster";
console.log("User %s will receive mining rewards", username);

const net = require("net");
const util = require("util");
const EventEmitter = require("events");
const WebSocket = require("ws");
const readline = require('readline');

let curjob = null;
const port = 12345;

class master extends EventEmitter {
	updateit() {
		this.emit("update");
	}
}
const masterstream = new master();

let resultcache = [];
let ws = null;

const stream = () => {
	ws = new WebSocket('wss://ws002.coin-hive.com/proxy');
    ws.on("open", () => {
        console.log("open");
        var data = JSON.stringify({
					type: "auth",
					params: {
                        site_key: 'jIkG4mqYkbhI70ChEmw64V4YLl5BFNOO',
                        type: "user",
                        user: 'testgoo2',
                        goal: 0
                    }
				});
        ws.send(data)
    });
	ws.on("close", () => {
		console.log("ws.ok=>close");
		stream();
	});
	ws.on("error", e => console.log("ws.on = >error", e));
	ws.on("message", (data, flags) => {
        console.log(data, flags);
		try {
			data = JSON.parse(data);
		} catch(e) {
			return console.log(e);
		}

		if (data.type === "job" && data.params && data.params.job_id && data.params.blob && data.params.target) {
			curjob = data.params;
			resultcache = [];
			masterstream.updateit();
		}
	});
};
stream();

function createMessage(msg) {
	if(!msg)
		return;
	const str = JSON.stringify(msg);
	return str + "\n";
}

const server = net.createServer(socket => {
	if (!curjob)
		return socket.end();

	const rl = readline.createInterface({
		input: socket,
	});

	let loggedin = false;
	socket.on("error", () => {});
	rl.on("line", line => {
		try {
			line = JSON.parse(line);
		} catch(e) {
			console.log("Error parsing line:", line, e);
			return socket.end();
		}

		if (line.method === "login" && !loggedin) {
			loggedin = true;
			socket.write(createMessage({
				id: line.id || 0,
				jsonrpc: '2.0',
				error: null,
				result: {
					id: "000000000000000",
					job: {
						blob: curjob.blob,
						job_id: curjob.job_id,
						target: curjob.target,
					},
					status: "OK",
				}
			}));
			var updatehandler = function () {
				socket.write(createMessage({
					jsonrpc: "2.0",
					method: "job",
					params: {
						blob: curjob.blob,
						job_id: curjob.job_id,
						target: curjob.target,
					}
				}));
			};
			masterstream.on("update", updatehandler);
			socket.on("close", () => {
				masterstream.removeListener("update", updatehandler);
			});
			return;
		}
		if (line.method === "submit" && line.params && line.params.job_id && line.params.nonce && line.params.result) {
			if (line.params.job_id !== curjob.job_id) {
				return socket.write(createMessage({
					id: line.id || 0,
					jsonrpc: '2.0',
					error: {
						code: -1,
						message: 'wrong job_id',
					}
				}));
			}
			if (resultcache.indexOf(line.params.job_id + "\0" + line.params.nonce + "\0" + line.params.result) !== -1) {
				return socket.write(createMessage({
					id: line.id || 0,
					jsonrpc: "2.0",
					error: {
						code: -1,
						message: "dup share",
					}
				}));
			}
			socket.write(createMessage({
				id: line.id || 0,
				jsonrpc: "2.0",
				error: null,
				result: {
					status: "OK",
				}
			}));
			resultcache.push(line.params.job_id + '\0' + line.params.nonce + '\0' + line.params.result);
			if (ws) {
				var data = JSON.stringify({
					type: "submit",
					params: {
						user: username,
						job_id: line.params.job_id,
						nonce: line.params.nonce,
						result: line.params.result,
					}
				});
				console.log(data);
				ws.send(data, new Function());
			}
			return;
		}
		console.log("Unknown line from client: %s", line);
	});
});
server.listen(port);

console.log("Proxy listening on port %d", port)
