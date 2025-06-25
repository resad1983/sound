let particles = [];
let mic, fft;
let isRunning = false;
let startButton, stopButton;
let volumePercent = 0;
let thresholdPercent = 15;
let particleCount = 500;
let shapeMode = 1; // 模式 1~5：圓、三角、方、六邊形、八角形
let targetPositions = [];
let lastSwitchTime = 0;
let baseNoiseLevel = 0;
let noiseSamples = [];
let calibrationDone = false;
let calibrationStartTime = 0;
let spectrumColors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  colorMode(HSB, 360, 100, 100, 100);

  mic = new p5.AudioIn();
  fft = new p5.FFT(0.9, 1024);
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
  lastSwitchTime = millis();
  calibrationStartTime = millis();
  noiseSamples = [];
  calibrationDone = false;
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

    if (!calibrationDone) {
      noiseSamples.push(vol);
      if (millis() - calibrationStartTime > 3000) {
        baseNoiseLevel = noiseSamples.reduce((a, b) => a + b, 0) / noiseSamples.length;
        calibrationDone = true;
        print("\u5b8c\u6210\u5e95\u566a\u6821\u6b63:", baseNoiseLevel);
      } else {
        fill(0, 0, 100);
        textSize(16);
        text("\u6b63\u5728\u4f30\u7b97\u74b0\u5883\u97f3…", 20, 70);
        return;
      }
    }

    let adjVol = max(vol - baseNoiseLevel, 0);
    let dB = 20 * Math.log10(adjVol + 0.0001);
    volumePercent = constrain(map(dB, -50, -10, 0, 100), 0, 100);

    let spectrum = fft.analyze();
    let bands = fft.linAverages(7); // 7 bands
    let centerPoint = createVector(width / 2, height / 2);
    let distances = particles.map(p => p.pos.dist(centerPoint));
    let avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    let maxPossibleDist = dist(0, 0, width / 2, height / 2);
    let concentration = 100 - constrain(map(avgDistance, 0, maxPossibleDist, 0, 100), 0, 100);

    if (concentration > 65 && millis() - lastSwitchTime > 3000) {
      shapeMode = floor(random(1, 6));
      generateTargetPositions();
      lastSwitchTime = millis();
    }

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const target = targetPositions[i % targetPositions.length];
      let bandIndex = i % 7;
      let bandVal = bands[bandIndex];
      let hue = map(bandIndex, 0, 6, 0, 360);
      let speedScale = map(bandVal, 0, 255, 0.2, 2);
      p.update(volumePercent, hue, 80, 100, target, speedScale);
      p.display();
    }

    fill(0, 0, 100);
    textSize(16);
    text(`音量: ${nf(volumePercent, 2, 1)}%`, 20, 70);
    text(`FPS: ${nf(frameRate(), 2, 0)}`, 20, 90);
    text(`集中度: ${nf(concentration, 2, 0)}%`, 20, 110);
    text(`模式: ${shapeMode}`, 20, 130);
  } else {
    fill(0, 0, 100);
    textSize(16);
    text("請點擊『開始』以啟動聲音互動", 20, 70);
  }
}

function keyPressed() {
  if (key >= '1' && key <= '5') {
    shapeMode = int(key);
    generateTargetPositions();
  }
}

function generateTargetPositions() {
  targetPositions = [];
  const cx = width / 2;
  const cy = height / 2;
  const r = min(width, height) / 4;
  const count = particleCount;

  if (shapeMode === 1) { // 圓形
    for (let i = 0; i < count; i++) {
      let angle = TWO_PI * i / count;
      targetPositions.push(createVector(cx + cos(angle) * r, cy + sin(angle) * r));
    }
  } else {
    const corners = [];
    let sides = shapeMode + 2;
    for (let i = 0; i < sides; i++) {
      let angle = TWO_PI * i / sides - HALF_PI;
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

  update(volPercent, hueBase, sat, bri, target, speedFactor) {
    if (volPercent < thresholdPercent) {
      this.vel.add(p5.Vector.random2D().mult(1.2));
    } else {
      let dir = p5.Vector.sub(target, this.pos);
      dir.setMag(map(volPercent, thresholdPercent, 100, 0.2, 5) * speedFactor);
      this.vel.add(dir);
    }

    this.vel.limit(4);
    this.pos.add(this.vel);
    this.pos.x = constrain(this.pos.x, 0, width);
    this.pos.y = constrain(this.pos.y, 0, height);
    this.color = color(hueBase, sat, bri, 100);
  }

  display() {
    fill(this.color);
    ellipse(this.pos.x, this.pos.y, this.size);
  }
}