// Consts
const pixelSize = _hardware.defaultPixelScale;
const marginSize = pixelSize * 4;

// Debug Settings
let freeControl = false;
let visualDebug = false;

// Data Types
class Player {

    static horizontalSpeed = 256;
    static travelSpeed = 256;
    static maxFuel = 20;
    static startingFuel = Player.maxFuel / 2;
    static maxShield = 20;
    static startingShield = Player.maxShield / 2;
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
        this.shield = Player.startingShield;
        this.state = 'idle';
    }

    draw(dt, pos) {
        this.elapsed += dt;
        let yOffset = Math.sin(this.elapsed * Player.oscilationSpeed) * Player.oscilationAmplitude;
        spriteSheet['player'].cspr(0, pos.x + pixelSize, pos.y - pixelSize + yOffset);

        if (visualDebug) {
            let rect = new Rect(pos, pixelSize, pixelSize);
            rect.draw();
        }
    }
};

class Item {

    static fuelSpriteIndex = 0;
    static shieldSpriteIndex = 1;
    static fuelRefillAmount = 5;
    static shieldRefillAmount = 5;

    constructor(type, x, y) {
        this.pos = new Vec(x, y);
        this.type = type;
        this.pickedUp = false;
    }

    get refillAmount() {
        return this.type == 'fuel' ? Item.fuelRefillAmount : Item.shieldRefillAmount;
    }

    get spriteIndex() {
        return this.type == 'fuel' ? Item.fuelSpriteIndex : Item.shieldSpriteIndex;
    }

    draw(dt, pos) {
        if (this.pickedUp) {
            return;
        }
        spriteSheet['items'].cspr(this.spriteIndex, pos.x, pos.y);
    }
}

class Asteroid {

    static nextId = 0;
    static maxAmplitude = Player.travelSpeed;

    constructor(index, x, y, entropy) {
        this.id = Asteroid.nextId++;
        this.centerOfGravity = new Vec(x, y);
        this.pos = new Vec(x, y);
        this.index = index;
        this.speed = new Vec(0, 0);
        this.destroyed = false;
        this.entropy = entropy
        this.elapsed = 0;
    }

    get size() {
        return [7, 11, 15][this.index] * pixelSize;
    }

    get damage() {
        return this.index + 1;
    }

    draw(dt, pos) {
        if (this.destroyed) {
            return;
        }

        if (visualDebug) {
            let ctx = drawingContext();
            ctx.strokeStyle = colors[14];
            ctx.strokeRect(pos.x, pos.y, this.size, this.size);
        }

        spriteSheet['asteroids'].spr(this.index, pos.x, pos.y)
        if (this.label) {
            let labelPos = pos.add(new Vec(4,4).mult(-pixelSize));
            print(this.id.toString(), labelPos.x, labelPos.y, 7);
        }
    }
};

class Level {

    constructor() {
        this.end = Player.travelSpeed * 100;
        this.complete = false;
        player.pos = new Vec(256, 0);
        player.velocity = new Vec(0, Player.travelSpeed);

        this.fuels = [];
        this.shields = [];
        this.asteroids = [];

        for (let i = 0; i < 19; i++) {
            let x = this.randomItemX();
            let y = Player.travelSpeed * ( i + 1 ) * 5;
            this.fuels.push(new Item('fuel', x, y));
            if (i % 5 == 0) {
                let x2 = 512 - x;
                let y2 = Math.floor(Math.random() * 3 + 1) * Player.travelSpeed + y;
                this.fuels.push(new Item('fuel', x2, y2));
            }
        }

        for (let i = 20; i <= 80; i += 20) {
            let x = this.randomItemX();
            let y = Player.travelSpeed * (i + Math.floor(Math.random() * 5 - 2));
            this.shields.push(new Item('shield', x, y));
        }

        for (let i = 0; i < 190; i++) {
            let x = this.randomItemX();
            let y = Player.travelSpeed * 0.5 * (10 + i);
            let entropy = i / 190 + Math.sin(Math.random());
            this.asteroids.push(new Asteroid(Math.floor(Math.random() * 3), x, y, entropy));
        }
    }

    randomItemX() {
        let minX = (marginSize + spriteSheet['items'].spriteWidth) * 2;
        let maxX = 512 - minX;
        let range = maxX - minX;
        let x = Math.floor(Math.sin(Math.random()) * (range + 1) + minX);
        x = x - x % pixelSize;
        console.assert(minX <= x && x <= maxX);
        return x;
    }

