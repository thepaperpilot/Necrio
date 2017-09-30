// Aliases
// these make the rest of the code shorter, plus it puts all the "PIXI is not defined" errors up here in one place
// since I'm not using NPM or anything, so subl has no way of knowing these are being loaded before this file runs.
let Container = PIXI.Container,
    autoDetectRenderer = PIXI.autoDetectRenderer,
    loader = PIXI.loader,
    Sprite = PIXI.Sprite,
    TextureCache = PIXI.utils.TextureCache,
    Text = PIXI.Text,
    sound = PIXI.sound,
    Emitter = PIXI.particles.Emitter,
	Graphics = PIXI.Graphics;

let ZOOM = 100;

let socket = io();
let user;
let users = {};
let state = play;

document.getElementById('nameForm').addEventListener('submit', function(e) {
	// Prevent page from refreshing
	e.preventDefault()
	
	document.getElementById('intro').classList.add('submitted')

	let username

	socket.emit('login', username = document.getElementById('name').value)

	socket.on('init', (me) => {
		user = me
		console.log(user)
		let text = new Text(username, getTextStyle())
		text.x = user.x
		text.y = user.y
		text.alpha = 0.9
		ui.addChild(text)
		user.text = text;
		for (let i = 0; i < user.minions.length; i++) {
			user.minions[i].sprite = new Sprite(TextureCache.enemy1)
			user.minions[i].sprite.x = user.minions[i].x
			user.minions[i].sprite.y = user.minions[i].y
			stage.addChild(user.minions[i].sprite)
		}
		gameLoop();
	})

	socket.on('add player', (id, user) => {
		console.log('added', user.name)
		users[id] = user
		let text = new Text(user.name, getTextStyle())
		text.x = user.x
		text.y = user.y
		text.alpha = 0.9
		user.text = text
		for (let i = 0; i < user.minions.length; i++) {
			user.minions[i].sprite = new Sprite(TextureCache.enemy1)
			user.minions[i].sprite.x = user.minions[i].x
			user.minions[i].sprite.y = user.minions[i].y
			stage.addChild(user.minions[i].sprite)
		}
		ui.addChild(text)
	})

	socket.on('remove player', (id) => {
		if (users[id]) {
			console.log('removed', users[id].name)
			ui.removeChild(users[id].text)
			for (let i = 0; i < users[id].minions.length; i++) {
				stage.removeChild(users[id].minions[i].sprite)
			}
			delete users[id]
		}
	})
})

// Create some basic objects
let gameStage = new Container();
let stage = new Container();
let ui = new Container();
gameStage.addChild(stage);
gameStage.addChild(ui);
stage.interactive = true;
let renderer = autoDetectRenderer(1, 1, {antialias: true, transparent: true});
document.body.appendChild(renderer.view);

// Make the game fit the entire window
renderer.view.style.position = "absolute";
renderer.view.style.display = "block";
renderer.autoResize = true;
renderer.resize(window.innerWidth, window.innerHeight);

// Window stuff
window.addEventListener("resize", resize);

// Load everything
PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;
loader
	// Images
	.add("enemy1", "img/placeholder.png")
	// Call setup after loading
	.load(setup);

function getTextStyle() {
	return {
		fill: '#'+(Math.random()*0xFFFFFF<<0).toString(16), 
		align: 'center', 
		stroke: '#fff',
		strokeThickness: 4,
	    //dropShadow: true,
	    //dropShadowColor: '#000000',
	    //dropShadowBlur: 2,
	    //dropShadowAngle: Math.PI / 6,
	    //dropShadowDistance: 6,
		fontSize: 28,
		fontWeight: 'bold'
	}
}

function setup() {
	document.getElementById('intro').classList.remove('submitted')
	document.getElementById('loading').classList.add('submitted')
	document.getElementById('name').disabled = false
	document.getElementById('name').focus()
}

function gameLoop() {
	requestAnimationFrame(gameLoop);

	state();

	renderer.render(gameStage);
}

function play() {
	let x = 0, y = 0
	for (let i = 0; i < user.minions.length; i++) {
		x += user.minions[i].x
		y += user.minions[i].y
	}
	x /= user.minions.length
	y /= user.minions.length
	
	stage.x = /*ui.x =*/ renderer.width/2;
	stage.y = /*ui.y =*/ renderer.height/2;
	stage.pivot.x /*= ui.pivot.x*/ = x;
	stage.pivot.y /*= ui.pivot.y*/ = y;
	stage.scale.x = stage.scale.y = Math.pow(ZOOM / user.minions.length, .5);

	ui.x = renderer.width / 2;
	ui.y = renderer.height / 2;
	user.text.x = 0
	user.text.y = 0

	let keys = Object.keys(users)
	for (let i = 0; i < keys.length; i++) {
		let user = users[keys[i]]
		let userx = 0, usery = 0
		for (let i = 0; i < user.minions.length; i++) {
			userx += user.minions[i].x
			usery += user.minions[i].y
		}
		userx /= user.minions.length
		usery /= user.minions.length
		user.text.x = (userx - x) * stage.scale.x
		user.text.y = (usery - y) * stage.scale.y
	}
}

function resize() {
	renderer.resize(window.innerWidth, window.innerHeight);
}
