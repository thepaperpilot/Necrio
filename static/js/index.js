// Aliases
// these make the rest of the code shorter, plus it puts all the "PIXI is not defined" errors up here in one place
// since I'm not using NPM or anything, so subl has no way of knowing these are being loaded before this file runs.
let Container = PIXI.Container,
    autoDetectRenderer = PIXI.autoDetectRenderer,
    loader = PIXI.loader,
    Sprite = PIXI.Sprite,
    TextureCache = PIXI.utils.TextureCache,
    Text = PIXI.Text,
    Texture = PIXI.Texture,
    Emitter = PIXI.particles.Emitter,
	Graphics = PIXI.Graphics;

let ZOOM = 100;

let elapsed = Date.now();
let emitters = []
let socket = io();
let user;
let users = {};
let state = play;

let x = null // mouse X
let y = null // mouse Y
let mouseDown = 0

let debug = null//*/ new Graphics()

document.getElementById('nameForm').addEventListener('submit', function(e) {
	// Prevent page from refreshing
	e.preventDefault()

	document.getElementById('intro').classList.add('submitted')

	let username

	socket.on('init', (me, width, height) => {
		console.log(me)
		user = me
		let text = new Text(user.name ? user.name + "\n▼" : '', getTextStyle(user.color))
		text.x = user.x
		text.y = user.y
		text.anchor.set(0.5,1)
		text.alpha = 0.9
		user.text = text;
		let minKeys = Object.keys(user.minions)
		for (let i = 0; i < minKeys.length; i++) {
			setupMinion(user.minions[minKeys[i]], user.color)
		}
		ui.addChild(text)
		gameLoop();

		// Create grid
		let g = new Graphics()
		let padding = 10
		let spacing = 10

		g.lineStyle(2, 0x242a33, 1)
		g.moveTo(-padding, -padding)
		g.lineTo(width + padding, -padding)
		g.lineTo(width + padding, height + padding)
		g.lineTo(-padding, height + padding)
		g.lineTo(-padding, -padding)

		for (let i = -padding; i < width + padding; i += spacing) {
			if ((i + padding) % (10 * spacing) === 0)
				g.lineStyle(2, 0x242a33, 1)
			else
				g.lineStyle(1, 0x242a33, 1)
			g.moveTo(i, -padding)
			g.lineTo(i, height + padding)
		}
		for (let i = -padding; i < height + padding; i += spacing) {
			if ((i + padding) % (10 * spacing) === 0)
				g.lineStyle(2, 0x242a33, 1)
			else
				g.lineStyle(1, 0x242a33, 1)
			g.moveTo(-padding, i)
			g.lineTo(width + padding, i)
		}

		stage.addChildAt(g, 0)

		document.addEventListener('mousemove', onMouseUpdate, false);
		document.addEventListener('mouseenter', onMouseUpdate, false);
		document.addEventListener('mousedown', onMouseDown, false);
		document.addEventListener('mouseup', onMouseUp, false);
	})

	socket.on('disconnect', () => {
		window.location.reload()
	})

	socket.on('add player', (id, user) => {
		console.log('added', user.name)
		users[id] = user
		let text = new Text(user.name ? user.name + "\n▼" : '', getTextStyle(user.color))
		text.x = user.x
		text.y = user.y
		text.anchor.set(0.5,1)
		text.alpha = 0.9
		user.text = text
		let minKeys = Object.keys(user.minions)
		for (let i = 0; i < minKeys.length; i++) {
			setupMinion(user.minions[minKeys[i]], user.color)
		}
		ui.addChild(text)
	})

	socket.on('remove player', (id) => {
		if (users[id]) {
			console.log('removed', users[id].name)
			ui.removeChild(users[id].text)
			let minKeys = Object.keys(users[id].minions)
			for (let i = 0; i < minKeys.length; i++) {
				stage.removeChild(users[id].minions[minKeys[i]].sprite)
			}
			delete users[id]
		}
	})

	socket.on('update', (theirUsers) => {
		let keys = Object.keys(theirUsers)
		for (let i = 0; i < keys.length; i++) {
			let u = users[keys[i]] || user
			let minKeys = Object.keys(u.minions)
			for (let j = 0; j < minKeys.length; j++) {
				// TODO handling added or removed minions
				u.minions[minKeys[j]].update(theirUsers[keys[i]].minions[minKeys[j]])
			}
		}

		let x = 0, y = 0
		keys = Object.keys(user.minions)
		for (let i = 0; i < keys.length; i++) {
			x += user.minions[keys[i]].x
			y += user.minions[keys[i]].y
		}
		x /= keys.length
		y /= keys.length

		stage.x = renderer.width/2;
		stage.y = renderer.height/2;
		stage.pivot.x = x;
		stage.pivot.y = y;
		stage.scale.x = stage.scale.y = Math.pow(ZOOM / keys.length, 0.5);

		ui.x = renderer.width / 2;
		ui.y = renderer.height / 2;
		user.text.x = 0
		user.text.y = -12 * stage.scale.x

		keys = Object.keys(users)
		for (let i = 0; i < keys.length; i++) {
			let user = users[keys[i]]
			let userx = 0, usery = 0
			let minKeys = Object.keys(user.minions)
			for (let i = 0; i < minKeys.length; i++) {
				userx += user.minions[minKeys[i]].x
				usery += user.minions[minKeys[i]].y
			}
			userx /= minKeys.length
			usery /= minKeys.length
			user.text.x = (userx - x) * stage.scale.x
			user.text.y = ((usery - y) - 12) * stage.scale.y
		}

		minions.children.sort((a, b) => {
			return a.y - b.y
		})

		if (!!mouseDown) updateServer()
	})

	socket.on('attack', (userId, minionId, color) => {
		let u = users[userId] || user
		if (!u) return
		let minion = u.minions[minionId]
		if (minion)
			createEmitter(color, minion.x, minion.y)
	})

	socket.emit('login', username = document.getElementById('name').value)
})

