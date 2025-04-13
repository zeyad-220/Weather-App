const apiKey = '87360c49ff1ac59e484827c614dce126'; 
    const locationElement = document.getElementById('location');
    const temperatureElement = document.getElementById('temperature');
    const descriptionElement = document.getElementById('description');
    const weatherIconElement = document.getElementById('weather-icon');
    const windSpeedElement = document.getElementById('wind-speed');
    const humidityElement = document.getElementById('humidity');
    const pressureElement = document.getElementById('pressure');
    const forecastContainer = document.getElementById('forecast-container');

    function fetchWeather(lat, lon) {
      const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;

      Promise.all([
        fetch(currentWeatherUrl).then(response => response.json()),
        fetch(forecastUrl).then(response => response.json())
      ])
      .then(([currentData, forecastData]) => {
        updateCurrentWeather(currentData);
        updateForecast(forecastData);
      })
      .catch(error => {
        console.error('Error fetching weather data:', error);
        locationElement.textContent = 'Unable to fetch weather data';
        temperatureElement.textContent = '';
        descriptionElement.textContent = '';
        weatherIconElement.innerHTML = '';
        windSpeedElement.textContent = '';
        humidityElement.textContent = '';
        pressureElement.textContent = '';
        forecastContainer.innerHTML = '';
      });
    }

    function updateCurrentWeather(data) {
      const city = data.name;
      const temperature = data.main.temp;
      const description = data.weather[0].description;
      const icon = data.weather[0].icon;
      const windSpeed = data.wind.speed;
      const humidity = data.main.humidity;
      const pressure = data.main.pressure;

      locationElement.textContent = city;
      temperatureElement.textContent = `${temperature} °C`;
      descriptionElement.textContent = description.charAt(0).toUpperCase() + description.slice(1);
      weatherIconElement.innerHTML = `<img src="http://openweathermap.org/img/wn/${icon}@2x.png" alt="Weather Icon">`;
      windSpeedElement.textContent = `${windSpeed} m/s`;
      humidityElement.textContent = `${humidity}%`;
      pressureElement.textContent = `${pressure} hPa`;
    }

    function updateForecast(data) {
      const forecastList = data.list;
      const uniqueDays = new Set();

      forecastContainer.innerHTML = '';

      forecastList.forEach(item => {
        const date = new Date(item.dt_txt);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });

        if (!uniqueDays.has(day)) {
          uniqueDays.add(day);

          const forecastItem = document.createElement('div');
          forecastItem.className = 'forecast-item';

          const forecastDate = document.createElement('div');
          forecastDate.className = 'forecast-date';
          forecastDate.textContent = day;

          const forecastIcon = document.createElement('div');
          forecastIcon.className = 'forecast-icon';
          forecastIcon.innerHTML = `<img src="http://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="Weather Icon">`;

          const forecastTemp = document.createElement('div');
          forecastTemp.className = 'forecast-temp';
          forecastTemp.textContent = `${item.main.temp} °C`;

          const forecastDescription = document.createElement('div');
          forecastDescription.className = 'forecast-description';
          forecastDescription.textContent = item.weather[0].description.charAt(0).toUpperCase() + item.weather[0].description.slice(1);

          forecastItem.appendChild(forecastDate);
          forecastItem.appendChild(forecastIcon);
          forecastItem.appendChild(forecastTemp);
          forecastItem.appendChild(forecastDescription);

          forecastContainer.appendChild(forecastItem);
        }
      });
    }

    function getLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          fetchWeather(lat, lon);
        }, error => {
          console.error('Error getting location:', error);
          locationElement.textContent = 'Unable to get your location';
          temperatureElement.textContent = '';
          descriptionElement.textContent = '';
          weatherIconElement.innerHTML = '';
          windSpeedElement.textContent = '';
          humidityElement.textContent = '';
          pressureElement.textContent = '';
          forecastContainer.innerHTML = '';
        });
      } else {
        console.error('Geolocation is not supported by this browser.');
        locationElement.textContent = 'Geolocation is not supported by this browser';
        temperatureElement.textContent = '';
        descriptionElement.textContent = '';
        weatherIconElement.innerHTML = '';
        windSpeedElement.textContent = '';
        humidityElement.textContent = '';
        pressureElement.textContent = '';
        forecastContainer.innerHTML = '';
      }
    }

    getLocation();