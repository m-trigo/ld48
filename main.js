const pixelSize = _hardware.defaultPixelScale;
const marginSize = pixelSize * 4;

// Data Types
class Player {

    static horizontalSpeed = 256;

    constructor() {
        this.size =  spriteSheet['player'].spriteWidth;
        this.pos = new Vec(screen().width/2, screen().height/2);
        this.velocity = new Vec(0, 0);
        this.accelerationFactor = pixelSize * 2;
        this.world
        this.oscilationAmplitude = pixelSize;
        this.oscilationSpeed = 5;
        this.elapsed = 0;
        this.state = 'idle';
        this.fuel = 100;
        this.shield = 100;
    }

    update(dt) {
        if (this.state == 'right') {
            this.velocity.x += (Player.horizontalSpeed - this.velocity.x) * this.accelerationFactor * dt;
            if (this.velocity.x > Player.horizontalSpeed) {
                this.velocity.x = Player.horizontalSpeed
            }
        }
        else if (this.state == 'left') {
            this.velocity.x += (-Player.horizontalSpeed - this.velocity.x) * this.accelerationFactor * dt;
            if (this.velocity.x < -Player.horizontalSpeed) {
                this.velocity.x = -Player.horizontalSpeed
            }
        }
        else {
            this.velocity.x -= this.velocity.x * this.accelerationFactor * 0.5 * dt;
            if (Math.abs(this.velocity.x) < pixelSize) {
                this.velocity.x = 0;
            }
        }

        this.pos = this.pos.add(this.velocity.mult(dt));
        this.pos.x = Math.round(this.pos.x);
        this.state = 'idle';
    }

    draw(dt) {
        this.elapsed += dt;
        if (this.animation) {
            this.animation.animate(dt);
        }
        let yOffset = Math.sin(this.elapsed * 5) * this.oscilationAmplitude;
        spriteSheet['player'].spr(0, player.pos.x, player.pos.y + yOffset);
    }
};

class Cloud {

    constructor() {
        this.x = 0;
        this.y = 0;
        this.speed = -512;
        this.reset();
    }

    reset() {
        this.x = Math.floor(Math.random() * (screen().width - spriteSheet['clouds'].spriteHeight));
        this.y = Math.floor(screen().height + Math.floor(Math.random() * 100));
    }

    update(dt) {
        this.y += this.speed * dt;
        if (this.y < -spriteSheet['clouds'].spriteHeight) {
            this.reset();
        }
    }

    draw(dt) {
        spriteSheet['clouds'].spr(0, this.x, this.y)
    }
};

// Variables
let player = null;
let asteroids = [];

function drawProgressBar() {
    let ctx = drawingContext();
    ctx.lineWidth = pixelSize;

    let y = marginSize + ctx.lineWidth * (1.5);
    let start = marginSize + pixelSize * 3;
    let end = screen().width - marginSize - pixelSize * 5;
    ctx.beginPath();
    ctx.strokeStyle = colors[7];
    ctx.moveTo(start, y);
    ctx.lineTo(end, y);
    ctx.stroke();
    ctx.closePath();

    let progress = player.pos.x / screen().width;
    progress = Math.min(progress, 1);
    progress = Math.max(0, progress);
    print(progress, 0, 0, 7);
    let width = pixelSize * 7;
    let x = Math.floor(start + (end - width - start) * progress);
    ctx.beginPath();
    ctx.strokeStyle = colors[0];
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();
    ctx.closePath();

    let rect = new Rect(new Vec(x + 2 * pixelSize, y -1.5 * pixelSize), pixelSize * 3, pixelSize * 3);
    rect.color = 7;
    rect.draw();
}

// Life Cycle
function load() {
    loadSpriteSheet('player', './sprites/player.png', 1, 1);
    loadSpriteSheet('margin', './sprites/margin.png', 1, 1);
    loadSpriteSheet('hud-bars', './sprites/hud-bars.png', 1, 1);
    loadSpriteSheet('progress-bar', './sprites/progress-bar.png', 1, 1);
}

function init() {
    //enableGrid(true);
    player = new Player();
}

function draw(dt) {
    cls(0);
    //spriteSheet['margin'].spr(0, 0, 0);
    spriteSheet['hud-bars'].spr(0, marginSize, screen().height - marginSize - spriteSheet['hud-bars'].spriteHeight);
    spriteSheet['progress-bar'].spr(0, 0, marginSize);
    player.draw(dt);
    drawProgressBar();
}

function update(dt) {
    // Input
    if (btn('left')) {
        player.state = 'left';
    }
    if (btn('right')) {
        player.state = 'right';
    }

    // Debug
    if (btnp('up')) {
        player.pos.x = Math.floor(player.pos.x + pixelSize);
    }
    if (btnp('down')) {
        player.pos.x = Math.floor(player.pos.x - pixelSize);
    }

    // Process
    player.update(dt);

    // Output
    draw(dt);
}