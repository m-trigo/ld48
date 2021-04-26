// Consts
const pixelSize = _hardware.defaultPixelScale;
const marginSize = pixelSize * 4;

let freeControl = false;
let visualDebug = true;

// Data Types
class Player {

    static horizontalSpeed = 256;
    static travelSpeed = 128;
    static maxFuel = 20;
    static startingFuel = Player.maxFuel / 2;
    static maxShield = 20;
    static startingShield = Player.maxShield / 5;
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
    static fuelRefillAmount = Player.maxFuel * 1/5;
    static shieldRefillAmount = Player.maxShield * 1/5;

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

    constructor(index, x, y) {
        this.id = Asteroid.nextId++;
        this.pos = new Vec(x, y);
        this.index = index;
        this.speed = new Vec(0, 0);
        this.destroyed = false;
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

    constructor(index) {
        this.index = index;
        this.end = Player.travelSpeed * 10;
        this.complete = false;
        this.fuels = [
            new Item('fuel', 256 - pixelSize * 16, Player.travelSpeed * 4),
            new Item('fuel', 300, Player.travelSpeed * 7),
            new Item('fuel', 416, Player.travelSpeed * 8),
        ];
        this.shields = [
            //new Item('shield', 384, Player.travelSpeed * 5),
        ];
        this.asteroids = [
            new Asteroid(1, 128, Player.travelSpeed * 2),
            new Asteroid(0, 384, Player.travelSpeed * 2.5),
            new Asteroid(2, 256, Player.travelSpeed * 3),
            new Asteroid(2, 156, Player.travelSpeed * 5),
            new Asteroid(0, 156, Player.travelSpeed * 6),
            new Asteroid(2, 384, Player.travelSpeed * 7),
            new Asteroid(2, 128, Player.travelSpeed * 7.5),
            new Asteroid(2, marginSize, Player.travelSpeed * 7),
            new Asteroid(2, marginSize, Player.travelSpeed * 8),
            new Asteroid(2, 256, Player.travelSpeed * 9),
            new Asteroid(1, 384, Player.travelSpeed * 11),
            new Asteroid(1, 128, Player.travelSpeed * 11),
            new Asteroid(2, 256, Player.travelSpeed * 11.5),
            new Asteroid(0, 128, Player.travelSpeed * 12),
            new Asteroid(0, 256, Player.travelSpeed * 12),
            new Asteroid(1, 384, Player.travelSpeed * 12.5),
            new Asteroid(1, marginSize, Player.travelSpeed * 12.5),
            new Asteroid(1, 256, Player.travelSpeed * 13),
            new Asteroid(0, 384, Player.travelSpeed * 13),
            new Asteroid(2, 128, Player.travelSpeed * 13.5),
        ];
        player.pos = new Vec(256, 0);
        player.velocity = new Vec(0, Player.travelSpeed);
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
            }
        });

        this.asteroids.forEach(asteroid => {
            if (asteroid.destroyed) {
                return;
            }

            let xCollides = asteroid.pos.x <= player.pos.x && player.pos.x <= asteroid.pos.x + asteroid.size;
            let yCollides = asteroid.pos.y - asteroid.size <= player.pos.y && player.pos.y <= asteroid.pos.y;
            if (xCollides && yCollides) {
                asteroid.destroyed = true;
                if (player.shield > 0 && player.shield <= asteroid.damage) {
                    fadeToBlack.start(() => stateUpdate = gameOverUpdate);
                }
                player.shield -= asteroid.damage;
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

class Transition {

    constructor(messages, callback) {
        this.index = 0;
        this.elapsed = 0;
        this.speed = 20;
        this.messages = messages;
        this.callback = callback;
    }

    update(dt) {
        this.elapsed += dt;

        cls(0);

        for (let i = 0; i <= this.index; i++) {
            let message = this.messages[i];
            let x = pixelSize * 8;
            if (i % 2 != 0) {
                x = 512 - x - message.length * 4 * pixelSize;
            }

            if (i < this.index ) {
                print(message, x, (Math.floor(i/2) + 4) * pixelSize * 8, 7);
            }
            else {
                let endIndex = Math.floor(this.elapsed * this.speed);
                endIndex = Math.min(endIndex, message.length);
                let section = message.substr(0, endIndex);
                print(section, x, (Math.floor(i/2) + 4) * pixelSize * 8, 7);
            }
        }

        fadeToBlack.draw(dt);
        if (fadeToBlack.active) {
            //return;
        }

        if ((btnp('x') || btnp('o'))) {
            if (this.index < this.messages.length - 1) {
                this.index++;
                this.elapsed = 0;
            }
            else {
                this.callback(); // make sure to activate fade-to-black
            }
        }
    }
}

// Variables
let stateUpdate = levelUpdate;//titleScreenUpdate;
let player = null;
let levels = [];
let levelIndex = 0;
let largeFont = { name: 'Courier New', size: 48, weight: '' };
let mediumFont = { name: 'Courier New', size: 32, weight: '' };

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
    print('Game Title', pixelSize * 25, pixelSize * 25, 7, largeFont);
    print('Move .... [A] or [D]', pixelSize * 18, pixelSize * 80, 7, mediumFont);
    print('Start ... [X] or [C]', pixelSize * 18, pixelSize * 90, 7, mediumFont);

    fadeToBlack.draw(dt);
    if (fadeToBlack.active) {
        return;
    }

    if (btnp('x') || btnp('o')) {
        let titleToLevelTransition = new Transition([
            'SECTOR', 'A',
            'DEPTH', '0',
            'DANGER', 'LOW',
            'SCRAPS', 'NONE',
            'FUEL', 'RARE',
        ], () => fadeToBlack.start(() => {
            init();
            stateUpdate = levelUpdate;
        }));
        fadeToBlack.start(() => {
            stateUpdate = dt => titleToLevelTransition.update(dt);
        })
    }
}

function titleToLevelTransitionUpdate(dt) {
    titleToLevelTransition.update(dt);
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
    shieldBar.draw(dt);

    // Transitions
    fadeToBlack.draw(dt);
}

function gameOverUpdate(dt) {
    cls(0);
    print('Game Over', pixelSize * 30, pixelSize * 50, 7, largeFont);

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
    cls(0);
    print('You win', pixelSize * 30, pixelSize * 50, 7, largeFont);

    // Transitions
    fadeToBlack.draw(dt);
    if (fadeToBlack.active) {
        return;
    }

    if (btnp('x') || btnp('o')) {
        stateUpdate = titleScreenUpdate;
    }
}

// Life Cycle
function load() {

    loadFontFamily('pico8', './fonts/pico8.ttf');
    setDefaultFont('pico8');

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
    levels = [ new Level(0) ];
    levelIndex = 0;

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
        -- Road Map --
- (1h) Deal with out of bounds left + right
- (3h) Balance

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