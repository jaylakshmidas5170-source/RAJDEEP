/**
 * Minecraft Run - Retro 2D Dino Game Engine
 * Implements game loop, physics, sound synthesis, parallax backgrounds,
 * power-ups, particle systems, and state management.
 */

// --- SOUND SYNTHESIZER (Web Audio API) ---
class SoundSynth {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (enabled && this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playJump() {
        if (!this.enabled) return;
        this.init();
        const t = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        // Minecraft pop / jump sound: slide frequency up quickly
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(500, t + 0.12);
        
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(t);
        osc.stop(t + 0.12);
    }

    playDamage() {
        if (!this.enabled) return;
        this.init();
        const t = this.ctx.currentTime;
        
        // Synthesize explosion noise
        const bufferSize = this.ctx.sampleRate * 0.3; // 0.3s
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Fill buffer with random noise (white noise)
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + 0.3);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        
        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        // Deep rumble oscillator (Minecraft hit / oof)
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, t);
        osc.frequency.linearRampToValueAtTime(30, t + 0.25);
        
        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.3, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        
        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        
        noiseNode.start(t);
        osc.start(t);
        
        noiseNode.stop(t + 0.3);
        osc.stop(t + 0.3);
    }

    playScoreDing() {
        if (!this.enabled) return;
        this.init();
        const t = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        // Minecraft XP level up ding
        osc.frequency.setValueAtTime(950, t);
        osc.frequency.setValueAtTime(1250, t + 0.07);
        
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(t);
        osc.stop(t + 0.25);
    }

    playPowerup() {
        if (!this.enabled) return;
        this.init();
        const t = this.ctx.currentTime;
        
        // Chime arpeggio for Golden Apple
        const notes = [440, 554, 659, 880];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + idx * 0.08);
            
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.15, t + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.25);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(t + idx * 0.08);
            osc.stop(t + idx * 0.08 + 0.25);
        });
    }

    playBlockBreak() {
        if (!this.enabled) return;
        this.init();
        const t = this.ctx.currentTime;
        
        // Synthesize short crunchy gravel sound
        const bufferSize = this.ctx.sampleRate * 0.08;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, t);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        
        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        noiseNode.start(t);
        noiseNode.stop(t + 0.08);
    }
}

const synth = new SoundSynth();

// --- IMAGE PRELOADER ---
const images = {
    player: new Image(),
    tnt: new Image(),
    ghast: new Image()
};

images.player.src = 'assets/player.jpg';
images.tnt.src = 'assets/tnt.jpg';
images.ghast.src = 'assets/ghast.jpg';

let assetsLoaded = 0;
const totalAssets = 3;

function assetLoaded() {
    assetsLoaded++;
    if (assetsLoaded === totalAssets) {
        console.log("All game assets loaded successfully.");
    }
}

images.player.onload = assetLoaded;
images.tnt.onload = assetLoaded;
images.ghast.onload = assetLoaded;

// Fallback handlers if assets fail
images.player.onerror = () => { images.player.failed = true; assetLoaded(); };
images.tnt.onerror = () => { images.tnt.failed = true; assetLoaded(); };
images.ghast.onerror = () => { images.ghast.failed = true; assetLoaded(); };


// --- GAME CONSTANTS ---
const GAME_WIDTH = 960;
const GAME_HEIGHT = 400;
const GROUND_Y = 320;

// --- PARTICLE SYSTEM ---
class Particle {
    constructor(x, y, vx, vy, color, size, life, shape = 'square') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.maxLife = life;
        this.life = life;
        this.shape = shape;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15; // Mild gravity
        this.life--;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha;
        
