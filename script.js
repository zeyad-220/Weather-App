// Weather data: Open-Meteo (https://open-meteo.com, CC BY 4.0, no API key needed).
// No other service is called: your coordinates go only to Open-Meteo.
const locationElement = document.getElementById('location');
const temperatureElement = document.getElementById('temperature');
const descriptionElement = document.getElementById('description');
const weatherIconElement = document.getElementById('weather-icon');
const windSpeedElement = document.getElementById('wind-speed');
const humidityElement = document.getElementById('humidity');
const pressureElement = document.getElementById('pressure');
const forecastContainer = document.getElementById('forecast-container');

// Local SVG icons (same look everywhere, no emoji fonts)
const SUN = '<g stroke="#ffc233" stroke-width="3" stroke-linecap="round"><path d="M32 6v7M32 51v7M6 32h7M51 32h7M13.6 13.6l5 5M45.4 45.4l5 5M13.6 50.4l5-5M45.4 18.6l5-5"/></g><circle cx="32" cy="32" r="12" fill="#ffc233"/>';
const MOON = '<path d="M40 10a22 22 0 1 0 14 38A18 18 0 0 1 40 10z" fill="#e8edf5"/>';
const CLOUD = '<path d="M18 46a10 10 0 0 1-1-20 14 14 0 0 1 27-3 11 11 0 0 1 2 23z" fill="#cfd9e6"/>';
const CLOUD_DARK = '<path d="M18 40a10 10 0 0 1-1-20 14 14 0 0 1 27-3 11 11 0 0 1 2 23z" fill="#9fb0c4"/>';
const RAIN = '<g stroke="#4aa8ff" stroke-width="3.5" stroke-linecap="round"><path d="M22 48l-3 8M33 48l-3 8M44 48l-3 8"/></g>';
const SNOW = '<g fill="#ffffff"><circle cx="22" cy="52" r="3"/><circle cx="33" cy="55" r="3"/><circle cx="44" cy="52" r="3"/></g>';
const BOLT = '<path d="M35 40l-8 12h7l-3 9 12-14h-8l4-7z" fill="#ffc233"/>';
const FOG = '<g stroke="#b8c7d9" stroke-width="4" stroke-linecap="round"><path d="M12 24h40M8 34h40M14 44h40"/></g>';

function svg(inner) {
  return '<svg viewBox="0 0 64 64" width="100%" height="100%" role="img" aria-hidden="true">' + inner + '</svg>';
}

const PARTLY_DAY = '<g transform="translate(-6 -8) scale(.8)">' + SUN + '</g><g transform="translate(6 4)">' + CLOUD + '</g>';
const PARTLY_NIGHT = '<g transform="translate(-6 -8) scale(.8)">' + MOON + '</g><g transform="translate(6 4)">' + CLOUD + '</g>';

// WMO weather code -> [description, kind]
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

function iconFor(kind, isDay) {
  switch (kind) {
    case 'clear': return svg(isDay === 0 ? MOON : SUN);
    case 'partly': return svg(isDay === 0 ? PARTLY_NIGHT : PARTLY_DAY);
    case 'cloud': return svg(CLOUD);
    case 'fog': return svg(FOG);
    case 'rain': return svg('<g transform="translate(0 -8)">' + CLOUD_DARK + '</g><g transform="translate(0 -5)">' + RAIN + '</g>');
    case 'snow': return svg('<g transform="translate(0 -8)">' + CLOUD + '</g>' + SNOW);
    case 'storm': return svg('<g transform="translate(0 -10)">' + CLOUD_DARK + '</g>' + BOLT);
    default: return svg(CLOUD);
  }
}

function info(code, isDay) {
  const e = WMO[code] || ['Unknown', 'cloud'];
  return { text: e[0], icon: iconFor(e[1], isDay) };
}

function showError(message) {
  locationElement.textContent = message;
  temperatureElement.textContent = '';
  descriptionElement.textContent = '';
  weatherIconElement.innerHTML = '';
  windSpeedElement.textContent = '';
  humidityElement.textContent = '';
  pressureElement.textContent = '';
  forecastContainer.innerHTML = '';
}

function fetchWeather(lat, lon) {
  const url = 'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code,is_day' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
    '&wind_speed_unit=ms&timezone=auto&forecast_days=5';

  Promise.all([
    fetch(url).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  ])
    .then(([data]) => {
      updateCurrentWeather(data.current, 'Your location');
      updateForecast(data.daily);
    })
    .catch(error => {
      console.error('Error fetching weather data:', error);
      showError('Unable to fetch weather data');
    });
}

function updateCurrentWeather(c, place) {
  const w = info(c.weather_code, c.is_day);
  locationElement.textContent = place;
  temperatureElement.textContent = `${Math.round(c.temperature_2m * 10) / 10} °C`;
  descriptionElement.textContent = w.text;
  weatherIconElement.innerHTML = w.icon;
  windSpeedElement.textContent = `${c.wind_speed_10m} m/s`;
  humidityElement.textContent = `${c.relative_humidity_2m}%`;
  pressureElement.textContent = `${Math.round(c.surface_pressure)} hPa`;
}

function updateForecast(d) {
  forecastContainer.innerHTML = '';
  d.time.forEach((dateStr, i) => {
    const day = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
    const w = info(d.weather_code[i], 1);

    const item = document.createElement('div');
    item.className = 'forecast-item';

    const date = document.createElement('div');
    date.className = 'forecast-date';
    date.textContent = day;

    const icon = document.createElement('div');
    icon.className = 'forecast-icon';
    icon.innerHTML = w.icon;

    const temp = document.createElement('div');
    temp.className = 'forecast-temp';
    temp.textContent = `${Math.round(d.temperature_2m_max[i])}° / ${Math.round(d.temperature_2m_min[i])}°C`;

    const desc = document.createElement('div');
    desc.className = 'forecast-description';
    desc.textContent = w.text;

    item.append(date, icon, temp, desc);
    forecastContainer.appendChild(item);
  });
}

function getLocation() {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by this browser');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    position => fetchWeather(position.coords.latitude, position.coords.longitude),
    error => {
      console.error('Error getting location:', error);
      showError('Unable to get your location');
    }
  );
}

getLocation();
