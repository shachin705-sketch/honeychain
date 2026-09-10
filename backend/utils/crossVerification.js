// SIMULATED — In production, this would be a trained ML classifier
// (e.g., gradient-boosted model or neural network) trained on verified honey
// batches with features from satellite data, weather, spectral analysis, and
// provenance records. The rule-based logic below mimics what the model would learn.

const { getExpectedFloralSources } = require('../data/bloomCalendar');
const { checkNDVISupport } = require('../data/satelliteData');
const { checkTimingPlausibility, getWeatherData } = require('../data/weatherData');

// Risk score weights for each sub-check failure
const WEIGHTS = {
  bloomMismatch: 30,
  ndviLow: 15,
  timingMismatch: 20,
  moistureExceeded: 20,
  hmfExceeded: 20
};

// Risk bands
const RISK_BANDS = {
  VERIFIED_AUTHENTIC: { label: 'VERIFIED_AUTHENTIC', displayName: 'VERIFIED AUTHENTIC', color: 'green', maxScore: 25 },
  REVIEW_RECOMMENDED: { label: 'REVIEW_RECOMMENDED', displayName: 'REVIEW RECOMMENDED', color: 'amber', maxScore: 60 },
  HIGH_RISK: { label: 'HIGH_RISK', displayName: 'HIGH RISK — LIKELY MISLABELED/ADULTERATED', color: 'red', maxScore: 100 }
};

function getRiskBand(score) {
  if (score <= RISK_BANDS.VERIFIED_AUTHENTIC.maxScore) return RISK_BANDS.VERIFIED_AUTHENTIC;
  if (score <= RISK_BANDS.REVIEW_RECOMMENDED.maxScore) return RISK_BANDS.REVIEW_RECOMMENDED;
  return RISK_BANDS.HIGH_RISK;
}

