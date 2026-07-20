import { supabaseAuth } from './supabase-auth.js';
import { supabase, subscribeToTable } from './supabase.js';

function getStoredUser() {
  try {
    const raw = localStorage.getItem('eau-de-play-current-user') || localStorage.getItem('eau-de-play-user');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

async function fetchBookings(userEmail) {
  try {
    if (!userEmail) return [];

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_email', userEmail)
      .order('start_date', { ascending: false });

    if (error) {
      console.warn('Bookings could not be loaded:', error.message || error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.warn('Bookings request failed:', error);
    return [];
  }
}

function renderDashboardSummary(bookings, purchases) {
  const bookingCount = document.getElementById('summary-bookings-count');
  const upcomingCount = document.getElementById('summary-upcoming-count');
  const purchaseCount = document.getElementById('summary-purchases-count');

  const now = new Date();
  const upcoming = bookings.filter((booking) => new Date(booking.start_date) > now);

  // Animate counts so the dashboard feels alive
  if (bookingCount) animateCount(bookingCount, bookings.length);
  if (purchaseCount) animateCount(purchaseCount, purchases.length);
  if (upcomingCount) animateCount(upcomingCount, upcoming.length);
}

const AVATAR_STORAGE_KEY = 'eau-de-play-club-avatar';
const AVATAR_OPTIONS_KEY = 'eau-de-play-avatar-options';
const AVATAR_PROFILE_TABLE = 'profiles';
const DEFAULT_AVATAR_OPTIONS = {
  size: 'medium',
  height: 'average',
  skin: '#d69f77',
  hair: '#f4d35e',
  hairstyle: 'curly',
  outfit: '#70d6ff',
  accessory: 'none'
};
// extend defaults
DEFAULT_AVATAR_OPTIONS.pattern = 'none';
DEFAULT_AVATAR_OPTIONS.makeup = 'none';
DEFAULT_AVATAR_OPTIONS.tattoo = 'none';



function animateCount(element, target) {
  if (!element) return;
  const start = 0;
  const duration = 650;
  let rafId = null;
  const startTime = performance.now();
  function step(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const value = Math.floor(t * target);
    element.textContent = String(value);
    if (t < 1) rafId = requestAnimationFrame(step);
    else element.textContent = String(target);
  }
  if (rafId) cancelAnimationFrame(rafId);
  requestAnimationFrame(step);
}

function getStoredAvatar() {
  try {
    return localStorage.getItem(AVATAR_STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

function saveAvatar(dataUrl) {
  try {
    localStorage.setItem(AVATAR_STORAGE_KEY, dataUrl);
  } catch (error) {
    console.warn('Unable to save avatar', error);
  }
}

function renderAvatarPreview(dataUrl) {
  const preview = document.getElementById('avatar-preview');
  const previewSide = document.getElementById('avatar-preview-side');
  if (!preview) return;
  // Use quoted URL to avoid CSS parsing issues with data URLs and provide an <img>
  // fallback for older browsers where setting backgroundImage may fail.
  if (dataUrl) {
    try {
      preview.style.backgroundImage = 'url("' + dataUrl + '")';
      preview.style.backgroundSize = 'cover';
      preview.style.backgroundPosition = 'center';
      preview.classList.add('has-avatar');
    } catch (e) {
      // graceful fallback: inject an <img> element
      preview.innerHTML = '';
      const img = document.createElement('img');
      img.alt = 'Avatar preview';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.src = dataUrl;
      preview.appendChild(img);
      preview.classList.add('has-avatar');
    }
    if (previewSide) {
      try {
        previewSide.style.backgroundImage = 'url("' + dataUrl + '")';
        previewSide.style.backgroundSize = 'cover';
        previewSide.style.backgroundPosition = 'center';
        previewSide.classList.add('has-avatar');
      } catch (e) {
        previewSide.innerHTML = '';
        const img2 = document.createElement('img');
        img2.alt = 'Avatar preview';
        img2.style.width = '100%';
        img2.style.height = '100%';
        img2.style.objectFit = 'cover';
        img2.src = dataUrl;
        previewSide.appendChild(img2);
        previewSide.classList.add('has-avatar');
      }
    }
  } else {
    preview.style.backgroundImage = '';
    preview.classList.remove('has-avatar');
    preview.innerHTML = '';
    if (previewSide) { previewSide.style.backgroundImage = ''; previewSide.classList.remove('has-avatar'); previewSide.innerHTML = ''; }
  }
}

function getAvatarOptions() {
  try {
    const stored = localStorage.getItem(AVATAR_OPTIONS_KEY);
    return stored ? JSON.parse(stored) : { ...DEFAULT_AVATAR_OPTIONS };
  } catch (error) {
    return { ...DEFAULT_AVATAR_OPTIONS };
  }
}

function saveAvatarOptions(options) {
  try {
    localStorage.setItem(AVATAR_OPTIONS_KEY, JSON.stringify(options));
  } catch (error) {
    console.warn('Unable to save avatar options', error);
  }
}

function getFormAvatarOptions() {
  const size = document.getElementById('avatar-size')?.value || DEFAULT_AVATAR_OPTIONS.size;
  const height = document.getElementById('avatar-height')?.value || DEFAULT_AVATAR_OPTIONS.height;
  const skin = document.getElementById('avatar-skin')?.value || DEFAULT_AVATAR_OPTIONS.skin;
  const hair = document.getElementById('avatar-hair')?.value || DEFAULT_AVATAR_OPTIONS.hair;
  const hairstyle = document.getElementById('avatar-hairstyle')?.value || DEFAULT_AVATAR_OPTIONS.hairstyle;
  const outfit = document.getElementById('avatar-outfit')?.value || DEFAULT_AVATAR_OPTIONS.outfit;
  const accessory = document.getElementById('avatar-accessory')?.value || DEFAULT_AVATAR_OPTIONS.accessory;
  const pattern = document.getElementById('avatar-pattern')?.value || DEFAULT_AVATAR_OPTIONS.pattern || 'none';
  const makeup = document.getElementById('avatar-makeup')?.value || DEFAULT_AVATAR_OPTIONS.makeup || 'none';
  const tattoo = document.getElementById('avatar-tattoo')?.value || DEFAULT_AVATAR_OPTIONS.tattoo || 'none';
  return { size, height, skin, hair, hairstyle, outfit, accessory, pattern, makeup, tattoo };
}

function setFormAvatarOptions(options) {
  document.getElementById('avatar-size')?.value && (document.getElementById('avatar-size').value = options.size);
  document.getElementById('avatar-height')?.value && (document.getElementById('avatar-height').value = options.height);
  document.getElementById('avatar-skin')?.value && (document.getElementById('avatar-skin').value = options.skin);
  document.getElementById('avatar-hair')?.value && (document.getElementById('avatar-hair').value = options.hair);
  document.getElementById('avatar-hairstyle')?.value && (document.getElementById('avatar-hairstyle').value = options.hairstyle);
  document.getElementById('avatar-outfit')?.value && (document.getElementById('avatar-outfit').value = options.outfit);
  if (document.getElementById('avatar-accessory') && typeof options.accessory !== 'undefined') document.getElementById('avatar-accessory').value = options.accessory;
  if (document.getElementById('avatar-pattern') && typeof options.pattern !== 'undefined') document.getElementById('avatar-pattern').value = options.pattern;
  if (document.getElementById('avatar-makeup') && typeof options.makeup !== 'undefined') document.getElementById('avatar-makeup').value = options.makeup;
  if (document.getElementById('avatar-tattoo') && typeof options.tattoo !== 'undefined') document.getElementById('avatar-tattoo').value = options.tattoo;
}

// Debounce helper
function debounce(fn, wait = 120) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// Attach listeners to all avatar form controls so the preview updates live
function attachAvatarFormListeners() {
  const inputs = Array.from(document.querySelectorAll('[id^="avatar-"]'));
  if (!inputs || inputs.length === 0) return;
  const updater = debounce(() => { try { createAvatarPlaceholder(); } catch (e) { /* ignore */ } }, 90);
  inputs.forEach((el) => {
    el.addEventListener('input', updater);
    el.addEventListener('change', updater);
  });
}

// Create a custom visible display for selects while keeping the native select interactive.
function createCustomSelects() {
  const selects = Array.from(document.querySelectorAll('.avatar-builder-controls select'));
  selects.forEach((select) => {
    if (select.dataset.customized === '1') return;
    const wrapper = document.createElement('div');
    wrapper.className = 'select-wrapper';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.width = select.style.width || '';

    // insert wrapper before select and move select inside
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    // create visible display
    const display = document.createElement('span');
    display.className = 'select-display';
    display.textContent = select.options[select.selectedIndex]?.text || '';
    display.setAttribute('aria-hidden', 'true');
    wrapper.appendChild(display);

    // style the native select so it's invisible but still focusable/clickable
    select.style.position = 'absolute';
    select.style.inset = '0';
    select.style.width = '100%';
    select.style.height = '100%';
    select.style.opacity = '0';
    select.style.zIndex = '2';
    select.style.cursor = 'pointer';

    // when the native select changes, update display text
    select.addEventListener('change', () => {
      display.textContent = select.options[select.selectedIndex]?.text || '';
      // trigger preview update
      try { createAvatarPlaceholder(); } catch (e) { /* ignore */ }
    });

    // clicking the display should focus the native select
    display.addEventListener('click', () => { select.focus(); select.click(); });

    select.dataset.customized = '1';
  });
}

function generateAvatarImage(options) {
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // background
  const bg = ctx.createRadialGradient(210, 210, 24, 210, 210, 220);
  bg.addColorStop(0, 'rgba(255,255,255,0.16)');
  bg.addColorStop(1, 'rgba(6,6,17,0.98)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 420, 420);

  const bodyHeight = options.height === 'tall' ? 140 : options.height === 'short' ? 98 : 120;
  const bodyWidth = options.size === 'large' ? 130 : options.size === 'small' ? 90 : 110;
  const bodyX = 210 - bodyWidth / 2;
  const bodyY = 230;

  // body
  ctx.fillStyle = options.outfit;
  ctx.beginPath();
  ctx.roundRect(bodyX, bodyY, bodyWidth, bodyHeight, 28);
  ctx.fill();

  // face
  ctx.fillStyle = options.skin;
  ctx.beginPath();
  ctx.ellipse(210, 150, 72, 84, 0, 0, Math.PI * 2);
  ctx.fill();

  // hair shape
  ctx.fillStyle = options.hair;
  ctx.beginPath();
  if (options.hairstyle === 'bangs') {
    ctx.moveTo(138, 130);
    ctx.bezierCurveTo(138, 60, 282, 60, 282, 130);
    ctx.lineTo(282, 190);
    ctx.bezierCurveTo(260, 210, 240, 224, 210, 224);
    ctx.bezierCurveTo(180, 224, 160, 210, 138, 190);
  } else if (options.hairstyle === 'spiky') {
    ctx.moveTo(138, 130);
    ctx.lineTo(168, 86);
    ctx.lineTo(190, 132);
    ctx.lineTo(210, 94);
    ctx.lineTo(232, 134);
    ctx.lineTo(258, 92);
    ctx.lineTo(282, 130);
    ctx.lineTo(282, 192);
    ctx.lineTo(138, 192);
  } else {
    ctx.ellipse(210, 118, 96, 72, 0, Math.PI, 0, false);
    ctx.lineTo(118, 168);
    ctx.lineTo(118, 192);
    ctx.lineTo(302, 192);
    ctx.lineTo(302, 168);
  }
  ctx.closePath();
  ctx.fill();

  // face accents
  ctx.fillStyle = '#1f1f31';
  ctx.beginPath();
  ctx.arc(180, 148, 8, 0, Math.PI * 2);
  ctx.arc(240, 148, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(210, 180, 20, 0, Math.PI);
  ctx.stroke();

  // subtle highlights
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(190, 128, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(225, 118, 7, 0, Math.PI * 2);
  ctx.fill();

  // accessory simple rendering
  if (options.accessory === 'sunglasses') {
    ctx.fillStyle = 'rgba(20,20,20,0.95)';
    ctx.fillRect(150, 136, 120, 22);
    ctx.fillStyle = 'rgba(40,40,40,0.95)';
    ctx.fillRect(150, 158, 44, 8);
    ctx.fillRect(226, 158, 44, 8);
  } else if (options.accessory === 'earring') {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(258, 160, 6, 0, Math.PI * 2); ctx.fill();
  } else if (options.accessory === 'hat') {
    ctx.fillStyle = '#222';
    ctx.fillRect(120, 84, 180, 34);
    ctx.beginPath(); ctx.ellipse(210, 130, 110, 28, 0, 0, Math.PI); ctx.fill();
  } else if (options.accessory === 'mask') {
    ctx.fillStyle = 'rgba(30,30,40,0.9)';
    ctx.fillRect(162, 162, 96, 28);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.strokeRect(162, 162, 96, 28);
  }

  // eyes shading and lashes
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.ellipse(180, 148, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(240, 148, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
  // whites
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(180, 146, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(240, 146, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();

  // nose shading
  ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.beginPath(); ctx.moveTo(210,156); ctx.lineTo(206,170); ctx.lineTo(214,170); ctx.closePath(); ctx.fill();

  // lips
  ctx.fillStyle = 'rgba(180,60,90,0.95)'; ctx.beginPath(); ctx.ellipse(210,192,18,8,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(202,186,16,4);

  // clothing details: collar, pattern
  ctx.fillStyle = shadeColor(options.outfit, -12);
  ctx.beginPath(); ctx.moveTo(bodyX, bodyY); ctx.lineTo(bodyX + bodyWidth, bodyY); ctx.lineTo(bodyX + bodyWidth, bodyY + 26); ctx.lineTo(bodyX, bodyY + 26); ctx.closePath(); ctx.fill();
  // add subtle stripes or dot pattern depending on outfit color
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let i = 0; i < 8; i++) { ctx.fillRect(bodyX + i * 14 + 6, bodyY + 36, 6, bodyHeight - 50); }

  // accessory variants
  if (options.accessory === 'necklace') {
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(210, 238, 36, 0.9 * Math.PI, 2.1 * Math.PI); ctx.stroke();
  } else if (options.accessory === 'scarf') {
    ctx.fillStyle = '#222'; ctx.fillRect(162, 238, 96, 20); ctx.fillRect(170, 256, 64, 18);
  } else if (options.accessory === 'headphones') {
    ctx.fillStyle = '#111'; ctx.fillRect(124, 110, 20, 44); ctx.fillRect(276, 110, 20, 44);
    ctx.beginPath(); ctx.arc(210, 96, 86, 0.75 * Math.PI, 0.25 * Math.PI); ctx.lineWidth = 10; ctx.strokeStyle = '#111'; ctx.stroke();
  } else if (options.accessory === 'chain') {
    ctx.strokeStyle = '#e0d4b5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(176,228); ctx.quadraticCurveTo(210,246,244,228); ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}

function generateAvatarSVGImage(options) {
  const bodyHeight = options.height === 'tall' ? 140 : options.height === 'short' ? 98 : 120;
  const bodyWidth = options.size === 'large' ? 130 : options.size === 'small' ? 90 : 110;
  const faceCx = 210, faceCy = 150, faceRx = 72, faceRy = 84;

  // defs for patterns
  const patternId = options.pattern && options.pattern !== 'none' ? `pattern-${options.pattern}` : '';
  let patternDef = '';
  if (options.pattern === 'stripes') {
    patternDef = `<pattern id="${patternId}" patternUnits="userSpaceOnUse" width="14" height="14"><rect width="14" height="14" fill="${options.outfit}"/><rect width="7" height="14" fill="rgba(255,255,255,0.06)"/></pattern>`;
  } else if (options.pattern === 'dots') {
    patternDef = `<pattern id="${patternId}" patternUnits="userSpaceOnUse" width="16" height="16"><rect width="16" height="16" fill="${options.outfit}"/><circle cx="8" cy="8" r="3" fill="rgba(255,255,255,0.06)"/></pattern>`;
  } else if (options.pattern === 'gradient') {
    patternDef = `<linearGradient id="grad-${patternId}" x1="0" x2="1"><stop offset="0%" stop-color="${options.outfit}" stop-opacity="1"/><stop offset="100%" stop-color="${shadeColor(options.outfit,-30)}" stop-opacity="1"/></linearGradient>`;
  } else if (options.pattern === 'chevron') {
    patternDef = `<pattern id="${patternId}" patternUnits="userSpaceOnUse" width="24" height="24"><rect width="24" height="24" fill="${options.outfit}"/><path d="M0 12 L6 6 L12 12 L18 6 L24 12 L24 24 L0 24 Z" fill="rgba(255,255,255,0.04)"/></pattern>`;
  }

  // accessory layers (simple)
  const accessorySVG = (() => {
    switch (options.accessory) {
      case 'sunglasses': return `<rect x="150" y="136" width="120" height="22" fill="#111" rx="6"/>`;
      case 'earring': return `<circle cx="258" cy="160" r="6" fill="#ffd166"/>`;
      case 'hat': return `<rect x="120" y="84" width="180" height="34" fill="#222" rx="6"/><ellipse cx="210" cy="130" rx="110" ry="28" fill="#222"/>`;
      case 'mask': return `<rect x="162" y="162" width="96" height="28" fill="#1e1e28" rx="6"/>`;
      case 'necklace': return `<path d="M176 238 Q210 256 244 238" stroke="#ffd166" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      case 'scarf': return `<rect x="162" y="238" width="96" height="20" fill="#222" rx="6"/>`;
      case 'headphones': return `<rect x="124" y="110" width="20" height="44" fill="#111" rx="6"/><rect x="276" y="110" width="20" height="44" fill="#111" rx="6"/><path d="M124 130 C160 10 260 10 296 130" stroke="#111" stroke-width="10" fill="none" stroke-linecap="round"/>`;
      case 'chain': return `<path d="M176 228 Q210 246 244 228" stroke="#e0d4b5" stroke-width="3" fill="none"/>`;
      default: return '';
    }
  })();

  // makeup
  const makeupSVG = (() => {
    if (options.makeup === 'glow') return `<circle cx="190" cy="128" r="10" fill="rgba(255,200,220,0.18)"/><circle cx="225" cy="118" r="7" fill="rgba(255,200,220,0.14)"/>`;
    if (options.makeup === 'smokey') return `<ellipse cx="180" cy="146" rx="12" ry="6" fill="rgba(30,30,40,0.6)"/><ellipse cx="240" cy="146" rx="12" ry="6" fill="rgba(30,30,40,0.6)"/>`;
    if (options.makeup === 'bold') return `<ellipse cx="210" cy="192" rx="18" ry="8" fill="#b43c5a"/>`;
    return '';
  })();

  // tattoo
  const tattooSVG = (() => {
    if (options.tattoo === 'star') return `<polygon points="210,200 216,214 232,214 218,224 224,238 210,228 196,238 202,224 188,214 204,214" fill="rgba(0,0,0,0.24)" transform="translate(40,10) scale(0.6)"/>`;
    if (options.tattoo === 'music') return `<path d="M10 10 L10 40 L30 34" stroke="#111" stroke-width="3" fill="none" transform="translate(240,200) scale(0.6)"/>`;
    if (options.tattoo === 'tribal') return `<path d="M0 0 C10 10, 20 10, 30 0" stroke="#111" stroke-width="3" fill="none" transform="translate(220,210) scale(0.8)"/>`;
    return '';
  })();

  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns='http://www.w3.org/2000/svg' width='420' height='420' viewBox='0 0 420 420'>
    <defs>
      ${patternDef}
    </defs>
    <rect width='100%' height='100%' fill='black' />
    <g>
      <!-- background glow -->
      <radialGradient id='g1' cx='50%' cy='50%'><stop offset='0%' stop-color='rgba(255,255,255,0.12)'/><stop offset='100%' stop-color='rgba(6,6,17,1)'/></radialGradient>
      <rect width='100%' height='100%' fill='url(#g1)' />
      <!-- body -->
      <rect x='${210 - bodyWidth/2}' y='${230}' width='${bodyWidth}' height='${bodyHeight}' rx='28' fill='${options.pattern === 'gradient' ? `url(#grad-${patternId})` : (options.pattern !== 'none' ? `url(#${patternId})` : options.outfit)}' />
      <!-- face -->
      <ellipse cx='${faceCx}' cy='${faceCy}' rx='${faceRx}' ry='${faceRy}' fill='${options.skin}' />
      <!-- hair (simple) -->
      <path d='M118 168 C150 60 270 60 302 168 L302 192 L118 192 Z' fill='${options.hair}' />
      <!-- eyes -->
      <circle cx='180' cy='148' r='8' fill='#111' />
      <circle cx='240' cy='148' r='8' fill='#111' />
      <circle cx='180' cy='146' r='3' fill='#fff' />
      <circle cx='240' cy='146' r='3' fill='#fff' />
      <!-- mouth -->
      <ellipse cx='210' cy='192' rx='18' ry='8' fill='rgba(180,60,90,0.95)' />
      <!-- accessories -->
      ${accessorySVG}
      <!-- makeup -->
      ${makeupSVG}
      <!-- tattoo -->
      ${tattooSVG}
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// small color shading helper
function shadeColor(color, percent) {
  // color expected as hex like #rrggbb
  try {
    const num = parseInt(color.replace('#',''),16);
    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 0x00FF) + percent;
    let b = (num & 0x0000FF) + percent;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return `rgb(${r},${g},${b})`;
  } catch (e) { return color; }
}

async function saveAvatarToSupabase(userId, dataUrl) {
  if (!userId || !dataUrl) return null;
  // Prefer uploading the avatar to Supabase Storage and save the public URL
  try {
    const uploadedUrl = await uploadAvatarToStorage(userId, dataUrl);
    if (!uploadedUrl) {
      // fallback to storing dataUrl directly if upload failed
      const { data, error } = await supabase
        .from('users')
        .upsert({ id: userId, avatar_url: dataUrl }, { onConflict: 'id' })
        .select('avatar_url')
        .single();
      if (error) throw error;
      return data?.avatar_url || null;
    }

    const { data, error } = await supabase
      .from('users')
      .upsert({ id: userId, avatar_url: uploadedUrl }, { onConflict: 'id' })
      .select('avatar_url')
      .single();
    if (error) throw error;
    return data?.avatar_url || uploadedUrl || null;
  } catch (error) {
    console.warn('Unable to save avatar to Supabase', error);
    return null;
  }
}

// Upload a data URL (svg/png) to Supabase Storage under bucket 'avatars'
async function uploadAvatarToStorage(userId, dataUrl) {
  if (!userId || !dataUrl || !supabase?.storage) return null;
  try {
    const matches = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.*)$/);
    if (!matches) throw new Error('Invalid data URL');
    const mime = matches[1];
    const b64 = matches[2];
    const byteChars = atob(b64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mime });

    const ext = mime.includes('svg') ? 'svg' : (mime.split('/')[1] || 'png');
    const filePath = `${userId}/${Date.now()}.${ext}`;
    const bucket = 'avatars';

    const { data: uploadData, error: uploadErr } = await supabase.storage.from(bucket).upload(filePath, blob, { upsert: true });
    if (uploadErr) {
      console.warn('Storage upload error', uploadErr.message || uploadErr);
      return null;
    }

    // get public URL
    const { data: pubData, error: pubErr } = supabase.storage.from(bucket).getPublicUrl(filePath);
    if (pubErr) {
      console.warn('Get public URL error', pubErr.message || pubErr);
      return null;
    }
    return pubData?.publicUrl || pubData?.publicURL || null;
  } catch (err) {
    console.warn('uploadAvatarToStorage failed', err);
    return null;
  }
}

async function loadProfileAvatar(userId) {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', userId)
      .single();
    if (error) {
      console.warn('Unable to load avatar from Supabase', error);
      return null;
    }
    return data?.avatar_url || null;
  } catch (error) {
    console.warn('Unable to load avatar profile', error);
    return null;
  }
}

function createAvatarPlaceholder() {
  const options = getFormAvatarOptions();
  saveAvatarOptions(options);
  // synchronous placeholder retained for compatibility — generate and save locally
  let dataUrl = null;
  try { dataUrl = generateAvatarSVGImage(options); } catch (e) { dataUrl = null; }
  if (!dataUrl) dataUrl = generateAvatarImage(options);
  if (!dataUrl) return null;
  saveAvatar(dataUrl);
  renderAvatarPreview(dataUrl);
  return dataUrl;
}

// Async creation + save to Supabase (call when user clicks Create)
async function createAndSaveAvatarToSupabase(userId) {
  const options = getFormAvatarOptions();
  saveAvatarOptions(options);
  let dataUrl = null;
  try { dataUrl = generateAvatarSVGImage(options); } catch (e) { dataUrl = null; }
  if (!dataUrl) dataUrl = generateAvatarImage(options);
  if (!dataUrl) throw new Error('Avatar generation failed');
  saveAvatar(dataUrl);
  renderAvatarPreview(dataUrl);

  if (userId) {
    try {
      const saved = await saveAvatarToSupabase(userId, dataUrl);
      if (saved) {
        // ensure local copy is the persisted one
        saveAvatar(saved);
        renderAvatarPreview(saved);
        return saved;
      }
    } catch (err) {
      console.warn('Auto-save to Supabase failed', err);
    }
  }
  return dataUrl;
}

function renderBookings(bookings) {
  const container = document.getElementById('bookings-list');
  const upcomingContainer = document.getElementById('upcoming-services');
  const infoContainer = document.getElementById('booking-info');
  if (!container || !upcomingContainer) return;

  const now = new Date();
  const upcoming = bookings.filter((booking) => new Date(booking.start_date) > now);
  const past = bookings.filter((booking) => new Date(booking.start_date) <= now);

  if (bookings.length === 0) {
    container.innerHTML = '<p>No bookings found yet.</p>';
    upcomingContainer.innerHTML = '<p>No upcoming services scheduled.</p>';
    if (infoContainer) infoContainer.innerHTML = '<p>Select a booking to view details.</p>';
    return;
  }

    container.innerHTML = past.map((booking) => `
      <div class="booking-card card-enter" data-booking-id="${booking.id}">
        <div class="card-inner">
          <div class="card-front">
            <div class="booking-row">
              <strong>${booking.service_name || 'Service'}</strong>
            </div>
            <div class="booking-row">
              <span>Date:</span> ${new Date(booking.start_date).toLocaleString()}
            </div>
            <div class="booking-row">
              <span>Location:</span> ${booking.location || 'N/A'}
            </div>
            <div class="booking-row">
              <span>Total:</span> €${parseFloat(booking.total || 0).toFixed(2)}
            </div>
            <div class="booking-row">
              <span>Status:</span> <span class="booking-status ${String(booking.status || 'confirmed').toLowerCase()}">${booking.status || 'Confirmed'}</span>
            </div>
          </div>
          <div class="card-back">
            <div class="booking-back-content">
              <div><strong>${booking.service_name || 'Service'}</strong></div>
              <div>Transaction: ${booking.transaction_id || '—'}</div>
              <div>Booked by: ${booking.user_email || '—'}</div>
              <div class="booking-back-actions">
                <div class="booking-action" data-action="reschedule" data-booking-id="${booking.id}">Reschedule</div>
                <div class="booking-action secondary ${booking.transaction_id || String(booking.status || '').toLowerCase() === 'paid' ? 'disabled' : ''}" data-action="cancel" data-booking-id="${booking.id}" ${booking.transaction_id || String(booking.status || '').toLowerCase() === 'paid' ? 'data-disabled="true" title="This booking has been paid — contact admin to cancel"' : ''}>Cancel</div>
                <div class="booking-action" data-action="details" data-booking-id="${booking.id}">View Details</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('');

  upcomingContainer.innerHTML = upcoming.length === 0
    ? '<p>No upcoming services scheduled.</p>'
    : upcoming.map((booking) => `
      <div class="upcoming-service-card" data-booking-id="${booking.id}">
        <div class="service-date">${new Date(booking.start_date).toLocaleDateString()}</div>
        <div class="service-name">${booking.service_name || 'Service'}</div>
        <div class="service-location">${booking.location || 'N/A'}</div>
        <div class="service-price">€${parseFloat(booking.total || 0).toFixed(2)}</div>
      </div>
    `).join('');

  // Click interactions: flip card on click; back button shows details
  document.querySelectorAll('.booking-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      // If user clicked the back 'View Details' action, open the detail pane
      const action = e.target?.dataset?.action;
      if (action === 'details') {
        const bid = e.target.dataset.bookingId;
        const booking = bookings.find((b) => String(b.id) === String(bid));
        if (booking) showBookingInfo(booking);
        return;
      }

      // flip
      // toggle flip only if clicked outside action buttons
      if (!e.target.closest('.booking-action')) {
        card.classList.toggle('is-flipped');
      }
    });
  });

  // handle reschedule and cancel actions
  document.querySelectorAll('.booking-action').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.bookingId;

      // Prevent attempts to cancel when button is disabled for paid bookings
      if (action === 'cancel' && (btn.dataset.disabled === 'true' || btn.classList.contains('disabled'))) {
        alert('This booking has been paid. To cancel a paid booking, please contact admin via the contact page.');
        window.location.href = 'contact.html';
        return;
      }

      if (action === 'cancel') {
        if (!confirm('Cancel this booking? This action can be undone by admin. Proceed?')) return;
        try {
          await cancelBooking(id);
        } catch (err) { console.error(err); alert('Unable to cancel booking.'); }
      }
      if (action === 'reschedule') {
        const newDate = prompt('Enter new date & time (YYYY-MM-DD HH:MM):');
        if (!newDate) return;
        // try to parse
        const parsed = new Date(newDate);
        if (isNaN(parsed)) { alert('Invalid date format.'); return; }
        try {
          await rescheduleBooking(id, parsed.toISOString());
        } catch (err) { console.error(err); alert('Unable to reschedule booking.'); }
      }
    });
  });

  // Stagger entrance animation for better UX
  document.querySelectorAll('.booking-card.card-enter').forEach((el, idx) => {
    el.style.animationDelay = `${idx * 60}ms`;
    // remove helper class after animation finished to avoid interfering with hover states
    el.addEventListener('animationend', () => el.classList.remove('card-enter'));
  });

  document.querySelectorAll('.upcoming-service-card').forEach((card) => {
    card.addEventListener('click', () => {
      const bookingId = card.dataset.bookingId;
      const booking = bookings.find((item) => item.id === bookingId);
      if (booking) showBookingInfo(booking);
    });
  });

  if (bookings.length > 0 && infoContainer) {
    showBookingInfo(bookings[0]);
  }
}

function showBookingInfo(booking) {
  const infoContainer = document.getElementById('booking-info');
  if (!infoContainer) return;

  infoContainer.innerHTML = `
    <div class="booking-detail">
      <h4>${booking.service_name || 'Service'}</h4>
      <div class="detail-row"><span>Booking ID:</span><strong>${booking.id || 'N/A'}</strong></div>
      <div class="detail-row"><span>Date & Time:</span><strong>${new Date(booking.start_date).toLocaleString()}</strong></div>
      <div class="detail-row"><span>Location:</span><strong>${booking.location || 'N/A'}</strong></div>
      <div class="detail-row"><span>Total Cost:</span><strong>€${parseFloat(booking.total || 0).toFixed(2)}</strong></div>
      <div class="detail-row"><span>Payment Method:</span><strong>${booking.payment_system || 'Card'}</strong></div>
      <div class="detail-row"><span>Status:</span><strong class="booking-status ${String(booking.status || 'confirmed').toLowerCase()}">${booking.status || 'Confirmed'}</strong></div>
      ${booking.transaction_id ? `<div class="detail-row"><span>Transaction ID:</span><strong>${booking.transaction_id}</strong></div>` : ''}
      <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--color-border);">
        ${booking.transaction_id ? `
          <p style="font-size:0.85rem; color:var(--color-text-secondary);">
            This booking has been paid. To cancel a paid booking, please <a href="contact.html">contact our admin</a>.
            You may still reschedule this booking using the "Reschedule" action on the card.
          </p>
        ` : `
          <p style="font-size:0.85rem; color:var(--color-text-secondary);">
            To cancel or modify this booking, you can use the controls on the card or <a href="contact.html">contact our admin</a>.
          </p>
        `}
      </div>
    </div>
  `;
}

function renderPurchases(purchases) {
  const container = document.getElementById('purchases-list');
  if (!container) return;

  if (purchases.length === 0) {
    container.innerHTML = '<p>No purchases found yet.</p>';
    return;
  }

  container.innerHTML = purchases.map((purchase) => `
    <div class="purchase-card">
      <div class="purchase-row"><strong>${purchase.name || 'Purchase'}</strong></div>
      <div class="purchase-row"><span>Quantity:</span> ${purchase.quantity || 1}</div>
      <div class="purchase-row"><span>Price:</span> €${parseFloat(purchase.price || 0).toFixed(2)}</div>
    </div>
  `).join('');
}

// Apply a realtime diff payload to the local bookings cache.
// Returns true if applied, false if not applicable (caller may fallback to full refetch).
function applyBookingDiff(payload, userEmail) {
  if (!payload) return false;
  // normalize event type and record payloads
  const eventType = payload.eventType || payload.type || payload.event || (payload?.commit_timestamp ? 'INSERT' : null);
  const newRec = payload.new || payload.record || payload.payload?.new || payload.payload?.record || null;
  const oldRec = payload.old || payload.old_record || payload.payload?.old || payload.payload?.old_record || null;

  // If no record found, cannot apply locally
  if (!newRec && !oldRec) return false;

  // Determine target id and email
  const targetEmail = (newRec && newRec.user_email) || (oldRec && oldRec.user_email) || null;
  if (!targetEmail || String(targetEmail).toLowerCase() !== String(userEmail).toLowerCase()) return false;

  // ensure cache exists
  window.__bookings_cache = window.__bookings_cache || [];

  const id = (newRec && newRec.id) || (oldRec && oldRec.id);
  if (eventType === 'INSERT' || (newRec && !oldRec)) {
    // prepend
    window.__bookings_cache.unshift(newRec);
    // update UI
    renderDashboardSummary(window.__bookings_cache, JSON.parse(localStorage.getItem('eau-de-play-cart')||'[]'));
    renderBookings(window.__bookings_cache);
    // highlight new item
    const el = document.querySelector(`.booking-card[data-booking-id="${id}"]`);
    if (el) el.classList.add('highlight-pulse');
    return true;
  }

  if (eventType === 'UPDATE' || (newRec && oldRec)) {
    const idx = window.__bookings_cache.findIndex(b => String(b.id) === String(id));
    if (idx !== -1) {
      window.__bookings_cache[idx] = newRec;
      renderDashboardSummary(window.__bookings_cache, JSON.parse(localStorage.getItem('eau-de-play-cart')||'[]'));
      renderBookings(window.__bookings_cache);
      const el = document.querySelector(`.booking-card[data-booking-id="${id}"]`);
      if (el) el.classList.add('highlight-pulse');
      return true;
    }
    // if not found, insert
    window.__bookings_cache.unshift(newRec);
    renderDashboardSummary(window.__bookings_cache, JSON.parse(localStorage.getItem('eau-de-play-cart')||'[]'));
    renderBookings(window.__bookings_cache);
    return true;
  }

  if (eventType === 'DELETE' || (!newRec && oldRec)) {
    const beforeLen = window.__bookings_cache.length;
    window.__bookings_cache = window.__bookings_cache.filter(b => String(b.id) !== String(id));
    if (window.__bookings_cache.length !== beforeLen) {
      renderDashboardSummary(window.__bookings_cache, JSON.parse(localStorage.getItem('eau-de-play-cart')||'[]'));
      renderBookings(window.__bookings_cache);
      return true;
    }
    return false;
  }

  return false;
}

async function init() {
  const storedUser = getStoredUser();
  const user = (await supabaseAuth.getCurrentUser()) || storedUser;
  // Always wire up the avatar controls and preview so the builder is usable
  // even when a visitor is not signed in (preview uses localStorage when available).
  const avatarCreateBtn = document.getElementById('avatar-create-btn');
  const savedOptions = getAvatarOptions();
  setFormAvatarOptions(savedOptions);

  // Attach live-preview listeners so users can see changes as they edit
  try { attachAvatarFormListeners(); } catch (e) { /* ignore */ }

  // create custom-styled select displays to guarantee consistent colors
  try { createCustomSelects(); } catch (e) { /* ignore */ }

  // ensure preview reflects current form values immediately (uses local cache/fallback)
  try { createAvatarPlaceholder(); } catch (e) { /* ignore */ }

  // If the user is not signed in, show helpful messaging and disable save button
  if (!user) {
    const profileEmail = document.getElementById('profile-email');
    if (profileEmail) profileEmail.textContent = 'Please sign in to view your account.';
    const listEl = document.getElementById('bookings-list');
    const purchasesEl = document.getElementById('purchases-list');
    const upcomingEl = document.getElementById('upcoming-services');
    if (listEl) listEl.innerHTML = '<p>Please sign in to view your bookings.</p>';
    if (purchasesEl) purchasesEl.innerHTML = '<p>Please sign in to view your purchases.</p>';
    if (upcomingEl) upcomingEl.innerHTML = '<p>Please sign in to view upcoming services.</p>';

    if (avatarCreateBtn) {
      avatarCreateBtn.disabled = true;
      avatarCreateBtn.textContent = 'Sign in to create avatar';
      avatarCreateBtn.title = 'You must be signed in to create and save an avatar';
      avatarCreateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'auth.html';
      });
    }

    // If there's a locally saved avatar, ensure it's rendered for preview
    const storedAvatar = getStoredAvatar();
    if (storedAvatar) renderAvatarPreview(storedAvatar);
    return;
  }

  // Signed-in path: show profile email and prefer server-stored avatar
  const profileEmail = document.getElementById('profile-email');
  if (profileEmail) profileEmail.textContent = user.email || user.id || 'Account user';

  const storedAvatar = getStoredAvatar();
  if (storedAvatar) {
    renderAvatarPreview(storedAvatar);
  } else if (user && user.id) {
    const profileAvatar = await loadProfileAvatar(user.id);
    if (profileAvatar) {
      saveAvatar(profileAvatar);
      renderAvatarPreview(profileAvatar);
    }
  }

  if (avatarCreateBtn) {
    avatarCreateBtn.addEventListener('click', async () => {
      if (!user || !user.id) return;
      avatarCreateBtn.disabled = true;
      try {
        await createAndSaveAvatarToSupabase(user.id);
      } catch (err) {
        console.error('Avatar creation failed', err);
      } finally {
        avatarCreateBtn.disabled = false;
      }
    });
  }

  // show skeleton loaders while we fetch
  const bookingsContainer = document.getElementById('bookings-list');
  const purchasesContainer = document.getElementById('purchases-list');
  const upcomingContainer = document.getElementById('upcoming-services');
  if (bookingsContainer) bookingsContainer.innerHTML = `
    <div class="skeleton-list">
      <div class="skeleton-card"><div class="skeleton-avatar"></div><div class="skeleton-body"><div class="skeleton-line large"></div><div class="skeleton-line mid"></div></div><div class="skeleton-badge"></div></div>
      <div class="skeleton-card"><div class="skeleton-avatar"></div><div class="skeleton-body"><div class="skeleton-line mid"></div><div class="skeleton-line mid"></div></div><div class="skeleton-badge"></div></div>
      <div class="skeleton-card"><div class="skeleton-avatar"></div><div class="skeleton-body"><div class="skeleton-line large"></div><div class="skeleton-line small"></div></div><div class="skeleton-badge"></div></div>
    </div>`;
  if (purchasesContainer) purchasesContainer.innerHTML = `<div class="skeleton-list"><div class="skeleton-card"><div class="skeleton-avatar"></div><div class="skeleton-body"><div class="skeleton-line mid"></div></div></div></div>`;
  if (upcomingContainer) upcomingContainer.innerHTML = `<div class="skeleton-list"><div class="skeleton-card"><div class="skeleton-avatar"></div><div class="skeleton-body"><div class="skeleton-line mid"></div></div></div></div>`;

  const bookings = await fetchBookings(user.email || user.id);
  // cache bookings for local diffs
  window.__bookings_cache = Array.isArray(bookings) ? bookings.slice() : [];
  console.debug('[account] fetched bookings count:', bookings.length, bookings);
  const cartHistory = (() => {
    try { return JSON.parse(localStorage.getItem('eau-de-play-cart') || '[]'); }
    catch { return []; }
  })();
  console.debug('[account] cart history items:', cartHistory.length, cartHistory);

  renderDashboardSummary(window.__bookings_cache, cartHistory);
  renderBookings(window.__bookings_cache);
  renderPurchases(cartHistory);

  // attach dashboard interactions after initial render
  attachDashboardInteractions();

  // Realtime: subscribe to bookings changes and refresh the list when updates occur
  if (typeof subscribeToTable === 'function') {
    try {
      const channel = subscribeToTable('bookings', (payload) => {
        console.debug('[realtime] bookings payload:', payload);
        // Attempt to apply diff locally to avoid full refetch
        try {
          const applied = applyBookingDiff(payload, user.email || user.id);
          if (!applied) {
            // fallback to full refetch if diff unsupported
            if (bookingsContainer) bookingsContainer.style.opacity = '0.6';
            fetchBookings(user.email || user.id).then((fresh) => {
              window.__bookings_cache = Array.isArray(fresh) ? fresh.slice() : [];
              renderDashboardSummary(window.__bookings_cache, cartHistory);
              renderBookings(window.__bookings_cache);
            }).catch((err) => console.error('Realtime full refresh error', err))
            .finally(() => { if (bookingsContainer) bookingsContainer.style.opacity = ''; });
          }
        } catch (err) {
          console.error('Realtime diff application error', err);
        }
      });

      // store channel for cleanup
      window.__bookings_realtime_channel = channel;
      window.addEventListener('beforeunload', () => {
        try { channel?.unsubscribe?.(); } catch (e) { /* ignore */ }
      });
    } catch (err) {
      console.warn('Realtime subscription setup failed:', err);
    }
  }

  const signoutBtn = document.getElementById('signout-btn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', async () => {
      await supabaseAuth.signOut();
      window.location.href = 'index.html';
    });
  }
}

async function cancelBooking(id) {
  try {
    // fetch current booking to verify payment status
    const { data: current, error: fetchErr } = await supabase.from('bookings').select('id,status,transaction_id').eq('id', id).single();
    if (fetchErr) throw fetchErr;
    if (current?.transaction_id || String(current?.status || '').toLowerCase() === 'paid') {
      alert('This booking has already been paid. To cancel a paid booking, please contact admin via the contact page.');
      window.location.href = 'contact.html';
      return null;
    }

    const { data, error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id).select();
    if (error) throw error;
    // apply to local cache
    const idx = (window.__bookings_cache||[]).findIndex(b => String(b.id) === String(id));
    if (idx !== -1) { window.__bookings_cache[idx].status = 'cancelled'; renderBookings(window.__bookings_cache); renderDashboardSummary(window.__bookings_cache, JSON.parse(localStorage.getItem('eau-de-play-cart')||'[]')); }
    return data;
  } catch (err) { throw err; }
}

async function rescheduleBooking(id, isoDate) {
  try {
    const { data, error } = await supabase.from('bookings').update({ start_date: isoDate }).eq('id', id).select();
    if (error) throw error;
    const idx = (window.__bookings_cache||[]).findIndex(b => String(b.id) === String(id));
    if (idx !== -1) { window.__bookings_cache[idx].start_date = isoDate; renderBookings(window.__bookings_cache); renderDashboardSummary(window.__bookings_cache, JSON.parse(localStorage.getItem('eau-de-play-cart')||'[]')); }
    return data;
  } catch (err) { throw err; }
}

// Dashboard expand/collapse measured height helper
function attachDashboardInteractions() {
  document.querySelectorAll('.summary-card-large').forEach((card) => {
    card.addEventListener('click', (e) => {
      const expanded = card.classList.contains('expanded');
      const list = card.querySelector('.expanded-list');
      if (!list) {
        // create and populate
        const recent = (window.__bookings_cache || []).slice(0,5);
        const div = document.createElement('div');
        div.className = 'expanded-list';
        div.innerHTML = recent.map(b => `<div class="expanded-item">${new Date(b.start_date).toLocaleDateString()} - ${b.service_name || 'Service'} • €${parseFloat(b.total||0).toFixed(2)}</div>`).join('');
        card.appendChild(div);
      }
      const el = card.querySelector('.expanded-list');
      if (!el) return;
      if (!expanded) {
        // expand measured height
        el.style.display = 'block';
        const full = el.scrollHeight + 'px';
        el.style.height = '0px';
        requestAnimationFrame(() => { el.style.transition = 'height 360ms ease, opacity 240ms ease'; el.style.height = full; el.style.opacity = '1'; card.classList.add('expanded'); });
        el.addEventListener('transitionend', function cb() { el.style.height = ''; el.style.transition = ''; el.removeEventListener('transitionend', cb); });
      } else {
        // collapse
        const cur = el.scrollHeight + 'px';
        el.style.height = cur;
        requestAnimationFrame(() => { el.style.transition = 'height 320ms ease, opacity 200ms ease'; el.style.height = '0px'; el.style.opacity = '0'; });
        el.addEventListener('transitionend', function cb2() { el.style.display = 'none'; el.style.height = ''; el.style.transition = ''; card.classList.remove('expanded'); el.removeEventListener('transitionend', cb2); });
      }
    });
  });
}


init();
