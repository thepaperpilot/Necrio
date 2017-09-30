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
		console.log(user)
		user = me
		let text = new Text(username + "\n▼", getTextStyle())
		text.x = user.x
		text.y = user.y
		text.anchor.set(0.5,1)
		text.alpha = 0.9
		user.text = text;
		for (let i = 0; i < user.minions.length; i++) {
			setupMinion(user.minions[i])
		}
		ui.addChild(text)
		gameLoop();
	})

	socket.on('add player', (id, user) => {
		console.log('added', user.name)
		users[id] = user
		let text = new Text(user.name + "\n▼", getTextStyle())
		text.x = user.x
		text.y = user.y
		text.anchor.set(0.5,1)
		text.alpha = 0.9
		user.text = text
		for (let i = 0; i < user.minions.length; i++) {
			setupMinion(user.minions[i])
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

	socket.on('update', (theirUsers) => {
		let keys = Object.keys(theirUsers)
		for (let i = 0; i < keys.length; i++) {
			let u = users[keys[i]] || user
			for (let j = 0; j < u.minions.length; j++) {
				u.minions[j].update(theirUsers[keys[i]].minions[j])
			}
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

	/* For Grant use only
	let temp = new Container()
	temp.addChild(new Sprite(TextureCache.enemy1))
	console.log(TextureCache.enemy1)
	let temp2 = autoDetectRenderer(TextureCache.enemy1.orig.width, TextureCache.enemy1.orig.height);
	temp2.render(temp)
	let pixels = temp2.plugins.extract.pixels(temp)

	// Untested, I just wrote this to give you a start
	let specialPixel = [1, 2, 3, 4] // 0 - 255

	for (let i = 0; i < pixels.length; i += 4) {
		if (pixels[i] === specialPixel[0] && pixels[i + 1] === specialPixel[1] && pixels[i + 2] === specialPixel[2] && pixels[i + 3] === specialPixel[3]) {
			// change this pixel to some color
		}
	}

	let temp3 = document.createElement('canvas')
	canvas.width = TextureCache.enemy1.orig.width
	canvas.height = TextureCache.enemy1.orig.height
	canvas.putImageData(pixels)
	TextureCache.myCustomEnemy = Texture.fromCanvas(temp3)
	*/

	// Create grid
	let g = new Graphics()
	let width = 200
	let height = 100
	let padding = 10
	let spacing = 10

	g.lineStyle(2, 0x242a33, 1)
	g.moveTo(-padding, -padding)
	g.lineTo(width + padding, -padding)
	g.lineTo(width + padding, height + padding)
	g.lineTo(-padding, height + padding)
	g.lineTo(-padding, -padding)

	g.lineStyle(1, 0x242a33, 1)
	for (let i = -padding; i < width + padding; i += spacing) {
		g.moveTo(i, -padding)
		g.lineTo(i, height + padding)
	}
	for (let i = -padding; i < height + padding; i += spacing) {
		g.moveTo(-padding, i)
		g.lineTo(width + padding, i)
	}

	stage.addChild(g)
}

function setupMinion(minion) {
	minion.sprite = new Sprite(TextureCache.enemy1)
	minion.sprite.anchor.set(0.5, 1)
	minion.sprite.x = minion.x
	minion.sprite.y = minion.y
	minion.update = function(minion) {
		this.x = this.sprite.x = minion.x
		this.y = this.sprite.y = minion.y
	};
	stage.addChild(minion.sprite)
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
	
	stage.x = renderer.width/2;
	stage.y = renderer.height/2;
	stage.pivot.x = x;
	stage.pivot.y = y;
	stage.scale.x = stage.scale.y = Math.pow(ZOOM / user.minions.length, .5);

	ui.x = renderer.width / 2;
	ui.y = renderer.height / 2;
	user.text.x = 0
	user.text.y = -12 * stage.scale.x

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
		user.text.y = ((usery - y) - 12) * stage.scale.y
	}
}

function resize() {
	renderer.resize(window.innerWidth, window.innerHeight);
}
