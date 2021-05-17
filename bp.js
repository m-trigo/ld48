/* Hardware */
let _hardware = {

    /* Screen */
    width : 512,
    height: 512,

    canvas: function() {
        return document.getElementById('canvas')
    },

    context: function () {
        let ctx = this.canvas().getContext('2d');
        ctx.imageSmoothingEnabled = false;
        return ctx;
    },

    coord: function (x, y) {
        let rect = this.canvas().getBoundingClientRect();
        let xScale = this.canvas().width / rect.width;
        let yScale = this.canvas().height / rect.height;
        x = (x - rect.left) * xScale;
        y = (y - rect.top) * yScale;
        return { x, y };
    },

    /* Input */
    input: {
        mouse: {
            x: 0,
            y: 0,
            pressed: false
        }
    },

    /* Time */
    elapsed: 0,
    lastUpdate: null,
    lastSecondTimestamps: [],

    /* Defaults */
    defaultFont: {
        name: 'Courier New',
        size: 16,
        weight: ''
    },

    /* Debug */
    displayFPS: false,
    pixelGrid: {
        display: false,
        size: 4,
        color: 7
    },

    /* Utility */
    screenShake: {
        offset: { x: 0, y: 0 },
        amplitude: 1,
        decay: 1,
        intensity: 0,

        shake(intensity) {
            this.intensity = Math.max(this.intensity + intensity, 1);
        },

        update(dt) {
            if (this.intensity > 0) {
                this.intensity = Math.max(this.intensity - dt * this.decay, 0);
                this.offset.x = this.intensity * this.amplitude * Math.random() * 2 - 1;
                this.offset.y = this.intensity * this.amplitude * Math.random() * 2 - 1;
            }
        }
    },

    screenFade: {
        color: 0,
        fadeTime: 1,
        fadeInComplete: false,
        fadeOutComplete: false,
        onFadeInComplete: null,
        onFadeOutComplete: null,
        elapsed: 0,

        isActive: function () {
            return 0 < this.elapsed && this.elapsed <= this.fadeTime * 2;
        },

        start() {
            this.elapsed = Number.EPSILON;
            this.nextCallback = this.onFadeInComplete;
            this.fadeInComplete = false;
            this.fadeOutComplete = false;
        },

        update(dt) {
            if (!this.isActive()) {
                return;
            }

            this.elapsed += dt;
            let progress = Math.min(this.elapsed / this.fadeTime, 2);

            let fadeColor = colors[this.color];
            let r = parseInt(fadeColor.substr(1, 2), 16)
            let g = parseInt(fadeColor.substr(3, 2), 16)
            let b = parseInt(fadeColor.substr(5, 2), 16)
            let a = progress;
            if (a > 1) {
                a = 2 - a;
            }
            fadeColor = `rgba(${r}, ${g}, ${b}, ${a})`;

            let ctx = drawingContext();
            ctx.fillStyle = fadeColor;
            ctx.fillRect(0, 0, _hardware.canvas().width, _hardware.canvas().height);

            if (progress >= this.fadeTime * 1 && !this.fadeInComplete) {
                this.fadeInComplete = true;
                if (this.onFadeInComplete) {
                    this.onFadeInComplete();
                }
            }

            if (progress >= this.fadeTime * 2 && !this.fadeOutComplete) {
                this.fadeOutComplete = true;
                if (this.onFadeOutComplete) {
                    this.onFadeOutComplete();
                }
            }
        }
    }
}

/* Debug */
function FPS(on) {
    _hardware.displayFPS = on;
}

function enableGrid(display, size = _hardware.pixelGrid.size, color = _hardware.pixelGrid.color) {
    _hardware.pixelGrid = { display, size, color };
}

/* Utility */
class Vec {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(vec) {
        return new Vec(this.x + vec.x, this.y + vec.y);
    }

    sub(vec) {
        return new Vec(this.x - vec.x, this.y - vec.y);
    }

    mult(scalar) {
        return new Vec(this.x * scalar, this.y * scalar);
    }

    div(scalar) {
        return new Vec(this.x/scalar, this.y/scalar);
    }

    copy() {
        return new Vec(this.x, this.y);
    }

    draw() {
        let ctx = drawingContext();
        ctx.fillStyle = colors[14];
        ctx.fillRect(this.x, this.y, 4, 4);
    }
}