// Create some basic objects
let gameStage = new Container();
let stage = new Container();
let minions = new Container();
let ui = new Container();
if (debug) ui.addChild(debug)
stage.addChild(minions);
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
	.add("enemy1", "img/skeli.png")
	.add("spark", "img/spark.png")
	// Call setup after loading
	.load(setup);

function getTextStyle(color) {
	return {
		fill: color,
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

function generateColoredTexture(string, color) {
	let temp = new Container()
	temp.addChild(new Sprite(TextureCache[string]))
	let temp2 = autoDetectRenderer(TextureCache[string].orig.width, TextureCache[string].orig.height);
	temp2.render(temp)
	let pixels = temp2.plugins.extract.pixels(temp)

  /*
	// Pixel to get replaced
	// Find this by logging pixels and looking at the pixel data
	let specialPixel = [229, 229, 229, 255] // 0 - 255

	for (let i = 0; i < pixels.length; i += 4) {
		if (pixels[i] === specialPixel[0] &&
			pixels[i + 1] === specialPixel[1] &&
			pixels[i + 2] === specialPixel[2] &&
			pixels[i + 3] === specialPixel[3]) {

			let rgb = hexToRgbA(color)
			pixels[i] = rgb[0]
			pixels[i + 1] = rgb[1]
			pixels[i + 2] = rgb[2]
			pixels[i + 3] = rgb[3]
		}
	}
  */

  // Grayscale colorizer
	for (let i = 0; i < pixels.length; i += 4) {
		if (pixels[i] === pixels[i+1] &&
			pixels[i] === pixels[i+2] &&
			pixels[i + 3] !== 0) {

			let rgb = hexToRgbA(color)
      let colorHsv = rgbAToHsvA(rgb)
      let pixelHsv = rgbAToHsvA([pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]]);

      let targetHsv = [colorHsv[0], colorHsv[1], pixelHsv[2], pixelHsv[3]];
      let targetRgb = hsvAToRgbA(targetHsv);
			pixels[i] = targetRgb[0]
			pixels[i + 1] = targetRgb[1]
			pixels[i + 2] = targetRgb[2]
			pixels[i + 3] = targetRgb[3]
		}
	}

	var canvas = document.createElement('canvas');
	canvas.width = 16;
	canvas.height = 16;
	var ctx = canvas.getContext('2d');
	var pix = ctx.createImageData(canvas.width, canvas.height);
	let inc = 0
	for (var y = 0; y < canvas.height; y++) {
		for (var x = 0; x < canvas.width; x++) {
			pix.data[inc] = pixels[inc++];
			pix.data[inc] = pixels[inc++];
			pix.data[inc] = pixels[inc++];
			pix.data[inc] = pixels[inc++];
		}
	}

	ctx.putImageData(pix, 0, 0);
	TextureCache[string + color] = Texture.fromCanvas(canvas);
}

function setupMinion(minion, color) {
	if (!TextureCache[minion.sprite + color])
		generateColoredTexture(minion.sprite, color)
	minion.sprite = new Sprite(TextureCache[minion.sprite + color])
	minion.sprite.anchor.set(0.5, 1)
	minion.sprite.x = minion.x
	minion.sprite.y = minion.y
	minion.update = function(minion) {
		this.x = this.sprite.x = minion.x
		this.y = this.sprite.y = minion.y
	};
	minions.addChild(minion.sprite)
}

function createEmitter(color, x, y) {
	let emitter = new Emitter(stage,
	[TextureCache.spark],
	{
		"alpha": {
			"start": 1,
			"end": 0.31
		},
		"scale": {
			"start": 0.4,
			"end": 0.001,
			"minimumScaleMultiplier": 0.5
		},
		"color": {
			"start": color,
			"end": "#ffffff"
		},
		"speed": {
			"start": 400,
			"end": 50,
			"minimumSpeedMultiplier": 0.2
		},
		"acceleration": {
			"x": 0,
			"y": 0
		},
		"maxSpeed": 0,
		"startRotation": {
			"min": 250,
			"max": 290
		},
		"noRotation": false,
		"rotationSpeed": {
			"min": 0,
			"max": 20
		},
		"lifetime": {
			"min": 0.25,
			"max": 0.5
		},
		"blendMode": "normal",
		"frequency": 0.01,
		"emitterLifetime": 0.2,
		"maxParticles": 1000,
		"pos": {
			"x": x,
			"y": y
		},
		"addAtBack": false,
		"spawnType": "point"
	})
	emitters.push(emitter)
}

function gameLoop() {
	requestAnimationFrame(gameLoop);

	state();

	renderer.render(gameStage);

	if (debug) debug.clear()
}

function play() {
	socket.emit('heartbeat')

	let now = Date.now()
	let delta = (now - elapsed) * 0.001
	elapsed = now;

	for (let i = 0; i < emitters.length; i++) {
		emitters[i].update(delta);
	}
}

function resize() {
	renderer.resize(window.innerWidth, window.innerHeight);
}

function onMouseUpdate(e) {
	x = e.pageX - window.innerWidth / 2
	y = e.pageY - window.innerHeight / 2
	if (!!mouseDown) updateServer()
}

function onMouseDown() {
	mouseDown++
	updateServer()
}

function onMouseUp() {
	mouseDown--
	updateServer()
}

function updateServer() {
	//let dx = scalarProjection(user.minions.m0.x - stage.pivot.x,
	//	user.minions.m0.y - stage.pivot.y)
	let keys = Object.keys(user.minions)
	let dx = user.minions[keys[0]].x - (stage.pivot.x + x / stage.scale.x)
	let dy = user.minions[keys[0]].y - (stage.pivot.y + y / stage.scale.y)
	let distance = dx * dx + dy * dy
	let leader = keys[0]
	if (debug) {
		debug.lineStyle(1, 0x880000, 1)
		debug.moveTo(0, 0)
		debug.lineTo(x, y)
		debug.lineStyle(1, 0x000088, 1)
    	debug.moveTo(0, 0)
    	debug.lineTo((user.minions[keys[0]].x - stage.pivot.x) * stage.scale.x,
    		(user.minions[keys[0]].y - stage.pivot.y) * stage.scale.y)
	}
	for (let i = 1; i < keys.length; i++) {
		/*let temp = scalarProjection(user.minions[keys[i]].x - stage.pivot.x,
			user.minions[keys[i]].y - stage.pivot.y)
		if (temp > dx) {
			leader = keys[i]
			dx = temp
		}*/
		dx = user.minions[keys[i]].x - (stage.pivot.x + x / stage.scale.x)
		dy = user.minions[keys[i]].y - (stage.pivot.y + y / stage.scale.y)
		let temp = dx * dx + dy * dy
		if (temp < distance) {
			distance = temp
			leader = keys[i]
		}
		if (debug) {
	    	debug.moveTo(0, 0)
	    	debug.lineTo((user.minions[keys[i]].x - stage.pivot.x) * stage.scale.x,
	    		(user.minions[keys[i]].y - stage.pivot.y) * stage.scale.y)
	    }
	}
	if (debug) {
		debug.lineStyle(2, 0x008800, 1)
    	debug.moveTo(0, 0)
    	debug.lineTo((user.minions[leader].x - stage.pivot.x) * stage.scale.x,
    		(user.minions[leader].y - stage.pivot.y) * stage.scale.y)
    }
	socket.emit('update',
		x / stage.scale.x - (user.minions[leader].x - stage.pivot.x),
		y / stage.scale.y - (user.minions[leader].y - stage.pivot.y),
		!!mouseDown,
		leader
	)
}

function scalarProjection(minionx, miniony) {
	// a = (minionx, miniony)
	// b = (mousex, mousey)
	let abdot = (minionx * x) + (miniony * y)
    let blensq = (x * x) + (y * y)
    return abdot / blensq
}

// https://stackoverflow.com/questions/21646738/convert-hex-to-rgba
function hexToRgbA(hex){
	console.log(hex)
    var c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return [(c>>16)&255, (c>>8)&255, c&255, 255];
    }
    //throw new Error('Bad Hex');
    return [0, 0, 0, 255]
}

