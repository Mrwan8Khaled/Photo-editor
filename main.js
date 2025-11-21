// AeroEdit - main.js (vanilla)
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
let img = new Image();
let state = {
  scale: 1,
  rotate: 0,
  flipX: false,
  flipY: false,
  filters: {
    saturate: 100,
    contrast: 100,
    brightness: 100,
    sepia: 0,
    grayscale: 0,
    blur: 0,
    'hue-rotate': 0,
    exposure: 0,
  },
};

// History stack
const history = { stack: [], pos: -1, max: 20 };
function pushHistory() {
  try {
    if (history.pos < history.stack.length - 1) history.stack = history.stack.slice(0, history.pos + 1);
    history.stack.push(canvas.toDataURL());
    if (history.stack.length > history.max) history.stack.shift();
    history.pos = history.stack.length - 1;
    updateHistoryInfo();
  } catch (e) {
    console.warn('history push failed', e);
  }
}
function undo() {
  if (history.pos > 0) {
    history.pos--;
    restoreFromDataURL(history.stack[history.pos]);
    updateHistoryInfo();
  }
}
function redo() {
  if (history.pos < history.stack.length - 1) {
    history.pos++;
    restoreFromDataURL(history.stack[history.pos]);
    updateHistoryInfo();
  }
}
function updateHistoryInfo() {
  document.getElementById('historyInfo').textContent = `${history.pos + 1} / ${history.stack.length}`;
}
function restoreFromDataURL(dataURL) {
  const i = new Image();
  i.onload = () => {
    canvas.width = i.width;
    canvas.height = i.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(i, 0, 0);
  };
  i.src = dataURL;
}

// Elements
const uploadInput = document.getElementById('uploadInput');
const dropTarget = document.querySelector('.drop-target');
const downloadBtn = document.getElementById('downloadBtn');
const formatSelect = document.getElementById('formatSelect');
const qualityRange = document.getElementById('qualityRange');

// Controls
const controls = ['saturate', 'contrast', 'brightness', 'sepia', 'grayscale', 'blur', 'hue-rotate', 'exposure'];
controls.forEach((k) => {
  const el = document.getElementById(k);
  el?.addEventListener('input', () => {
    state.filters[k] = el.value;
    const label = document.getElementById(k + 'Val');
    if (label) {
      label.textContent = k.includes('hue') ? el.value + '°' : k === 'blur' ? el.value + 'px' : el.value + (k === 'exposure' ? '' : '%');
    }
    applyAllFiltersDebounced();
  });
});

// Apply filters
function computeFilterString() {
  const f = state.filters;
  return `saturate(${f.saturate}%) contrast(${f.contrast}%) brightness(${f.brightness}%) sepia(${f.sepia}%) grayscale(${f.grayscale}%) blur(${f.blur}px) hue-rotate(${f['hue-rotate']}deg)`;
}
function applyAllFilters() {
  if (!img.src) return;
  // draw on main canvas at original resolution
  const w = img.naturalWidth,
    h = img.naturalHeight;
  canvas.width = w;
  canvas.height = h;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.filter = computeFilterString();
  ctx.drawImage(img, 0, 0, w, h);
  ctx.restore();
  pushHistory();
}
const applyAllFiltersDebounced = debounce(applyAllFilters, 150);

// Debounce utility
function debounce(fn, wait) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), wait);
  };
}

// Upload / Drag & Drop
uploadInput.addEventListener('change', (e) => {
  handleFile(e.target.files[0]);
});
['dragenter', 'dragover'].forEach((ev) => {
  dropTarget.addEventListener(ev, (e) => {
    e.preventDefault();
    dropTarget.classList.add('active');
  });
});
['dragleave', 'drop'].forEach((ev) => {
  dropTarget.addEventListener(ev, (e) => {
    e.preventDefault();
    dropTarget.classList.remove('active');
  });
});
dropTarget.addEventListener('drop', (e) => {
  const f = e.dataTransfer.files[0];
  if (f) handleFile(f);
});

function handleFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      state.scale = 1;
      state.rotate = 0;
      state.flipX = false;
      state.flipY = false;
      applyAllFilters();
      showUI();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function showUI() {
  document.getElementById('downloadBtn').style.display = 'inline-block';
  document.querySelector('.drop-target').style.display = 'none';
}

// Download
downloadBtn.addEventListener('click', () => {
  const mime = formatSelect.value;
  const quality = Number(qualityRange.value);
  const data = canvas.toDataURL(mime, quality);
  const a = document.createElement('a');
  a.href = data;
  a.download = `aeroedit-${Date.now()}.${mime === 'image/png' ? 'png' : 'jpg'}`;
  a.click();
});

// Reset
document.getElementById('resetAll').addEventListener('click', resetAll);
function resetAll() {
  Object.keys(state.filters).forEach((k) => {
    state.filters[k] = k === 'saturate' || k === 'contrast' || k === 'brightness' ? 100 : 0;
  });
  ['saturate', 'contrast', 'brightness', 'sepia', 'grayscale', 'blur', 'hue-rotate', 'exposure'].forEach((k) => {
    const el = document.getElementById(k);
    if (el) el.value = state.filters[k];
    const label = document.getElementById(k + 'Val');
    if (label) label.textContent = k === 'hue-rotate' ? '0°' : k === 'blur' ? '0px' : state.filters[k] + '%';
  });
  if (img.src) applyAllFilters();
}

// Rotate / Flip
document.getElementById('rotate90Btn').addEventListener('click', () => {
  rotateAndRedraw(90);
});
function rotateAndRedraw(deg) {
  if (!img.src) return;
  const tmp = document.createElement('canvas');
  const tctx = tmp.getContext('2d');
  const w = canvas.width,
    h = canvas.height;
  tmp.width = h;
  tmp.height = w;
  tctx.save();
  tctx.translate(tmp.width / 2, tmp.height / 2);
  tctx.rotate((deg * Math.PI) / 180);
  tctx.drawImage(canvas, -w / 2, -h / 2);
  tctx.restore();
  canvas.width = tmp.width;
  canvas.height = tmp.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(tmp, 0, 0);
  pushHistory();
}

// Flip
document.getElementById('flipHBtn').addEventListener('click', () => {
  if (!img.src) return;
  const tmp = document.createElement('canvas');
  tmp.width = canvas.width;
  tmp.height = canvas.height;
  const tctx = tmp.getContext('2d');
  tctx.save();
  tctx.translate(tmp.width, 0);
  tctx.scale(-1, 1);
  tctx.drawImage(canvas, 0, 0);
  tctx.restore();
  canvas.width = tmp.width;
  canvas.height = tmp.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(tmp, 0, 0);
  pushHistory();
});

document.getElementById('flipVBtn').addEventListener('click', () => {
  if (!img.src) return;
  const tmp = document.createElement('canvas');
  tmp.width = canvas.width;
  tmp.height = canvas.height;
  const tctx = tmp.getContext('2d');
  tctx.save();
  tctx.translate(0, tmp.height);
  tctx.scale(1, -1);
  tctx.drawImage(canvas, 0, 0);
  tctx.restore();
  canvas.width = tmp.width;
  canvas.height = tmp.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(tmp, 0, 0);
  pushHistory();
});

// Undo/Redo
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);

// Presets
document.querySelectorAll('.preset').forEach((btn) => {
  btn.addEventListener('click', () => {
    const p = btn.dataset.preset;
    if (p === 'vintage') {
      setFilters({ saturate: 90, contrast: 110, brightness: 95, sepia: 18, grayscale: 0, blur: 0, 'hue-rotate': 0 });
    } else if (p === 'cinematic') {
      setFilters({ saturate: 120, contrast: 120, brightness: 95, sepia: 0, grayscale: 0, blur: 0, 'hue-rotate': 5 });
    } else if (p === 'bw') {
      setFilters({ saturate: 0, contrast: 120, brightness: 100, sepia: 0, grayscale: 100, blur: 0, 'hue-rotate': 0 });
    }
    applyAllFilters();
  });
});

