// ---- State ----
let images = [];
let activeIndex = -1;
let watermarkLogo = null;
let watermarkOpacity = 0.3;
let watermarkEnabled = true;
let isProcessing = false;
let isCustomLogo = false;
const MAX_IMAGES = 6;

let propertyInfo = {
  name: 'Sunset Villa', location: 'Malibu, CA',
  price: '$299/night', services: 'Pool, Wi‑Fi',
  directions: '15 min from LAX'
};

let cardBgColor = '#000000', cardTextColor = '#ffffff', cardFontFamily = "'Segoe UI', sans-serif";

// ---- Detect Capacitor ----
const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();

// ---- DOM refs ----
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const importBtn = document.getElementById('importBtn');
const enhanceBtn = document.getElementById('enhanceBtn');
const exportBtn = document.getElementById('exportBtn');
const shareBtn = document.getElementById('shareBtn');
const propertyDetailsBtn = document.getElementById('propertyDetailsBtn');
const watermarkToggle = document.getElementById('watermarkToggle');
const logoUpload = document.getElementById('logoUpload');
const logoPreview = document.getElementById('logoPreview');
const clearLogoBtn = document.getElementById('clearLogoBtn');
const notification = document.getElementById('notification');
const enhanceProgress = document.getElementById('enhanceProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

const propName = document.getElementById('propName');
const propLocation = document.getElementById('propLocation');
const propPrice = document.getElementById('propPrice');
const propServices = document.getElementById('propServices');
const propDirections = document.getElementById('propDirections');
const bgColorInput = document.getElementById('cardBgColor');
const textColorInput = document.getElementById('cardTextColor');
const fontSelect = document.getElementById('fontSelect');

const galleryContainer = document.getElementById('galleryContainer');
const imageCounter = document.getElementById('imageCounter');
const clearAllBtn = document.getElementById('clearAllBtn');

// ---- Helpers ----
function showNotification(msg, type = 'success') {
  notification.textContent = msg;
  notification.className = 'notification ' + type;
  notification.classList.remove('hidden');
  clearTimeout(notification._timeout);
  notification._timeout = setTimeout(() => notification.classList.add('hidden'), 4000);
}

// ---- Canvas resize ----
function resizeCanvas() {
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height) - 20;
  canvas.width = size;
  canvas.height = size;
  renderCanvas();
}

// ---- Rendering ----
function renderCanvas() {
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, w, h);

  if (images.length === 0) {
    drawInfoCard();
    return;
  }

  // Load images and draw collage
  let imageObjects = [];
  let loaded = 0;
  for (let i = 0; i < images.length; i++) {
    const img = new Image();
    img.onload = () => {
      loaded++;
      if (loaded === images.length) drawCollage(imageObjects);
    };
    img.onerror = () => {
      loaded++;
      if (loaded === images.length) drawCollage(imageObjects);
    };
    img.src = images[i].dataURL;
    imageObjects.push(img);
  }
  // If images already cached, draw immediately – but we rely on the callback.
}

function drawCollage(imageObjects) {
  const w = canvas.width, h = canvas.height;
  const count = images.length;
  let rects = getLayoutRects(w, h, count);

  for (let i = 0; i < Math.min(count, rects.length); i++) {
    const img = imageObjects[i];
    const rect = rects[i];
    drawImageCover(ctx, img, rect);
  }

  drawOverlays();
}

