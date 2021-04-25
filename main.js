// Data Types
class Player {

    static leftSpriteIndex = 0;
    static rightSpriteIndex = 4;
    static verticalSpeed = 0;
    static horizontalSpeed = 256;

    constructor() {
        this.size =  spriteSheet['player'].spriteWidth;
        this.velocity = new Vec(Player.horizontalSpeed, Player.verticalSpeed);
        this.pos = new Vec(screen().width/2 - this.size / 2, screen().height / 2 - this.size);
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
        player.pos = player.pos.add(player.velocity.mult(dt));

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
let clouds = [];

// Life Cycle
function load() {
    loadSpriteSheet('player', './sprites/player.png', 1, 8);
    loadSpriteSheet('heart', './sprites/heart.png', 1, 1);
    loadSpriteSheet('clouds', './sprites/clouds.png', 1, 2);
}

function init() {
    player = new Player();
    for (let i = 0; i < 4; i++) {
        clouds.push(new Cloud());
    }
}

function draw(dt) {
    cls(7);
    clouds.forEach(c => c.draw(dt));
    player.draw(dt);

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
    clouds.forEach(c => c.update(dt));

    // Output
    draw(dt);
}

/*
 -- Notes --
 Streak: Heartbroken > Taken > LOVESTRUCK
 Not trully random. Suffle + Limit abs diff between values
*/