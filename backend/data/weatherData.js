// SIMULATED — In production, this would call a real weather API
// (e.g., India Meteorological Department (IMD) API, OpenWeatherMap, or
// AccuWeather Historical API) to get actual temperature, rainfall,
// and humidity data for the region and date range.

const WEATHER_DATA = {
  "Punjab": {
    1: { avgTemp: 12, rainfall_mm: 22, humidity: 65, season: "winter", description: "Cold dry winter, light fog" },
    2: { avgTemp: 16, rainfall_mm: 28, humidity: 60, season: "winter", description: "Warming winter, occasional rain" },
    3: { avgTemp: 22, rainfall_mm: 25, humidity: 50, season: "spring", description: "Pleasant spring, mustard harvest" },
    4: { avgTemp: 28, rainfall_mm: 15, humidity: 40, season: "spring", description: "Hot dry spring, litchi bloom" },
    5: { avgTemp: 34, rainfall_mm: 18, humidity: 35, season: "summer", description: "Hot summer, pre-monsoon showers" },
    6: { avgTemp: 36, rainfall_mm: 55, humidity: 55, season: "monsoon", description: "Monsoon onset, humid conditions" },
    7: { avgTemp: 33, rainfall_mm: 220, humidity: 75, season: "monsoon", description: "Peak monsoon, heavy rainfall" },
    8: { avgTemp: 32, rainfall_mm: 180, humidity: 78, season: "monsoon", description: "Late monsoon, waterlogged fields" },
    9: { avgTemp: 30, rainfall_mm: 80, humidity: 68, season: "autumn", description: "Post-monsoon, pleasant weather" },
    10: { avgTemp: 25, rainfall_mm: 15, humidity: 55, season: "autumn", description: "Cool autumn, clear skies" },
    11: { avgTemp: 18, rainfall_mm: 8, humidity: 58, season: "winter", description: "Early winter, mustard seedling stage" },
    12: { avgTemp: 13, rainfall_mm: 15, humidity: 62, season: "winter", description: "Cold winter, foggy mornings" }
  },
  "Haryana": {
    1: { avgTemp: 13, rainfall_mm: 20, humidity: 62, season: "winter", description: "Cold winter, dense fog in plains" },
    2: { avgTemp: 17, rainfall_mm: 25, humidity: 58, season: "winter", description: "Warming, mustard at peak" },
    3: { avgTemp: 23, rainfall_mm: 22, humidity: 48, season: "spring", description: "Spring warmth, harvest season" },
    4: { avgTemp: 30, rainfall_mm: 12, humidity: 38, season: "spring", description: "Hot dry spell" },
    5: { avgTemp: 36, rainfall_mm: 15, humidity: 32, season: "summer", description: "Extreme heat, Lo winds" },
    6: { avgTemp: 37, rainfall_mm: 50, humidity: 52, season: "monsoon", description: "Monsoon arrival" },
    7: { avgTemp: 34, rainfall_mm: 200, humidity: 72, season: "monsoon", description: "Heavy monsoon rainfall" },
    8: { avgTemp: 33, rainfall_mm: 165, humidity: 75, season: "monsoon", description: "Continued monsoon" },
    9: { avgTemp: 31, rainfall_mm: 75, humidity: 65, season: "autumn", description: "Post-monsoon transition" },
    10: { avgTemp: 26, rainfall_mm: 12, humidity: 52, season: "autumn", description: "Cool autumn" },
    11: { avgTemp: 19, rainfall_mm: 6, humidity: 55, season: "winter", description: "Early winter chill" },
    12: { avgTemp: 14, rainfall_mm: 12, humidity: 60, season: "winter", description: "Cold winter" }
  },
  "Kerala": {
    1: { avgTemp: 27, rainfall_mm: 15, humidity: 68, season: "dry", description: "Dry season, pleasant weather" },
    2: { avgTemp: 28, rainfall_mm: 20, humidity: 65, season: "dry", description: "Late dry season, pre-monsoon warmth" },
    3: { avgTemp: 29, rainfall_mm: 35, humidity: 62, season: "dry", description: "Heating up, occasional thunderstorms" },
    4: { avgTemp: 30, rainfall_mm: 100, humidity: 70, season: "pre-monsoon", description: "Pre-monsoon showers, mango showers" },
    5: { avgTemp: 29, rainfall_mm: 250, humidity: 80, season: "monsoon", description: "Southwest monsoon onset" },
    6: { avgTemp: 27, rainfall_mm: 650, humidity: 88, season: "monsoon", description: "Heavy monsoon, flooding possible" },
    7: { avgTemp: 26, rainfall_mm: 580, humidity: 90, season: "monsoon", description: "Peak monsoon" },
    8: { avgTemp: 26, rainfall_mm: 420, humidity: 88, season: "monsoon", description: "Continued heavy rainfall" },
    9: { avgTemp: 27, rainfall_mm: 280, humidity: 82, season: "post-monsoon", description: "Retreating monsoon" },
    10: { avgTemp: 27, rainfall_mm: 300, humidity: 80, season: "post-monsoon", description: "Northeast monsoon active" },
    11: { avgTemp: 27, rainfall_mm: 150, humidity: 75, season: "post-monsoon", description: "Late northeast monsoon" },
    12: { avgTemp: 27, rainfall_mm: 40, humidity: 70, season: "dry", description: "Dry season begins" }
  },
  "Uttar Pradesh": {
    1: { avgTemp: 14, rainfall_mm: 18, humidity: 62, season: "winter", description: "Cold winter, fog prevalent" },
    2: { avgTemp: 18, rainfall_mm: 22, humidity: 55, season: "winter", description: "Warming, mustard flowering" },
    3: { avgTemp: 24, rainfall_mm: 15, humidity: 45, season: "spring", description: "Spring warmth, harvest time" },
    4: { avgTemp: 32, rainfall_mm: 8, humidity: 32, season: "spring", description: "Hot dry spring, litchi bloom" },
    5: { avgTemp: 38, rainfall_mm: 10, humidity: 28, season: "summer", description: "Extreme heat wave conditions" },
    6: { avgTemp: 37, rainfall_mm: 85, humidity: 55, season: "monsoon", description: "Monsoon arrives, relief from heat" },
    7: { avgTemp: 33, rainfall_mm: 280, humidity: 78, season: "monsoon", description: "Heavy monsoon rainfall" },
    8: { avgTemp: 32, rainfall_mm: 250, humidity: 80, season: "monsoon", description: "Continued monsoon" },
    9: { avgTemp: 31, rainfall_mm: 120, humidity: 72, season: "autumn", description: "Post-monsoon transition" },
    10: { avgTemp: 27, rainfall_mm: 15, humidity: 58, season: "autumn", description: "Pleasant autumn" },
    11: { avgTemp: 20, rainfall_mm: 5, humidity: 55, season: "winter", description: "Early winter" },
    12: { avgTemp: 15, rainfall_mm: 10, humidity: 60, season: "winter", description: "Cold winter, frost possible" }
  },
  "Maharashtra": {
    1: { avgTemp: 24, rainfall_mm: 5, humidity: 45, season: "dry", description: "Dry winter, pleasant in Deccan" },
    2: { avgTemp: 26, rainfall_mm: 8, humidity: 40, season: "dry", description: "Warming dry season" },
    3: { avgTemp: 30, rainfall_mm: 10, humidity: 35, season: "dry", description: "Hot dry, pre-monsoon" },
    4: { avgTemp: 34, rainfall_mm: 15, humidity: 38, season: "dry", description: "Very hot, occasional dust storms" },
    5: { avgTemp: 36, rainfall_mm: 25, humidity: 45, season: "pre-monsoon", description: "Pre-monsoon thunderstorms" },
    6: { avgTemp: 32, rainfall_mm: 200, humidity: 72, season: "monsoon", description: "Southwest monsoon onset" },
    7: { avgTemp: 28, rainfall_mm: 550, humidity: 85, season: "monsoon", description: "Heavy monsoon, Sahyadri floods" },
    8: { avgTemp: 27, rainfall_mm: 480, humidity: 88, season: "monsoon", description: "Peak monsoon rainfall" },
    9: { avgTemp: 28, rainfall_mm: 250, humidity: 80, season: "post-monsoon", description: "Retreating monsoon" },
    10: { avgTemp: 29, rainfall_mm: 45, humidity: 62, season: "post-monsoon", description: "Post-monsoon, pleasant" },
    11: { avgTemp: 27, rainfall_mm: 15, humidity: 50, season: "dry", description: "Early dry season" },
    12: { avgTemp: 25, rainfall_mm: 8, humidity: 48, season: "dry", description: "Cool dry winter" }
  },
  "Rajasthan": {
    1: { avgTemp: 16, rainfall_mm: 8, humidity: 42, season: "winter", description: "Cool winter, frost in desert" },
    2: { avgTemp: 20, rainfall_mm: 10, humidity: 38, season: "winter", description: "Warming, mustard in irrigated zones" },
    3: { avgTemp: 26, rainfall_mm: 8, humidity: 30, season: "spring", description: "Hot dry spring" },
    4: { avgTemp: 32, rainfall_mm: 5, humidity: 22, season: "summer", description: "Extreme heat, Thar desert" },
    5: { avgTemp: 38, rainfall_mm: 8, humidity: 18, season: "summer", description: "Peak summer, 45°C+ temperatures" },
    6: { avgTemp: 36, rainfall_mm: 45, humidity: 45, season: "monsoon", description: "Monsoon arrives in eastern Rajasthan" },
    7: { avgTemp: 32, rainfall_mm: 180, humidity: 68, season: "monsoon", description: "Active monsoon in Aravalli region" },
    8: { avgTemp: 30, rainfall_mm: 150, humidity: 72, season: "monsoon", description: "Continued monsoon" },
    9: { avgTemp: 30, rainfall_mm: 60, humidity: 58, season: "autumn", description: "Post-monsoon" },
    10: { avgTemp: 27, rainfall_mm: 8, humidity: 42, season: "autumn", description: "Dry autumn" },
    11: { avgTemp: 22, rainfall_mm: 5, humidity: 40, season: "winter", description: "Early winter" },
    12: { avgTemp: 17, rainfall_mm: 5, humidity: 44, season: "winter", description: "Cold winter nights" }
  },
  "Madhya Pradesh": {
    1: { avgTemp: 17, rainfall_mm: 12, humidity: 52, season: "winter", description: "Cool winter in Malwa" },
    2: { avgTemp: 21, rainfall_mm: 15, humidity: 48, season: "winter", description: "Warming, mustard active" },
    3: { avgTemp: 26, rainfall_mm: 10, humidity: 40, season: "spring", description: "Spring warmth" },
    4: { avgTemp: 32, rainfall_mm: 8, humidity: 30, season: "spring", description: "Hot dry spring" },
    5: { avgTemp: 38, rainfall_mm: 10, humidity: 25, season: "summer", description: "Extreme heat" },
    6: { avgTemp: 36, rainfall_mm: 80, humidity: 52, season: "monsoon", description: "Monsoon onset" },
    7: { avgTemp: 30, rainfall_mm: 300, humidity: 78, season: "monsoon", description: "Heavy monsoon" },
    8: { avgTemp: 28, rainfall_mm: 280, humidity: 82, season: "monsoon", description: "Peak monsoon" },
    9: { avgTemp: 29, rainfall_mm: 140, humidity: 72, season: "autumn", description: "Post-monsoon" },
    10: { avgTemp: 26, rainfall_mm: 20, humidity: 55, season: "autumn", description: "Pleasant autumn" },
    11: { avgTemp: 21, rainfall_mm: 8, humidity: 50, season: "winter", description: "Early winter" },
    12: { avgTemp: 18, rainfall_mm: 10, humidity: 55, season: "winter", description: "Cool winter" }
  }
};