        if (this.shape === 'square') {
            ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size/2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    spawnBreak(x, y, colors, count = 15) {
        for (let i = 0; i < count; i++) {
            const size = Math.random() * 6 + 4;
            const vx = (Math.random() * 6 - 3);
            const vy = (Math.random() * -6 - 2);
            const life = Math.random() * 20 + 15;
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.particles.push(new Particle(x, y, vx, vy, color, size, life));
        }
    }

    spawnRunDust(x, y) {
        const size = Math.random() * 3 + 2;
        const vx = -Math.random() * 2 - 1;
        const vy = -Math.random() * 1;
        const life = Math.random() * 10 + 5;
        this.particles.push(new Particle(x, y, vx, vy, 'rgba(134, 96, 67, 0.4)', size, life, 'square'));
    }

    spawnSparkles(x, y, count = 2) {
        const sparkleColors = ['#ffcc00', '#ffffff', '#00f0ff', '#e5b300'];
        for (let i = 0; i < count; i++) {
            const size = Math.random() * 3 + 1.5;
            const vx = (Math.random() * 2 - 1);
            const vy = (Math.random() * -2 - 0.5);
            const life = Math.random() * 15 + 10;
            const color = sparkleColors[Math.floor(Math.random() * sparkleColors.length)];
            this.particles.push(new Particle(x, y, vx, vy, color, size, life, 'circle'));
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            p.draw(ctx);
        }
    }

    clear() {
        this.particles = [];
    }
}


// --- PARALLAX BACKGROUND LAYERS ---
class ParallaxBackground {
    constructor() {
        this.skyTime = 0; // Ticks score time to cycle day/night
        this.clouds = [
            { x: 100, y: 50, w: 90, h: 25, speed: 0.25 },
            { x: 450, y: 80, w: 120, h: 30, speed: 0.15 },
            { x: 800, y: 40, w: 70, h: 20, speed: 0.3 }
        ];
        this.mountains = [
            { x: 0, w: 400, h: 120, speed: 0.5 },
            { x: 400, w: 500, h: 100, speed: 0.5 },
            { x: 900, w: 450, h: 130, speed: 0.5 }
        ];
        this.trees = [];
        this.generateTrees();
        
        this.stars = [];
        this.generateStars();
    }

    generateTrees() {
        // Build trees randomly distributed
        for (let x = 0; x < GAME_WIDTH + 200; x += Math.random() * 120 + 80) {
            this.trees.push({
                x: x,
                w: 24,
                h: Math.random() * 30 + 40,
                type: Math.random() > 0.5 ? 'birch' : 'oak',
                speed: 1.2
            });
        }
    }

    generateStars() {
        for (let i = 0; i < 40; i++) {
            this.stars.push({
                x: Math.random() * GAME_WIDTH,
                y: Math.random() * (GROUND_Y - 150),
                size: Math.random() * 2 + 1,
                brightness: Math.random()
            });
        }
    }

    update(gameSpeed) {
        this.skyTime += 0.05; // Time progress

        // Scroll Clouds
        for (const cloud of this.clouds) {
            cloud.x -= cloud.speed * (gameSpeed * 0.2);
            if (cloud.x + cloud.w < 0) cloud.x = GAME_WIDTH + Math.random() * 100;
        }

        // Scroll Mountains
        for (const m of this.mountains) {
            m.x -= m.speed * (gameSpeed * 0.25);
            if (m.x + m.w < 0) {
                m.x = GAME_WIDTH;
                m.h = Math.random() * 40 + 90;
            }
        }

        // Scroll Trees
        for (const t of this.trees) {
            t.x -= t.speed * (gameSpeed * 0.4);
            if (t.x + t.w < -50) {
                // Find rightmost tree to spawn after it
                const rightmost = Math.max(...this.trees.map(tr => tr.x));
                t.x = rightmost + Math.random() * 120 + 80;
                t.h = Math.random() * 30 + 40;
            }
        }
    }

    getSkyColors() {
        // Map skyTime to loop sky gradient smoothly
        // Cycle: Day -> Sunset -> Night -> Sunrise -> Day
        const phase = (this.skyTime / 50) % (Math.PI * 2);
        
        let colorTop, colorBottom, sunY, moonY, isNightVal;
        
        // Interpolate colors based on phase
        const sinVal = Math.sin(phase);
        
        if (sinVal > 0.3) {
            // Day
            colorTop = '#1476d4';
            colorBottom = '#4f9eed';
            sunY = GROUND_Y - 200 - sinVal * 80;
            moonY = GAME_HEIGHT + 100;
            isNightVal = 0;
        } else if (sinVal <= 0.3 && sinVal > -0.3) {
            // Sunset / Sunrise
            if (Math.cos(phase) > 0) {
                // Sunset
                colorTop = '#1c1b35';
                colorBottom = '#d64627';
            } else {
                // Sunrise
                colorTop = '#1c1a2f';
                colorBottom = '#eb8034';
            }
            sunY = GROUND_Y - 100;
            moonY = GROUND_Y - 100;
            isNightVal = 0.5;
        } else {
            // Night
            colorTop = '#06060c';
            colorBottom = '#111124';
            sunY = GAME_HEIGHT + 100;
            moonY = GROUND_Y - 220 + sinVal * 60;
            isNightVal = 1.0;
        }
        
        return { colorTop, colorBottom, sunY, moonY, nightFactor: isNightVal };
    }

