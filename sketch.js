// ✅ 修正後版本：解決聲音抓取問題 + 手機支援 + RWD
let particles = [];
let mic, fft;
let isRunning = false;
let startButton, stopButton;
let volumePercent = 0;
let thresholdPercent = 20;
let spectrum = [];
let particleCount;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
  colorMode(HSB, 360, 100, 100, 100);
  frameRate(30); // 手機友善 fps

  // 手機裝置自動減少粒子數
  let isMobile = /Mobi|Android/i.test(navigator.userAgent);
  particleCount = isMobile ? 400 : 1000;

  mic = new p5.AudioIn();
  fft = new p5.FFT();
  fft.setInput(mic);

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  startButton = createButton('開始');
  startButton.position(20, 20);
  startButton.mousePressed(() => {
    mic.start();
    isRunning = true;
  });

  stopButton = createButton('停止');
  stopButton.position(80, 20);
  stopButton.mousePressed(() => {
    mic.stop();
    isRunning = false;
  });
}

function draw() {
  background(0, 0, 10);

  if (isRunning) {
    let vol = mic.getLevel(); // 0~1
    let dB = 20 * Math.log10(vol + 0.0001);
    volumePercent = constrain(map(dB, -60, 0, 0, 100), 0, 100);

    // 降低 FFT 執行頻率
    if (frameCount % 3 === 0) {
      spectrum = fft.analyze();
    }

    let bass = fft.getEnergy("bass");
    let mid = fft.getEnergy("mid");
    let treble = fft.getEnergy("treble");

    let baseHue = map(treble, 0, random(255), 0, 360);
    let sat = map(bass, 0, random(255), 50, 100);
    let bri = map(mid, 0, 255, 30, 100);

    for (let p of particles) {
      p.update(volumePercent, baseHue, sat, bri);
      p.display();
    }

    fill(0, 0, 100);
    textSize(16);
    text(`音量: ${nf(volumePercent, 2, 1)}%`, 20, 60);
  } else {
    fill(0, 0, 100);
    textSize(16);
    text("請點擊「開始」以啟動聲音互動", 20, 70);
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
