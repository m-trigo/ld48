const pixelSize = _hardware.defaultPixelScale;
const marginSize = pixelSize * 4;

// Data Types
class Player {

    static horizontalSpeed = 256;
    static travelSpeed = 16;

    constructor() {
        this.sprite = spriteSheet['player'];
        this.size = this.sprite.spriteWidth;
        this.pos = new Vec(screen().width/2, screen().height/2);
        this.wpos = new Vec(0, 0);
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

        let opos = this.pos;
        this.pos = this.pos.add(this.velocity.mult(dt));
        let dpos = this.pos.sub(opos);
        this.wpos = this.wpos.add(dpos);
        this.wpos.y += Player.travelSpeed * dt;
        this.state = 'idle';
    }

    draw(dt) {
        print(`pos: (${Math.round(this.wpos.x)}, ${Math.round(this.wpos.y)})`, 0, 0, 7);

        this.elapsed += dt;
        if (this.animation) {
            this.animation.animate(dt);
        }
        let yOffset = Math.sin(this.elapsed * 5) * this.oscilationAmplitude;
        this.sprite.cspr(0, player.pos.x + pixelSize, player.pos.y - pixelSize + yOffset);
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
let levels = [ { end: 256 } ];
let levelIndex = 0;
let player = null;
let asteroids = [];

let progressBar = {
    elapsed: 0,
    period: 1
}
function drawProgressBar(dt) {
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

    let progress = player.wpos.y / levels[levelIndex].end;
    progress = Math.min(progress, 1);
    progress = Math.max(0, progress);
    let width = pixelSize * 7;
    let x = Math.floor(start + (end - width - start) * progress);
    ctx.beginPath();
    ctx.strokeStyle = colors[0];
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();
    ctx.closePath();

    progressBar.elapsed += dt;
    if (progressBar.elapsed < progressBar.period * (5/6)) {
        let rect = new Rect(new Vec(x + 2 * pixelSize, y -1.5 * pixelSize), pixelSize * 3, pixelSize * 3);
        rect.color = 7;
        rect.draw();
    }

    if (progressBar.elapsed > progressBar.period) {
        progressBar.elapsed %= progressBar.period;
    }
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
    drawProgressBar(dt);
}

function update(dt) {
    // Input
    if (btn('left')) {
        player.state = 'left';
    }
    if (btn('right')) {
        player.state = 'right';
    }

    // Process
    player.update(dt);

    // Output
    draw(dt);
}

/*
- World position
- Player movement in world
- Reach end
- Implement fuel
- Implement fuel pick up
- Add asteroids + shield

- Deal with out of bounds left + right

- Portals
*/