class Rect {

    constructor(start, end) {
        this.start = start;
        this.end = end;
    }

    get width() {
        return Math.abs(this.start.x - this.end.x);
    }

    get height() {
        return Math.abs(this.start.y - this.end.y);
    }

    get xMin() {
        return Math.min(this.start.x, this.end.x);
    }

    get xMax() {
        return Math.max(this.start.x, this.end.x);
    }

    get yMin() {
        return Math.min(this.start.y, this.end.y);
    }

    get yMax() {
        return Math.max(this.start.y, this.end.y);
    }

    contains(vec) {
        let xContains = this.xMin <= vec.x && vec.x <= this.xMax;
        let yContains = this.yMin <= vec.y && vec.y <= this.yMax;
        return xContains && yContains;
    }

    draw() {
        let ctx = drawingContext();
        ctx.fillStyle = colors[14];

        // Top
        ctx.fillRect(this.xMin, this.yMin, this.width, 4);
        // Bottom
        ctx.fillRect(this.xMin, this.yMin + this.height - 4, this.width, 4);
        // Left
        ctx.fillRect(this.xMin, this.yMin, 4, this.height);
        // Right
        ctx.fillRect(this.xMin + this.width - 4, this.yMin, 4, this.height);
    }
}

// Refactor
class Animation {

    constructor(runtime, steps, stepCb, linearCb = null, endCb = () => this.step = 0) {
        this.runtime = runtime;
        this.steps = steps;
        this.linearCb = linearCb;
        this.stepCb = stepCb;
        this.endCb = endCb;
        this.elapsed = 0;
        this.step = 0;
        this.playing = true;
    }

    get period() {
        return this.runtime/this.steps;
    };

    animate(dt) {
        if (!this.playing) {
            return;
        }
        if (this.linearCb) {
            this.linearCb(this.step, dt, this)
        }
        this.elapsed += dt;
        if (this.elapsed > this.period) {
            this.elapsed %= this.period;
            if (this.stepCb) {
                this.stepCb(this.step, dt, this);
            }
            this.step++;
        }
        if (this.step == this.steps && this.endCb) {
            this.endCb(this.step, dt, this);
        }
    }
}

class Sequenence {

}

function shakeScreen(intensity, amplitude, decay) {
    _hardware.screenShake.amplitude = amplitude;
    _hardware.screenShake.decay = decay;
    _hardware.screenShake.shake(intensity);
}

function fadeScreen(color, fadeTime, fadeInCallback, fadeOutCallback) {
    _hardware.screenFade.color = color;
    _hardware.screenFade.fadeTime = fadeTime;
    _hardware.screenFade.onFadeInComplete = fadeInCallback;
    _hardware.screenFade.onFadeOutComplete = fadeOutCallback;
    _hardware.screenFade.start();
}

/* Input */
let btns = {
    up: { pressed: false, repeat: false, keys: ['Up', 'ArrowUp', 'W'] },
    left: { pressed: false, repeat: false, keys: ['Left', 'ArrowLeft', 'A']  },
    down: { pressed: false, repeat: false, keys: ['Down', 'ArrowDown', 'S']  },
    right: { pressed: false, repeat: false, keys: ['Right', 'ArrowRight', 'D']  },
    x: { pressed: false, repeat: false, keys: ['X']  },
    o: { pressed: false, repeat: false, keys: ['C']  }
};

let mouse = {
    position: { x: 0, y: 0 },
    pressed: false,
    repeat: false,

    get justPressed() { return this.pressed && !this.repeat }
};

function btn(buttonKey) {
    return btns[buttonKey].pressed;
}

function btnp(buttonKey) {
    return btns[buttonKey].pressed && !btns[buttonKey].repeat;
}

/* Asset Loading */
let loadingPromises = [];

class Font {
    constructor(name, size, weight) {
        this.name = name;
        this.size = size;
        this.weight = weight;
    }
}

function loadFontFamily(name, src) {
    var font = new FontFace(name, `url(${src})`);
    let promise = font.load().then(loaded => {
        document.fonts.add(loaded);
    }).catch(e => console.log(e));
    loadingPromises.push(promise);
}