    updatePlayer(dt) {

        if (freeControl) {
            if (btn('up')) {
                player.pos.y += pixelSize * 64 * dt;
            }
            if (btn('left')) {
                player.pos.x -= pixelSize * 64 * dt;
            }
            if (btn('down')) {
                player.pos.y -= pixelSize * 64 * dt;
            }
            if (btn('right')) {
                player.pos.x += pixelSize * 64 * dt;
            }
            return;
        }

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
            player.velocity.y -= player.velocity.y * Player.accelerationFactor * 0.1 * dt;
            if (Math.abs(player.velocity.y) < pixelSize && player.velocity.y > 0) {
                player.velocity.y = 0;
                fadeToBlack.start(() => stateUpdate = gameOverUpdate);
            }
            player.velocity.x = 0;
        }

        player.pos = player.pos.add(player.velocity.mult(dt));
        player.pos.x = Math.max(Math.min(player.pos.x, 512 - marginSize), marginSize);
        player.state = 'idle';
    }

    update(dt) {
        this.updatePlayer(dt);

        this.fuels.concat(this.shields).forEach(item => {
            if (item.pickedUp) {
                return;
            }
            let spriteRange = spriteSheet['player'].spriteWidth / 2 + spriteSheet['items'].spriteWidth;
            let xCollides = Math.abs(player.pos.x - item.pos.x) < spriteRange;
            let yCollides = Math.abs(player.pos.y - item.pos.y) < spriteRange;
            if (xCollides && yCollides) {
                player[item.type] += item.refillAmount;
                item.pickedUp = true;
                sfx['pickup'].play();
            }
        });

        this.asteroids.forEach(asteroid => {
            if (asteroid.destroyed) {
                return;
            }

            asteroid.elapsed += dt;
            let offset = Math.floor(Math.sin(asteroid.elapsed) * Asteroid.maxAmplitude * asteroid.entropy);
            asteroid.pos = asteroid.centerOfGravity.add(new Vec(offset, 0));

            let xCollides = asteroid.pos.x <= player.pos.x && player.pos.x <= asteroid.pos.x + asteroid.size;
            let yCollides = asteroid.pos.y - asteroid.size <= player.pos.y && player.pos.y <= asteroid.pos.y;
            if (xCollides && yCollides) {
                asteroid.destroyed = true;
                if (player.shield > 0 && player.shield <= asteroid.damage) {
                    fadeToBlack.start(() => stateUpdate = gameOverUpdate);
                }
                player.shield -= asteroid.damage;
                sfx['hit'].play();
            }
        });

        if (!this.complete && player.pos.y > this.end) {
            this.complete = true;
            fadeToBlack.start(() => stateUpdate = victoryUpdate);
        }
    }

    drawToScreen(dt, obj) {
        let drawPos = obj.pos.copy();
        let yToPlayer = obj.pos.y - player.pos.y;
        drawPos.y = Player.screenY - yToPlayer;
        obj.draw(dt, drawPos);
    }

    draw(dt) {
        //print(`pos: (${Math.round(player.pos.x)}, ${Math.round(player.pos.y)})`, 0, 0, 7);

        // Finish Line
        this.drawToScreen(dt, {
            pos: new Vec(0, this.end),
            draw(dt, pos) {
                spriteSheet['finish-line'].spr(0, pos.x, pos.y)
            }
        });

        this.asteroids.forEach(asteroid => this.drawToScreen(dt, asteroid));
        this.fuels.concat(this.shields).forEach(fuel => this.drawToScreen(dt, fuel));
        this.drawToScreen(dt, player);
    }
}

// Variables
let stateUpdate = titleScreenUpdate;
let player = null;
let level = null;
let largeFont = { name: 'pico8', size: 32, weight: '' };
let mediumFont = { name: 'pico8', size: 16, weight: '' };

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

        let progress = player.pos.y / level.end;
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

let shieldBar = {
    draw(dt) {
        let progress = Math.ceil(player.shield) / Player.maxShield;
        progress = Math.min(progress, 1);
        progress = Math.max(0, progress);

        const barWidth = 80;
        let width = barWidth * pixelSize * progress;
        let x = 136;
        let y = 452 + 7 * pixelSize;
        let rect = new Rect(new Vec(x, y), width, pixelSize * 3);
        rect.color = colors[11];
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

    start(endCallback, reverse = false) {
        if (!this.active) {
            this.endCallback = endCallback;
            this.elapsed = 0;
            this.active = true;
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
                this.reverse = true;
                fadeToBlack.start(null, true);
            }
        }
    }
}

