const pixelSize = _hardware.defaultPixelScale;
const marginSize = pixelSize * 4;

// Data Types
class Player {

    static horizontalSpeed = 256;
    static travelSpeed = 128;
    static maxFuel = 20;
    static startingFuel = Player.maxFuel * 2/5;
    static baseFuelCost = 1;
    static screenY = 512 * 3/4;

    constructor() {
        this.size = spriteSheet['player'].spriteWidth;
        this.pos = new Vec(screen().width / 2, 0);
        this.velocity = new Vec(0, Player.travelSpeed);
        this.accelerationFactor = pixelSize * 2;
        this.world
        this.oscilationAmplitude = pixelSize;
        this.oscilationSpeed = 5;
        this.elapsed = 0;
        this.state = 'idle';
        this.fuel = Player.startingFuel;
        this.shield = 20;
    }

    draw(dt, pos) {
        this.elapsed += dt;
        let yOffset = Math.sin(this.elapsed * 5) * this.oscilationAmplitude;
        spriteSheet['player'].cspr(0, pos.x + pixelSize, pos.y - pixelSize + yOffset);
    }
};

class Fuel {

    constructor(x, y) {
        this.pos = new Vec(x, y);
        this.refillAmount = Player.maxFuel * 1/5;
        this.pickedUp = false;
    }

    draw(dt, pos) {
        if (this.pickedUp) {
            return;
        }
        spriteSheet['items'].cspr(0, pos.x, pos.y);
    }
}

class Level {
    constructor(index) {
        this.index = index;
        this.end = Player.travelSpeed * 20;
        this.fuels = [
            new Fuel(256, Player.travelSpeed * 10)
        ];
    }

    updatePlayer(dt) {
        if (player.state == 'right') {
            player.velocity.x += (Player.horizontalSpeed - player.velocity.x) * player.accelerationFactor * dt;
            if (player.velocity.x > Player.horizontalSpeed) {
                player.velocity.x = Player.horizontalSpeed
            }
        }
        else if (player.state == 'left') {
            player.velocity.x += (-Player.horizontalSpeed - player.velocity.x) * player.accelerationFactor * dt;
            if (player.velocity.x < -Player.horizontalSpeed) {
                player.velocity.x = -Player.horizontalSpeed
            }
        }
        else {
            player.velocity.x -= player.velocity.x * player.accelerationFactor * 0.5 * dt;
            if (Math.abs(player.velocity.x) < pixelSize) {
                player.velocity.x = 0;
            }
        }

        if (player.fuel > 0) {
            player.fuel = Math.max(player.fuel - dt, 0);
        }
        else {
            // This will change once we have asteroids.
            // Space has no friction, fuel = cost to dodge
            // Running out of fuel relies on shield + luck to go over a fuel pickup
            player.velocity.y -= player.velocity.y * player.accelerationFactor * 0.1 * dt;
            if (Math.abs(player.velocity.y) < pixelSize) {
                player.velocity.y = 0;
            }
            player.velocity.x = 0;
        }

        player.pos = player.pos.add(player.velocity.mult(dt));

        player.state = 'idle';
    }

    update(dt) {
        this.updatePlayer(dt);
        this.fuels.forEach(fuel => {
            if (fuel.pickedUp) {
                return;
            }
            let spriteRange = spriteSheet['player'].spriteWidth / 2 + spriteSheet['items'].spriteWidth;
            let xCollides = Math.abs(player.pos.x - fuel.pos.x) < spriteRange;
            let yCollides = Math.abs(player.pos.y - fuel.pos.y) < spriteRange;
            if (xCollides && yCollides) {
                player.fuel += fuel.refillAmount;
                fuel.pickedUp = true;
            }
        });
    }

    drawToScreen(dt, obj) {
        let drawPos = obj.pos.copy();
        let yToPlayer = obj.pos.y - player.pos.y;
        drawPos.y = Player.screenY - yToPlayer;
        obj.draw(dt, drawPos);
    }

    draw(dt) {
        print(`pos: (${Math.round(player.pos.x)}, ${Math.round(player.pos.y)})`, 0, 0, 7);
        this.fuels.forEach(fuel => this.drawToScreen(dt, fuel));
        this.drawToScreen(dt, player)
    }
}

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
let levels = [ new Level(0) ];
let levelIndex = 0;
let player = null;
let asteroids = [];

// HUD
let progressBar = {
    elapsed: 0,
    period: 1,
    draw(dt) {
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

        let progress = player.pos.y / levels[levelIndex].end;
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
        if (progressBar.elapsed > progressBar.period) {
            progressBar.elapsed %= progressBar.period;
        }

        if (progressBar.elapsed > progressBar.period * (5/6)) {
            return;
        }

        let rect = new Rect(new Vec(x + 2 * pixelSize, y -1.5 * pixelSize), pixelSize * 3, pixelSize * 3);
        rect.color = colors[7];
        rect.draw();
    }
}

let fuelBar = {
    draw(dt) {
        let progress = Math.ceil(player.fuel) / Player.maxFuel;
        progress = Math.min(progress, 1);
        progress = Math.max(0, progress);

        let width = 4 * pixelSize * Player.maxFuel * progress;
        let x = 136;
        let y = 452;
        let rect = new Rect(new Vec(x, y), width, pixelSize * 3);
        rect.color = colors[12];
        rect.draw();
    }
}

let fadeToBlack = {
    elapsed: 0,
    duration: 2,
    area: new Rect(new Vec(0, 0), 512, 512),
    draw(dt) {
        let progress = this.elapsed / this.duration;
    }
}

// Life Cycle
function load() {
    loadSpriteSheet('player', './sprites/player.png', 1, 1);
    loadSpriteSheet('margin', './sprites/margin.png', 1, 1);
    loadSpriteSheet('hud-bars', './sprites/hud-bars.png', 1, 1);
    loadSpriteSheet('progress-bar', './sprites/progress-bar.png', 1, 1);
    loadSpriteSheet('items', './sprites/items.png', 1, 1);
}

function init() {
    //enableGrid(true);
    player = new Player();
}

function draw(dt) {
    cls(0);
    //spriteSheet['margin'].spr(0, 0, 0);

    // Level
    let level = levels[levelIndex];
    level.draw(dt);

    // HUD
    spriteSheet['progress-bar'].spr(0, 0, marginSize);
    progressBar.draw(dt);

    spriteSheet['hud-bars'].spr(0, marginSize, screen().height - marginSize - spriteSheet['hud-bars'].spriteHeight);
    fuelBar.draw(dt);
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
    if (mouse.justPressed) {
        let mx = Math.floor(mouse.position.x);
        mx = mx - mx % pixelSize;
        let my = Math.floor(mouse.position.y);
        my = my - my % pixelSize;
        console.log({mx, my});
    }

    // Process
    let level = levels[levelIndex];
    level.update(dt);

    if (player.pos.y > level.end) {
        // Victory screen
    }
    else if (player.fuel <= 0) {
        // Lose screen
    }

    // Output
    draw(dt);
}

/*
- Reach end (Win Condition)
- Out of fuel (Lose Condition)

- Deal with out of bounds left + right

- Portals & Recursion

- Add asteroids + shield
- Fuel is only to doge!
- Balance and polish

*/