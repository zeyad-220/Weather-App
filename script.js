// Weather data: Open-Meteo (https://open-meteo.com, CC BY 4.0, no API key needed).
// City search + weather: Open-Meteo. Street/area name for "my location": OpenStreetMap Nominatim (reverse geocoding).
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const state = { unit: store.get('wx-unit', 'metric'), place: null, hits: [], data: null, errKey: '', lang: store.get('wx-lang', (navigator.language || '').startsWith('ar') ? 'ar' : 'en') };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Language (English / Arabic) ----------
const STR = {
  en: { title: 'Weather App', brand: 'Weather', search: 'Search for a city', locate: 'Use my location', units: 'Switch units', langsw: 'Switch language',
    loading: 'Loading…', h24: 'Next 24 hours', d7: '7-day forecast', feels: 'Feels like', wind: 'Wind', hum: 'Humidity', press: 'Pressure', uv: 'UV index',
    rain: 'Chance of rain', sunrise: 'Sunrise', sunset: 'Sunset', copy: 'Weather App © 2025 Zeyad Gaber | All Rights Reserved', credit: 'Weather data by',
    now: 'Now', today: 'Today', high: 'High', low: 'Low', kmh: 'km/h', mph: 'mph', am: 'AM', pm: 'PM', uvl: ['Low', 'Moderate', 'High', 'Very high', 'Extreme'],
    none: 'No cities found. Try another spelling.', finding: 'Finding your area…', cur: 'Current position', yourloc: 'Your location', cairo: ['Cairo', 'Egypt'],
    eNet: 'Could not load the weather. Check your connection and try again.', eGeo: 'This browser can’t share your location. Search for a city instead.',
    eDeny: 'Location is blocked. Search for a city, or allow location access in your browser.' },
  ar: { title: 'تطبيق الطقس', brand: 'الطقس', search: 'ابحث عن مدينة', locate: 'استخدم موقعي', units: 'تغيير الوحدات', langsw: 'تغيير اللغة',
    loading: 'جارٍ التحميل…', h24: 'الـ 24 ساعة القادمة', d7: 'توقعات 7 أيام', feels: 'الإحساس الفعلي', wind: 'الرياح', hum: 'الرطوبة', press: 'الضغط', uv: 'الأشعة فوق البنفسجية',
    rain: 'احتمال المطر', sunrise: 'الشروق', sunset: 'الغروب', copy: 'تطبيق الطقس © 2025 زياد جابر | جميع الحقوق محفوظة', credit: 'بيانات الطقس من',
    now: 'الآن', today: 'اليوم', high: 'العظمى', low: 'الصغرى', kmh: 'كم/س', mph: 'ميل/س', am: 'ص', pm: 'م', uvl: ['منخفض', 'متوسط', 'مرتفع', 'مرتفع جداً', 'شديد'],
    none: 'لا توجد نتائج. جرّب كتابة أخرى.', finding: 'جارٍ تحديد منطقتك…', cur: 'موقعك الحالي', yourloc: 'موقعك', cairo: ['القاهرة', 'مصر'],
    eNet: 'تعذّر تحميل الطقس. تأكد من الاتصال بالإنترنت وحاول مرة أخرى.', eGeo: 'المتصفح لا يدعم تحديد الموقع. ابحث عن مدينة بدلاً من ذلك.',
    eDeny: 'تم حظر الموقع. ابحث عن مدينة أو اسمح للمتصفح بالوصول إلى موقعك.' }
};
const AR = { 0: 'صافٍ', 1: 'صافٍ في الغالب', 2: 'غائم جزئياً', 3: 'غائم كلياً', 45: 'ضباب', 48: 'ضباب جليدي', 51: 'رذاذ خفيف', 53: 'رذاذ', 55: 'رذاذ كثيف',
  56: 'رذاذ متجمد', 57: 'رذاذ متجمد كثيف', 61: 'مطر خفيف', 63: 'مطر', 65: 'مطر غزير', 66: 'مطر متجمد', 67: 'مطر متجمد غزير', 71: 'ثلوج خفيفة', 73: 'ثلوج',
  75: 'ثلوج كثيفة', 77: 'حبيبات ثلج', 80: 'زخات خفيفة', 81: 'زخات مطر', 82: 'زخات عنيفة', 85: 'زخات ثلجية', 86: 'زخات ثلجية كثيفة',
  95: 'عاصفة رعدية', 96: 'عاصفة رعدية مع برد', 99: 'عاصفة رعدية مع برد كثيف' };