function getLayoutRects(w, h, count) {
  let rects = [];
  if (count === 1) {
    rects = [{ x: 0, y: 0, width: w, height: h }];
  } else if (count === 2) {
    rects = [
      { x: 0, y: 0, width: w / 2, height: h },
      { x: w / 2, y: 0, width: w / 2, height: h }
    ];
  } else if (count === 3) {
    rects = [
      { x: 0, y: 0, width: (2 * w) / 3, height: h },
      { x: (2 * w) / 3, y: 0, width: w / 3, height: h / 2 },
      { x: (2 * w) / 3, y: h / 2, width: w / 3, height: h / 2 }
    ];
  } else if (count === 4) {
    rects = [
      { x: 0, y: 0, width: w / 2, height: h / 2 },
      { x: w / 2, y: 0, width: w / 2, height: h / 2 },
      { x: 0, y: h / 2, width: w / 2, height: h / 2 },
      { x: w / 2, y: h / 2, width: w / 2, height: h / 2 }
    ];
  } else if (count === 5) {
    rects = [
      { x: 0, y: 0, width: w / 2, height: h / 3 },
      { x: w / 2, y: 0, width: w / 2, height: h / 3 },
      { x: 0, y: h / 3, width: w / 2, height: h / 3 },
      { x: w / 2, y: h / 3, width: w / 2, height: h / 3 },
      { x: 0, y: (2 * h) / 3, width: w, height: h / 3 }
    ];
  } else if (count >= 6) {
    const cols = 3, rows = 2;
    const cellW = w / cols, cellH = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx < count) {
          rects.push({ x: c * cellW, y: r * cellH, width: cellW, height: cellH });
        }
      }
    }
  }
  return rects;
}

function drawImageCover(ctx, img, rect) {
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  const scaleX = rect.width / imgW;
  const scaleY = rect.height / imgH;
  const scale = Math.max(scaleX, scaleY);
  const sw = imgW * scale, sh = imgH * scale;
  const sx = (sw - rect.width) / 2, sy = (sh - rect.height) / 2;
  ctx.drawImage(img, -sx, -sy, sw, sh);
}

function drawOverlays() {
  drawWatermark();
  drawInfoCard();
}

function drawWatermark() {
  const w = canvas.width, h = canvas.height;
  if (watermarkEnabled && watermarkLogo) {
    const logoImg = new Image();
    logoImg.onload = () => {
      const logoWidth = w * 0.18;
      const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
      ctx.globalAlpha = watermarkOpacity;
      ctx.drawImage(logoImg, 10, 10, logoWidth, logoHeight);
      ctx.globalAlpha = 1.0;
    };
    logoImg.src = watermarkLogo;
  }
}

function drawInfoCard() {
  const w = canvas.width, h = canvas.height;
  const info = propertyInfo;
  const cardHeight = 180, cardY = h - cardHeight - 10;
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(10, cardY, w - 20, cardHeight, 12);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = cardTextColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let y = cardY + 12;
  ctx.font = `bold 18px ${cardFontFamily}`;
  ctx.fillText(`🏠 ${info.name}`, 20, y);
  y += 28;
  ctx.font = `bold 14px ${cardFontFamily}`;
  ctx.fillText(`📍 ${info.location}`, 20, y);
  y += 22;
  ctx.fillText(`💰 ${info.price}`, 20, y);
  y += 22;
  ctx.fillText(`🛠️ ${info.services}`, 20, y);
  y += 22;
  ctx.fillText(`🗺️ ${info.directions}`, 20, y);
}

// ---- roundRect polyfill ----
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r) {
    if (r > w/2) r = w/2;
    if (r > h/2) r = h/2;
    this.moveTo(x+r, y);
    this.lineTo(x+w-r, y);
    this.quadraticCurveTo(x+w, y, x+w, y+r);
    this.lineTo(x+w, y+h-r);
    this.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    this.lineTo(x+r, y+h);
    this.quadraticCurveTo(x, y+h, x, y+h-r);
    this.lineTo(x, y+r);
    this.quadraticCurveTo(x, y, x+r, y);
    this.closePath();
    return this;
  };
}

// ---- Import ----
importBtn.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      const remaining = MAX_IMAGES - images.length;
      const toAdd = Array.from(files).slice(0, remaining);
      for (const file of toAdd) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          images.push({ dataURL: ev.target.result, path: file.name, name: file.name });
          if (images.length === 1) activeIndex = 0;
          renderCanvas();
          renderGallery();
        };
        reader.readAsDataURL(file);
      }
      showNotification(`Added ${toAdd.length} image(s).`);
    }
  };
  input.click();
});

