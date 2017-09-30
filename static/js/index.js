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

let socket = io();
let username;
let users = {};
let state = () => {}

document.getElementById('nameForm').addEventListener('submit', function(e) {
	// Prevent page from refreshing
	e.preventDefault()
	
	document.getElementById('intro').classList.add('submitted')

	socket.emit('login', username = document.getElementById('name').value)

	socket.on('init', (x, y) => {
		let text = new Text(username, {fill: ['#'+(Math.random()*0xFFFFFF<<0).toString(16)], align: 'center'})
		text.x = x
		text.y = y
		stage.addChild(text)
		stage.position.x = renderer.width/2;
		stage.position.y = renderer.height/2;
		stage.pivot.x = x;
		stage.pivot.y = y;
		gameLoop();
	})

	socket.on('add player', (id, user) => {
		users[id] = user
		let text = new Text(user.name, {fill: ['#'+(Math.random()*0xFFFFFF<<0).toString(16)], align: 'center'})
		text.tint = (Math.random()*0xFFFFFF<<0)
		text.x = user.x
		text.y = user.y
		stage.addChild(text)
		console.log('added', user.name)
	})

	socket.on('remove player', (id) => {
		console.log('removed', users[id].name)
		delete users[id]
	})
})

document.getElementById('intro').classList.remove('submitted')
document.getElementById('name').disabled = false
document.getElementById('name').focus()

// Create some basic objects
let stage = new Container();
stage.interactive = true;
let renderer = autoDetectRenderer(1, 1, {antialias: true, transparent: true});
document.body.appendChild(renderer.view);

// Make the game fit the entire window
renderer.view.style.position = "absolute";
renderer.view.style.display = "block";
renderer.autoResize = true;
renderer.resize(window.innerWidth, window.innerHeight);

function gameLoop() {
	requestAnimationFrame(gameLoop);

	state();

	renderer.render(stage);
}
