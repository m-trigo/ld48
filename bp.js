/* Hardware */
let _hardware = {
    width : 512,
    height: 512,
    canvas: () => document.getElementById('canvas'),
    input: {
        mouse: {
            x: 0,
            y: 0,
            pressed: false
        }
    },
    coord: function (x, y) {
        let rect = this.canvas().getBoundingClientRect();
        let xScale = this.canvas().width / rect.width;
        let yScale = this.canvas().height / rect.height;
        x = (x - rect.left) * xScale;
        y = (y - rect.top) * yScale;
        return new Vec(x, y);
    },
    lastUpdate: null,
    context: () => {
        let ctx = this.canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        return ctx;
    },
    defaultFont: {
        name: 'Courier New',
        size: 16,
        weight: ''
    },
    elapsed: 0,
    lastSecondTimestamps: [],
    displayFPS: false,
    pixelGrid: {
        display: false,
        size: 4,
        color: 7
    },
    defaultPixelScale: 4
}

/* Debug */
function FPS(on) {
    _hardware.displayFPS = on;
}

function enableGrid(display, size = _hardware.pixelGrid.size, color = _hardware.pixelGrid.color) {
    _hardware.pixelGrid = { display, size, color };
}

let captures = [];
function screenCapture() {
    captures.push(_hardware.canvas().toDataURL());
}

function showCaptures() {
    captures.forEach(cap => window.open(cap, '_blank'));
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
}

class Rect {

    constructor(start, width, height) {
        this.start = start;
        this.width = width;
        this.height = height;
        this.visible = true;
        this.color = 14;
    }

    draw() {
        if (!this.visible) return;
        let ctx = drawingContext();
        ctx.beginPath();
        ctx.rect(this.start.x, this.start.y, this.width, this.height);
        ctx.fillStyle = colors[this.color];
        ctx.fill();
        ctx.closePath();
    }

    contains(vec) {
        let result = this.start.x <= vec.x && vec.x <= this.start.x + this.width;
        result &= this.start.y <= vec.y && vec.y <= this.start.y + this.height;
        return result;
    }
}

class StepAnimation {

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

/* Environment */
function screen() {
    return {
        get width() {
            return _hardware.canvas().width;
        },

        get height() {
            return _hardware.canvas().height;
        },

        get start() {
            return new Vec();
        },

        get end() {
            return new Vec(this.width, this.height);
        },

        get center() {
            return this.end.sub(this.start).div(2);
        }
    };
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

function btn(btn) {
    return btns[btn].pressed;
}

function btnp(btn) {
    return btns[btn].pressed && !btns[btn].repeat;
}

let mouse = {
    position: new Vec(),
    pressed: false,
    repeat: false,

    get justPressed() { return this.pressed && !this.repeat }
};

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

    cspr(index, x, y) {
        this.spr(0, x - this.spriteWidth / 2, y - this.spriteHeight / 2);
    }
}

let spriteSheet = {};
function loadSpriteSheet(name, src, rows, cols, scale = _hardware.defaultPixelScale) {
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
    ctx.beginPath();
    ctx.rect(0, 0, _hardware.canvas().width, _hardware.canvas().height);
    ctx.fillStyle = colors[color];
    ctx.fill();
    ctx.closePath();
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

    mouse.position = _hardware.coord(_hardware.input.mouse.x, _hardware.input.mouse.y);
    mouse.repeat = _hardware.input.mouse.pressed && mouse.pressed;
    mouse.pressed = _hardware.input.mouse.pressed;

    let now = new Date()
    let dt = (now - _hardware.lastUpdate)/1000;
    _hardware.lastUpdate = now;
    if (dt > 0.2) {
        console.log(`[warn] Frame skipped: ${dt} seconds`)
        dt = 0;
    }
    update(dt);
    if (_hardware.pixelGrid.display) {
        let size = _hardware.pixelGrid.size;
        let ctx = _hardware.context();
        for (let x = size / 2; x < screen().width; x +=size * 2) {
            let halfwayLine = Math.abs(x - screen().width / 2) < pixelSize;
            ctx.strokeStyle  = colors[_hardware.pixelGrid.color] + (halfwayLine ? 'C0' : '70');
            ctx.beginPath();
            ctx.lineWidth = size;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, screen().height);
            ctx.stroke();
            ctx.closePath();
        }
        for (let y = size / 2; y < screen().height; y += size * 2) {
            let halfwayLine = Math.abs(y - screen().height / 2) < pixelSize;
            ctx.strokeStyle  = colors[_hardware.pixelGrid.color] + (halfwayLine ? 'C0' : '70');
            ctx.beginPath();
            ctx.lineWidth = size;
            ctx.moveTo(0, y);
            ctx.lineTo(screen().width, y);
            ctx.stroke();
            ctx.closePath();
        }
    }
    if (_hardware.displayFPS) {
        _hardware.lastSecondTimestamps.push(now);
        let filter = timestamp => now - timestamp < 1000;
        _hardware.lastSecondTimestamps = _hardware.lastSecondTimestamps.filter(filter);
        print(_hardware.lastSecondTimestamps.length, 0, 0, 7)
    }
    requestAnimationFrame(loop);
}

function main() {
    // Canvas
    _hardware.canvas().width = _hardware.width;
    _hardware.canvas().style.width = _hardware.width;
    _hardware.canvas().height = _hardware.height;
    _hardware.canvas().style.height = _hardware.height;

    // Key events
    document.onkeydown = e => _hardware.input[e.key.toUpperCase()] = true;
    document.onkeyup = e => _hardware.input[e.key.toUpperCase()] = false;

    // Mouse events
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

    // Touch events
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

    // Initialize
    load();

    Promise.allSettled(loadingPromises).then(e => {
        init();
        cls(0);
        _hardware.lastUpdate = new Date();
        requestAnimationFrame(loop);
    }).catch(e => console.log(e));
}

/*
TODO: Replace line drawins with rectangle drawins whenever possible.
*/