function setDefaultFont(name, size = _hardware.defaultFont.size, weight = '') {
    _hardware.defaultFont = new Font(name, size, weight);
}

function loadAudio(src) {
    audio = new Audio(src);
    audio.start = function () {
        if (this.paused) {
            this.play();
        }
        else {
            this.load();
            this.oncanplaythrough = () =>  {
                this.play();
                this.oncanplaythrough = null;
            }
        }
    }
    let promise = new Promise(resolve => audio.oncanplaythrough = resolve);
    loadingPromises.push(promise);
    return audio;
}

let sfx = {};
function loadSFX(name, src) {
    sfx[name] = loadAudio(src);
}

let music = {};
function loadMusic(name, src) {
    music[name] = loadAudio(src);
}

class SpriteSheet {

    constructor(src, rows, cols, scale) {
        this.src = src;
        this.rows = rows;
        this.cols = cols;
        this.scale = scale;
        this.img = new Image();
        this.imageSource = src;
    }

    get unscaledSpriteWidth() { return this.img.width / this.cols; }
    get unscaledSpriteHeight() { return this.img.height / this.rows; }
    get spriteWidth() { return this.scale * this.unscaledSpriteWidth; }
    get spriteHeight() { return this.scale * this.unscaledSpriteHeight; }

    load() {
        let promise = new Promise((resolve, reject) => {
            this.img.onload = resolve;
            this.img.onerror = reject;
            this.img.src = this.imageSource;
        });
        return promise;
    }

    spr(index, x, y) {
        if (!this.img) {
            return
        };
        let r = Math.floor(index / this.cols);
        let c = index % this.cols;
        drawingContext().drawImage(this.img,
            c * this.unscaledSpriteWidth, r * this.unscaledSpriteHeight,
            this.unscaledSpriteWidth, this.unscaledSpriteHeight,
            x, y, this.spriteWidth, this.spriteHeight)
    }

    // TODO: Remove, not worth having the two ways. It creates inconsistency
    cspr(index, x, y) {
        this.spr(index, x - this.spriteWidth / 2, y - this.spriteHeight / 2);
    }
}

let spriteSheet = {};
function loadSpriteSheet(name, src, rows, cols, scale = 1) {
    spriteSheet[name] = new SpriteSheet(src, rows, cols, scale);
    loadingPromises.push(spriteSheet[name].load());
}

/* Drawing */
function drawingContext() {
    return _hardware.context();
}

let colors = {
    0: '#000000',
    1: '#1D2B53',
    2: '#7E2553',
    3: '#008751',
    4: '#AB5236',
    5: '#5F574F',
    6: '#C2C3C7',
    7: '#FFF1E8',
    8: '#FF004D',
    9: '#FFA300',
    10: '#FFEC27',
    11: '#00E436',
    12: '#29ADFF',
    13: '#83769C',
    14: '#FF77A8',
    15: '#FFCCAA'
}

function cls(color = 0) {
    let ctx = drawingContext();
    ctx.fillStyle = colors[color];
    ctx.fillRect(0, 0, _hardware.canvas().width, _hardware.canvas().height);
}

function print(text, x, y, color = 0, fontOverride = null) {
    let font = fontOverride ?? _hardware.defaultFont;
    let ctx = drawingContext();
    ctx.font = `${font.weight} ${font.size}px ${font.name}`;
    ctx.fillStyle = colors[color];
    ctx.textBaseline = 'top';
    ctx.fillText(text, x, y);
}

/* Life Cycle */
function elapsedMilliseconds() {
    return _hardware.elapsed;
}

function elapsedSeconds() {
    return Math.floor(elapsedMilliseconds/1000);
}

