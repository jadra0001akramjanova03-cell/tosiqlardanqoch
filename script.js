
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const coinsElement = document.getElementById("coins");
const recordElement = document.getElementById("record");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");

const W = canvas.width;
const H = canvas.height;

let running = false;
let animationId = null;
let lastTime = 0;

let score = 0;
let coins = 0;
let record = Number(localStorage.getItem("goldenRunRecord")) || 0;

let speed = 0.38;
let spawnTimer = 0;
let objects = [];
let distance = 0;

let player = {
  lane: 1,
  x: 0,
  jump: 0,
  jumpVelocity: 0,
  sliding: 0,
  hit: false
};

recordElement.textContent = record;

function laneX(lane, z = 1) {
  const perspective = 0.22 + z * 0.78;
  const spacing = 145 * perspective;
  return W / 2 + (lane - 1) * spacing;
}

function groundY(z) {
  return 145 + z * 425;
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#080b15");
  sky.addColorStop(0.5, "#171207");
  sky.addColorStop(1, "#080808");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Uzoqdagi shahar binolari
  for (let i = 0; i < 14; i++) {
    const x = i * 75 - 10;
    const height = 65 + (i * 37 % 90);

    ctx.fillStyle = "#11100c";
    ctx.fillRect(x, 145 - height, 58, height);

    ctx.fillStyle = "#9a7414";
    for (let j = 0; j < 3; j++) {
      ctx.fillRect(x + 10 + j * 14, 155 - height, 4, 5);
      ctx.fillRect(x + 10 + j * 14, 170 - height, 4, 5);
    }
  }

  // Ufqda yorug‘lik
  const glow = ctx.createRadialGradient(450, 160, 5, 450, 160, 300);
  glow.addColorStop(0, "#a17a1828");
  glow.addColorStop(1, "#00000000");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Yo‘lning tashqi chegaralari
  ctx.beginPath();
  ctx.moveTo(350, 145);
  ctx.lineTo(35, 600);
  ctx.lineTo(865, 600);
  ctx.lineTo(550, 145);
  ctx.closePath();

  ctx.fillStyle = "#171717";
  ctx.fill();

  // Yo‘l chetidagi oltin chiziqlar
  ctx.strokeStyle = "#d7a900";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(350, 145);
  ctx.lineTo(35, 600);
  ctx.moveTo(550, 145);
  ctx.lineTo(865, 600);
  ctx.stroke();

  // Uch yo‘lak
  for (let i = 1; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(450 + (i - 1.5) * 67, 145);
    ctx.lineTo(450 + (i - 1.5) * 275, 600);
    ctx.strokeStyle = "#a98a2c80";
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 13]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Yo‘l chiziqlaridagi harakat
  for (let i = 0; i < 12; i++) {
    const z = ((i / 12 + distance * 0.7) % 1);
    const y = groundY(z);
    const width = 5 + z * 30;

    ctx.fillStyle = "#8b701e";
    ctx.fillRect(W / 2 - width / 2, y, width, 2 + z * 3);
  }
}

