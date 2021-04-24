
// Data Types
class Player {

    static leftSpriteIndex = 0;
    static rightSpriteIndex = 4;
    static verticalSpeed = 0;
    static horizontalSpeed = 64;

    constructor() {
        this.velocity = new Vec(Player.horizontalSpeed, Player.verticalSpeed);
        this.size = 16 * _hardware.defaultPixelScale;
        this.pos = new Vec(512/2 - this.size/2, 512 * 1/2);
        this.spriteIndex = 0;
        this.animation = null;
        this.oscilationAmplitude = 8;
        this.oscilationSpeed = 5;
        this.elapsed = 0;
        this.state = 'idle';
    }

    update(dt) {
        if (this.state == 'right') {
            this.velocity.x = Player.horizontalSpeed;
        }
        else if (this.state == 'left') {
            this.velocity.x = -Player.horizontalSpeed;
        }
        else {
            this.velocity.x = 0;
        }

        if (this.animation == null) {
            let step = null;
            if (this.state == 'left' && this.spriteIndex == Player.rightSpriteIndex) {
                step = () => this.spriteIndex--;
            }
            else if (this.state == 'right' && this.spriteIndex == Player.leftSpriteIndex) {
                step = () => this.spriteIndex++;
            }

            if (step) {
                this.animation = new StepAnimation(0.4, 4, step, null, () => this.animation = null);

            }

            player.pos = player.pos.add(player.velocity.mult(dt));
        }


        this.state = 'idle';
    }

    draw(dt) {
        this.elapsed += dt;
        if (this.animation) {
            this.animation.animate(dt);
        }
        let yOffset = Math.sin(this.elapsed * 5) * this.oscilationAmplitude;
        spriteSheet['player'].spr(this.spriteIndex, player.pos.x, player.pos.y + yOffset);
    }
};

class HeartPiece {

    static size = _hardware.defaultPixelScale;

    constructor(x, y) {
        this.pos = new Vec(x, y);
    }

    draw(dt) {
        let ctx = drawingContext();
        ctx.beginPath();
        ctx.fillStyle = colors[8];
        ctx.rect(this.pos.x, this.pos.y, HeartPiece.size, HeartPiece.size);
        ctx.fill();
        ctx.closePath();
    }
}

class HeartTrail {

    static maxLength = 8;
    static spawnPeriod = 0.4;
    static fallSpeed = 256;
    static maxHorizontalOffset = 16;

    constructor() {
        this.elapsed = 0;
        this.index = 0;
        this.list = [];
        for (let i = 0; i < HeartTrail.maxLength; i++) {
            this.list.push(new HeartPiece(-HeartPiece.size, -HeartPiece.size));
        }
    }

    draw(dt) {
        this.list.forEach(heart => heart.draw(dt));
    }

    update(dt) {

        this.list.forEach(heart => {
            heart.pos.y -= HeartTrail.fallSpeed * dt;
        });

        this.elapsed += dt;
        if (this.elapsed < HeartTrail.spawnPeriod) {
            return;
        }
        this.elapsed %= HeartTrail.spawnPeriod;
        this.elapsed += (Math.random() - 0.5)/16;

        let heart = this.list[this.index];
        let offset = (Math.random() * 0.5 + 0.5) * HeartTrail.maxHorizontalOffset;
        heart.pos.x = player.pos.x + offset + player.size / 2;
        heart.pos.y = player.pos.y;

        HeartTrail.maxHorizontalOffset *= -1;
        this.index = (this.index + 1) % this.list.length;
    }
};

// Variables
let player = new Player();
let heartTrail = new HeartTrail();

// Life Cycle
function load() {
    loadSpriteSheet('player', './sprites/player.png', 1, 8);
    loadSpriteSheet('heart', './sprites/heart.png', 1, 1);
}

function init() {
}

function draw(dt) {
    cls(7);
    spriteSheet['heart'].spr(0, 0, 0);
    heartTrail.draw(dt);
    player.draw(dt);
}

function update(dt) {
    // Input
    if (btn('left')) {
        player.state = 'left';
        //player.move('left', dt);
    }
    if (btn('right')) {
        player.state = 'right';
        //player.move('right', dt);
    }

    // Process
    player.update(dt);
    heartTrail.update(dt);

    // Output
    draw(dt);
}

/*
 -- Notes --
 Streak: Interested > Taken > LOVESTRUCK
*/