    draw(ctx, gameSpeed) {
        const { colorTop, colorBottom, sunY, moonY, nightFactor } = this.getSkyColors();

        // 1. Sky Gradient
        const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
        grad.addColorStop(0, colorTop);
        grad.addColorStop(1, colorBottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, GAME_WIDTH, GROUND_Y);

        // 2. Stars (if dusk/night)
        if (nightFactor > 0.05) {
            ctx.fillStyle = '#ffffff';
            for (const star of this.stars) {
                // Twinkle effect
                const brightness = (Math.sin(this.skyTime + star.x) + 1.2) / 2.2 * star.size;
                ctx.globalAlpha = nightFactor * brightness;
                ctx.fillRect(star.x, star.y, star.size, star.size);
            }
            ctx.globalAlpha = 1.0;
        }

        // 3. Draw Celestial bodies (Sun/Moon)
        // Sun (Minecraft block style)
        if (sunY < GROUND_Y) {
            ctx.fillStyle = '#fffc33';
            ctx.strokeStyle = '#ffa200';
            ctx.lineWidth = 4;
            ctx.fillRect(550, sunY, 50, 50);
            ctx.strokeRect(550, sunY, 50, 50);
        }
        // Moon (Minecraft block style)
        if (moonY < GROUND_Y) {
            ctx.fillStyle = '#dfdfe5';
            ctx.strokeStyle = '#a6a6b2';
            ctx.lineWidth = 4;
            ctx.fillRect(150, moonY, 40, 40);
            ctx.strokeRect(150, moonY, 40, 40);
            
            // Darker square patches inside moon
            ctx.fillStyle = '#8f8f9e';
            ctx.fillRect(156, moonY + 8, 10, 10);
            ctx.fillRect(174, moonY + 22, 8, 8);
        }

        // 4. Clouds (Blocky)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        for (const cloud of this.clouds) {
            ctx.fillRect(cloud.x, cloud.y, cloud.w, cloud.h);
            // Add blocky puff detail
            ctx.fillRect(cloud.x + 15, cloud.y - 8, cloud.w - 30, 8);
        }

        // 5. Mountains (Blocky silhouette)
        ctx.fillStyle = '#222938';
        for (const m of this.mountains) {
            ctx.fillRect(m.x, GROUND_Y - m.h, m.w, m.h);
            // Add decorative darker block highlight on mountains
            ctx.fillStyle = '#1d222e';
            ctx.fillRect(m.x + 30, GROUND_Y - m.h + 20, m.w - 60, m.h - 20);
            ctx.fillStyle = '#222938';
        }

        // 6. Horizon Trees (Pixel art trees)
        for (const t of this.trees) {
            // Trunk
            ctx.fillStyle = t.type === 'birch' ? '#e6e6e6' : '#6b4e35';
            ctx.fillRect(t.x + t.w / 2 - 3, GROUND_Y - t.h, 6, t.h);
            
            // Foliage (Minecraft style square canopy)
            ctx.fillStyle = t.type === 'birch' ? '#69a842' : '#3c7a21';
            const foliageSize = t.w;
            ctx.fillRect(t.x + t.w / 2 - foliageSize / 2, GROUND_Y - t.h - foliageSize + 10, foliageSize, foliageSize);
            ctx.fillRect(t.x + t.w / 2 - foliageSize / 3, GROUND_Y - t.h - foliageSize - 4 + 10, foliageSize * 0.6, 6);
        }
    }
}


// --- GROUND RENDERER ---
class Ground {
    constructor() {
        this.scrollX = 0;
    }

    update(gameSpeed) {
        this.scrollX = (this.scrollX - gameSpeed) % 32;
    }

    draw(ctx) {
        // Draw the top grass layer
        ctx.fillStyle = '#5c8e32'; // Grass green
        ctx.fillRect(0, GROUND_Y, GAME_WIDTH, 14);

        // Draw pixel border separator
        ctx.fillStyle = '#426922'; // Dark green border
        ctx.fillRect(0, GROUND_Y + 12, GAME_WIDTH, 4);

        // Draw dirt background below grass
        ctx.fillStyle = '#866043'; // Dirt brown
        ctx.fillRect(0, GROUND_Y + 16, GAME_WIDTH, GAME_HEIGHT - GROUND_Y - 16);

        // Draw scrollable block grid marks for movement feel
        ctx.fillStyle = '#735136'; // Darker dirt mark
        const spacing = 32;
        const totalMarks = Math.ceil(GAME_WIDTH / spacing) + 2;
        
        ctx.save();
        ctx.translate(this.scrollX, 0);
        for (let i = 0; i < totalMarks; i++) {
            const x = i * spacing;
            ctx.fillRect(x + 4, GROUND_Y + 24, 6, 6);
            ctx.fillRect(x + 18, GROUND_Y + 36, 8, 8);
            ctx.fillRect(x + 10, GROUND_Y + 54, 4, 4);
            ctx.fillRect(x + 22, GROUND_Y + 68, 6, 6);
        }
        ctx.restore();
    }
}


