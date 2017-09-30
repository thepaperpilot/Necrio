var express = require('express')
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('static'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

let users = {};

let WIDTH = 200;
let HEIGHT = 100;

io.on('connection', function(socket){
  socket.on('login', function(name){
    let user = new User(name)
  	socket.emit('init', user)
  	let keys = Object.keys(users)
  	for (let i = 0; i < keys.length; i++) {
  		socket.emit('add player', keys[i], users[keys[i]])
  	}
  	users[socket.id] = user
  	socket.broadcast.emit('add player', socket.id, user)
  });
  socket.on('disconnect', function() {
  	socket.broadcast.emit('remove player', socket.id, users[socket.id])
  	delete users[socket.id]
  })
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

function User(name) {
	this.name = name;
	this.x = Math.random() * WIDTH;
	this.y = Math.random() * HEIGHT;
  this.minions = [];
  for (let i = 0; i < 3; i++) {
    this.minions.push(new Minion(this.x + Math.random() * 10 - 5, this.y + Math.random() * 10 - 5))
  }
  return this
}

function Minion(x, y) {
  this.x = x;
  this.y = y;
  return this
}
