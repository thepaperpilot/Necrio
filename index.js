var express = require('express')
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('static'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

let users = {};

io.on('connection', function(socket){
  socket.on('login', function(name){
  	let x = Math.random() * 200
  	let y = Math.random() * 100
  	socket.emit('init', x, y)
  	let keys = Object.keys(users)
  	for (let i = 0; i < keys.length; i++) {
  		socket.emit('add player', keys[i], users[keys[i]])
  	}
  	users[socket.id] = new User(name, x, y)
  	socket.broadcast.emit('add player', socket.id, users[socket.id])
  });
  socket.on('disconnect', function() {
  	socket.broadcast.emit('remove player', socket.id, users[socket.id])
  	delete users[socket.id]
  })
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

function User(name, x, y) {
	this.name = name
	this.x = x;
	this.y = y;
}