// ---- AI Enhance (mock – replace with real API) ----
enhanceBtn.addEventListener('click', async () => {
  if (activeIndex < 0 || !images[activeIndex]) {
    showNotification('Select an image first.', 'error');
    return;
  }
  if (isProcessing) return;
  isProcessing = true;
  enhanceBtn.disabled = true;
  enhanceProgress.classList.remove('hidden');
  progressFill.style.width = '0%';
  progressText.textContent = '🧠 Enhancing...';

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 10;
    if (progress > 95) progress = 95;
    progressFill.style.width = progress + '%';
  }, 200);

  try {
    // Simulate AI processing – replace with your API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    showNotification('✨ Enhancement complete!', 'success');
  } catch (e) {
    showNotification('Enhancement failed.', 'error');
  }
  clearInterval(interval);
  progressFill.style.width = '100%';
  setTimeout(() => {
    enhanceProgress.classList.add('hidden');
    isProcessing = false;
    enhanceBtn.disabled = false;
  }, 500);
});

// ---- Share (native or fallback) ----
async function shareImage(dataURL, title = 'JAM Status') {
  if (isNative) {
    const { Share } = Capacitor.Plugins;
    const { Filesystem, Directory } = Capacitor.Plugins;
    const fileName = `status_${Date.now()}.png`;
    const result = await Filesystem.writeFile({
      path: fileName,
      data: dataURL.split(',')[1],
      directory: Directory.Cache,
      recursive: true
    });
    await Share.share({
      title: title,
      url: result.uri,
      dialogTitle: 'Share your property status'
    });
  } else {
    // Web fallback (File API)
    const blob = await fetch(dataURL).then(r => r.blob());
    if (navigator.share) {
      await navigator.share({
        title: title,
        files: [new File([blob], 'status.png', { type: 'image/png' })]
      });
    } else {
      // Fallback to download
      const link = document.createElement('a');
      link.download = 'status.png';
      link.href = dataURL;
      link.click();
    }
  }
}

shareBtn.addEventListener('click', async () => {
  if (images.length === 0) {
    showNotification('No images to share.', 'error');
    return;
  }
  const dataURL = canvas.toDataURL('image/png');
  try {
    await shareImage(dataURL, 'My property status');
    showNotification('📤 Shared successfully!');
  } catch (err) {
    console.warn('Share failed:', err);
    showNotification('Share failed.', 'error');
  }
});

// ---- Export (Save to device) ----
exportBtn.addEventListener('click', async () => {
  if (images.length === 0) {
    showNotification('No images to export.', 'error');
    return;
  }
  const dataURL = canvas.toDataURL('image/png');
  if (isNative) {
    const { Filesystem, Directory } = Capacitor.Plugins;
    try {
      const result = await Filesystem.writeFile({
        path: `status_${Date.now()}.png`,
        data: dataURL.split(',')[1],
        directory: Directory.Documents,
        recursive: true
      });
      showNotification(`✅ Saved: ${result.uri}`);
    } catch (e) {
      showNotification('Save failed.', 'error');
    }
  } else {
    // Web fallback
    const link = document.createElement('a');
    link.download = 'status.png';
    link.href = dataURL;
    link.click();
    showNotification('✅ Image saved.');
  }
});

// ---- Watermark controls ----
watermarkToggle.addEventListener('change', () => {
  watermarkEnabled = watermarkToggle.checked;
  renderCanvas();
});

logoUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      watermarkLogo = ev.target.result;
      isCustomLogo = true;
      logoPreview.innerHTML = `<img src="${watermarkLogo}" style="max-width:80px; max-height:80px; border-radius:4px;">`;
      renderCanvas();
      showNotification('Logo uploaded.');
    };
    reader.readAsDataURL(file);
  }
});