function drawCoin(x, y, scale) {
  const r = 11 * scale;

  ctx.save();
  ctx.translate(x, y);

  ctx.shadowColor = "#ffd21f";
  ctx.shadowBlur = 18 * scale;

  const gradient = ctx.createRadialGradient(-r / 3, -r / 3, 1, 0, 0, r);
  gradient.addColorStop(0, "#fff8a8");
  gradient.addColorStop(0.5, "#ffd21f");
  gradient.addColorStop(1, "#b88600");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.72, r, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#fff1a0";
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  ctx.fillStyle = "#805600";
  ctx.font = `bold ${14 * scale}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("$", 0, 1);

  ctx.restore();
}

function drawObstacle(obj) {
  const z = obj.z;
  const x = laneX(obj.lane, z);
  const y = groundY(z);
  const scale = 0.25 + z * 0.85;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (obj.type === "barrier") {
    // Sakrab o'tiladigan to‘siq
    ctx.shadowColor = "#ff8c00";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#c77a00";
    ctx.fillRect(-38, -45, 76, 43);

    ctx.fillStyle = "#ffd21f";
    ctx.fillRect(-38, -43, 76, 9);

    ctx.fillStyle = "#281900";
    for (let i = -28; i < 35; i += 22) {
      ctx.save();
      ctx.translate(i, -15);
      ctx.rotate(-0.6);
      ctx.fillRect(-4, -22, 8, 44);
      ctx.restore();
    }

    ctx.fillStyle = "#8c5500";
    ctx.fillRect(-30, -4, 10, 12);
    ctx.fillRect(20, -4, 10, 12);

  } else if (obj.type === "overhead") {
    // Sirpanib o'tiladigan to‘siq
    ctx.shadowColor = "#ffda35";
    ctx.shadowBlur = 14;

    ctx.fillStyle = "#a87900";
    ctx.fillRect(-42, -90, 12, 90);
    ctx.fillRect(30, -90, 12, 90);

    ctx.fillStyle = "#ffd21f";
    ctx.fillRect(-48, -90, 96, 19);

    ctx.fillStyle = "#3b2900";
    ctx.fillRect(-30, -86, 60, 8);

  } else {
    // O'tib bo'lmaydigan katta quti
    ctx.shadowColor = "#ff4a00";
    ctx.shadowBlur = 15;

    ctx.fillStyle = "#9b3900";
    ctx.fillRect(-38, -60, 76, 60);

    ctx.fillStyle = "#ff8c00";
    ctx.fillRect(-38, -60, 76, 10);

    ctx.strokeStyle = "#ffd21f";
    ctx.lineWidth = 3;
    ctx.strokeRect(-38, -60, 76, 60);

    ctx.fillStyle = "#3a1800";
    ctx.font = "bold 19px Arial";
    ctx.textAlign = "center";
    ctx.fillText("!", 0, -23);
  }

  ctx.restore();
}

function drawPlayer() {
  const targetX = laneX(player.lane, 1);
  player.x += (targetX - player.x) * 0.22;

  const jumpHeight = player.jump;
  const x = player.x || targetX;
  const y = 525 - jumpHeight;

  ctx.save();
  ctx.translate(x, y);

  // Soya
  ctx.fillStyle = "#0009";
  ctx.beginPath();
  ctx.ellipse(0, 4 + jumpHeight * 0.25, 32, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  if (player.sliding > 0) {
    // Sirpanayotgan qahramon
    ctx.rotate(-0.15);

    ctx.fillStyle = "#ffd21f";
    ctx.beginPath();
    ctx.roundRect(-30, -29, 59, 22, 9);
    ctx.fill();

    ctx.fillStyle = "#e6b68b";
    ctx.beginPath();
    ctx.arc(25, -24, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#242424";
    ctx.fillRect(-29, -10, 25, 8);
    ctx.fillRect(8, -10, 25, 8);

  } else {
    // Oyoqlar
    const runningLeg = Math.sin(distance * 24) * 7;

    ctx.strokeStyle = "#f4c99d";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(-9, -23);
    ctx.lineTo(-13 + runningLeg, -5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(9, -23);
    ctx.lineTo(13 - runningLeg, -5);
    ctx.stroke();

    // Oyoq kiyimlari
    ctx.fillStyle = "#ffd21f";
    ctx.fillRect(-24 + runningLeg, -8, 17, 7);
    ctx.fillRect(7 - runningLeg, -8, 17, 7);

    // Gavda
    const bodyGradient = ctx.createLinearGradient(-20, -75, 20, -20);
    bodyGradient.addColorStop(0, "#fff1a0");
    bodyGradient.addColorStop(1, "#d69c00");

    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.roundRect(-17, -70, 34, 48, 10);
    ctx.fill();

    // Qo‘llar
    ctx.strokeStyle = "#e8b98c";
    ctx.lineWidth = 8;

    ctx.beginPath();
    ctx.moveTo(-15, -60);
    ctx.lineTo(-24, -39 + runningLeg);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(15, -60);
    ctx.lineTo(24, -39 - runningLeg);
    ctx.stroke();

    // Bosh
    ctx.fillStyle = "#e8b98c";
    ctx.beginPath();
    ctx.arc(0, -85, 16, 0, Math.PI * 2);
    ctx.fill();

    // Soch
    ctx.fillStyle = "#24201a";
    ctx.beginPath();
    ctx.arc(0, -91, 16, Math.PI, Math.PI * 2);
    ctx.fill();

    // Ko'zlar
    ctx.fillStyle = "#171717";
    ctx.beginPath();
    ctx.arc(-6, -85, 2, 0, Math.PI * 2);
    ctx.arc(6, -85, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function addObject(type, lane, z = 0) {
  objects.push({ type, lane, z, collected: false });
}

function spawnObjects() {
  const lane = Math.floor(Math.random() * 3);
  const chance = Math.random();

  if (chance < 0.28) {
    addObject("barrier", lane);
  } else if (chance < 0.53) {
    addObject("overhead", lane);
  } else if (chance < 0.73) {
    addObject("block", lane);
  } else {
    // Bir nechta tanga
    for (let i = 0; i < 5; i++) {
      addObject("coin", lane, -i * 0.075);
    }
  }

  // Ba'zan boshqa yo‘lakda ham tanga paydo bo‘ladi
  if (Math.random() < 0.4) {
    const otherLane = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
    for (let i = 0; i < 3; i++) {
      addObject("coin", otherLane, -i * 0.09);
    }
  }
}

function moveLeft() {
  if (running) player.lane = Math.max(0, player.lane - 1);
}

function moveRight() {
  if (running) player.lane = Math.min(2, player.lane + 1);
}

function jump() {
  if (running && player.jump === 0 && player.sliding <= 0) {
    player.jumpVelocity = 720;
  }
}

function slide() {
  if (running && player.jump === 0) {
    player.sliding = 0.65;
  }
}

function update(dt) {
  speed = Math.min(0.75, speed + dt * 0.006);
  distance += dt;

  score += Math.floor(dt * 10 * (speed / 0.38));
  scoreElement.textContent = score;

  if (player.jumpVelocity > 0 || player.jump > 0) {
    player.jump += player.jumpVelocity * dt;
    player.jumpVelocity -= 1900 * dt;

    if (player.jump <= 0) {
      player.jump = 0;
      player.jumpVelocity = 0;
    }
  }

  if (player.sliding > 0) {
    player.sliding -= dt;
  }

  spawnTimer += dt;

  const spawnDelay = Math.max(0.65, 1.25 - speed * 0.7);

  if (spawnTimer >= spawnDelay) {
    spawnObjects();
    spawnTimer = 0;
  }

  for (const obj of objects) {
    obj.z += speed * dt;

    if (obj.z > 0.91 && obj.z < 1.04 && obj.lane === player.lane) {
      if (obj.type === "coin" && !obj.collected) {
        obj.collected = true;
        coins++;
        score += 50;
        coinsElement.textContent = coins;
        scoreElement.textContent = score;
      }

      if (obj.type === "barrier" && player.jump < 55) {
        gameOver();
        return;
      }

      if (obj.type === "overhead" && player.sliding <= 0) {
        gameOver();
        return;
      }

      if (obj.type === "block") {
        gameOver();
        return;
      }
    }
  }

  objects = objects.filter(obj => obj.z < 1.12 && !obj.collected);
}

function render() {
  drawBackground();

  // Avval uzoqdagi, keyin yaqin obyektlar chiziladi
  const sorted = [...objects].sort((a, b) => a.z - b.z);

  for (const obj of sorted) {
    if (obj.type === "coin") {
      const x = laneX(obj.lane, obj.z);
      const y = groundY(obj.z) - 27 * (0.25 + obj.z * 0.85);
      drawCoin(x, y, 0.25 + obj.z * 0.85);
    } else {
      drawObstacle(obj);
    }
  }

  drawPlayer();

  // Tezlik ko‘rsatkichi
  ctx.fillStyle = "#ffd21f";
  ctx.font = "bold 17px Arial";
  ctx.textAlign = "left";
  ctx.fillText("TEZLIK: " + Math.round(speed * 100), 22, 35);
}

function gameLoop(timestamp) {
  if (!running) return;

  const dt = Math.min((timestamp - lastTime) / 1000, 0.035);
  lastTime = timestamp;

  update(dt);
  render();

  if (running) {
    animationId = requestAnimationFrame(gameLoop);
  }
}

function startGame() {
  if (animationId) cancelAnimationFrame(animationId);

  score = 0;
  coins = 0;
  speed = 0.38;
  spawnTimer = 0;
  distance = 0;
  objects = [];

  player = {
    lane: 1,
    x: laneX(1, 1),
    jump: 0,
    jumpVelocity: 0,
    sliding: 0,
    hit: false
  };

  scoreElement.textContent = "0";
  coinsElement.textContent = "0";

  overlay.classList.add("hidden");
  running = true;

  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

function gameOver() {
  running = false;

  if (animationId) cancelAnimationFrame(animationId);

  if (score > record) {
    record = score;
    localStorage.setItem("goldenRunRecord", record);
    recordElement.textContent = record;
  }

  overlayTitle.textContent = "O‘YIN TUGADI!";
  overlayText.textContent =
    `Hisob: ${score} | Yig‘ilgan tangalar: ${coins}`;

  startBtn.textContent = "QAYTA O‘YNASH";
  overlay.classList.remove("hidden");
  render();
}

startBtn.addEventListener("click", startGame);

// Klaviatura boshqaruvi
document.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) {
    e.preventDefault();
  }

  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") moveLeft();
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") moveRight();
  if (e.key === "ArrowUp" || e.key === " ") jump();
  if (e.key === "ArrowDown") slide();
});

// Telefon tugmalari
document.querySelectorAll(".mobile-controls button").forEach(button => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;

    if (action === "left") moveLeft();
    if (action === "right") moveRight();
    if (action === "jump") jump();
    if (action === "slide") slide();
  });
});

// Ekranni surish orqali boshqarish
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", (e) => {
  const touch = e.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });

canvas.addEventListener("touchend", (e) => {
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx < 0) moveLeft();
    else moveRight();
  } else {
    if (dy < 0) jump();
    else slide();
  }
}, { passive: true });

// Dastlabki ekran
render();