function runCrossVerification(claim, spectralData) {
  const { region, month, floralSource, harvestDate } = claim;
  const { moisture, sugar_ratio, hmf_level } = spectralData;

  let riskScore = 0;
  const checks = {};

  // Check 1: Bloom calendar match
  const expectedSources = getExpectedFloralSources(region, month);
  const floralSourceMatch = expectedSources.includes(floralSource);
  if (!floralSourceMatch) riskScore += WEIGHTS.bloomMismatch;
  checks.floralSourceMatch = {
    passed: floralSourceMatch,
    expectedSources,
    detail: floralSourceMatch
      ? `${floralSource} is in expected bloom for ${region} in month ${month}`
      : `${floralSource} NOT in expected bloom for ${region} in month ${month}. Expected: ${expectedSources.join(', ') || 'none'}`
  };

  // Check 2: NDVI / satellite vegetation support
  const ndviResult = checkNDVISupport(region, month, floralSource);
  const ndviSupport = ndviResult.supported;
  if (ndviResult.ndviLow) riskScore += WEIGHTS.ndviLow;
  checks.ndviSupport = {
    passed: ndviSupport,
    ndvi: ndviResult.ndvi,
    dominantBloom: ndviResult.dominantBloom,
    description: ndviResult.description,
    detail: ndviSupport
      ? `NDVI ${ndviResult.ndvi.toFixed(2)} — vegetation signal supports ${floralSource} presence`
      : `NDVI ${ndviResult.ndvi.toFixed(2)} — vegetation signal TOO LOW for active ${floralSource} bloom (threshold: 0.45)`
  };

  // Check 3: Timing / weather plausibility
  const timingResult = checkTimingPlausibility(region, month, floralSource);
  const timingMatch = timingResult.inBloomWindow;
  if (!timingMatch) riskScore += WEIGHTS.timingMismatch;
  const weatherData = getWeatherData(region, month);
  checks.timingMatch = {
    passed: timingMatch,
    inBloomWindow: timingResult.inBloomWindow,
    isPeakSeason: timingResult.isPeakSeason,
    expectedMonths: timingResult.expectedMonths,
    weather: { temp: weatherData.avgTemp, rainfall: weatherData.rainfall_mm, humidity: weatherData.humidity },
    detail: timingMatch
      ? timingResult.description
      : timingResult.description
  };

  // Check 4: NIR spectral adulteration
  const moistureOk = moisture <= 20;
  const hmfOk = hmf_level <= 40;
  const nirWithinRange = moistureOk && hmfOk;
  if (!moistureOk) riskScore += WEIGHTS.moistureExceeded;
  if (!hmfOk) riskScore += WEIGHTS.hmfExceeded;
  const nirIssues = [];
  if (!moistureOk) nirIssues.push(`moisture ${moisture}% exceeds 20%`);
  if (!hmfOk) nirIssues.push(`HMF ${hmf_level}mg/kg exceeds 40mg/kg`);
  checks.nirWithinRange = {
    passed: nirWithinRange,
    moisture,
    hmf_level,
    sugar_ratio,
    detail: nirWithinRange
      ? `NIR profile within authentic range: moisture ${moisture}%, HMF ${hmf_level}mg/kg`
      : `NIR ADULTERATION FLAGS: ${nirIssues.join('; ')}`
  };

  // Check 5: Pollen analysis (Phase 2 placeholder)
  checks.pollenAvailable = {
    passed: false,
    available: false,
    detail: 'Lab microscopy not yet integrated — planned for Phase 2'
  };

  // Cap risk score at 100
  riskScore = Math.min(100, riskScore);

  // Determine risk band
  const riskBand = getRiskBand(riskScore);

  // Generate plain-English explanation
  const explanation = generateExplanation(claim, checks, riskScore, riskBand);

  return {
    floralSourceMatch: checks.floralSourceMatch.passed,
    timingMatch: checks.timingMatch.passed,
    ndviSupport: checks.ndviSupport.passed,
    nirWithinRange: checks.nirWithinRange.passed,
    pollenAvailable: false,
    riskScore,
    riskBand: riskBand.label,
    riskBandDisplay: riskBand.displayName,
    riskBandColor: riskBand.color,
    explanationText: explanation,
    checksDetail: checks
  };
}

function generateExplanation(claim, checks, riskScore, riskBand) {
  const parts = [];

  if (!checks.floralSourceMatch.passed) {
    parts.push(`Claimed ${claim.floralSource} honey from ${claim.region} in month ${claim.month}, but regional bloom calendar shows this flora is not expected during this period`);
  }
  if (!checks.ndviSupport.passed) {
    parts.push(`Satellite vegetation data (NDVI ${checks.ndviSupport.ndvi.toFixed(2)}) shows minimal flowering activity in ${claim.region} during month ${claim.month}`);
  }
  if (!checks.timingMatch.passed) {
    parts.push(`Harvest timing is inconsistent with the expected bloom window for ${claim.floralSource}`);
  }
  if (!checks.nirWithinRange.passed) {
    const issues = [];
    if (!checks.nirWithinRange.passed && checks.nirWithinRange.moisture > 20) issues.push(`moisture ${checks.nirWithinRange.moisture}%`);
    if (!checks.nirWithinRange.passed && checks.nirWithinRange.hmf_level > 40) issues.push(`HMF ${checks.nirWithinRange.hmf_level}mg/kg`);
    if (issues.length > 0) parts.push(`Spectral analysis shows elevated levels (${issues.join(', ')}) suggesting possible adulteration`);
  }

  if (parts.length === 0) {
    return `All cross-verification checks passed for ${claim.floralSource} honey from ${claim.region}. Bloom calendar, satellite NDVI, weather timing, and NIR spectral profile are all consistent with an authentic product.`;
  }

  return parts.join('. ') + '. Recommend manual inspection before certification.';
}

module.exports = { runCrossVerification, getRiskBand, WEIGHTS, RISK_BANDS };
