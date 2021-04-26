// Consts
const pixelSize = _hardware.defaultPixelScale;
const marginSize = pixelSize * 4;

// Data Types
class Player {

    static horizontalSpeed = 256;
    static travelSpeed = 128;
    static maxFuel = 20;
    static startingFuel = Player.maxFuel;
    static baseFuelCost = 1;
    static screenY = 512 * 3/4;
    static oscilationAmplitude = pixelSize;
    static oscilationSpeed = 5;
    static startingVelocity = new Vec(0, Player.travelSpeed);
    static startingPosition = new Vec(256, 0);
    static accelerationFactor = pixelSize * 2;

    constructor() {
        this.size = spriteSheet['player'].spriteWidth;
        this.pos = Player.startingPosition;
        this.velocity = Player.startingVelocity;
        this.elapsed = 0;
        this.fuel = Player.startingFuel;
        this.shield = 20;
        this.state = 'idle';
    }

    draw(dt, pos) {
        this.elapsed += dt;
        let yOffset = Math.sin(this.elapsed * Player.oscilationSpeed) * Player.oscilationAmplitude;
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


        player.pos = new Vec(screen().width / 2, 0);
        player.velocity = new Vec(0, Player.travelSpeed);
    }

    updatePlayer(dt) {
        if (player.state == 'right') {
            player.velocity.x += (Player.horizontalSpeed - player.velocity.x) * Player.accelerationFactor * dt;
            if (player.velocity.x > Player.horizontalSpeed) {
                player.velocity.x = Player.horizontalSpeed
            }
        }
        else if (player.state == 'left') {
            player.velocity.x += (-Player.horizontalSpeed - player.velocity.x) * Player.accelerationFactor * dt;
            if (player.velocity.x < -Player.horizontalSpeed) {
                player.velocity.x = -Player.horizontalSpeed
            }
        }
        else {
            player.velocity.x -= player.velocity.x * Player.accelerationFactor * 0.5 * dt;
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
            player.velocity.y -= player.velocity.y * Player.accelerationFactor * 0.1 * dt;
            if (Math.abs(player.velocity.y) < pixelSize && player.velocity.y > 0) {
                player.velocity.y = 0;
                fadeToBlack.endCallback = () => {
                    fadeToBlack.endCallback = null;
                    fadeToBlack.start(true);
                    stateUpdate = gameOverUpdate;
                };
                fadeToBlack.start();
            }
            player.velocity.x = 0;
        }

        player.pos = player.pos.add(player.velocity.mult(dt));

        if (isNaN(player.pos.x) || isNaN(player.pos.y)) {
            debugger;
        }

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
let stateUpdate = titleScreenUpdate;
let player = null;
let levels = [];
let levelIndex = 0;

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

        const barWidth = 80;
        let width = barWidth * pixelSize * progress;
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
    active: false,
    reverse: false,
    area: new Rect(new Vec(0, 0), 512, 512),
    endCallback: null,

    start(reverse = false) {
        if (!this.active) {
            this.active = true;
            this.elapsed = 0;
            this.reverse = reverse;
        }
    },

    draw(dt) {
        if (!this.active) {
            return;
        }
        this.elapsed += dt;
        let progress = Math.min(this.elapsed / this.duration, 1);
        this.area.color = `rgba(0, 0, 0, ${this.reverse ? (1 - progress ) : progress})`;
        this.area.draw();
        if (progress == 1) {
            this.active = false;
            if (this.endCallback) {
                this.endCallback();
            }
        }
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
    levels = [ new Level(0) ];
}

function titleScreenUpdate(dt) {
    cls(0);
    let font = { name: 'Courier New', size: 48, weight: '' };
    print('Game Title', pixelSize * 25, pixelSize * 25, 7, font);
    font.size = 32;
    print('Move .... [A] or [D]', pixelSize * 18, pixelSize * 80, 7, font);
    print('Start ... [X] or [C]', pixelSize * 18, pixelSize * 90, 7, font);

    if (btnp('x') || btnp('o')) {
        stateUpdate = levelUpdate;
    }
}

function levelUpdate(dt) {
    // Input
    if (btn('left')) {
        player.state = 'left';
    }

    if (btn('right')) {
        player.state = 'right';
    }

    // Updates
    let level = levels[levelIndex];
    level.update(dt);

    // Drawings
    cls(0);
    level.draw(dt);

    // HUD
    spriteSheet['progress-bar'].spr(0, 0, marginSize);
    progressBar.draw(dt);

    spriteSheet['hud-bars'].spr(0, marginSize, screen().height - marginSize - spriteSheet['hud-bars'].spriteHeight);
    fuelBar.draw(dt);

    // Transitions
    fadeToBlack.draw(dt);
}

function gameOverUpdate(dt) {
    cls(0);
    print('Game Over', 200, 260, 7);

    // Transitions
    fadeToBlack.draw(dt);

    if (fadeToBlack.active) {
        return;
    }

    if (btnp('x') || btnp('o')) {
        stateUpdate = titleScreenUpdate;
    }
}

function victoryUpdate(dt) {

}

function update(dt) {
    // Debug
    if (mouse.justPressed) {
        let mx = Math.floor(mouse.position.x);
        mx = mx - mx % pixelSize;
        let my = Math.floor(mouse.position.y);
        my = my - my % pixelSize;
        console.log({mx, my});
    }

    // Scene
    stateUpdate(dt);
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