// --- OBSTACLE CLASSES ---
class Obstacle {
    constructor(x, y, w, h, type, speedMultiplier) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.type = type; // 'tnt_single', 'tnt_double', 'tnt_triple', 'ghast'
        this.speedMultiplier = speedMultiplier;
        
        // Floating motion for Ghast
        this.floatOffset = Math.random() * Math.PI;
        
        // Color definitions for particle breaks
        this.breakColors = type.includes('tnt') ? ['#ff1e27', '#ffffff', '#1a1a1a', '#e60000'] : ['#e6e6e6', '#d1d1d1', '#ff5722'];
    }

    update(gameSpeed) {
        this.x -= gameSpeed * this.speedMultiplier;
        
        // Ghast bobbing effect
        if (this.type === 'ghast') {
            this.floatOffset += 0.08;
            this.y += Math.sin(this.floatOffset) * 0.8;
        }
    }

    draw(ctx) {
        ctx.save();
        if (this.type.includes('tnt')) {
            // Draw TNT
            if (images.tnt.complete && !images.tnt.failed) {
                // If it is a double/stacked obstacle, stack them
                if (this.type === 'tnt_double') {
                    // Two side-by-side or stacked. Let's do stacked or side-by-side. 
                    // Let's do side-by-side:
                    ctx.drawImage(images.tnt, this.x, this.y, this.w / 2, this.h);
                    ctx.drawImage(images.tnt, this.x + this.w / 2, this.y, this.w / 2, this.h);
                } else if (this.type === 'tnt_triple') {
                    // Three side by side
                    ctx.drawImage(images.tnt, this.x, this.y, this.w / 3, this.h);
                    ctx.drawImage(images.tnt, this.x + this.w / 3, this.y, this.w / 3, this.h);
                    ctx.drawImage(images.tnt, this.x + (this.w / 3) * 2, this.y, this.w / 3, this.h);
                } else {
                    // Single TNT
                    ctx.drawImage(images.tnt, this.x, this.y, this.w, this.h);
                }
            } else {
                // Fallback rendering
                ctx.fillStyle = '#e53e3e';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 3;
                ctx.fillRect(this.x, this.y, this.w, this.h);
                ctx.strokeRect(this.x, this.y, this.w, this.h);
                // Draw 'TNT' text
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px "Press Start 2P"';
                ctx.fillText("TNT", this.x + 5, this.y + this.h / 2 + 4);
            }
        } else if (this.type === 'ghast') {
            // Draw Ghast
            if (images.ghast.complete && !images.ghast.failed) {
                ctx.drawImage(images.ghast, this.x, this.y, this.w, this.h);
            } else {
                // Fallback rendering
                ctx.fillStyle = '#eeeeee';
                ctx.strokeStyle = '#cccccc';
                ctx.lineWidth = 3;
                ctx.fillRect(this.x, this.y, this.w, this.h);
                ctx.strokeRect(this.x, this.y, this.w, this.h);
                // Draw small crying red eyes
                ctx.fillStyle = '#ff1e27';
                ctx.fillRect(this.x + 8, this.y + 12, 6, 6);
                ctx.fillRect(this.x + this.w - 14, this.y + 12, 6, 6);
                // Gray tears
                ctx.fillStyle = '#90caf9';
                ctx.fillRect(this.x + 8, this.y + 18, 4, 15);
                ctx.fillRect(this.x + this.w - 12, this.y + 18, 4, 15);
            }
        }
        ctx.restore();
    }
}


// --- POWER-UP: GOLDEN APPLE CLASS ---
class GoldenApple {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 32;
        this.h = 32;
        this.floatOffset = Math.random() * Math.PI;
    }

    update(gameSpeed) {
        this.x -= gameSpeed;
        this.floatOffset += 0.08;
        this.y += Math.sin(this.floatOffset) * 0.5;
    }

    draw(ctx) {
        ctx.save();
        // Golden apple visual: yellow apple shape with glow
        const centerX = this.x + this.w / 2;
        const centerY = this.y + this.h / 2;
        
        // Sparkle aura
        const gradient = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, 16);
        gradient.addColorStop(0, 'rgba(255, 230, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 230, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 16, 0, Math.PI * 2);
        ctx.fill();
        
        // Drawing blocky apple representation
        ctx.fillStyle = '#ffcc00'; // Gold color
        ctx.fillRect(this.x + 8, this.y + 8, 16, 16);
        ctx.fillRect(this.x + 12, this.y + 4, 8, 24);
        ctx.fillRect(this.x + 4, this.y + 12, 24, 8);
        
        // Shine pixel
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 8, this.y + 8, 4, 4);

        // Brown stem
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(this.x + 14, this.y, 4, 4);
        
        ctx.restore();
    }
}


