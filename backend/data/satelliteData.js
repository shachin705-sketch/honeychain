// SIMULATED — In production, this would call a real satellite NDVI API
// (e.g., NASA MODIS data, ISRO satellite imagery, or commercial providers
// like Planet Labs) that provides real-time vegetation index data from space.
// NDVI (Normalized Difference Vegetation Index) ranges from -1 to 1,
// where values > 0.5 indicate active vegetation/bloom.

const NDVI_DATA = {
  "Punjab": {
    1: { ndvi: 0.68, dominantBloom: "mustard", description: "Mustard fields at peak bloom across Malwa and Doaba regions" },
    2: { ndvi: 0.72, dominantBloom: "mustard", description: "Late mustard bloom, early litchi buds appearing" },
    3: { ndvi: 0.65, dominantBloom: "mustard", description: "Mustard harvest beginning, residual floral activity" },
    4: { ndvi: 0.58, dominantBloom: "litchi", description: "Litchi orchards in bloom, moderate vegetation index" },
    5: { ndvi: 0.52, dominantBloom: "wildflower", description: "Post-litchi wildflower emergence in foothills" },
    6: { ndvi: 0.48, dominantBloom: "wildflower", description: "Monsoon wildflowers, moderate NDVI" },
    7: { ndvi: 0.55, dominantBloom: "eucalyptus", description: "Eucalyptus plantations active during monsoon" },
    8: { ndvi: 0.57, dominantBloom: "eucalyptus", description: "Peak monsoon vegetation, eucalyptus flowering" },
    9: { ndvi: 0.62, dominantBloom: "multiflora", description: "Post-monsoon multiflora bloom across plains" },
    10: { ndvi: 0.60, dominantBloom: "multiflora", description: "Autumn multiflora, mustard seedlings emerging" },
    11: { ndvi: 0.66, dominantBloom: "mustard", description: "Mustard sowing complete, early bloom in south Punjab" },
    12: { ndvi: 0.54, dominantBloom: "wildflower", description: "Winter wildflower patches, low overall vegetation" }
  },
  "Haryana": {
    1: { ndvi: 0.64, dominantBloom: "mustard", description: "Mustard belt fully active across Karnal-Sirsa corridor" },
    2: { ndvi: 0.70, dominantBloom: "mustard", description: "Peak mustard bloom, high NDVI across agricultural belt" },
    3: { ndvi: 0.62, dominantBloom: "mustard", description: "Late mustard, transitioning to wildflower season" },
    4: { ndvi: 0.50, dominantBloom: "wildflower", description: "Spring wildflowers, moderate vegetation" },
    5: { ndvi: 0.48, dominantBloom: "wildflower", description: "Pre-monsoon dry spell, wildflower patches" },
    6: { ndvi: 0.45, dominantBloom: "eucalyptus", description: "Early monsoon, eucalyptus plantations greening" },
    7: { ndvi: 0.52, dominantBloom: "eucalyptus", description: "Monsoon vegetation peak for tree plantations" },
    8: { ndvi: 0.55, dominantBloom: "multiflora", description: "Post-monsoon multiflora emergence" },
    9: { ndvi: 0.58, dominantBloom: "multiflora", description: "Autumn multiflora bloom at peak" },
    10: { ndvi: 0.50, dominantBloom: "wildflower", description: "Residual wildflower, mustard seedlings" },
    11: { ndvi: 0.62, dominantBloom: "mustard", description: "Early mustard bloom across southern Haryana" },
    12: { ndvi: 0.58, dominantBloom: "mustard", description: "Mustard establishing, moderate NDVI" }
  },
  "Kerala": {
    1: { ndvi: 0.70, dominantBloom: "eucalyptus", description: "Hill station eucalyptus active, post-monsoon greenery" },
    2: { ndvi: 0.65, dominantBloom: "jamun", description: "Early jamun flowering in Western Ghats foothills" },
    3: { ndvi: 0.62, dominantBloom: "jamun", description: "Peak jamun bloom, wildflower patches in high ranges" },
    4: { ndvi: 0.55, dominantBloom: "wildflower", description: "Pre-monsoon wildflower season in Wayanad" },
    5: { ndvi: 0.50, dominantBloom: "litchi", description: "Litchi cultivation areas in northern Kerala blooming" },
    6: { ndvi: 0.58, dominantBloom: "eucalyptus", description: "Monsoon eucalyptus activity in plantations" },
    7: { ndvi: 0.52, dominantBloom: "wildflower", description: "Monsoon wildflowers in high ranges" },
    8: { ndvi: 0.54, dominantBloom: "multiflora", description: "Post-monsoon multiflora, high NDVI in hills" },
    9: { ndvi: 0.60, dominantBloom: "multiflora", description: "Autumn multiflora peak in Wayanad" },
    10: { ndvi: 0.55, dominantBloom: "wildflower", description: "Late monsoon wildflower residue" },
    11: { ndvi: 0.62, dominantBloom: "eucalyptus", description: "Post-monsoon eucalyptus revival" },
    12: { ndvi: 0.58, dominantBloom: "wildflower", description: "Winter wildflower patches in hill regions" }
  },
  "Uttar Pradesh": {
    1: { ndvi: 0.50, dominantBloom: "wildflower", description: "Winter wildflower patches, low overall vegetation" },
    2: { ndvi: 0.62, dominantBloom: "mustard", description: "Mustard belt active in western UP" },
    3: { ndvi: 0.68, dominantBloom: "mustard", description: "Peak mustard bloom across Terai and Doab" },
    4: { ndvi: 0.58, dominantBloom: "litchi", description: "Litchi orchards in bloom in Lucknow-Malihabad belt" },
    5: { ndvi: 0.55, dominantBloom: "litchi", description: "Late litchi bloom, fruit set beginning" },
    6: { ndvi: 0.48, dominantBloom: "wildflower", description: "Pre-monsoon dry spell, scattered wildflowers" },
    7: { ndvi: 0.55, dominantBloom: "multiflora", description: "Monsoon multiflora emergence" },
    8: { ndvi: 0.52, dominantBloom: "eucalyptus", description: "Eucalyptus and jamun activity in eastern UP" },
    9: { ndvi: 0.50, dominantBloom: "jamun", description: "Residual jamun, low NDVI period" },
    10: { ndvi: 0.54, dominantBloom: "multiflora", description: "Post-monsoon multiflora patches" },
    11: { ndvi: 0.60, dominantBloom: "mustard", description: "Early mustard sowing, moderate NDVI" },
    12: { ndvi: 0.56, dominantBloom: "mustard", description: "Mustard seedlings establishing" }
  },
  "Maharashtra": {
    1: { ndvi: 0.48, dominantBloom: "wildflower", description: "Winter dry season, sparse wildflower patches" },
    2: { ndvi: 0.52, dominantBloom: "mustard", description: "Mustard cultivation in Vidarbha region" },
    3: { ndvi: 0.55, dominantBloom: "jamun", description: "Early jamun flowering in Western Ghats" },
    4: { ndvi: 0.58, dominantBloom: "jamun", description: "Peak jamun bloom, litchi orchards active" },
    5: { ndvi: 0.50, dominantBloom: "litchi", description: "Litchi season, pre-monsoon vegetation decline" },
    6: { ndvi: 0.45, dominantBloom: "eucalyptus", description: "Early monsoon, eucalyptus plantations greening" },
    7: { ndvi: 0.52, dominantBloom: "wildflower", description: "Monsoon wildflowers in Sahyadri ranges" },
    8: { ndvi: 0.58, dominantBloom: "multiflora", description: "Post-monsoon multiflora peak" },
    9: { ndvi: 0.55, dominantBloom: "multiflora", description: "Autumn multiflora, moderate NDVI" },
    10: { ndvi: 0.48, dominantBloom: "wildflower", description: "Post-monsoon wildflower residue" },
    11: { ndvi: 0.50, dominantBloom: "eucalyptus", description: "Eucalyptus plantation flowering" },
    12: { ndvi: 0.46, dominantBloom: "wildflower", description: "Winter dry spell, minimal vegetation" }
  },
  "Rajasthan": {
    1: { ndvi: 0.35, dominantBloom: "mustard", description: "Mustard in irrigated zones, desert scrub dormant" },
    2: { ndvi: 0.42, dominantBloom: "mustard", description: "Peak mustard in Shekhawati-Mewar belt" },
    3: { ndvi: 0.38, dominantBloom: "mustard", description: "Late mustard, arid conditions spreading" },
    4: { ndvi: 0.30, dominantBloom: "wildflower", description: "Pre-monsoon dry, minimal floral activity" },
    5: { ndvi: 0.25, dominantBloom: "wildflower", description: "Peak dry season, very low NDVI" },
    6: { ndvi: 0.30, dominantBloom: "wildflower", description: "Early monsoon greening in eastern hills" },
    7: { ndvi: 0.40, dominantBloom: "wildflower", description: "Monsoon wildflowers in Aravalli ranges" },
    8: { ndvi: 0.45, dominantBloom: "multiflora", description: "Post-monsoon multiflora in irrigated areas" },
    9: { ndvi: 0.42, dominantBloom: "multiflora", description: "Autumn multiflora residue" },
    10: { ndvi: 0.35, dominantBloom: "wildflower", description: "Post-monsoon decline, sparse vegetation" },
    11: { ndvi: 0.38, dominantBloom: "mustard", description: "Mustard sowing in progress" },
    12: { ndvi: 0.36, dominantBloom: "mustard", description: "Early mustard emergence in irrigated belts" }
  },
  "Madhya Pradesh": {
    1: { ndvi: 0.50, dominantBloom: "wildflower", description: "Winter wildflower patches in northern MP" },
    2: { ndvi: 0.58, dominantBloom: "mustard", description: "Mustard cultivation active in Malwa plateau" },
    3: { ndvi: 0.62, dominantBloom: "mustard", description: "Peak mustard bloom across Bundelkhand" },
    4: { ndvi: 0.55, dominantBloom: "litchi", description: "Litchi orchards in Chambal division blooming" },
    5: { ndvi: 0.50, dominantBloom: "litchi", description: "Late litchi, pre-monsoon vegetation decline" },
    6: { ndvi: 0.48, dominantBloom: "wildflower", description: "Pre-monsoon dry spell" },
    7: { ndvi: 0.58, dominantBloom: "multiflora", description: "Monsoon multiflora emergence" },
    8: { ndvi: 0.62, dominantBloom: "multiflora", description: "Post-monsoon peak vegetation" },
    9: { ndvi: 0.58, dominantBloom: "multiflora", description: "Autumn multiflora activity" },
    10: { ndvi: 0.52, dominantBloom: "wildflower", description: "Post-monsoon wildflower residue" },
    11: { ndvi: 0.55, dominantBloom: "mustard", description: "Early mustard sowing" },
    12: { ndvi: 0.50, dominantBloom: "wildflower", description: "Winter dormant period" }
  }
};