const tr = k => STR[state.lang][k];
const LOC = () => state.lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US';

// ---------- Animated SVG icons ----------
const SUN = '<g class="rays" stroke="#ffc233" stroke-width="3" stroke-linecap="round"><path d="M32 6v7M32 51v7M6 32h7M51 32h7M13.6 13.6l5 5M45.4 45.4l5 5M13.6 50.4l5-5M45.4 18.6l5-5"/></g><circle cx="32" cy="32" r="12" fill="#ffc233"/>';
const MOON = '<path d="M40 10a22 22 0 1 0 14 38A18 18 0 0 1 40 10z" fill="#e8edf5"/>';
const CLOUD = '<path class="drift" d="M18 46a10 10 0 0 1-1-20 14 14 0 0 1 27-3 11 11 0 0 1 2 23z" fill="#e4ecf5"/>';
const CLOUD_DARK = '<path class="drift" d="M18 40a10 10 0 0 1-1-20 14 14 0 0 1 27-3 11 11 0 0 1 2 23z" fill="#9fb0c4"/>';
const RAIN = '<g stroke="#4aa8ff" stroke-width="3.5" stroke-linecap="round"><path class="drop" d="M22 48l-3 8"/><path class="drop" d="M33 48l-3 8"/><path class="drop" d="M44 48l-3 8"/></g>';
const SNOW = '<g fill="#fff"><circle class="flake" cx="22" cy="52" r="3"/><circle class="flake" style="animation-delay:.7s" cx="33" cy="55" r="3"/><circle class="flake" style="animation-delay:1.4s" cx="44" cy="52" r="3"/></g>';
const BOLT = '<path class="bolt" d="M35 40l-8 12h7l-3 9 12-14h-8l4-7z" fill="#ffc233"/>';
const FOG = '<g stroke="#d3deea" stroke-width="4" stroke-linecap="round"><path class="drift" d="M12 24h40M8 34h40M14 44h40"/></g>';
const svg = inner => '<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">' + inner + '</svg>';
const PARTLY = body => '<g transform="translate(-6 -8) scale(.8)">' + body + '</g><g transform="translate(6 4)">' + CLOUD + '</g>';

const WMO = {
  0: ['Clear sky', 'clear'], 1: ['Mainly clear', 'partly'], 2: ['Partly cloudy', 'partly'], 3: ['Overcast', 'cloud'],
  45: ['Fog', 'fog'], 48: ['Rime fog', 'fog'],
  51: ['Light drizzle', 'rain'], 53: ['Drizzle', 'rain'], 55: ['Heavy drizzle', 'rain'],
  56: ['Freezing drizzle', 'rain'], 57: ['Heavy freezing drizzle', 'rain'],
  61: ['Light rain', 'rain'], 63: ['Rain', 'rain'], 65: ['Heavy rain', 'rain'],
  66: ['Freezing rain', 'rain'], 67: ['Heavy freezing rain', 'rain'],
  71: ['Light snow', 'snow'], 73: ['Snow', 'snow'], 75: ['Heavy snow', 'snow'], 77: ['Snow grains', 'snow'],
  80: ['Light showers', 'rain'], 81: ['Showers', 'rain'], 82: ['Violent showers', 'rain'],
  85: ['Snow showers', 'snow'], 86: ['Heavy snow showers', 'snow'],
  95: ['Thunderstorm', 'storm'], 96: ['Thunderstorm with hail', 'storm'], 99: ['Thunderstorm with heavy hail', 'storm']
};

function iconFor(kind, day) {
  switch (kind) {
    case 'clear': return svg(day ? SUN : MOON);
    case 'partly': return svg(PARTLY(day ? SUN : MOON));
    case 'fog': return svg(FOG);
    case 'rain': return svg('<g transform="translate(0 -8)">' + CLOUD_DARK + '</g><g transform="translate(0 -5)">' + RAIN + '</g>');
    case 'snow': return svg('<g transform="translate(0 -8)">' + CLOUD + '</g>' + SNOW);
    case 'storm': return svg('<g transform="translate(0 -10)">' + CLOUD_DARK + '</g>' + BOLT);
    default: return svg(CLOUD);
  }
}
function info(code, day) {
  const [en, kind] = WMO[code] || ['Unknown', 'cloud'];
  const text = state.lang === 'ar' ? (AR[code] || en) : en;
  return { text, kind, icon: iconFor(kind, day) };
}