function loop() {

    /* Button Inputs */
    for (let btn in btns) {
        let done = false;
        btns[btn].keys.forEach(key => {
            key = key.toUpperCase();
            if (_hardware.input[key] === undefined || done) {
                return;
            }
            btns[btn].repeat = btns[btn].pressed;
            btns[btn].pressed = _hardware.input[key];
            if (!btns[btn].pressed) {
                btns[btn].repeat = false;
            }
            done = btns[btn].pressed;
        });
    }

    /* Mouse Inputs */
    mouse.position = _hardware.coord(_hardware.input.mouse.x, _hardware.input.mouse.y);
    mouse.repeat = _hardware.input.mouse.pressed && mouse.pressed;
    mouse.pressed = _hardware.input.mouse.pressed;

    /* Frame Data*/
    let now = new Date()
    let dt = (now - _hardware.lastUpdate)/1000;
    _hardware.lastUpdate = now;
    if (dt > 0.2) {
        console.log(`[warn] Frame skipped: ${dt} seconds`)
        dt = 0;
    }

    drawingContext().save();

    /* Screen Effects */
    _hardware.screenShake.update(dt);
    if (_hardware.screenShake.offset.x != 0 || _hardware.screenShake.offset.y != 0) {
        drawingContext().translate(_hardware.screenShake.offset.x, _hardware.screenShake.offset.y);
    }

    /* Update Life Cycle Call */
    update(dt);

    drawingContext().restore();

    _hardware.screenFade.update(dt);

    /* Debug */
    if (_hardware.pixelGrid.display) {
        let size = _hardware.pixelGrid.size;
        let ctx = _hardware.context();
        ctx.fillStyle  = colors[_hardware.pixelGrid.color] + '70';

        for (let x = 0; x < _hardware.width; x += 2 * size) {
            ctx.fillRect(x, 0, size, _hardware.height);
        }

        for (let y = 0; y < _hardware.height; y += 2 * size) {
            ctx.fillRect(0, y, _hardware.width, size);
        }
    }

    if (_hardware.displayFPS) {
        _hardware.lastSecondTimestamps.push(now);
        let filter = timestamp => now - timestamp < 1000;
        _hardware.lastSecondTimestamps = _hardware.lastSecondTimestamps.filter(filter);
        print(_hardware.lastSecondTimestamps.length, 0, 0, 7)
    }

    /* Next Frame Request */
    requestAnimationFrame(loop);
}

function main() {
    /* Canvas */
    _hardware.canvas().width = _hardware.width;
    _hardware.canvas().style.width = _hardware.width;
    _hardware.canvas().height = _hardware.height;
    _hardware.canvas().style.height = _hardware.height;

    /* Key Events */
    document.onkeydown = e => _hardware.input[e.key.toUpperCase()] = true;
    document.onkeyup = e => _hardware.input[e.key.toUpperCase()] = false;

    /* Mouse Events */
    _hardware.canvas().onmousemove = e => {
        _hardware.input.mouse.x = e.clientX;
        _hardware.input.mouse.y = e.clientY;
    }
    _hardware.canvas().onmousedown = e => {
        _hardware.input.mouse.x = e.clientX;
        _hardware.input.mouse.y = e.clientY;
        _hardware.input.mouse.pressed = true
    }
    _hardware.canvas().onmouseup = e => {
        _hardware.input.mouse.x = e.clientX;
        _hardware.input.mouse.y = e.clientY;
        _hardware.input.mouse.pressed = false;
    }

    /* Touch Events */
    _hardware.canvas().ontouchmove = e =>  {
        _hardware.input.mouse.x = e.changedTouches[0].clientX;
        _hardware.input.mouse.y = e.changedTouches[0].clientY;
    }
    _hardware.canvas().ontouchstart = e =>  {
        _hardware.input.mouse.x = e.changedTouches[0].clientX;
        _hardware.input.mouse.y = e.changedTouches[0].clientY;
        _hardware.input.mouse.pressed = true
    }
    _hardware.canvas().ontouchend = e =>  {
        _hardware.input.mouse.x = e.changedTouches[0].clientX;
        _hardware.input.mouse.y = e.changedTouches[0].clientY;
        _hardware.input.mouse.pressed = false
    }

    /* Initialize */
    load();

    Promise.allSettled(loadingPromises).then(e => {
        init();
        cls(0);
        _hardware.lastUpdate = new Date();
        requestAnimationFrame(loop);
    }).catch(e => console.log(e));
}

/*
Tasks:

    -- Refactors --
    - Update the debug pixel grid
    - The "StepAnimation" class into "Animation"
    - The "SpriteSheet" class into "Sprite"

    --- Brand New --
    - Add a built-in frame pause/advance utility
    - Add a built-in sequencing option (think short cutscenes)
    - Add built-in tweening/easing functions?
    - Add full API documentation in the README.md
    - Add mobile screen controls
*/