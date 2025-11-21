const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
let img = new Image();
let state = {
  scale:1, rotate:0, flipX:false, flipY:false,
  filters: {
    saturate:100, contrast:100, brightness:100, sepia:0, grayscale:0, blur:0, 'hue-rotate':0, exposure:0
  }
};

// History stack
const history = { stack:[], pos:-1, max:20 };
function pushHistory() {
  try{
    if(history.pos < history.stack.length-1) history.stack = history.stack.slice(0, history.pos+1);
    history.stack.push(canvas.toDataURL());
    if(history.stack.length>history.max) history.stack.shift();
    history.pos = history.stack.length-1;
    updateHistoryInfo();
  }catch(e){console.warn('history push failed',e)}
}
function undo(){ if(history.pos>0){ history.pos--; restoreFromDataURL(history.stack[history.pos]); updateHistoryInfo(); }}
function redo(){ if(history.pos < history.stack.length-1){ history.pos++; restoreFromDataURL(history.stack[history.pos]); updateHistoryInfo(); }}
function updateHistoryInfo(){ document.getElementById('historyInfo').textContent = `${history.pos+1} / ${history.stack.length}` }
function restoreFromDataURL(dataURL){ const i = new Image(); i.onload = ()=>{ canvas.width = i.width; canvas.height = i.height; ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(i,0,0); }; i.src = dataURL }

// Elements
const uploadInput = document.getElementById('uploadInput');
const dropTarget = document.querySelector('.drop-target');
const downloadBtn = document.getElementById('downloadBtn');
const formatSelect = document.getElementById('formatSelect');
const qualityRange = document.getElementById('qualityRange');

// Controls
const controls = ['saturate','contrast','brightness','sepia','grayscale','blur','hue-rotate','exposure'];
controls.forEach(k=>{ const el = document.getElementById(k); el?.addEventListener('input',()=>{ state.filters[k] = el.value; document.getElementById(k + 'Val').textContent = k.includes('hue') ? el.value + '°' : (k==='blur' ? el.value+'px' : el.value + (k==='exposure' ? '' : '%')); applyAllFiltersDebounced(); }); });

// Apply filters
function computeFilterString(){ const f = state.filters; return `saturate(${f.saturate}%) contrast(${f.contrast}%) brightness(${f.brightness}%) sepia(${f.sepia}%) grayscale(${f.grayscale}%) b