// ---------- Background particles (rain, snow, stars) ----------
const cv = $('fx'), cx = cv.getContext('2d');
let W = 0, H = 0, parts = [], fxMode = 'none';
function resize() { W = cv.width = innerWidth; H = cv.height = innerHeight; }
function setFx(mode) {
  fxMode = reduce ? 'none' : mode;
  const n = { rain: 170, snow: 100, stars: 90 }[fxMode] || 0;
  parts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, v: Math.random() * .6 + .5, r: Math.random() * 1.8 + .5 }));
}
function frame(t) {
  cx.clearRect(0, 0, W, H);
  for (const p of parts) {
    if (fxMode === 'rain') {
      cx.strokeStyle = 'rgba(190,220,255,.45)'; cx.lineWidth = 1;
      cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(p.x - 2, p.y + 14 * p.v); cx.stroke();
      p.y += 15 * p.v; p.x -= 1.2; if (p.y > H) { p.y = -20; p.x = Math.random() * W; }
    } else if (fxMode === 'snow') {
      cx.fillStyle = 'rgba(255,255,255,.85)'; cx.beginPath(); cx.arc(p.x, p.y, p.r * 1.4, 0, 6.3); cx.fill();
      p.y += p.v * 1.3; p.x += Math.sin(p.y / 35) * .5; if (p.y > H) { p.y = -10; p.x = Math.random() * W; }
    } else if (fxMode === 'stars') {
      cx.fillStyle = `rgba(255,255,255,${.35 + .65 * Math.abs(Math.sin(t / 900 + p.x))})`;
      cx.beginPath(); cx.arc(p.x, p.y * .8, p.r * .8, 0, 6.3); cx.fill();
    }
  }
  requestAnimationFrame(frame);
}
addEventListener('resize', () => { resize(); setFx(fxMode); });
resize(); requestAnimationFrame(frame);