// Game Loops
function titleScreenUpdate(dt) {
    cls(0);
    print('EDGE', pixelSize * 23, pixelSize * 24, 6, largeFont);
    print('EDGE', pixelSize * 24, pixelSize * 24, 7, largeFont);
    print('OF', pixelSize * 23, pixelSize * (24 + 16), 6, largeFont);
    print('OF', pixelSize * 24, pixelSize * (24 + 16), 7, largeFont);
    print('RECURSION', pixelSize * 23, pixelSize * (24 + 32), 6, largeFont);
    print('RECURSION', pixelSize * 24, pixelSize * (24 + 32), 7, largeFont);
    print('MOVE .... [A] or [D]', pixelSize * 24, pixelSize * 80, 7, mediumFont);
    print('START ... [X] or [C]', pixelSize * 24, pixelSize * 90, 7, mediumFont);

    fadeToBlack.draw(dt);
    if (fadeToBlack.active) {
        return;
    }

    if (btnp('x') || btnp('o')) {
        fadeToBlack.start(() => {
            init();
            music['bgm'].play();
            stateUpdate = levelUpdate;
        });
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
    level.update(dt);

    // Drawings
    cls(0);
    level.draw(dt);

    // HUD
    spriteSheet['progress-bar'].spr(0, 0, marginSize);
    progressBar.draw(dt);

    spriteSheet['hud-bars'].spr(0, marginSize, screen().height - marginSize - spriteSheet['hud-bars'].spriteHeight);
    fuelBar.draw(dt);
    shieldBar.draw(dt);

    // Transitions
    fadeToBlack.draw(dt);
}

function gameOverUpdate(dt) {
    cls(0);
    print('GAME OVER', pixelSize * 30, pixelSize * 50, 7, largeFont);

    // Transitions
    fadeToBlack.draw(dt);
    if (fadeToBlack.active) {
        return;
    }

    if (btnp('x') || btnp('o')) {
        fadeToBlack.start(() => {
            stateUpdate = titleScreenUpdate;
        });
    }
}

function victoryUpdate(dt) {
    cls(0);
    print('THANK YOU', pixelSize * 30, pixelSize * 50, 7, largeFont);
    print('FOR PLAYING!', pixelSize * 20, pixelSize * 70, 7, largeFont);

    // Transitions
    fadeToBlack.draw(dt);
    if (fadeToBlack.active) {
        return;
    }

    if (btnp('x') || btnp('o')) {
        fadeToBlack.start(() => {
            stateUpdate = titleScreenUpdate;
        });
    }
}

// Life Cycle
function load() {
    loadFontFamily('pico8', './fonts/pico8.ttf');
    setDefaultFont('pico8');

    loadSFX('hit', './audio/hit.wav');
    loadSFX('pickup', './audio/pickup.wav');
    loadMusic('bgm', './audio/galacticknight.mp3');
    music['bgm'].loop = true;

    loadSpriteSheet('player', './sprites/player.png', 1, 1);
    loadSpriteSheet('margin', './sprites/margin.png', 1, 1);
    loadSpriteSheet('hud-bars', './sprites/hud-bars.png', 1, 1);
    loadSpriteSheet('progress-bar', './sprites/progress-bar.png', 1, 1);
    loadSpriteSheet('items', './sprites/items.png', 1, 2);
    loadSpriteSheet('finish-line', './sprites/finish-line.png', 1, 1);
    loadSpriteSheet('asteroids', './sprites/asteroids.png', 1, 3);
    loadSpriteSheet('portal', './sprites/portal.png', 1, 1);
}

function init() {
    //enableGrid(true);
    player = new Player();
    level = new Level();
}

function update(dt) {
    // Debug
    if (mouse.justPressed) {
        let x = Math.floor(mouse.position.x);
        x = x - x % pixelSize;
        let y = Math.floor(mouse.position.y);
        y = y - y % pixelSize;
        //console.log({x, y});
    }

    // Scene
    stateUpdate(dt);
}
/*
    -- Feature Complete --

- SFX
- Screen shake
- Animations
- Polish HUD (flashing animations, shake animations)
- Music
- Title Screen
- Victory Screen
- Game Over Screen

    -- Post Jam --

- Fuel is only to dodge!
    // This will change once we have asteroids.
    // Space has no friction, fuel = cost to dodge
    // Running out of fuel relies on shield + luck to go over a fuel pickup
- Portals, Levels & Recursion
- Tutorialize Mechanic
*/