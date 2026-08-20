const $ = selector => document.querySelector(selector);
const screens = document.querySelectorAll('.screen');
const kanaRows = ['あいうえお','かきくけこ','さしすせそ','たちつてと','なにぬねの','はひふへほ','まみむめも','やゆよ','らりるれろ','わをん'];
let current = 'home', currentKana = 'あ', currentQuestion;
const traceStrokes = [], numberStrokes = [];

function go(id) {
  current = id;
  screens.forEach(screen => screen.classList.toggle('active', screen.id === id));
  if (id === 'math') newQuestion();
}
document.querySelectorAll('[data-go]').forEach(button => button.onclick = () => go(button.dataset.go));
$('#homeButton').onclick = () => go('home');

function setupCanvas(id, strokes) {
  const canvas = $('#' + id), ctx = canvas.getContext('2d');
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const point = event => { const r = canvas.getBoundingClientRect(); return { x: (event.clientX - r.left) * canvas.width / r.width, y: (event.clientY - r.top) * canvas.height / r.height }; };
  let stroke = null;
  function draw(line) { ctx.strokeStyle = '#6f78d8'; ctx.lineWidth = 24; ctx.beginPath(); line.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); }
  canvas.addEventListener('pointerdown', event => { event.preventDefault(); canvas.setPointerCapture(event.pointerId); stroke = [point(event)]; strokes.push(stroke); draw(stroke); });
  canvas.addEventListener('pointermove', event => { if (!stroke) return; stroke.push(point(event)); draw(stroke); });
  ['pointerup', 'pointercancel'].forEach(name => canvas.addEventListener(name, () => stroke = null));
  return () => { ctx.clearRect(0, 0, canvas.width, canvas.height); strokes.length = 0; };
}
const clearTrace = setupCanvas('traceCanvas', traceStrokes);
const clearNumber = setupCanvas('numberCanvas', numberStrokes);

const guideCanvas = $('#guideCanvas');
const guideCtx = guideCanvas.getContext('2d', { willReadFrequently: true });
function drawGuide() {
  guideCtx.clearRect(0, 0, 720, 720);
  guideCtx.fillStyle = '#d8c8e6';
  guideCtx.font = 'bold 540px "Noto Sans JP", "Yu Gothic", sans-serif';
  guideCtx.textAlign = 'center'; guideCtx.textBaseline = 'middle';
  guideCtx.fillText(currentKana, 360, 385);
}
function selectKana(kana) {
  currentKana = kana;
  $('#kanaName').textContent = `「${kana}」`;
  clearTrace(); drawGuide();
  $('#traceMessage').textContent = 'うすい もじの うえを なぞろう';
  document.querySelectorAll('#kanaPicker button').forEach(button => button.classList.toggle('selected', button.textContent === kana));
}
kanaRows.join('').split('').forEach(kana => {
  const button = document.createElement('button'); button.textContent = kana;
  button.onclick = () => selectKana(kana); $('#kanaPicker').append(button);
});
selectKana('あ');

document.querySelectorAll('[data-clear]').forEach(button => button.onclick = () => {
  if (button.dataset.clear === 'traceCanvas') { clearTrace(); $('#traceMessage').textContent = 'うすい もじの うえを なぞろう'; }
  else { clearNumber(); $('#mathMessage').textContent = 'ゆびで すうじを かいてね'; }
});

function celebrate(title, text, icon = '⭐') {
  $('#celebrationTitle').textContent = title; $('#celebrationText').textContent = text;
  $('#celebrationIcon').textContent = icon; $('#celebration').classList.add('show');
}
$('#nextButton').onclick = () => {
  $('#celebration').classList.remove('show');
  if (current === 'math') newQuestion();
  else { clearTrace(); $('#traceMessage').textContent = 'つぎも じょうずに かけるよ！'; }
};

function canvasMask(canvas, colorTest, size = 90) {
  const source = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  const mask = Array(size * size).fill(false);
  for (let y = 0; y < canvas.height; y += 6) for (let x = 0; x < canvas.width; x += 6) {
    const i = (y * canvas.width + x) * 4;
    if (colorTest(source[i], source[i + 1], source[i + 2], source[i + 3])) mask[Math.floor(y / canvas.height * size) * size + Math.floor(x / canvas.width * size)] = true;
  }
  return { mask, size };
}
function closeTo(mask, size, x, y, radius) {
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
    const xx = x + dx, yy = y + dy;
    if (xx >= 0 && yy >= 0 && xx < size && yy < size && dx * dx + dy * dy <= radius * radius && mask[yy * size + xx]) return true;
  }
  return false;
}
function tracingScore() {
  const guide = canvasMask(guideCanvas, (r, g, b, a) => a > 0 && r > 150 && b > 150);
  const ink = canvasMask($('#traceCanvas'), (r, g, b, a) => a > 0 && b > 130 && r < 150);
  let guideTotal = 0, guideHit = 0, inkTotal = 0, inkHit = 0;
  guide.mask.forEach((on, i) => { if (!on) return; guideTotal++; const x = i % guide.size, y = Math.floor(i / guide.size); if (closeTo(ink.mask, guide.size, x, y, 5)) guideHit++; });
  ink.mask.forEach((on, i) => { if (!on) return; inkTotal++; const x = i % guide.size, y = Math.floor(i / guide.size); if (closeTo(guide.mask, guide.size, x, y, 4)) inkHit++; });
  return { coverage: guideHit / guideTotal, accuracy: inkHit / inkTotal };
}
$('#checkTrace').onclick = () => {
  const points = traceStrokes.flat();
  if (points.length < 18) { $('#traceMessage').textContent = 'もうすこし かいてみよう！'; return; }
  const score = tracingScore();
  // でたらめな線では通らないよう、見本への正確さと見本をなぞれた量を両方判定する。
  if (score.accuracy >= .72 && score.coverage >= .17) celebrate('すごい！', `「${currentKana}」を じょうずに かけたね！`, '🎉');
  else { $('#traceMessage').textContent = 'おてほんの うえを、もっと たくさん なぞってみよう！'; }
};

