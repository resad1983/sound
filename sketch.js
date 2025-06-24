let particles = [];
let mic, fft;
let isRunning = false;
let startButton, stopButton;
let volumePercent = 0;
let thresholdPercent =25;

let particleCount;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  colorMode(HSB, 360, 100, 100, 100);

  // 裝置判斷，自動調整粒子數量
  let isMobile = /Android|webOS|iPhone|iPad/i.test(navigator.userAgent);
  particleCount = isMobile ? 50 : 1000;

  mic = new p5.AudioIn();
  fft = new p5.FFT();
  fft.setInput(mic);

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  startButton = createButton('開始');
  startButton.position(20, 20);
  startButton.touchStarted(startMic); // 手機支援
  startButton.mousePressed(startMic);

  stopButton = createButton('停止');
  stopButton.position(100, 20);
  stopButton.touchStarted(stopMic);
  stopButton.mousePressed(stopMic);
}

function startMic() {
  userStartAudio(); // 📌 啟用音訊（必要）
  mic.start();
  isRunning = true;
}

function stopMic() {
  mic.stop();
  isRunning = false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
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

    for (let p of particles) {
      p.update(volumePercent, baseHue, sat, bri);
      p.display();
    }

    fill(0, 0, 100);
    textSize(16);
    text(`音量: ${nf(volumePercent, 2, 1)}%`, 20, 70);
    text(`FPS: ${nf(frameRate(), 2, 0)}`, 20, 90);
  } else {
    fill(0, 0, 100);
    textSize(16);
    text("請點擊『開始』以啟動聲音互動", 20, 70);
  }
}

class Particle {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = p5.Vector.random2D();
    this.size = random(2, 6);
    this.color = color(random(360), 80, 80);
  }

  update(volumePercent, hueBase, sat, bri) {
    if (volumePercent < thresholdPercent) {
      let noiseVec = p5.Vector.random2D().mult(map(volumePercent, 0, thresholdPercent, 3, 0.5));
      this.vel.add(noiseVec);
    } else {
      let center = createVector(width / 2, height / 2);
      let dir = p5.Vector.sub(center, this.pos);
      dir.setMag(map(volumePercent, thresholdPercent, 100, 0.5, 3));
      this.vel.add(dir);
    }

    this.vel.limit(5);
    this.pos.add(this.vel);
    this.pos.x = constrain(this.pos.x, 0, width);
    this.pos.y = constrain(this.pos.y, 0, height);

    let hueOffset = random(-50, 50);
    this.color = color((hueBase + hueOffset + 360) % 360, sat, bri, 100);
  }

  display() {
    fill(this.color);
    ellipse(this.pos.x, this.pos.y, this.size);
  }
}