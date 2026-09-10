// SIMULATED — In production, this would be a real satellite NDVI/bloom API
// (e.g., NASA MODIS data, ISRO satellite imagery, or commercial providers
// like Planet Labs) that provides real-time floral bloom detection from space.

const BLOOM_CALENDAR = {
  "Punjab": {
    1: ["mustard"],
    2: ["mustard", "litchi"],
    3: ["mustard"],
    4: ["litchi"],
    5: ["wildflower"],
    6: ["wildflower"],
    7: ["eucalyptus"],
    8: ["eucalyptus"],
    9: ["multiflora"],
    10: ["multiflora"],
    11: ["mustard", "jamun"],
    12: ["wildflower"]
  },
  "Haryana": {
    1: ["mustard"],
    2: ["mustard"],
    3: ["mustard"],
    4: ["wildflower"],
    5: ["wildflower"],
    6: ["eucalyptus"],
    7: ["eucalyptus"],
    8: ["multiflora"],
    9: ["multiflora"],
    10: ["wildflower"],
    11: ["mustard"],
    12: ["mustard"]
  },
  "Kerala": {
    1: ["eucalyptus"],
    2: ["jamun"],
    3: ["jamun", "wildflower"],
    4: ["wildflower"],
    5: ["litchi"],
    6: ["eucalyptus"],
    7: ["wildflower"],
    8: ["wildflower", "multiflora"],
    9: ["multiflora"],
    10: ["wildflower"],
    11: ["eucalyptus"],
    12: ["wildflower"]
  },
  "Uttar Pradesh": {
    1: ["wildflower"],
    2: ["mustard"],
    3: ["mustard"],
    4: ["litchi"],
    5: ["litchi"],
    6: ["wildflower"],
    7: ["multiflora"],
    8: ["eucalyptus", "jamun"],
    9: ["jamun"],
    10: ["multiflora"],
    11: ["mustard"],
    12: ["mustard"]
  },
  "Maharashtra": {
    1: ["wildflower"],
    2: ["mustard"],
    3: ["jamun"],
    4: ["jamun", "litchi"],
    5: ["litchi"],
    6: ["eucalyptus"],
    7: ["wildflower"],
    8: ["multiflora"],
    9: ["multiflora"],
    10: ["wildflower"],
    11: ["eucalyptus"],
    12: ["wildflower"]
  }
};

function getExpectedFloralSources(region, month) {
  const regionData = BLOOM_CALENDAR[region];
  if (!regionData) return [];
  return regionData[month] || [];
}

module.exports = { BLOOM_CALENDAR, getExpectedFloralSources };
