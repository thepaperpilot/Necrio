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
let SPEED = 1;

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
  socket.on('heartbeat', function() {
    if (!users[socket.id]) return

    users[socket.id].updated = true
  })
  socket.on('update', function(x, y, moving) {
    if (!users[socket.id]) return

    users[socket.id].moving = moving
    if (moving) {
      // Vector math?? Uh oh, see if we can optimize this
      // We can't trust player to calculate this, because it might not respect
      // the speed we want players going
      let angle = Math.atan2(y, x)
      users[socket.id].x = Math.cos(angle) * SPEED
      users[socket.id].y = Math.sin(angle) * SPEED
    }
  })
  socket.on('disconnect', function() {
    if (!users[socket.id]) return

  	socket.broadcast.emit('remove player', socket.id, users[socket.id])
    for (let i = 0; i < users[socket.id].minions.length; i++) {
      minions.splice(minions.indexOf(users[socket.id].minions[i]), 1)
    }
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
  for (let i = 0; i < 4; i++) {
    this.minions.push(new Minion(this.x + Math.random() * 20 - 10, this.y + Math.random() * 20 - 10))
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
  this.speedMod = 1;
  return this
}

function step() {
  // Move minions
  let keys = Object.keys(users)
  for (let i = 0; i < keys.length; i++) {
    if (users[keys[i]].moving) {
      for (let j = 0; j < users[keys[i]].minions.length; j++) {
        let minion = users[keys[i]].minions[j]
        minion.x += users[keys[i]].x * minion.speedMod
        minion.y += users[keys[i]].y * minion.speedMod
      }
    }
  }

  // Check for collisions
  for (let i = 0; i < minions.length; i++) {
    let m1 = minions[i]
    for (let j = i + 1; j < minions.length; j++) {
      let m2 = minions[j]
      let vx = m1.x - m2.x
      let vy = m1.y - m2.y
      let comWidth = m1.width / 2 + m2.width / 2
      let comHeight = m1.height / 2 + m2.height / 2
      if (Math.abs(vx) < comWidth && Math.abs(vy) < comHeight) {
        let overlapX = comWidth - Math.abs(vx);
        let overlapY = comHeight - Math.abs(vy);
        if (overlapX >= overlapY) {
          let newY = (vy > 0 ? 1 : -1) * overlapY
          m1.y += newY
          m2.y -= newY
        } else {
          let newX = (vx > 0 ? 1 : -1) * overlapX
          m1.x += newX
          m2.x -= newX
        }
      }
    }
    minions[i].x = Math.min(Math.max(minions[i].x, 0), WIDTH)
    minions[i].y = Math.min(Math.max(minions[i].y, 0), HEIGHT)
  }

  // Update players
  for (let i = 0; i < keys.length; i++) {
    if (users[keys[i]].updated) {
      io.to(keys[i]).emit("update", users);
      users[keys[i]].updated = false;
    }
  }
}