clearLogoBtn.addEventListener('click', () => {
  watermarkLogo = null;
  isCustomLogo = false;
  logoPreview.innerHTML = '';
  renderCanvas();
  showNotification('Logo cleared.');
});

// ---- Gallery ----
function renderGallery() {
  galleryContainer.innerHTML = '';
  imageCounter.textContent = `(${images.length}/${MAX_IMAGES})`;
  if (images.length === 0) {
    galleryContainer.innerHTML = '<div style="color:#999;">No images</div>';
    return;
  }
  images.forEach((img, index) => {
    const thumb = document.createElement('img');
    thumb.src = img.dataURL;
    thumb.classList.toggle('active', index === activeIndex);
    thumb.addEventListener('click', () => {
      activeIndex = index;
      renderGallery();
    });
    galleryContainer.appendChild(thumb);
  });
}

clearAllBtn.addEventListener('click', () => {
  images = [];
  activeIndex = -1;
  renderGallery();
  renderCanvas();
  showNotification('All images cleared.');
});

// ---- Property Info updates ----
[propName, propLocation, propPrice, propServices, propDirections].forEach(el => {
  el.addEventListener('input', () => {
    propertyInfo.name = propName.value;
    propertyInfo.location = propLocation.value;
    propertyInfo.price = propPrice.value;
    propertyInfo.services = propServices.value;
    propertyInfo.directions = propDirections.value;
    renderCanvas();
  });
});

// ---- Styling ----
bgColorInput.addEventListener('input', () => {
  cardBgColor = bgColorInput.value;
  renderCanvas();
});
textColorInput.addEventListener('input', () => {
  cardTextColor = textColorInput.value;
  renderCanvas();
});
fontSelect.addEventListener('change', () => {
  cardFontFamily = fontSelect.value;
  renderCanvas();
});

// ---- Property Modal ----
const propertyModal = document.getElementById('propertyModal');
const closePropertyBtn = document.getElementById('closePropertyModal');
const savePropertyBtn = document.getElementById('savePropertyBtn');
const modalPropName = document.getElementById('modalPropName');
const modalPropLocation = document.getElementById('modalPropLocation');
const modalPropPrice = document.getElementById('modalPropPrice');
const modalPropServices = document.getElementById('modalPropServices');
const modalPropDirections = document.getElementById('modalPropDirections');

propertyDetailsBtn.addEventListener('click', () => {
  modalPropName.value = propertyInfo.name;
  modalPropLocation.value = propertyInfo.location;
  modalPropPrice.value = propertyInfo.price;
  modalPropServices.value = propertyInfo.services;
  modalPropDirections.value = propertyInfo.directions;
  propertyModal.classList.remove('hidden');
});
closePropertyBtn.addEventListener('click', () => propertyModal.classList.add('hidden'));
savePropertyBtn.addEventListener('click', () => {
  propertyInfo.name = modalPropName.value;
  propertyInfo.location = modalPropLocation.value;
  propertyInfo.price = modalPropPrice.value;
  propertyInfo.services = modalPropServices.value;
  propertyInfo.directions = modalPropDirections.value;
  propName.value = propertyInfo.name;
  propLocation.value = propertyInfo.location;
  propPrice.value = propertyInfo.price;
  propServices.value = propertyInfo.services;
  propDirections.value = propertyInfo.directions;
  renderCanvas();
  propertyModal.classList.add('hidden');
  showNotification('✅ Details saved.');
});

// ---- Toggle sidebar ----
const toggleBtn = document.createElement('button');
toggleBtn.id = 'toggleSidebar';
toggleBtn.textContent = '☰';
document.body.appendChild(toggleBtn);
const sidebar = document.getElementById('sidebar');
toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

// ---- Init ----
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
renderGallery();
showNotification('🚀 JAM_WonderStatus for iOS');