// ---------- Helpers ----------
const hour12 = h => (h % 12 || 12) + ' ' + tr(h < 12 ? 'am' : 'pm');
const clock = s => { const h = +s.slice(11, 13); return `${h % 12 || 12}:${s.slice(14, 16)} ${tr(h < 12 ? 'am' : 'pm')}`; };
const T = n => Math.round(n) + '°';
function countUp(el, to) {
  if (reduce) { el.textContent = to; return; }
  const from = 0, t0 = performance.now();
  (function step(t) {
    const k = Math.min((t - t0) / 900, 1), e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}
function uvLabel(u) { return tr('uvl')[u < 3 ? 0 : u < 6 ? 1 : u < 8 ? 2 : u < 11 ? 3 : 4]; }
function showError(key) { state.errKey = key; const e = $('err'); e.textContent = key ? tr(key) : ''; e.hidden = !key; }

// ---------- Fetch + render ----------
async function load(p, save = true) {
  state.place = p;
  document.body.classList.add('loading');
  const metric = state.unit === 'metric';
  const url = 'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${p.lat}&longitude=${p.lon}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_direction_10m,weather_code,is_day' +
    '&hourly=temperature_2m,weather_code,precipitation_probability,is_day' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max' +
    `&temperature_unit=${metric ? 'celsius' : 'fahrenheit'}&wind_speed_unit=${metric ? 'kmh' : 'mph'}` +
    '&cell_selection=nearest&timezone=auto&forecast_days=7&forecast_hours=24';
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    state.data = await r.json();
    render(state.data, p);
    showError('');
    if (save) remember(p);
  } catch (err) {
    console.error('Error fetching weather data:', err);
    showError('eNet');
  } finally {
    document.body.classList.remove('loading');
  }
}

function render(d, p, quiet) {
  const c = d.current, dl = d.daily, metric = state.unit === 'metric';
  const w = info(c.weather_code, c.is_day);
  document.body.dataset.sky = (w.kind === 'clear' || w.kind === 'partly') ? (c.is_day ? 'day' : 'night') : w.kind;
  setFx(w.kind === 'rain' || w.kind === 'storm' ? 'rain' : w.kind === 'snow' ? 'snow' : (!c.is_day && (w.kind === 'clear' || w.kind === 'partly')) ? 'stars' : 'none');

  $('location').textContent = p.name;
  $('sub').textContent = p.sub || '';
  $('time').textContent = new Date().toLocaleString(LOC(), { timeZone: d.timezone, weekday: 'long', hour: 'numeric', minute: '2-digit' });
  if (quiet) $('temperature').textContent = Math.round(c.temperature_2m); else countUp($('temperature'), Math.round(c.temperature_2m));
  $('deg').textContent = metric ? '°C' : '°F';
  $('description').textContent = w.text;
  $('hilo').textContent = `${tr('high')} ${T(dl.temperature_2m_max[0])} • ${tr('low')} ${T(dl.temperature_2m_min[0])}`;
  $('weather-icon').innerHTML = w.icon;
  $('weather-icon').setAttribute('aria-label', w.text);

  $('feels').textContent = T(c.apparent_temperature);
  $('wind-speed').textContent = `${Math.round(c.wind_speed_10m)} ${tr(metric ? 'kmh' : 'mph')}`;
  $('arrow').style.transform = `rotate(${c.wind_direction_10m + 180}deg)`;
  $('humidity').textContent = c.relative_humidity_2m + '%';
  $('pressure').textContent = Math.round(c.pressure_msl) + ' hPa';
  $('uv').textContent = Math.round(dl.uv_index_max[0]);
  $('uvl').textContent = uvLabel(dl.uv_index_max[0]);
  $('rain').textContent = (dl.precipitation_probability_max[0] ?? 0) + '%';
  $('sunrise').textContent = clock(dl.sunrise[0]);
  $('sunset').textContent = clock(dl.sunset[0]);
  requestAnimationFrame(() => {
    $('humbar').style.width = c.relative_humidity_2m + '%';
    $('rainbar').style.width = (dl.precipitation_probability_max[0] ?? 0) + '%';
  });

  const h = d.hourly;
  $('hourly').innerHTML = h.time.map((t, i) => {
    const x = info(h.weather_code[i], h.is_day[i]);
    return `<div class="hr pop" style="--i:${i}"><span>${i ? hour12(+t.slice(11, 13)) : tr('now')}</span><div class="ico">${x.icon}</div><b>${T(h.temperature_2m[i])}</b><small>${h.precipitation_probability[i] > 10 ? h.precipitation_probability[i] + '%' : ''}</small></div>`;
  }).join('');

  const lo = Math.min(...dl.temperature_2m_min), hi = Math.max(...dl.temperature_2m_max), span = (hi - lo) || 1;
  $('forecast-container').innerHTML = dl.time.map((s, i) => {
    const x = info(dl.weather_code[i], 1);
    const name = i ? new Date(s + 'T12:00:00').toLocaleDateString(LOC(), { weekday: 'short' }) : tr('today');
    const l = (dl.temperature_2m_min[i] - lo) / span * 100, wd = (dl.temperature_2m_max[i] - dl.temperature_2m_min[i]) / span * 100;
    return `<div class="day pop" style="--i:${i}"><span class="d">${name}</span><div class="ico">${x.icon}</div><span class="t">${esc(x.text)}</span><span class="lo">${T(dl.temperature_2m_min[i])}</span><div class="track"><i style="inset-inline-start:${l}%;width:${Math.max(wd, 6)}%"></i></div><span class="hi">${T(dl.temperature_2m_max[i])}</span></div>`;
  }).join('');
}

// ---------- Recent cities ----------
function remember(p) {
  if (p.gps) return;
  const list = [p, ...store.get('wx-recent', []).filter(x => x.lat !== p.lat || x.lon !== p.lon)].slice(0, 5);
  store.set('wx-recent', list); drawChips();
}
function drawChips() {
  const list = store.get('wx-recent', []);
  $('recent').innerHTML = list.map((p, i) => `<button class="chip pop" style="--i:${i}" data-i="${i}">${esc(p.name)}</button>`).join('');
}
$('recent').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (b) load(store.get('wx-recent', [])[+b.dataset.i]);
});

// ---------- Search ----------
const q = $('q'), results = $('results');
let timer;
q.addEventListener('input', () => {
  clearTimeout(timer);
  const v = q.value.trim();
  if (v.length < 2) { results.hidden = true; return; }
  timer = setTimeout(() => search(v), 300);
});
async function search(v) {
  try {
    const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=6&language=' + state.lang + '&name=' + encodeURIComponent(v));
    const j = await r.json();
    state.hits = (j.results || []).map(x => ({ name: x.name, sub: [x.admin1, x.country].filter(Boolean).join(', '), lat: x.latitude, lon: x.longitude }));
    results.innerHTML = state.hits.length
      ? state.hits.map((h, i) => `<li><button data-i="${i}">${esc(h.name)}<small>${esc(h.sub)}</small></button></li>`).join('')
      : '<li><button disabled>' + tr('none') + '</button></li>';
    results.hidden = false;
  } catch { results.hidden = true; }
}
function pick(i) {
  const p = state.hits[i]; if (!p) return;
  results.hidden = true; q.value = ''; q.blur(); load(p);
}
results.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) pick(+b.dataset.i); });
q.addEventListener('keydown', async e => { if (e.key === 'Enter') { clearTimeout(timer); if (q.value.trim().length > 1) { await search(q.value.trim()); pick(0); } } if (e.key === 'Escape') results.hidden = true; });
document.addEventListener('click', e => { if (!e.target.closest('.search')) results.hidden = true; });