function setFilters(obj) {
  Object.assign(state.filters, obj);
  Object.keys(obj).forEach((k) => {
    const el = document.getElementById(k);
    if (el) el.value = state.filters[k];
    const label = document.getElementById(k + 'Val');
    if (label) label.textContent = k === 'hue-rotate' ? state.filters[k] + '°' : k === 'blur' ? state.filters[k] + 'px' : state.filters[k] + '%';
  });
}

// Crop tool (basic draggable rectangular overlay)
let cropping = false;
let cropRect = null;
const overlay = document.getElementById('overlayCrop');
const cropBtn = document.getElementById('cropBtn');
const cropControls = document.getElementById('cropControls');
cropBtn.addEventListener('click', () => {
  if (!img.src) return;
  cropping = !cropping;
  overlay.classList.toggle('hidden', !cropping);
  cropControls.classList.toggle('hidden', !cropping);
  if (cropping) {
    initCrop();
  } else {
    cropRect = null;
    overlay.style.width = '0';
    overlay.style.height = '0';
  }
});
function initCrop() {
  cropRect = { x: (canvas.width * 0.1) | 0, y: (canvas.height * 0.1) | 0, w: (canvas.width * 0.8) | 0, h: (canvas.height * 0.8) | 0 };
  updateOverlay();
  enableCropDrag();
}
function updateOverlay() {
  overlay.style.left = (cropRect.x / canvas.width) * 100 + '%';
  overlay.style.top = (cropRect.y / canvas.height) * 100 + '%';
  overlay.style.width = (cropRect.w / canvas.width) * 100 + '%';
  overlay.style.height = (cropRect.h / canvas.height) * 100 + '%';
}

function enableCropDrag() {
  let dragging = false;
  let startX = 0,
    startY = 0;
  overlay.addEventListener('mousedown', (e) => {
    dragging = true;
    startX = e.offsetX;
    startY = e.offsetY;
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const nx = Math.max(0, Math.min(canvas.width, mx - cropRect.w / 2));
    const ny = Math.max(0, Math.min(canvas.height, my - cropRect.h / 2));
    cropRect.x = nx;
    cropRect.y = ny;
    updateOverlay();
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
  });
}

document.getElementById('applyCrop').addEventListener('click', () => {
  if (!cropRect) return;
  const tmp = document.createElement('canvas');
  tmp.width = Math.max(1, Math.round(cropRect.w));
  tmp.height = Math.max(1, Math.round(cropRect.h));
  const tctx = tmp.getContext('2d');
  tctx.drawImage(canvas, Math.round(cropRect.x), Math.round(cropRect.y), Math.round(cropRect.w), Math.round(cropRect.h), 0, 0, tmp.width, tmp.height);
  canvas.width = tmp.width;
  canvas.height = tmp.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(tmp, 0, 0);
  cropRect = null;
  overlay.classList.add('hidden');
  cropControls.classList.add('hidden');
  pushHistory();
});

document.getElementById('cancelCrop').addEventListener('click', () => {
  cropRect = null;
  overlay.classList.add('hidden');
  cropControls.classList.add('hidden');
});

// Webcam capture
const webcamBtn = document.getElementById('webcamBtn');
webcamBtn.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const v = document.createElement('video');
    v.autoplay = true;
    v.srcObject = stream;
    await v.play();
    const tmp = document.createElement('canvas');
    tmp.width = v.videoWidth;
    tmp.height = v.videoHeight;
    tmp.getContext('2d').drawImage(v, 0, 0);
    handleFile(dataURLtoFile(tmp.toDataURL(), 'webcam.png'));
    stream.getTracks().forEach((t) => t.stop());
  } catch (e) {
    alert('Webcam not available: ' + e.message);
  }
});
function dataURLtoFile(dataurl, filename) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.key === 'z' || (e.ctrlKey && e.key === 'z')) {
    undo();
  } else if (e.key === 'y' || (e.ctrlKey && e.key === 'y')) {
    redo();
  } else if (e.key.toLowerCase() === 'r') {
    resetAll();
  } else if (e.key.toLowerCase() === 'd') {
    document.getElementById('downloadBtn').click();
  }
});

// initial small helper
pushHistory();