function newQuestion() {
  clearNumber(); const a = 1 + Math.floor(Math.random() * 4), b = 1 + Math.floor(Math.random() * 4);
  currentQuestion = { a, b, answer: a + b }; $('#question').textContent = `${a} ＋ ${b} ＝`;
  $('#mathMessage').textContent = 'こたえの すうじを おしてね';
}
function answerWithButton(digit) {
  if (digit === currentQuestion.answer) celebrate('せいかい！', `${currentQuestion.a} たす ${currentQuestion.b} は ${currentQuestion.answer} だね！`, '🏆');
  else $('#mathMessage').textContent = 'おしい！ しきを もういちど みてみよう';
}
for (let digit = 0; digit <= 9; digit++) {
  const button = document.createElement('button'); button.textContent = digit;
  button.setAttribute('aria-label', `${digit}`); button.onclick = () => answerWithButton(digit);
  $('#numberPad').append(button);
}
function normalizedInk() {
  const canvas = $('#numberCanvas'), data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let left = canvas.width, right = 0, top = canvas.height, bottom = 0;
  for (let y = 0; y < canvas.height; y += 3) for (let x = 0; x < canvas.width; x += 3) { const i = (y * canvas.width + x) * 4; if (data[i + 2] > 130 && data[i] < 150) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); } }
  if (right - left < 35 || bottom - top < 70) return null;
  const small = document.createElement('canvas'); small.width = small.height = 80; const ctx = small.getContext('2d');
  const scale = Math.min(58 / (right - left), 64 / (bottom - top)); const w = (right - left) * scale, h = (bottom - top) * scale;
  ctx.drawImage(canvas, left, top, right - left, bottom - top, 40 - w / 2, 40 - h / 2, w, h);
  return canvasMask(small, (r, g, b, a) => a > 0 && b > 130 && r < 150, 80).mask;
}
const segments = { 0:'ab cdef'.replace(' ',''),1:'bc',2:'abged'.replace(' ',''),3:'abgcd',4:'fgbc',5:'afgcd',6:'afgecd'.replace(' ',''),7:'abc',8:'abcdefg' };
function digitTemplate(digit) {
  const c = document.createElement('canvas'); c.width = c.height = 80; const ctx = c.getContext('2d'); ctx.strokeStyle = '#000'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  const line = {a:[20,14,60,14],b:[62,17,62,37],c:[62,43,62,63],d:[20,66,60,66],e:[18,43,18,63],f:[18,17,18,37],g:[20,40,60,40]};
  for (const name of segments[digit]) { const p = line[name]; ctx.beginPath(); ctx.moveTo(p[0],p[1]);ctx.lineTo(p[2],p[3]);ctx.stroke(); }
  return canvasMask(c, (r,g,b,a) => a > 0, 80).mask;
}
function digitScore(ink, digit) {
  const expected = digitTemplate(digit); let wanted = 0, found = 0, drawn = 0, valid = 0;
  expected.forEach((on, i) => { const x = i % 80, y = Math.floor(i / 80); if (on) { wanted++; if (closeTo(ink,80,x,y,6)) found++; } if (ink[i]) { drawn++; if (closeTo(expected,80,x,y,6)) valid++; } });
  return Math.min(found / wanted, valid / drawn);
}
$('#checkMath').onclick = () => {
  const ink = normalizedInk();
  if (!ink) { $('#mathMessage').textContent = 'もっと おおきく すうじを かいてみよう！'; return; }
  const scores = Array.from({ length: 7 }, (_, i) => i + 2).map(digit => ({ digit, score: digitScore(ink, digit) })).sort((a,b) => b.score - a.score);
  const guess = scores[0];
  if (guess.score >= .62 && guess.digit === currentQuestion.answer) celebrate('せいかい！', `${currentQuestion.a} たす ${currentQuestion.b} は ${currentQuestion.answer} だね！`, '🏆');
  else $('#mathMessage').textContent = 'ちがうみたい。しき と すうじを もういちど みてみよう！';
};
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');
