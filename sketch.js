let particles = [];
let mic, fft;
let isRunning = false;
let startButton, stopButton;
let volumePercent = 0;
let thresholdPercent = 25;
let particleCount = 500;
let mode = 1; // 模式 1~4
let targetPositions = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  colorMode(HSB, 360, 100, 100, 100);

  mic = new p5.AudioIn();
  fft = new p5.FFT();
  fft.setInput(mic);

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  generateTargetPositions();

  startButton = createButton('開始');
  startButton.position(20, 20);
  startButton.mousePressed(startMic);

  stopButton = createButton('停止');
  stopButton.position(100, 20);
  stopButton.mousePressed(stopMic);
}

function startMic() {
  userStartAudio();
  mic.start();
  isRunning = true;
}

function stopMic() {
  mic.stop();
  isRunning = false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generateTargetPositions();
}

function draw() {
  background(0, 0, 10);

  if (isRunning) {
    let vol = mic.getLevel();
    let dB = 20 * Math.log10(vol + 0.0001);
    volumePercent = constrain(map(dB, -65, 0, 0, 100), 0, 100);

    let spectrum = fft.analyze();
    let bass = fft.getEnergy("bass");
    let mid = fft.getEnergy("mid");
    let treble = fft.getEnergy("treble");

    let baseHue = map(treble, 0, random(255), 10, 360);
    let sat = map(bass, 0, random(255), 50, 100);
    let bri = map(mid, 0, 255, 30, 100);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const target = targetPositions[i % targetPositions.length];
      p.update(volumePercent, baseHue, sat, bri, target);
      p.display();
    }

    fill(0, 0, 100);
    textSize(16);
    text(`音量: ${nf(volumePercent, 2, 1)}%`, 20, 70);
    text(`FPS: ${nf(frameRate(), 2, 0)}`, 20, 90);
    text(`模式: ${mode}`, 20, 110);
  } else {
    fill(0, 0, 100);
    textSize(16);
    text("請點擊『開始』以啟動聲音互動", 20, 70);
  }
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3' || key === '4') {
    mode = int(key);
    generateTargetPositions();
  }
}

function generateTargetPositions() {
  targetPositions = [];
  const cx = width / 2;
  const cy = height / 2;
  const r = min(width, height) / 4;
  const count = particleCount;

  if (mode === 1) { // 圓形
    for (let i = 0; i < count; i++) {
      let angle = TWO_PI * i / count;
      targetPositions.push(createVector(cx + cos(angle) * r, cy + sin(angle) * r));
    }
  } else if (mode === 2) { // 三角形
    const corners = [
      createVector(cx, cy - r),
      createVector(cx - r * sin(PI / 3), cy + r / 2),
      createVector(cx + r * sin(PI / 3), cy + r / 2)
    ];
    distributeAlongEdges(corners);
  } else if (mode === 3) { // 正方形
    const corners = [
      createVector(cx - r, cy - r),
      createVector(cx + r, cy - r),
      createVector(cx + r, cy + r),
      createVector(cx - r, cy + r)
    ];
    distributeAlongEdges(corners);
  } else if (mode === 4) { // 六邊形
    const corners = [];
    for (let i = 0; i < 6; i++) {
      let angle = TWO_PI * i / 6 - HALF_PI;
      corners.push(createVector(cx + cos(angle) * r, cy + sin(angle) * r));
    }
    distributeAlongEdges(corners);
  }
}

function distributeAlongEdges(corners) {
  const segs = corners.length;
  const pointsPerEdge = floor(particleCount / segs);
  for (let i = 0; i < segs; i++) {
    let a = corners[i];
    let b = corners[(i + 1) % segs];
    for (let j = 0; j < pointsPerEdge; j++) {
      let t = j / pointsPerEdge;
      let x = lerp(a.x, b.x, t);
      let y = lerp(a.y, b.y, t);
      targetPositions.push(createVector(x, y));
    }
  }
}

class Particle {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = p5.Vector.random2D();
    this.size = random(2, 6);
    this.color = color(random(360), 80, 80);
  }

  update(volumePercent, hueBase, sat, bri, target) {
    if (volumePercent < thresholdPercent) {
      this.vel.add(p5.Vector.random2D().mult(1.5));
    } else {
      let dir = p5.Vector.sub(target, this.pos);
      dir.setMag(map(volumePercent, thresholdPercent, 100, 0.1, 2));
      this.vel.add(dir);
    }
    this.vel.limit(3);
    this.pos.add(this.vel);
    this.pos.x = constrain(this.pos.x, 0, width);
    this.pos.y = constrain(this.pos.y, 0, height);

    let hueOffset = random(-30, 30);
    this.color = color((hueBase + hueOffset + 360) % 360, sat, bri, 100);
  }

  display() {
    fill(this.color);
    ellipse(this.pos.x, this.pos.y, this.size);
  }
}