// SIMULATED — NDVI threshold below which active blooming is considered unlikely
const NDVI_BLOOM_THRESHOLD = 0.45;

function getNDVIData(region, month) {
  const regionData = NDVI_DATA[region];
  if (!regionData) return { ndvi: 0.3, dominantBloom: 'unknown', description: 'No satellite data available for this region', isReliable: false };
  const monthData = regionData[month];
  if (!monthData) return { ndvi: 0.3, dominantBloom: 'unknown', description: 'No satellite data available for this month', isReliable: false };
  return { ...monthData, isReliable: monthData.ndvi >= NDVI_BLOOM_THRESHOLD };
}

function checkNDVISupport(region, month, claimedFloralSource) {
  const data = getNDVIData(region, month);
  const ndviLow = data.ndvi < NDVI_BLOOM_THRESHOLD;
  const dominantMismatch = data.dominantBloom !== claimedFloralSource && data.dominantBloom !== 'wildflower' && data.dominantBloom !== 'multiflora';
  return {
    ndvi: data.ndvi,
    dominantBloom: data.dominantBloom,
    description: data.description,
    isReliable: data.isReliable,
    ndviLow,
    dominantMismatch,
    supported: !ndviLow && !dominantMismatch
  };
}

module.exports = { NDVI_DATA, NDVI_BLOOM_THRESHOLD, getNDVIData, checkNDVISupport };