// SIMULATED — Bloom window definitions for timing plausibility check
// Maps each floral source to its expected bloom months per region
const BLOOM_WINDOWS = {
  "mustard":   { months: [11, 12, 1, 2, 3], peakMonths: [2, 3], description: "Oct-Mar flowering, peaks Feb-Mar" },
  "litchi":    { months: [4, 5], peakMonths: [4, 5], description: "Apr-May flowering" },
  "eucalyptus":{ months: [6, 7, 8, 11, 12, 1], peakMonths: [7, 8], description: "Monsoon + winter flowering" },
  "jamun":     { months: [2, 3, 4], peakMonths: [3, 4], description: "Feb-Apr flowering" },
  "wildflower":{ months: [4, 5, 6, 7, 8, 9, 10], peakMonths: [5, 6, 9], description: "Apr-Oct, post-monsoon peak" },
  "multiflora":{ months: [7, 8, 9, 10], peakMonths: [8, 9], description: "Jul-Oct, post-monsoon" }
};

function getWeatherData(region, month) {
  const regionData = WEATHER_DATA[region];
  if (!regionData) return { avgTemp: 25, rainfall_mm: 50, humidity: 55, season: 'unknown', description: 'No weather data available', isReliable: false };
  const monthData = regionData[month];
  if (!monthData) return { avgTemp: 25, rainfall_mm: 50, humidity: 55, season: 'unknown', description: 'No weather data available', isReliable: false };
  return { ...monthData, isReliable: true };
}

function checkTimingPlausibility(region, month, floralSource) {
  const window = BLOOM_WINDOWS[floralSource];
  if (!window) return { inBloomWindow: false, isPeakSeason: false, description: `Unknown floral source: ${floralSource}` };

  const inBloomWindow = window.months.includes(month);
  const isPeakSeason = window.peakMonths.includes(month);

  let description;
  if (isPeakSeason) {
    description = `${floralSource} is at peak bloom in ${region} during month ${month}`;
  } else if (inBloomWindow) {
    description = `${floralSource} bloom window is active in ${region} during month ${month} (not peak)`;
  } else {
    description = `${floralSource} is NOT in bloom in ${region} during month ${month}. Expected: months ${window.months.join(', ')}`;
  }

  return { inBloomWindow, isPeakSeason, description, expectedMonths: window.months, peakMonths: window.peakMonths };
}

module.exports = { WEATHER_DATA, BLOOM_WINDOWS, getWeatherData, checkTimingPlausibility };
