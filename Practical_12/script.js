/**
 * ==============================================================================
 * PRACTICAL 12: REAL-TIME WEATHER DASHBOARD
 * AIM: Build an interactive real-time web app using JavaScript and jQuery
 *      with DOM, events, storage, and AJAX integration.
 * ==============================================================================
 * Authors / Students: JavaScript Lab Practical 12
 * Technologies: ES6 JavaScript, jQuery 3.7.1, AJAX ($.ajax), HTML5 LocalStorage
 * ==============================================================================
 */

// Execute only when the DOM is fully loaded and ready
$(document).ready(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     1. APPLICATION CONFIGURATION & STATE
     -------------------------------------------------------------------------- */
  const STORAGE_KEYS = {
    LAST_CITY: 'weather_dashboard_last_city',
    SEARCH_HISTORY: 'weather_dashboard_search_history',
    TEMP_UNIT: 'weather_dashboard_temp_unit',
    API_PROVIDER: 'weather_dashboard_api_provider',
    OWM_API_KEY: 'weather_dashboard_owm_api_key'
  };

  // Default configuration
  const CONFIG = {
    DEFAULT_CITY: 'Mumbai',
    MAX_HISTORY_ITEMS: 8,
    DEFAULT_UNIT: 'C', // 'C' for Celsius, 'F' for Fahrenheit
    DEFAULT_PROVIDER: 'open-meteo', // 'open-meteo' or 'openweathermap'
    FALLBACK_OWM_KEY: '' // Can be configured by user or entered in UI modal
  };

  // Runtime application state
  const state = {
    currentCity: '',
    currentCountry: '',
    unit: localStorage.getItem(STORAGE_KEYS.TEMP_UNIT) || CONFIG.DEFAULT_UNIT,
    provider: localStorage.getItem(STORAGE_KEYS.API_PROVIDER) || CONFIG.DEFAULT_PROVIDER,
    owmKey: localStorage.getItem(STORAGE_KEYS.OWM_API_KEY) || CONFIG.FALLBACK_OWM_KEY,
    history: JSON.parse(localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY) || '[]'),
    rawWeatherData: null // Cache current weather in Celsius for instantaneous unit toggles
  };

  /* --------------------------------------------------------------------------
     2. JQUERY DOM ELEMENT SELECTORS
     -------------------------------------------------------------------------- */
  const $searchForm = $('#search-form');
  const $cityInput = $('#city-input');
  const $clearInputBtn = $('#clear-input-btn');
  const $searchBtn = $('#search-btn');
  const $refreshBtn = $('#refresh-btn');
  const $unitToggleBtn = $('#unit-toggle-btn');
  const $unitC = $('#unit-c');
  const $unitF = $('#unit-f');
  const $liveClock = $('#clock-display');
  
  // Alert and Loading Elements
  const $alertBox = $('#alert-box');
  const $alertMessage = $('#alert-message');
  const $alertCloseBtn = $('#alert-close-btn');
  const $loadingSpinner = $('#loading-spinner');
  
  // Weather Display Card Elements
  const $weatherCard = $('#weather-card');
  const $emptyState = $('#empty-state');
  const $cityName = $('#city-name');
  const $countryBadge = $('#country-badge');
  const $updateTimestamp = $('#update-timestamp');
  const $apiSourceBadge = $('#api-source-badge');
  const $weatherIcon = $('#weather-icon');
  const $weatherCondition = $('#weather-condition');
  const $weatherDescription = $('#weather-description');
  const $currentTemp = $('#current-temp');
  const $displayUnit = $('#display-unit');
  const $tempMax = $('#temp-max');
  const $tempMin = $('#temp-min');
  const $feelsLike = $('#feels-like');
  const $humidity = $('#humidity');
  const $windSpeed = $('#wind-speed');
  const $pressure = $('#pressure');
  const $coordinates = $('#coordinates');
  const $dayStatus = $('#day-status');
  const $dayNightIcon = $('#day-night-icon');

  // Search History Elements
  const $historyCount = $('#history-count');
  const $historyContainer = $('#history-chips-container');
  const $clearHistoryBtn = $('#clear-history-btn');

  // Modal Elements
  const $settingsModal = $('#settings-modal');
  const $openSettingsBtn = $('#open-settings-btn');
  const $closeModalBtn = $('#close-modal-btn');
  const $apiProviderSelect = $('#api-provider-select');
  const $owmKeyGroup = $('#owm-key-group');
  const $owmApiKeyInput = $('#owm-api-key');
  const $toggleKeyVisibilityBtn = $('#toggle-key-visibility');
  const $saveSettingsBtn = $('#save-settings-btn');
  const $resetSettingsBtn = $('#reset-settings-btn');

  let alertTimeout = null;

  /* --------------------------------------------------------------------------
     3. LIVE SYSTEM CLOCK (DOM & Events)
     -------------------------------------------------------------------------- */
  function updateLiveClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    $liveClock.text(timeString);
  }
  setInterval(updateLiveClock, 1000);
  updateLiveClock();

  /* --------------------------------------------------------------------------
     4. WEATHER ICON & CONDITION MAPPINGS
     -------------------------------------------------------------------------- */
  // Open-Meteo WMO weather code definitions
  const WMO_CODE_MAP = {
    0: { condition: 'Clear Sky', desc: 'Clear and cloudless sky', iconDay: '01d', iconNight: '01n' },
    1: { condition: 'Mainly Clear', desc: 'Mostly clear skies', iconDay: '02d', iconNight: '02n' },
    2: { condition: 'Partly Cloudy', desc: 'Scattered clouds', iconDay: '03d', iconNight: '03n' },
    3: { condition: 'Overcast', desc: 'Overcast skies', iconDay: '04d', iconNight: '04n' },
    45: { condition: 'Foggy', desc: 'Fog with low visibility', iconDay: '50d', iconNight: '50n' },
    48: { condition: 'Icy Fog', desc: 'Depositing rime fog', iconDay: '50d', iconNight: '50n' },
    51: { condition: 'Light Drizzle', desc: 'Light patchy drizzle', iconDay: '09d', iconNight: '09n' },
    53: { condition: 'Moderate Drizzle', desc: 'Consistent light drizzle', iconDay: '09d', iconNight: '09n' },
    55: { condition: 'Dense Drizzle', desc: 'Heavy dense drizzle', iconDay: '09d', iconNight: '09n' },
    61: { condition: 'Slight Rain', desc: 'Light rainfall showers', iconDay: '10d', iconNight: '10n' },
    63: { condition: 'Moderate Rain', desc: 'Moderate rainfall', iconDay: '10d', iconNight: '10n' },
    65: { condition: 'Heavy Rain', desc: 'Heavy continuous rain', iconDay: '10d', iconNight: '10n' },
    71: { condition: 'Light Snow', desc: 'Slight snowfall', iconDay: '13d', iconNight: '13n' },
    73: { condition: 'Moderate Snow', desc: 'Moderate snowfall', iconDay: '13d', iconNight: '13n' },
    75: { condition: 'Heavy Snow', desc: 'Intense heavy snow', iconDay: '13d', iconNight: '13n' },
    77: { condition: 'Snow Grains', desc: 'Fine snow grains', iconDay: '13d', iconNight: '13n' },
    80: { condition: 'Rain Showers', desc: 'Intermittent rain showers', iconDay: '09d', iconNight: '09n' },
    81: { condition: 'Heavy Showers', desc: 'Heavy shower precipitation', iconDay: '09d', iconNight: '09n' },
    82: { condition: 'Violent Showers', desc: 'Torrential downpour showers', iconDay: '09d', iconNight: '09n' },
    95: { condition: 'Thunderstorm', desc: 'Thunderstorm with lightning', iconDay: '11d', iconNight: '11n' },
    96: { condition: 'Thunderstorm & Hail', desc: 'Thunderstorm with light hail', iconDay: '11d', iconNight: '11n' },
    99: { condition: 'Severe Thunderstorm', desc: 'Severe thunderstorm with heavy hail', iconDay: '11d', iconNight: '11n' }
  };

  /**
   * Helper to retrieve icon URL and descriptions based on WMO code or OpenWeather code
   */
  function getWeatherVisuals(weatherCode, isDay = 1) {
    const info = WMO_CODE_MAP[weatherCode] || {
      condition: 'Variable Weather',
      desc: 'Typical atmospheric condition',
      iconDay: '02d',
      iconNight: '02n'
    };
    const iconCode = isDay ? info.iconDay : info.iconNight;
    // Standard high-resolution OpenWeatherMap icon set
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    return {
      condition: info.condition,
      description: info.desc,
      iconUrl: iconUrl
    };
  }

  /* --------------------------------------------------------------------------
     5. UNIT CONVERSION HELPERS
     -------------------------------------------------------------------------- */
  function toFahrenheit(celsius) {
    return Math.round((celsius * 9) / 5 + 32);
  }

  function formatTemp(celsius) {
    if (celsius === null || celsius === undefined || isNaN(celsius)) return '--';
    if (state.unit === 'F') {
      return toFahrenheit(celsius);
    }
    return Math.round(celsius);
  }

  function updateUnitToggleUI() {
    if (state.unit === 'C') {
      $unitC.addClass('active');
      $unitF.removeClass('active');
      $displayUnit.html('&deg;C');
    } else {
      $unitF.addClass('active');
      $unitC.removeClass('active');
      $displayUnit.html('&deg;F');
    }
  }

  /* --------------------------------------------------------------------------
     6. ALERT & NOTIFICATION SYSTEM (jQuery effects)
     -------------------------------------------------------------------------- */
  function showAlert(message, type = 'error') {
    if (alertTimeout) {
      clearTimeout(alertTimeout);
    }

    $alertMessage.text(message);
    if (type === 'warning') {
      $alertBox.css({ background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.35)', color: '#fde68a' });
    } else {
      $alertBox.css({ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.35)', color: '#fca5a5' });
    }

    $alertBox.stop(true, true).slideDown(250);

    // Auto-dismiss after 6 seconds
    alertTimeout = setTimeout(function () {
      hideAlert();
    }, 6000);
  }

  function hideAlert() {
    if (alertTimeout) {
      clearTimeout(alertTimeout);
      alertTimeout = null;
    }
    $alertBox.stop(true, true).slideUp(200);
  }

  $alertCloseBtn.on('click', function () {
    hideAlert();
  });

  /* --------------------------------------------------------------------------
     7. LOCAL STORAGE MANAGEMENT (Browser Storage)
     -------------------------------------------------------------------------- */
  function saveLastCity(city) {
    if (!city) return;
    state.currentCity = city;
    localStorage.setItem(STORAGE_KEYS.LAST_CITY, city);
  }

  function addCityToHistory(city) {
    if (!city) return;
    const formattedCity = city.trim();

    // Remove if already in history (to move it to top)
    const existingIndex = state.history.findIndex(
      item => item.toLowerCase() === formattedCity.toLowerCase()
    );
    if (existingIndex !== -1) {
      state.history.splice(existingIndex, 1);
    }

    // Add to front of history list
    state.history.unshift(formattedCity);

    // Enforce max history items
    if (state.history.length > CONFIG.MAX_HISTORY_ITEMS) {
      state.history.pop();
    }

    // Persist to localStorage
    localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(state.history));

    // Re-render history UI
    renderSearchHistory();
  }

  function removeCityFromHistory(cityToRemove, event) {
    if (event) {
      event.stopPropagation(); // Prevent triggering the search click on chip
    }

    state.history = state.history.filter(
      item => item.toLowerCase() !== cityToRemove.toLowerCase()
    );
    localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(state.history));
    renderSearchHistory();
  }

  function clearAllHistory() {
    state.history = [];
    localStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
    renderSearchHistory();
  }

  /**
   * Render Recent Search History Chips dynamically using jQuery
   */
  function renderSearchHistory() {
    $historyContainer.empty();
    $historyCount.text(state.history.length);

    if (state.history.length === 0) {
      $historyContainer.html(
        '<p class="history-empty-text" id="history-empty-text">No recent searches yet. Search for a city to save it in browser storage.</p>'
      );
      return;
    }

    // Build chip elements
    $.each(state.history, function (index, city) {
      const $chip = $('<div>')
        .addClass('history-chip')
        .attr('title', `Click to search weather for ${city}`)
        .append(
          $('<span>').text(city),
          $('<button>')
            .addClass('history-chip-remove')
            .attr('title', `Remove ${city} from history`)
            .html('<i class="fa-solid fa-xmark"></i>')
            .on('click', function (e) {
              removeCityFromHistory(city, e);
            })
        )
        .on('click', function () {
          $cityInput.val(city);
          toggleClearInputBtn();
          fetchWeather(city);
        });

      $historyContainer.append($chip);
    });
  }

  /* --------------------------------------------------------------------------
     8. AJAX INTEGRATION & WEATHER DATA RETRIEVAL (jQuery $.ajax)
     -------------------------------------------------------------------------- */
  /**
   * Main entry point to fetch weather for a given city
   */
  function fetchWeather(cityName) {
    const queryCity = (cityName || $cityInput.val() || '').trim();

    // Input Validation
    if (!queryCity) {
      showAlert('Please enter a city name to search.', 'warning');
      $cityInput.focus();
      return;
    }

    hideAlert();

    // Show loading spinner using jQuery fadeIn
    $loadingSpinner.stop(true, true).fadeIn(200);
    $weatherCard.hide();
    $emptyState.hide();

    // Check selected provider
    if (state.provider === 'openweathermap' && state.owmKey) {
      fetchFromOpenWeatherMap(queryCity);
    } else {
      fetchFromOpenMeteo(queryCity);
    }
  }

  /**
   * Strategy A: Open-Meteo API
   * Step 1: Geocoding via $.ajax()
   * Step 2: Forecast via $.ajax()
   */
  function fetchFromOpenMeteo(cityName) {
    const geoCodingUrl = 'https://geocoding-api.open-meteo.com/v1/search';

    // Step 1: Geocode City Name to Latitude and Longitude using $.ajax
    $.ajax({
      url: geoCodingUrl,
      method: 'GET',
      dataType: 'json',
      data: {
        name: cityName,
        count: 1,
        language: 'en',
        format: 'json'
      },
      timeout: 10000,
      success: function (geoResponse) {
        if (!geoResponse.results || geoResponse.results.length === 0) {
          $loadingSpinner.fadeOut(150, function () {
            showAlert(`City "${cityName}" not found. Please verify the spelling and try again.`);
            $emptyState.fadeIn(200);
          });
          return;
        }

        const location = geoResponse.results[0];
        const latitude = location.latitude;
        const longitude = location.longitude;
        const resolvedName = location.name;
        const countryCode = location.country_code ? location.country_code.toUpperCase() : 'GL';

        // Step 2: Retrieve real-time meteorology data via $.ajax
        const forecastUrl = 'https://api.open-meteo.com/v1/forecast';
        $.ajax({
          url: forecastUrl,
          method: 'GET',
          dataType: 'json',
          data: {
            latitude: latitude,
            longitude: longitude,
            current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,surface_pressure',
            daily: 'temperature_2m_max,temperature_2m_min',
            timezone: 'auto'
          },
          timeout: 10000,
          success: function (weatherResponse) {
            const current = weatherResponse.current;
            const daily = weatherResponse.daily;
            const isDay = current.is_day === 1;
            const visuals = getWeatherVisuals(current.weather_code, isDay);

            // Normalize weather data structure in memory (in Celsius)
            const normalizedData = {
              cityName: resolvedName,
              countryCode: countryCode,
              temp: current.temperature_2m,
              feelsLike: current.apparent_temperature,
              tempMax: daily.temperature_2m_max ? daily.temperature_2m_max[0] : current.temperature_2m,
              tempMin: daily.temperature_2m_min ? daily.temperature_2m_min[0] : current.temperature_2m,
              humidity: current.relative_humidity_2m,
              windSpeed: Math.round(current.wind_speed_10m),
              pressure: Math.round(current.surface_pressure),
              coordinates: `${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`,
              isDay: isDay,
              condition: visuals.condition,
              description: visuals.description,
              iconUrl: visuals.iconUrl,
              apiSource: 'Open-Meteo'
            };

            // Store in state & localStorage
            state.rawWeatherData = normalizedData;
            saveLastCity(resolvedName);
            addCityToHistory(resolvedName);

            // Update DOM and display with effects
            $loadingSpinner.fadeOut(150, function () {
              renderWeatherDOM(normalizedData);
              $weatherCard.stop(true, true).fadeIn(300);
            });
          },
          error: function (xhr, status, error) {
            $loadingSpinner.fadeOut(150, function () {
              handleAjaxError(xhr, status, error, cityName);
              $emptyState.fadeIn(200);
            });
          }
        });
      },
      error: function (xhr, status, error) {
        $loadingSpinner.fadeOut(150, function () {
          handleAjaxError(xhr, status, error, cityName);
          $emptyState.fadeIn(200);
        });
      }
    });
  }

  /**
   * Strategy B: OpenWeatherMap API via jQuery $.ajax()
   */
  function fetchFromOpenWeatherMap(cityName) {
    const owmUrl = 'https://api.openweathermap.org/data/2.5/weather';

    $.ajax({
      url: owmUrl,
      method: 'GET',
      dataType: 'json',
      data: {
        q: cityName,
        units: 'metric',
        appid: state.owmKey
      },
      timeout: 10000,
      success: function (data) {
        const weatherObj = (data.weather && data.weather.length > 0) ? data.weather[0] : {};
        const isDay = weatherObj.icon ? weatherObj.icon.endsWith('d') : true;

        const normalizedData = {
          cityName: data.name,
          countryCode: data.sys && data.sys.country ? data.sys.country : '',
          temp: data.main.temp,
          feelsLike: data.main.feels_like,
          tempMax: data.main.temp_max,
          tempMin: data.main.temp_min,
          humidity: data.main.humidity,
          windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
          pressure: data.main.pressure,
          coordinates: `${data.coord.lat.toFixed(2)}°N, ${data.coord.lon.toFixed(2)}°E`,
          isDay: isDay,
          condition: weatherObj.main || 'Clear',
          description: weatherObj.description || 'Clear sky',
          iconUrl: weatherObj.icon ? `https://openweathermap.org/img/wn/${weatherObj.icon}@2x.png` : '',
          apiSource: 'OpenWeatherMap'
        };

        state.rawWeatherData = normalizedData;
        saveLastCity(data.name);
        addCityToHistory(data.name);

        $loadingSpinner.fadeOut(150, function () {
          renderWeatherDOM(normalizedData);
          $weatherCard.stop(true, true).fadeIn(300);
        });
      },
      error: function (xhr, status, error) {
        // If 401 unauthorized or key error, alert user and offer Open-Meteo
        if (xhr.status === 401) {
          $loadingSpinner.fadeOut(150, function () {
            showAlert('Invalid OpenWeatherMap API Key. Switching to Open-Meteo fallback...', 'warning');
            state.provider = 'open-meteo';
            $apiProviderSelect.val('open-meteo');
            localStorage.setItem(STORAGE_KEYS.API_PROVIDER, 'open-meteo');
            fetchFromOpenMeteo(cityName);
          });
          return;
        }

        $loadingSpinner.fadeOut(150, function () {
          handleAjaxError(xhr, status, error, cityName);
          $emptyState.fadeIn(200);
        });
      }
    });
  }

  /**
   * Centralized AJAX error handler
   */
  function handleAjaxError(xhr, status, error, cityName) {
    if (xhr.status === 404) {
      showAlert(`City "${cityName}" not found. Please check spelling.`);
    } else if (status === 'timeout') {
      showAlert('Request timed out. Please check your internet connection and try again.');
    } else if (xhr.status === 0) {
      showAlert('Network error: Unable to contact the weather server. Please check your network connection.');
    } else {
      showAlert(`Error fetching weather (${xhr.status || status}): ${error || 'Unknown error occurred.'}`);
    }
  }

  /* --------------------------------------------------------------------------
     9. DOM MANIPULATION & RENDERING
     -------------------------------------------------------------------------- */
  /**
   * Update the DOM elements with current weather data
   */
  function renderWeatherDOM(data) {
    if (!data) return;

    // 1. City & Country
    $cityName.text(data.cityName);
    if (data.countryCode) {
      $countryBadge.text(data.countryCode).show();
    } else {
      $countryBadge.hide();
    }

    // 2. Timestamps & Badges
    const now = new Date();
    $updateTimestamp.text(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    $apiSourceBadge.text(data.apiSource || 'Open-Meteo');

    // 3. Condition & Visuals
    $weatherCondition.text(data.condition);
    $weatherDescription.text(data.description);
    if (data.iconUrl) {
      $weatherIcon.attr('src', data.iconUrl).attr('alt', data.condition).show();
    }

    // 4. Primary Temperatures (formatted to active unit °C or °F)
    $currentTemp.text(formatTemp(data.temp));
    $tempMax.text(`${formatTemp(data.tempMax)}°`);
    $tempMin.text(`${formatTemp(data.tempMin)}°`);
    $feelsLike.text(`${formatTemp(data.feelsLike)}°${state.unit}`);

    // 5. Secondary Metrics
    $humidity.text(`${data.humidity}%`);
    $windSpeed.text(`${data.windSpeed} km/h`);
    $pressure.text(`${data.pressure} hPa`);
    $coordinates.text(data.coordinates);

    // 6. Day / Night Status
    if (data.isDay) {
      $dayStatus.text('Daytime');
      $dayNightIcon.attr('class', 'fa-solid fa-sun').css('color', '#fbbf24');
    } else {
      $dayStatus.text('Nighttime');
      $dayNightIcon.attr('class', 'fa-solid fa-moon').css('color', '#a78bfa');
    }

    updateUnitToggleUI();
  }

  /**
   * Re-renders only temperature text without refetching from network
   */
  function updateDisplayedTemperatures() {
    if (!state.rawWeatherData) return;
    $currentTemp.text(formatTemp(state.rawWeatherData.temp));
    $tempMax.text(`${formatTemp(state.rawWeatherData.tempMax)}°`);
    $tempMin.text(`${formatTemp(state.rawWeatherData.tempMin)}°`);
    $feelsLike.text(`${formatTemp(state.rawWeatherData.feelsLike)}°${state.unit}`);
    updateUnitToggleUI();
  }

  /* --------------------------------------------------------------------------
     10. JAVASCRIPT & JQUERY EVENT LISTENERS
     -------------------------------------------------------------------------- */
  // A. Search Form Submit (Supports Enter key and Search Button)
  $searchForm.on('submit', function (e) {
    e.preventDefault();
    fetchWeather();
  });

  // B. Search Button Click
  $searchBtn.on('click', function (e) {
    e.preventDefault();
    fetchWeather();
  });

  // C. Input Typing: show/hide clear button and handle keypress
  function toggleClearInputBtn() {
    if ($cityInput.val().trim().length > 0) {
      $clearInputBtn.fadeIn(150);
    } else {
      $clearInputBtn.fadeOut(150);
    }
  }

  $cityInput.on('input keyup', function () {
    toggleClearInputBtn();
  });

  // D. Clear Search Input Button
  $clearInputBtn.on('click', function () {
    $cityInput.val('').focus();
    toggleClearInputBtn();
  });

  // E. Refresh Button (Refetches current city weather)
  $refreshBtn.on('click', function () {
    const targetCity = state.currentCity || $cityInput.val().trim() || CONFIG.DEFAULT_CITY;
    fetchWeather(targetCity);
  });

  // F. Temperature Unit Switcher (°C / °F toggle)
  $unitToggleBtn.on('click', function () {
    state.unit = state.unit === 'C' ? 'F' : 'C';
    localStorage.setItem(STORAGE_KEYS.TEMP_UNIT, state.unit);
    updateDisplayedTemperatures();
  });

  // G. Quick Pick Suggestions
  $('.quick-city-btn').on('click', function () {
    const selectedCity = $(this).data('city');
    $cityInput.val(selectedCity);
    toggleClearInputBtn();
    fetchWeather(selectedCity);
  });

  // H. Clear History Button
  $clearHistoryBtn.on('click', function () {
    if (state.history.length === 0) return;
    if (confirm('Are you sure you want to clear your search history?')) {
      clearAllHistory();
    }
  });

  /* --------------------------------------------------------------------------
     11. API SETTINGS MODAL EVENTS
     -------------------------------------------------------------------------- */
  function openSettingsModal() {
    $apiProviderSelect.val(state.provider);
    $owmApiKeyInput.val(state.owmKey);
    toggleOwmKeyVisibility();
    $settingsModal.stop(true, true).fadeIn(200);
  }

  function closeSettingsModal() {
    $settingsModal.stop(true, true).fadeOut(200);
  }

  function toggleOwmKeyVisibility() {
    if ($apiProviderSelect.val() === 'openweathermap') {
      $owmKeyGroup.slideDown(200);
    } else {
      $owmKeyGroup.slideUp(200);
    }
  }

  $openSettingsBtn.on('click', openSettingsModal);
  $closeModalBtn.on('click', closeSettingsModal);

  // Close modal when clicking outside modal card
  $settingsModal.on('click', function (e) {
    if ($(e.target).is($settingsModal)) {
      closeSettingsModal();
    }
  });

  $apiProviderSelect.on('change', toggleOwmKeyVisibility);

  // Toggle API key password masking
  $toggleKeyVisibilityBtn.on('click', function () {
    const isPassword = $owmApiKeyInput.attr('type') === 'password';
    $owmApiKeyInput.attr('type', isPassword ? 'text' : 'password');
    $(this).find('i').toggleClass('fa-eye fa-eye-slash');
  });

  // Save Modal Settings to localStorage
  $saveSettingsBtn.on('click', function () {
    const selectedProvider = $apiProviderSelect.val();
    const enteredKey = $owmApiKeyInput.val().trim();

    state.provider = selectedProvider;
    state.owmKey = enteredKey;

    localStorage.setItem(STORAGE_KEYS.API_PROVIDER, selectedProvider);
    localStorage.setItem(STORAGE_KEYS.OWM_API_KEY, enteredKey);

    closeSettingsModal();
    showAlert(`Settings saved. Active Provider: ${selectedProvider === 'open-meteo' ? 'Open-Meteo' : 'OpenWeatherMap'}`, 'warning');

    // If a city is already displayed, refresh with new provider
    if (state.currentCity) {
      fetchWeather(state.currentCity);
    }
  });

  // Reset Settings to Defaults
  $resetSettingsBtn.on('click', function () {
    state.provider = CONFIG.DEFAULT_PROVIDER;
    state.owmKey = '';
    $apiProviderSelect.val(CONFIG.DEFAULT_PROVIDER);
    $owmApiKeyInput.val('');
    localStorage.removeItem(STORAGE_KEYS.API_PROVIDER);
    localStorage.removeItem(STORAGE_KEYS.OWM_API_KEY);
    toggleOwmKeyVisibility();
    closeSettingsModal();
    showAlert('Settings reset to default (Open-Meteo, No API key required).', 'warning');
  });

  /* --------------------------------------------------------------------------
     12. APPLICATION INITIALIZATION & RESTORING SAVED STATE
     -------------------------------------------------------------------------- */
  function initApp() {
    // 1. Render initial history from localStorage
    renderSearchHistory();

    // 2. Set up initial temperature unit UI
    updateUnitToggleUI();

    // 3. Restore last searched city from localStorage, or load default city
    const lastCity = localStorage.getItem(STORAGE_KEYS.LAST_CITY);
    if (lastCity) {
      $cityInput.val(lastCity);
      toggleClearInputBtn();
      fetchWeather(lastCity);
    } else {
      // Load default starter city to immediately demonstrate features
      fetchWeather(CONFIG.DEFAULT_CITY);
    }
  }

  // Initialize the dashboard!
  initApp();
});