// --- PLAYER CLASS ---
class Player {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 100;
        this.baseHeight = 64;
        this.w = 64;
        this.h = this.baseHeight;
        this.y = GROUND_Y - this.h;
        this.vy = 0;
        
        // Physics constants
        this.gravity = 0.65;
        this.jumpForce = -13.5;
        
        this.isGrounded = true;
        this.isDucking = false;
        
        // Animations
        this.rotation = 0; // Rotates during jump
        this.runTimer = 0; // Bobbing runs
        
        // Power-ups & States
        this.invincible = false;
        this.invincibleTimer = 0;
        this.lives = 1;
    }

    jump() {
        if (this.isGrounded) {
            this.vy = this.jumpForce;
            this.isGrounded = false;
            synth.playJump();
        }
    }

    duck(isDucking) {
        if (isDucking && !this.isDucking) {
            this.isDucking = true;
            this.h = this.baseHeight / 2;
            this.y = GROUND_Y - this.h;
            // Instantly increase downward gravity to fast-fall
            if (!this.isGrounded) {
                this.vy += 4; 
            }
        } else if (!isDucking && this.isDucking) {
            this.isDucking = false;
            this.h = this.baseHeight;
            this.y = GROUND_Y - this.h;
        }
    }

    makeInvincible(duration) {
        this.invincible = true;
        this.invincibleTimer = duration; // in frames (e.g. 300 frames = 5s)
        synth.playPowerup();
    }

    update(particles) {
        // Apply Gravity
        this.vy += this.gravity;
        this.y += this.vy;

        // Ground constraint
        const targetGroundY = GROUND_Y - this.h;
        if (this.y >= targetGroundY) {
            this.y = targetGroundY;
            this.vy = 0;
            
            if (!this.isGrounded) {
                this.isGrounded = true;
                this.rotation = 0;
                // Landing particles
                particles.spawnBreak(this.x + this.w / 2, GROUND_Y, ['#5c8e32', '#866043'], 6);
            }
        }

        // Tick invincibility
        if (this.invincible) {
            this.invincibleTimer--;
            // Sparkle trails
            particles.spawnSparkles(this.x + Math.random() * this.w, this.y + Math.random() * this.h, 1);
            
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }

        // Running animation bobs & dust
        if (this.isGrounded) {
            this.runTimer += 0.2;
            if (Math.random() < 0.25) {
                particles.spawnRunDust(this.x, GROUND_Y);
            }
        } else {
            // Spin rotation in mid air (cool trick!)
            this.rotation += 0.12;
        }
    }

    draw(ctx) {
        ctx.save();
        
        // Apply rotation/bobbing transformations centered on player
        const centerX = this.x + this.w / 2;
        const centerY = this.y + this.h / 2;
        
        ctx.translate(centerX, centerY);
        
        if (this.isGrounded) {
            // Running Bob: bob up and down slightly, wobble rotation
            const bobY = Math.sin(this.runTimer) * 2;
            const wobbleRot = Math.cos(this.runTimer) * 0.05;
            ctx.translate(0, bobY);
            ctx.rotate(wobbleRot);
        } else {
            ctx.rotate(this.rotation);
        }

        // Golden Apple invincibility shield glow
        if (this.invincible) {
            const glowSize = this.w * 1.3;
            const gradient = ctx.createRadialGradient(0, 0, this.w / 2, 0, 0, glowSize / 2);
            // Flashing rainbow or gold glow
            const hue = (Date.now() / 3) % 360;
            gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.4)`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, glowSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Render player block image
        if (images.player.complete && !images.player.failed) {
            // Draw image cropped cleanly
            ctx.drawImage(
                images.player, 
                -this.w / 2, 
                -this.h / 2, 
                this.w, 
                this.h
            );
        } else {
            // Draw fallback cube (looks like a Steve head or custom block)
            ctx.fillStyle = '#825e3f'; // brown skin color
            ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
            ctx.strokeStyle = '#4e342e';
            ctx.lineWidth = 3;
            ctx.strokeRect(-this.w/2, -this.h/2, this.w, this.h);
            
            // Draw face fallback eyes
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-this.w/3, -this.h/5, 8, 6);
            ctx.fillRect(this.w/10, -this.h/5, 8, 6);
            ctx.fillStyle = '#00bcd4'; // cyan pupils
            ctx.fillRect(-this.w/3 + 2, -this.h/5, 4, 6);
            ctx.fillRect(this.w/10 + 2, -this.h/5, 4, 6);
            // Mouth
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(-this.w/5, this.h/6, this.w/2.5, 4);
        }
        
        ctx.restore();
    }
}


// --- MAIN GAME MANAGER ---
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Handle high DPI displays
        this.adjustCanvasResolution();

        this.gameState = 'START'; // 'START', 'PLAYING', 'GAMEOVER'
        this.difficulty = 'normal'; // 'easy', 'normal', 'hard'
        
        // High Score
        this.highScore = parseInt(localStorage.getItem('mc_high_score')) || 0;
        document.getElementById('high-score').textContent = this.formatScore(this.highScore);
        
        // Sound Setting
        this.soundEnabled = localStorage.getItem('mc_sound_enabled') !== 'false';
        document.getElementById('sound-toggle').checked = this.soundEnabled;
        synth.setEnabled(this.soundEnabled);

        // Particles Visual Setting
        this.particlesEnabled = localStorage.getItem('mc_particles_enabled') !== 'false';
        document.getElementById('particles-toggle').checked = this.particlesEnabled;
        
        // Instantiate game objects
        this.player = new Player();
        this.background = new ParallaxBackground();
        this.ground = new Ground();
        this.particles = new ParticleSystem();
        
        this.obstacles = [];
        this.powerups = [];
        
        this.score = 0;
        this.gameSpeed = 0;
        this.obstacleTimer = 0;
        
        this.keys = {};

        // Bind events
        this.setupEventHandlers();
        
        // Start rendering frame
        this.lastTime = 0;
        requestAnimationFrame((t) => this.loop(t));
    }

    adjustCanvasResolution() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        // Set actual drawing size matching display pixel density
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        // Scale back visual display via CSS to match bounds
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        // Reset scale matching density
        this.ctx.scale(dpr * (rect.width / GAME_WIDTH), dpr * (rect.height / GAME_HEIGHT));
    }

    setupEventHandlers() {
        // Keyboard inputs
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (this.gameState === 'PLAYING') {
                if (e.code === 'Space' || e.code === 'ArrowUp') {
                    this.player.jump();
                    e.preventDefault();
                }
                if (e.code === 'ArrowDown') {
                    this.player.duck(true);
                    e.preventDefault();
                }
            } else if (this.gameState === 'START') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    this.start();
                    e.preventDefault();
                }
            } else if (this.gameState === 'GAMEOVER') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    this.reset();
                    this.start();
                    e.preventDefault();
                }
            }

            // ESC to pause/toggle settings
            if (e.code === 'Escape') {
                this.toggleSettings();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'ArrowDown') {
                this.player.duck(false);
            }
        });

        // Touch/Mouse controls for Viewport (Jump on click/tap)
        const viewport = document.getElementById('game-viewport');
        viewport.addEventListener('mousedown', (e) => {
            if (this.gameState === 'PLAYING' && e.button === 0) {
                this.player.jump();
            }
        });
        viewport.addEventListener('touchstart', (e) => {
            if (this.gameState === 'PLAYING') {
                this.player.jump();
                e.preventDefault();
            }
        }, { passive: false });

        // DOM Button Bindings
        document.getElementById('start-btn').onclick = () => this.start();
        document.getElementById('respawn-btn').onclick = () => {
            this.reset();
            this.start();
        };
        document.getElementById('main-menu-btn').onclick = () => {
            this.reset();
            this.showOverlay('start-overlay');
        };
        document.getElementById('settings-toggle-btn').onclick = () => this.showOverlay('settings-overlay');
        
        // Save Settings
        document.getElementById('settings-save-btn').onclick = () => {
            const diffSelect = document.getElementById('difficulty-select');
            const soundToggle = document.getElementById('sound-toggle');
            const particlesToggle = document.getElementById('particles-toggle');
            
            this.difficulty = diffSelect.value;
            this.soundEnabled = soundToggle.checked;
            this.particlesEnabled = particlesToggle.checked;
            
            localStorage.setItem('mc_sound_enabled', this.soundEnabled);
            localStorage.setItem('mc_particles_enabled', this.particlesEnabled);
            synth.setEnabled(this.soundEnabled);
            
            document.getElementById('difficulty-badge').textContent = this.difficulty.toUpperCase();
            
            // Go back to start screen
            this.showOverlay('start-overlay');
        };

        // Handle resize events
        window.addEventListener('resize', () => {
            this.adjustCanvasResolution();
        });
    }

    showOverlay(overlayId) {
        document.querySelectorAll('.overlay').forEach(overlay => {
            overlay.classList.remove('active');
        });
        document.getElementById(overlayId).classList.add('active');
    }

    toggleSettings() {
        const settings = document.getElementById('settings-overlay');
        if (settings.classList.contains('active')) {
            this.showOverlay('start-overlay');
        } else if (this.gameState === 'START') {
            this.showOverlay('settings-overlay');
        }
    }

    start() {
        this.gameState = 'PLAYING';
        document.querySelectorAll('.overlay').forEach(o => o.classList.remove('active'));
        
        // Initialize base speed and health
        const config = this.getDifficultyConfig();
        this.gameSpeed = config.baseSpeed;
        this.player.lives = config.lives;
        
        this.score = 0;
        this.obstacleTimer = 0;
        
        this.updateHealthHUD();
        
        // Resume Audio Context on user gesture
        synth.init();
    }

    reset() {
        this.player.reset();
        this.obstacles = [];
        this.powerups = [];
        this.particles.clear();
        this.score = 0;
        document.getElementById('live-score').textContent = '00000';
        document.getElementById('powerup-hud').style.display = 'none';
        document.getElementById('new-high-score-announcement').style.display = 'none';
    }

    getDifficultyConfig() {
        switch (this.difficulty) {
            case 'easy':
                return { baseSpeed: 5.5, accel: 0.0006, spawnRate: 110, lives: 3 };
            case 'hard':
                return { baseSpeed: 8.5, accel: 0.0018, spawnRate: 75, lives: 1 };
            case 'normal':
            default:
                return { baseSpeed: 6.8, accel: 0.0010, spawnRate: 90, lives: 1 };
        }
    }

    updateHealthHUD() {
        const container = document.getElementById('health-hud');
        container.innerHTML = '';
        for (let i = 0; i < this.player.lives; i++) {
            const heart = document.createElement('span');
            heart.className = 'heart animate-beat';
            heart.textContent = '❤️';
            container.appendChild(heart);
        }
    }

    formatScore(val) {
        return String(Math.floor(val)).padStart(5, '0');
    }

    spawnObstacle() {
        const config = this.getDifficultyConfig();
        const rand = Math.random();
        
        // Ground height offset
        const baseHeight = 44;
        
        if (rand < 0.65) {
            // Ground TNT obstacle
            let type, w, h, y;
            const subRand = Math.random();
            if (subRand < 0.5) {
                // Single TNT
                type = 'tnt_single';
                w = 40;
                h = 40;
                y = GROUND_Y - h;
            } else if (subRand < 0.85) {
                // Stacked Double TNT
                type = 'tnt_double';
                w = 80;
                h = 40;
                y = GROUND_Y - h;
            } else {
                // Triple TNT
                type = 'tnt_triple';
                w = 120;
                h = 40;
                y = GROUND_Y - h;
            }
            this.obstacles.push(new Obstacle(GAME_WIDTH + 100, y, w, h, type, 1.0));
        } else {
            // Flying Ghast
            const w = 48;
            const h = 48;
            // 3 height levels: high (must duck), mid (must duck or time jump), low (must jump over)
            const levels = [
                GROUND_Y - 95, // High: duck under
                GROUND_Y - 65, // Mid
                GROUND_Y - 35  // Low: jump over
            ];
            const y = levels[Math.floor(Math.random() * levels.length)];
            // Ghast moves slightly faster than the ground speed for element of surprise
            this.obstacles.push(new Obstacle(GAME_WIDTH + 100, y, w, h, 'ghast', 1.15));
        }
    }

    spawnPowerup() {
        // Spawn a Golden Apple above the ground
        const y = GROUND_Y - 70 - Math.random() * 50;
        this.powerups.push(new GoldenApple(GAME_WIDTH + 100, y));
    }

    loop(time) {
        this.ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Update physics/layout if state is PLAYING
        if (this.gameState === 'PLAYING') {
            this.update();
        }

        // Draw Parallax Sky/Mountains/Clouds/Trees
        this.background.draw(this.ctx, this.gameSpeed);
        
        // Draw Ground (behind obstacles)
        this.ground.draw(this.ctx);

        // Draw Power-ups
        for (const pu of this.powerups) {
            pu.draw(this.ctx);
        }

        // Draw Obstacles
        for (const obs of this.obstacles) {
            obs.draw(this.ctx);
        }

        // Draw Particles
        if (this.particlesEnabled) {
            this.particles.draw(this.ctx);
        }

        // Draw Player Block
        this.player.draw(this.ctx);

        // Keep loop executing
        requestAnimationFrame((t) => this.loop(t));
    }

    update() {
        const config = this.getDifficultyConfig();
        
        // 1. Progress speed and score
        this.gameSpeed += config.accel;
        this.score += 0.15;
        document.getElementById('live-score').textContent = this.formatScore(this.score);

        // Trigger XP sound milestone every 100 points
        if (Math.floor(this.score) % 100 === 0 && Math.floor(this.score) > 0) {
            if (!this.soundMilestonePlayed) {
                synth.playScoreDing();
                this.soundMilestonePlayed = true;
            }
        } else {
            this.soundMilestonePlayed = false;
        }

        // Update background & ground offset
        this.background.update(this.gameSpeed);
        this.ground.update(this.gameSpeed);

        // 2. Update player physics
        this.player.update(this.particles);

        // 3. Spawn Obstacles
        this.obstacleTimer++;
        const currentSpawnRate = Math.max(45, config.spawnRate - (this.gameSpeed * 2));
        if (this.obstacleTimer >= currentSpawnRate) {
            this.spawnObstacle();
            this.obstacleTimer = 0;
            
            // Periodically spawn Golden Apple power-ups (roughly 15% of the time, check distance)
            if (Math.random() < 0.15 && this.powerups.length === 0) {
                // Ensure spawn isn't directly on top of an obstacle
                setTimeout(() => {
                    if (this.gameState === 'PLAYING') this.spawnPowerup();
                }, 1000);
            }
        }

        // 4. Update and clean obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.update(this.gameSpeed);
            
            // Delete if offscreen
            if (obs.x + obs.w < -100) {
                this.obstacles.splice(i, 1);
                continue;
            }

            // Collision Check
            if (this.checkCollision(this.player, obs)) {
                if (this.player.invincible) {
                    // Golden Apple lets you smash through TNT/Ghasts!
                    synth.playBlockBreak();
                    this.particles.spawnBreak(obs.x + obs.w / 2, obs.y + obs.h / 2, obs.breakColors, 15);
                    this.obstacles.splice(i, 1);
                    this.score += 25; // Bonus points for breaking!
                } else {
                    // Regular damage
                    synth.playDamage();
                    this.particles.spawnBreak(obs.x + obs.w / 2, obs.y + obs.h / 2, obs.breakColors, 20);
                    this.obstacles.splice(i, 1);
                    this.player.lives--;
                    this.updateHealthHUD();
                    
                    if (this.player.lives <= 0) {
                        this.gameOver();
                    }
                }
            }
        }

        // 5. Update and collect Power-ups
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const pu = this.powerups[i];
            pu.update(this.gameSpeed);

            if (pu.x + pu.w < -100) {
                this.powerups.splice(i, 1);
                continue;
            }

            if (this.checkCollision(this.player, pu)) {
                // Collect Golden Apple!
                this.player.makeInvincible(300); // 300 frames = 5 seconds
                this.powerups.splice(i, 1);
                
                // Show power-up duration overlay bar
                document.getElementById('powerup-hud').style.display = 'flex';
            }
        }

        // Update Golden Apple duration HUD
        if (this.player.invincible) {
            const pct = (this.player.invincibleTimer / 300) * 100;
            document.getElementById('powerup-progress').style.width = `${pct}%`;
        } else {
            document.getElementById('powerup-hud').style.display = 'none';
        }

        // 6. Update Particles
        this.particles.update();
    }

    checkCollision(player, entity) {
        // Contract hitboxes slightly (padding) for fairer, tighter collisions
        const pPadding = 6;
        const ePadding = 4;
        
        return (
            player.x + pPadding < entity.x + entity.w - ePadding &&
            player.x + player.w - pPadding > entity.x + ePadding &&
            player.y + pPadding < entity.y + entity.h - ePadding &&
            player.y + player.h - pPadding > entity.y + ePadding
        );
    }

    gameOver() {
        this.gameState = 'GAMEOVER';
        
        // Update high score
        let isNewHigh = false;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('mc_high_score', this.highScore);
            document.getElementById('high-score').textContent = this.formatScore(this.highScore);
            isNewHigh = true;
        }

        // Set game over panel details
        document.getElementById('final-score').textContent = Math.floor(this.score);
        document.getElementById('final-high-score').textContent = Math.floor(this.highScore);
        
        if (isNewHigh) {
            document.getElementById('new-high-score-announcement').style.display = 'block';
        }

        this.showOverlay('gameover-overlay');
    }
}

// Start the game instance once script runs
window.onload = () => {
    window.gameInstance = new Game();
};
