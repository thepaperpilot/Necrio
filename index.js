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
let numMinions = 0

let WIDTH = 2000;
let HEIGHT = 1000;
let SPEED = 0.1;
let MAX_VELOCITY = 2;
let LEADER_WEIGHT = 10;
let WEIGHT_MOD = 4;
let STARTING_MINIONS = 10;

io.on('connection', function(socket){
  socket.on('login', function(name){
    let user = new User(socket.id, name)
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
  socket.on('update', function(x, y, moving, leader) {
    if (!users[socket.id]) return

    users[socket.id].moving = moving
    users[socket.id].leader = leader
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

function User(id, name) {
	this.name = name;
	this.x = Math.random() * WIDTH;
	this.y = Math.random() * HEIGHT;
  this.color = '#'+(Math.random()*0xFFFFFF<<0).toString(16);
  this.minions = {};
  this.leader = 'm' + numMinions
  for (let i = 0; i < STARTING_MINIONS; i++) {
    this.minions['m' + numMinions] = new Minion(this.x + Math.random() * 20 - 10, this.y + Math.random() * 20 - 10)
    this.minions['m' + numMinions].user = id
    minions['m' + numMinions] = this.minions['m' + numMinions]
    numMinions++
  }
  return this
}

function Minion(x, y) {
  this.x = x;
  this.y = y;
  this.vx = 0;
  this.vy = 0;
  this.width = 16;
  this.height = 8;
  this.aggro = 8;
  this.speedMod = 1;
  this.attackTime = 0;
  this.attackDuration = 100;
  this.damage = 1;
  this.health = 3;
  this.sprite = "enemy1"
  this.user = Math.random()
  return this
}

function step() {
  // Move minions
  let keys = Object.keys(users)
  for (let i = 0; i < keys.length; i++) {
    let leader = users[keys[i]].minions[users[keys[i]].leader]
    if (users[keys[i]].moving) {
      leader.vx += users[keys[i]].x * leader.speedMod
      leader.vy += users[keys[i]].y * leader.speedMod
      if (leader.vx * leader.vx + leader.vy * leader.vy > MAX_VELOCITY * MAX_VELOCITY) {
        let angle = Math.atan2(leader.vy, leader.vx)
        leader.vx = Math.cos(angle) * MAX_VELOCITY
        leader.vy = Math.sin(angle) * MAX_VELOCITY
      }
    } else {
      leader.vx *= 0.9
      leader.vy *= 0.9
      if (leader.vx * leader.vx + leader.vy * leader.vy < (MAX_VELOCITY * 0.1) * (MAX_VELOCITY * 0.1)) {
        leader.vx = leader.vy = 0
      }
    }
    leader.x += leader.vx
    leader.y += leader.vy

    // AHhhhhhh this is so hard!!!
    let minKeys = Object.keys(users[keys[i]].minions)
    for (let j = 0; j < minKeys.length; j++) {
      if (users[keys[i]].leader === minKeys[j]) continue
      let minion = users[keys[i]].minions[minKeys[j]]
      let x = 0, y = 0
      let closest = []
      for (let k = 0; k < minKeys.length; k++) {
        if (minKeys[j] === minKeys[k]) continue
        closest.push(users[keys[i]].minions[minKeys[k]])
      }
      closest.sort((a, b) => {
        return ((b.x - minion.x) * (b.x - minion.x) + (b.y - minion.y) * (b.y - minion.y)) - ((a.x - minion.x) * (a.x - minion.x) + (a.y - minion.y) * (a.y - minion.y))
      }).splice(4)
      let weight = closest.length
      for (let k = 0; k < closest.length; k++) {
        let dist = Math.sqrt((closest[k].x - minion.x) * (closest[k].x - minion.x) + (closest[k].y - minion.y) * (closest[k].y - minion.y))
        if (leader === closest[k]) {
          x += LEADER_WEIGHT * closest[k].vx / Math.log(dist)
          y += LEADER_WEIGHT * closest[k].vy / Math.log(dist)
          weight += LEADER_WEIGHT - 1
        } else {
          x += closest[k].vx / Math.log(dist)
          y += closest[k].vy / Math.log(dist)
        }
      }
      x /= weight / WEIGHT_MOD;
      y /= weight / WEIGHT_MOD;

      minion.vx = (minion.vx + x) / 2
      minion.vy = (minion.vy + y) / 2
      if (minion.vx * minion.vx + minion.vy * minion.vy > MAX_VELOCITY * MAX_VELOCITY) {
        let angle = Math.atan2(minion.vy, minion.vx)
        minion.vx = Math.cos(angle) * MAX_VELOCITY
        minion.vy = Math.sin(angle) * MAX_VELOCITY
      }
      if (minion.vx * minion.vx + minion.vy * minion.vy < (MAX_VELOCITY * 0.1) * (MAX_VELOCITY * 0.1)) {
        minion.vx = minion.vy = 0
      }
      minion.x += minion.vx
      minion.y += minion.vy
    }
  }

  // Check for collisions
  let minKeys = Object.keys(minions)
  for (let i = 0; i < minKeys.length; i++) {
    let m1 = minions[minKeys[i]]
    for (let j = i + 1; j < minKeys.length; j++) {
      let m2 = minions[minKeys[j]]
      let vx = m1.x - m2.x
      let vy = m1.y - m2.y
      let comWidth = m1.width / 2 + m2.width / 2
      let comHeight = m1.height / 2 + m2.height / 2
      if (m1.user !== m2.user && !m1.target && Math.abs(vx) < comWidth + m1.aggro && Math.abs(vy) < comHeight + m1.aggro) {
        m1.target = minKeys[j]
      }
      if (m1.user !== m2.user && !m1.target && Math.abs(vx) < comWidth + m2.aggro && Math.abs(vy) < comHeight + m2.aggro) {
        m2.target = minKeys[i]
      }
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
    m1.x = Math.min(Math.max(m1.x, 0), WIDTH)
    m1.y = Math.min(Math.max(m1.y, 0), HEIGHT)
    if (m1.target) {
      m1.attackTime++
      if (m1.attackTime >= m1.attackDuration) {
        m1.attackTime = 0
        minions[m1.target].health -= m1.damage
        io.emit('attack', minions[m1.target].user, m1.target)
        if (minions[m1.target].health <= 0) {
          m1.target = null
          // TODO reviving minions
        }
      }
    }
  }

  // Update players
  for (let i = 0; i < keys.length; i++) {
    if (users[keys[i]].updated) {
      io.to(keys[i]).emit("update", users);
      users[keys[i]].updated = false;
    }
  }
}