//Returns the array in hue (0..360), saturation (0..100), value (0..100) alpha form.
function rgbAToHsvA(rgb){
  var rPrime = rgb[0]*1.0/255;
  var gPrime = rgb[1]*1.0/255;
  var bPrime = rgb[2]*1.0/255;
  var cMax = Math.max(rPrime, gPrime, bPrime);
  var cMin = Math.min(rPrime, gPrime, bPrime);
  var delta = cMax - cMin;

  var hue;
  if(delta === 0){
    hue = 0;
  }
  else if(cMax === rPrime){
    hue = 60*( ((gPrime - bPrime) / delta)%6);
  }
  else if(cMax === gPrime){
    hue = 60*((bPrime - rPrime)/delta +2);
  }
  else{
    hue = 60*((rPrime - gPrime)/delta +4);
  }

  var saturation;
  if(cMax === 0){
    saturation = 0;
  }
  else{
    saturation = delta/cMax;
  }

  var value = cMax;

  return [toInt(hue), toInt(saturation*100), toInt(value*100), rgb[3]];
}

function hsvAToRgbA(hsv){
  var c = (hsv[1]*hsv[2])/100.0;
  var x = c*(1- Math.abs((hsv[0]/60.0)%2 - 1));
  var m = hsv[2]/100.0 - c;

  var rgbPrime;

  if(hsv[0] < 60){
    rgbPrime = [c,x,0];
  }
  else if(hsv[0] >= 60 && hsv[0] < 120){
    rgbPrime = [x,c,0];
  }
  else if(hsv[0] >= 120 && hsv[0] < 180){
    rgbPrime = [0,c,x];
  }
  else if(hsv[0] >= 180 && hsv[0] < 240){
    rgbPrime = [0,x,c];
  }
  else if(hsv[0] >= 240 && hsv[0] < 300){
    rgbPrime = [x,0,c];
  }
  else{
    rgbPrime = [c,0,x];
  }

  return [toInt((rgbPrime[0]+m)*255),toInt((rgbPrime[1]+m)*255),toInt((rgbPrime[2]+m)*255),hsv[3]]
}

function toInt(n){
  return Math.round(Number(n));
}
