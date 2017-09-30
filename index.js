var express = require('express')
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('static'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

let users = {};
let minions = []

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
  setInterval(step, 1000 / 60)
});

function User(name) {
	this.name = name;
	this.x = Math.random() * WIDTH;
	this.y = Math.random() * HEIGHT;
  this.minions = [];
  for (let i = 0; i < 3; i++) {
    this.minions.push(new Minion(this.x + Math.random() * 10 - 5, this.y + Math.random() * 10 - 5))
    minions.push(this.minions[i])
  }
  return this
}

function Minion(x, y) {
  this.x = x;
  this.y = y;
  this.width = 16;
  this.height = 8;
  this.aggro = 16;
  return this
}

function step() {
  // Moving for testing purposes
  for (let i = 0; i < minions.length; i++) {
    //minions[i].x -= Math.random()// - 0.5
    //minions[i].y -= Math.random()// - 0.5
  }

  // Check for collisions
  for (let i = 0; i < minions.length; i++) {
    let m1 = minions[i]
    for (let j = i + 1; j < minions.length; j++) {
      let m2 = minions[j]
      if (Math.abs(m1.x - m2.x) < m1.width / 2 + m2.width / 2 && Math.abs(m1.y - m2.y) < m1.height / 2 + m2.height / 2) {
        m1.x += m2.x - m1.x + (m1.x < m2.x ? -1 : 1) * (m1.width / 2 + m2.width / 2)
      }
    }
    minions[i].x = Math.min(Math.max(minions[i].x, 0), WIDTH)
    minions[i].y = Math.min(Math.max(minions[i].y, 0), HEIGHT)
  }

  // Update players
  let keys = Object.keys(users)
  for (let i = 0; i < keys.length; i++) {
    io.to(keys[i]).emit("update", users);
  }
}