// ---------- Location + units ----------
function fallback() {
  return load(store.get('wx-recent', [])[0] || { name: tr('cairo')[0], sub: tr('cairo')[1], lat: 30.0444, lon: 31.2357 });
}
async function placeName(lat, lon) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&accept-language=${state.lang}&lat=${lat}&lon=${lon}`);
    const a = (await r.json()).address || {};
    const area = a.city_district || a.suburb || a.neighbourhood || a.quarter || a.village || a.hamlet;
    const city = a.city || a.town || a.state_district || a.county || a.state;
    const name = area || city;
    if (!name) return null;
    const sub = [...new Set([city, a.country].filter(x => x && x !== name))].join(', ');
    return { name, sub };
  } catch { return null; }
}
async function nameIt(p) {
  const n = await placeName(p.lat, p.lon);
  if (!n) { p.sub = tr('cur'); } else { Object.assign(p, n); }
  if (state.place === p) { $('location').textContent = p.name; $('sub').textContent = p.sub; }
}
function locate() {
  if (!navigator.geolocation) return fallback().then(() => showError('eGeo'));
  navigator.geolocation.getCurrentPosition(
    pos => {
      const p = { name: tr('yourloc'), sub: tr('finding'), lat: pos.coords.latitude, lon: pos.coords.longitude, gps: true };
      load(p, false); nameIt(p);
    },
    err => { console.error('Error getting location:', err); fallback().then(() => showError('eDeny')); },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}
$('locate').addEventListener('click', locate);
$('unit').addEventListener('click', () => {
  state.unit = state.unit === 'metric' ? 'imperial' : 'metric';
  store.set('wx-unit', state.unit); $('unit').textContent = state.unit === 'metric' ? '°C' : '°F';
  if (state.place) load(state.place, false);
});

async function relocalize(p) {
  if (p.gps) return nameIt(p);
  try {
    const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=5&language=' + state.lang + '&name=' + encodeURIComponent(p.name));
    const h = ((await r.json()).results || []).find(x => Math.abs(x.latitude - p.lat) < .1 && Math.abs(x.longitude - p.lon) < .1);
    if (h) Object.assign(p, { name: h.name, sub: [h.admin1, h.country].filter(Boolean).join(', ') });
  } catch {}
}
function applyStatic() {
  const ar = state.lang === 'ar';
  document.documentElement.lang = state.lang; document.documentElement.dir = ar ? 'rtl' : 'ltr';
  document.title = tr('title');
  document.querySelectorAll('[data-t]').forEach(e => { e.textContent = tr(e.dataset.t); });
  document.querySelectorAll('[data-ph]').forEach(e => { e.placeholder = tr(e.dataset.ph); });
  document.querySelectorAll('[data-al]').forEach(e => { e.setAttribute('aria-label', tr(e.dataset.al)); e.title = tr(e.dataset.al); });
  $('lang').textContent = ar ? 'EN' : 'عربي';
  if (!state.data) $('location').textContent = tr('loading');
  if (state.errKey) showError(state.errKey);
}
$('lang').addEventListener('click', async () => {
  state.lang = state.lang === 'ar' ? 'en' : 'ar'; store.set('wx-lang', state.lang);
  applyStatic(); results.hidden = true;
  if (state.data) render(state.data, state.place, true);
  const list = store.get('wx-recent', []);
  await Promise.all([state.place && relocalize(state.place), ...list.map(relocalize)]);
  store.set('wx-recent', list); drawChips();
  if (state.place) { $('location').textContent = state.place.name; $('sub').textContent = state.place.sub || ''; }
});

$('unit').textContent = state.unit === 'metric' ? '°C' : '°F';
applyStatic();
drawChips();
locate();
setInterval(() => { if (state.place && !document.hidden) load(state.place, false); }, 600000);
