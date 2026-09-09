// frontend/src/services/scientificEngine.js
// Scientific Investigation & Research Sampling Planner

export function getInvestigationReport({
  location = 'Visakhapatnam Shelf Waters (17.5°N, 83.5°E)',
  chlorophyll = 4.8,
  sst = 26.8,
  windKmph = 38.0,
}) {
  return {
    investigationId: 'INV-2026-AP-01',
    observedAnomaly: `High Chlorophyll-a spike (${chlorophyll} mg/m³) with cooling SST (${sst}°C)`,
    location,
    timestamp: new Date().toISOString(),
    favoredHypothesisId: 'HYP-UPWELLING',
    summary: `Observations off ${location} indicate intense localized biological productivity. A ~1.7°C depression in surface temperature accompanied by 38 km/h south-westerly alongshore wind provides compelling evidence of wind-driven coastal upwelling. Riverine runoff is largely ruled out by absence of warm freshwater signatures.`,
    hypotheses: [
      {
        id: 'HYP-UPWELLING',
        title: 'Wind-Driven Coastal Upwelling (Ekman Pumping)',
        likelihood: 84,
        status: 'HIGHLY_PLAUSIBLE',
        supporting: [
          {
            metric: 'Sea Surface Temperature',
            observed: `${sst}°C (-1.7°C vs ambient shelf)`,
            note: 'Colder sub-thermocline water pumped into the euphotic layer.',
          },
          {
            metric: 'Alongshore Wind Vector',
            observed: `South-Westerly at ${windKmph} km/h`,
            note: 'Generates classic right-hand Ekman mass transport offshore.',
          },
        ],
        contradicting: [],
        missing: [
          'Vertical CTD density/salinity profile down to 100m',
          'Dissolved inorganic nitrogen & silicate bottle samples',
        ],
        verificationTest: 'Execute cross-shelf CTD transect to locate 24°C isotherm boundary.',
      },
      {
        id: 'HYP-RUNOFF',
        title: 'Riverine Nutrient Plume (Godavari Delta Discharge)',
        likelihood: 32,
        status: 'UNLIKELY',
        supporting: [
          {
            metric: 'Chlorophyll Concentration',
            observed: `${chlorophyll} mg/m³`,
            note: 'Riverine silicate and micronutrients trigger diatom blooms.',
          },
        ],
        contradicting: [
          {
            metric: 'Surface Water Temperature',
            observed: `${sst}°C (Cold)`,
            note: 'Monsoon river plumes are typically warm (>29°C) and highly buoyant.',
          },
        ],
        missing: ['In-situ practical salinity (PSU) probe', 'Suspended sediment reflectance'],
        verificationTest: 'Check Sentinel-2 Band 4/8 turbid plume ratio.',
      },
      {
        id: 'HYP-HAB',
        title: 'Harmful Algal Bloom / Dinoflagellate Proliferation',
        likelihood: 42,
        status: 'INCONCLUSIVE',
        supporting: [
          {
            metric: 'Elevated Optical Fluorescence',
            observed: `${chlorophyll} mg/m³`,
            note: 'Dense microalgae blooms produce strong radiometric reflectance.',
          },
        ],
        contradicting: [
          {
            metric: 'Fisheries & Benthic Impact',
            observed: 'No fish mortality reported by harbor vessels',
            note: 'Typical toxic blooms lead to fish asphyxiation or surface scum.',
          },
        ],
        missing: ['Microscopic cellular enumeration', 'Dissolved oxygen profile'],
        verificationTest: 'Collect 1L water bottle sample for species taxonomy.',
      },
    ],
  };
}

export function generateCruiseSamplingPlan({
  port = 'Visakhapatnam Harbor',
  shipSpeedKnots = 9.0,
  maxHours = 12.0,
}) {
  const stations = [
    {
      id: 'STN-01',
      name: 'Inshore Baseline Station',
      lat: 17.65,
      lon: 83.35,
      depthM: 20,
      params: ['CTD Cast (0-20m)', 'Chlorophyll-a', 'Dissolved Oxygen', 'Nutrients (N/P)'],
      timeMins: 35,
      rationale: 'Establishes ambient inshore shelf baseline prior to upwelled plume.',
    },
    {
      id: 'STN-02',
      name: 'Core Upwelling Front Station',
      lat: 17.58,
      lon: 83.48,
      depthM: 50,
      params: ['CTD Cast (0-50m)', 'Phytoplankton Net Tow', 'Turbidity & PAR Profile'],
      timeMins: 45,
      rationale: 'Samples the maximum chlorophyll front and thermocline shoaling zone.',
    },
    {
      id: 'STN-03',
      name: 'Outer Shelf Break Station',
      lat: 17.48,
      lon: 83.62,
      depthM: 100,
      params: ['Deep CTD Cast (0-100m)', 'Zooplankton Multi-Net', 'Nutrient Chemistry'],
      timeMins: 55,
      rationale: 'Samples the shelf break where deep upwelling water originates.',
    },
    {
      id: 'STN-04',
      name: 'Offshore Open-Ocean Reference',
      lat: 17.35,
      lon: 83.80,
      depthM: 250,
      params: ['Deep CTD (0-200m)', 'Radiometer SST Verification'],
      timeMins: 60,
      rationale: 'Control station in warm, unperturbed oceanic water outside the front.',
    },
  ];

  const totalStationHours = stations.reduce((sum, s) => sum + s.timeMins, 0) / 60.0;
  const distNm = 64.0;
  const transitHours = distNm / shipSpeedKnots;
  const totalDuration = Number((transitHours + totalStationHours).toFixed(1));

  return {
    planId: 'CRUISE-AP-UPWELL-01',
    name: 'Andhra Cross-Shelf Oceanographic Transect',
    port,
    totalStations: stations.length,
    totalDistanceNm: distNm,
    estimatedHours: totalDuration,
    transitHours: Number(transitHours.toFixed(1)),
    onStationHours: Number(totalStationHours.toFixed(1)),
    isFeasible: totalDuration <= maxHours,
    stations,
    summary: `4-station cross-shelf transect departing ${port}. Roundtrip distance is ${distNm} NM requiring ~${totalDuration} hours total expedition time (${Number(transitHours.toFixed(1))}h cruising + ${Number(totalStationHours.toFixed(1))}h sampling). Feasible within single-day research vessel operational window.`,
  };
}
