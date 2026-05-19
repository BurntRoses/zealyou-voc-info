const DISCLAIMER =
  "This is a non-official activity signal index for situational awareness only. It is not an official USGS, Smithsonian, NOAA, civil-defense, or emergency-management forecast, and it is not an eruption probability.";

const ALERT_WEIGHTS = {
  WARNING: 26,
  WATCH: 17,
  ADVISORY: 7,
  NORMAL: -12,
  GREEN: -12,
  YELLOW: 7,
  ORANGE: 17,
  RED: 26,
  UNASSIGNED: 0,
};

const CURRENT_ERUPTION_RE =
  /\b(currently erupting|is erupting|eruption (?:is )?(?:continuing|continues|ongoing)|eruptive activity (?:continues|is ongoing)|active lava|lava is (?:erupting|fountaining|flowing)|lava flows? (?:continue|remain active|are active)|lava fountain(?:ing)? (?:continues|is ongoing)|active fissure)\b/i;
const ASH_RE =
  /\b(ash plume|volcanic ash|ashfall|explosion(?:s)?|explosive activity|ballistic)\b/i;
const WINDOW_RE =
  /\b(forecast window|likely|expected to|may occur|could begin|onset .*expected|suggests that .*will occur)\b/i;
const DEFORMATION_RE =
  /\b(inflation|deflation|uplift|tiltmeter(?:s)?|(?:increased|elevated|rapid|significant).*deformation|deformation.*(?:elevated|increased|rapid|significant))\b/i;
const SEISMIC_RE =
  /\b(tremor|earthquake swarm|seismicity.*(?:elevated|increased)|increased.*seismicity)\b/i;
const GAS_RE =
  /\b(SO2|sulfur dioxide|sulphur dioxide|elevated gas|increased gas|high gas|gas plume)\b/i;
const PAUSED_RE =
  /\b(currently paused|eruption.*paused|pause in eruptive activity|paused eruptive activity)\b/i;
const QUIET_RE =
  /\b(no eruption is occurring|not erupting|no signs? of imminent eruption|no significant|near background|normal background|activity.*low|seismicity.*low|remain(?:s)? low|quiet)\b/i;

const KEYWORDS = [
  { id: "current_eruption", re: CURRENT_ERUPTION_RE, w: 12, label: "Current-activity text mentions ongoing eruption or active lava." },
  { id: "ash", re: ASH_RE, w: 8, label: "Current-activity text mentions ash, explosions, or ballistic activity." },
  { id: "window", re: WINDOW_RE, w: 7, label: "Official notice uses near-term forecast-window language." },
  { id: "deformation", re: DEFORMATION_RE, w: 6, label: "Current-activity text mentions inflation, tilt, uplift, or elevated deformation." },
  { id: "seismic", re: SEISMIC_RE, w: 6, label: "Current-activity text mentions elevated tremor or seismicity." },
  { id: "gas", re: GAS_RE, w: 3, label: "Current-activity text mentions elevated gas or SO2." },
  { id: "paused", re: PAUSED_RE, w: -10, label: "Official notice says eruptive activity is paused." },
  { id: "quiet", re: QUIET_RE, w: -12, label: "Official notice says activity is low, near background, or not erupting." },
];

const HANS_ACTIVITY_HEADING_RE =
  /^(?:activity summary|summary|overview|current activity|recent activity|observations?|summit observations?|rift zone observations?|east rift zone observations?|southwest rift zone observations?|analysis|prognosis|outlook|remarks)\b/i;
const HANS_STOP_HEADING_RE =
  /^(?:background|hazards?|volcanic hazards?|resources?|more information|additional information|contact(?: information)?|for more information|references?|next notice|subscribe)\b/i;
const HANS_GENERIC_HEADING_RE = /^[A-Z][A-Za-z0-9 /(),.-]{2,80}:\s*/;

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function code(value) {
  return String(value ?? "").trim().toUpperCase();
}

function likelihoodLabel(score) {
  if (score >= 85) return "very_high";
  if (score >= 65) return "high";
  if (score >= 35) return "elevated";
  if (score >= 18) return "low";
  return "very_low";
}

function intensityLabel(score) {
  if (score >= 78) return "severe";
  if (score >= 58) return "high";
  if (score >= 36) return "moderate";
  if (score >= 14) return "minor";
  return "background";
}

function confidenceLabel(score) {
  if (score >= 0.72) return "high";
  if (score >= 0.44) return "moderate";
  return "low";
}

function pushDriver(drivers, name, direction, weight, detail, sourceIds) {
  drivers.push({ name, direction, weight, detail, sourceIds });
}

function buildNoticeText(volcano, notices) {
  return [volcano?.notice?.synopsis, ...(notices ?? []).slice(0, 5).flatMap((n) => [n.synopsis, currentActivityText(n.text)])]
    .filter(Boolean)
    .join("\n\n");
}

function currentActivityText(text) {
  const source = String(text ?? "")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!source) return "";

  const lines = source
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const selected = [];
  let capturing = false;

  for (const line of lines) {
    if (HANS_STOP_HEADING_RE.test(line)) {
      capturing = false;
      continue;
    }

    if (HANS_ACTIVITY_HEADING_RE.test(line)) {
      capturing = true;
      const content = line.replace(HANS_GENERIC_HEADING_RE, "").trim();
      if (content) selected.push(content);
      continue;
    }

    if (capturing) {
      if (HANS_GENERIC_HEADING_RE.test(line) && !HANS_ACTIVITY_HEADING_RE.test(line)) {
        capturing = false;
        continue;
      }
      selected.push(line);
    }
  }

  if (selected.length > 0) return selected.join("\n");

  const preamble = source
    .split(/\n\s*(?:Background|Hazards?|Volcanic Hazards?|Resources?|More Information|Additional Information|Contact(?: Information)?|For More Information|References?|Next Notice|Subscribe)\b[:\s]/i)[0]
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) =>
      line &&
      !/^(?:Current Volcano Alert Level|Current Aviation Color Code|Previous Volcano Alert Level|Previous Aviation Color Code):/i.test(line),
    );

  return preamble.slice(0, 8).join("\n");
}

function effectiveCodeContributions(alertScore, colorScore) {
  let alert = alertScore;
  let color = colorScore;

  if (alertScore !== 0 && colorScore !== 0) {
    if (Math.abs(alertScore) >= Math.abs(colorScore)) {
      color = Math.round(colorScore * 0.35);
    } else {
      alert = Math.round(alertScore * 0.35);
    }
  }

  return { alert, color, score: alert + color };
}

function analyzeCodes(volcano, notices, drivers) {
  const noticeCodes = notices?.find((notice) => notice.extractedCodes?.alertLevel || notice.extractedCodes?.colorCode)?.extractedCodes;
  const alertLevel = code(noticeCodes?.alertLevel ?? volcano?.alertLevel);
  const colorCode = code(noticeCodes?.colorCode ?? volcano?.colorCode);
  const alertScore = ALERT_WEIGHTS[alertLevel] ?? 0;
  const colorScore = ALERT_WEIGHTS[colorCode] ?? 0;
  const contributions = effectiveCodeContributions(alertScore, colorScore);

  if (alertLevel && alertLevel !== "UNASSIGNED") {
    pushDriver(drivers, "alert_level", contributions.alert >= 0 ? "raises" : "lowers", contributions.alert, `Official volcano alert level is ${alertLevel}.`, noticeCodes?.alertLevel ? ["usgs-hans"] : ["usgs-vsc"]);
  }
  if (colorCode && colorCode !== "UNASSIGNED") {
    pushDriver(drivers, "aviation_color_code", contributions.color >= 0 ? "raises" : "lowers", contributions.color, `Official aviation color code is ${colorCode}; color and alert codes are dampened together to avoid double-counting one official status.`, noticeCodes?.colorCode ? ["usgs-hans"] : ["usgs-vsc"]);
  }

  return { alertLevel: alertLevel || null, colorCode: colorCode || null, score: contributions.score };
}

function analyzeText(text, drivers) {
  let score = 0;
  for (const rule of KEYWORDS) {
    if (rule.re.test(text)) {
      score += rule.w;
      pushDriver(drivers, rule.id, rule.w >= 0 ? "raises" : "lowers", rule.w, rule.label, ["usgs-hans", "usgs-vsc"]);
    }
  }
  return score;
}

function analyzeEarthquakes(earthquakes, drivers) {
  const stats = earthquakes?.stats;
  if (!stats) return 0;

  let score = 0;
  const countPerDay = Number(stats.countPerDay ?? 0);
  const shallowRatio = Number(stats.shallowRatio ?? 0);
  const maxMagnitude = Number(stats.maxMagnitude ?? 0);
  let freqWeight = 0;

  if (countPerDay >= 50) freqWeight = 15;
  else if (countPerDay >= 20) freqWeight = 10;
  else if (countPerDay >= 5) freqWeight = 5;

  score += freqWeight;
  if (freqWeight) {
    pushDriver(drivers, "earthquake_frequency", "raises", freqWeight, `${stats.count} earthquakes in ${earthquakes.days} days (${countPerDay.toFixed(2)}/day) within ${earthquakes.radiusKm} km.`, ["usgs-earthquakes"]);
  } else if (stats.count === 0) {
    score -= 4;
    pushDriver(drivers, "no_nearby_earthquakes", "lowers", -4, `No USGS earthquake events were returned for ${earthquakes.days} days within ${earthquakes.radiusKm} km.`, ["usgs-earthquakes"]);
  }

  if (shallowRatio >= 0.6 && stats.count >= 5) {
    score += 8;
    pushDriver(drivers, "shallow_earthquake_ratio", "raises", 8, `${Math.round(shallowRatio * 100)}% of earthquakes are at or above ${earthquakes.shallowThresholdKm} km depth.`, ["usgs-earthquakes"]);
  }

  let magWeight = 0;
  if (maxMagnitude >= 4) magWeight = 10;
  else if (maxMagnitude >= 3) magWeight = 6;
  else if (maxMagnitude >= 2.5) magWeight = 3;
  score += magWeight;
  if (magWeight) {
    pushDriver(drivers, "maximum_magnitude", "raises", magWeight, `Maximum nearby earthquake magnitude is M${maxMagnitude.toFixed(1)}.`, ["usgs-earthquakes"]);
  }

  return score;
}

function analyzeHistory(volcano, history, drivers) {
  let score = 0;
  const currentYear = new Date().getUTCFullYear();
  const lastYear = history?.lastEruptionYear;

  if (Number.isFinite(lastYear)) {
    let weight = 0;
    if (lastYear >= currentYear) weight = 4;
    else if (currentYear - lastYear <= 5) weight = 3;
    else if (currentYear - lastYear <= 25) weight = 1;
    score += weight;
    if (weight) {
      pushDriver(drivers, "recent_eruption_history", "raises", weight, `Smithsonian GVP lists the last eruption year as ${lastYear}; this is background context, not a short-term forecast.`, ["smithsonian-gvp"]);
    }
  }

  if (/observed/i.test(history?.evidenceCategory ?? "")) {
    score += 1;
    pushDriver(drivers, "observed_eruption_record", "raises", 1, `GVP evidence category is ${history.evidenceCategory}.`, ["smithsonian-gvp"]);
  }

  if (/very high/i.test(volcano?.nvewsThreat ?? "")) {
    score += 2;
    pushDriver(drivers, "nvews_threat", "raises", 2, "USGS NVEWS threat ranking is Very High Threat. This reflects exposure and history, not a short-term forecast.", ["usgs-vsc"]);
  }

  return score;
}

function inferTimeframe(score, codes, noticeText, history) {
  const latestEpisode = Array.isArray(history?.episodes) ? history.episodes[0] : null;
  if (latestEpisode?.sourceType === "model" || latestEpisode?.type === "model" || /model/i.test(`${latestEpisode?.status ?? ""} ${latestEpisode?.source ?? ""}`)) {
    return "hvo_model_estimate_window";
  }
  if (/\bforecast window\b/i.test(noticeText)) return "official_notice_window";
  if (codes.alertLevel === "WARNING" || codes.colorCode === "RED") return "current_to_days";
  if (
    score >= 35 &&
    !QUIET_RE.test(noticeText) &&
    /\b(within the next (?:few )?(?:hours?|days?|week)|expected to|likely|may occur|onset)\b/i.test(noticeText)
  ) {
    return "days_to_one_week";
  }
  if (codes.alertLevel === "WATCH" || codes.colorCode === "ORANGE" || score >= 60) return "days_to_weeks";
  if (codes.alertLevel === "ADVISORY" || codes.colorCode === "YELLOW" || score >= 40) return "weeks_or_condition_dependent";
  return "no_short_term_official_window";
}

function inferIntensity(codes, noticeText, likelihoodScore) {
  let score = Math.round(likelihoodScore * 0.35);
  if (codes.colorCode === "RED" || codes.alertLevel === "WARNING") score += 22;
  else if (codes.colorCode === "ORANGE" || codes.alertLevel === "WATCH") score += 13;
  else if (codes.colorCode === "YELLOW" || codes.alertLevel === "ADVISORY") score += 5;
  if (ASH_RE.test(noticeText)) score += 10;
  if (CURRENT_ERUPTION_RE.test(noticeText)) score += 10;
  if (WINDOW_RE.test(noticeText)) score += 3;
  if (PAUSED_RE.test(noticeText)) score -= 8;
  if (QUIET_RE.test(noticeText)) score -= 6;
  if (WINDOW_RE.test(noticeText) && /\b(?:(?:episode|episo|epis\.?|ep\.?)\s*(?:no\.?|number)?[\s#:-]*\d+|fountain(?:ing)?)\b/i.test(noticeText)) {
    score = Math.max(score, 36);
  }
  score = clamp(score);
  return { label: intensityLabel(score), score };
}

function hasHistory(history) {
  return Boolean(
    history?.profile ||
      history?.lastEruptionYear ||
      history?.geologicalSummary ||
      history?.evidenceCategory,
  );
}

function noticeIsRecent(notice) {
  const sentMs = Number.isFinite(notice?.sentUnixtime)
    ? notice.sentUnixtime * 1000
    : Date.parse(notice?.sentUtc ?? "");
  if (!Number.isFinite(sentMs)) return false;
  return Date.now() - sentMs <= 3 * 24 * 60 * 60 * 1000;
}

function confidence({ volcano, notices, earthquakes, history, diagnostics }) {
  let score = 0.16;
  if (volcano?.alertLevel && volcano.alertLevel !== "UNASSIGNED") score += 0.12;
  if (volcano?.colorCode && volcano.colorCode !== "UNASSIGNED") score += 0.1;
  if ((notices?.length ?? 0) > 0) score += 0.18;
  if ((notices ?? []).some(noticeIsRecent)) score += 0.04;
  if (earthquakes?.stats) score += 0.14;
  if (hasHistory(history)) score += 0.08;
  score -= Math.min(0.24, (diagnostics?.errors?.length ?? 0) * 0.08);
  return { label: confidenceLabel(score), score: Number(clamp(score, 0, 0.88).toFixed(2)) };
}

function uncertainties({ volcano, notices, earthquakes, history, diagnostics }) {
  const items = [
    "The model does not use live deformation, gas, infrasound, webcam, or field-observation feeds except where they are summarized in official public notices.",
  ];
  if (!volcano?.alertLevel || volcano.alertLevel === "UNASSIGNED") items.push("USGS alert level is unassigned or unavailable.");
  if (!volcano?.colorCode || volcano.colorCode === "UNASSIGNED") items.push("USGS aviation color code is unassigned or unavailable.");
  if ((notices?.length ?? 0) === 0) items.push("No recent HANS notice was returned for the selected window.");
  if (!earthquakes?.stats || earthquakes.stats.count === 0) items.push("Recent earthquake evidence is absent or sparse in the selected radius/window.");
  if (!hasHistory(history)) items.push("Smithsonian GVP historical record was unavailable.");
  if ((diagnostics?.errors?.length ?? 0) > 0) items.push("One or more official sources failed and may be represented by stale cache or omitted data.");
  return items;
}

function explanation(volcano, likelihood, confidenceValue, drivers) {
  const topDrivers = [...drivers].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)).slice(0, 4);
  const driverText = topDrivers.length
    ? topDrivers.map((d) => d.detail).join(" ")
    : "No strong public-data driver was detected.";
  const signalLabel = likelihood.label.replace(/_/g, " ");
  const article = /^[aeiou]/i.test(signalLabel) ? "an" : "a";
  return `${volcano?.name ?? "This volcano"} has ${article} ${signalLabel} non-official activity signal index with ${confidenceValue.label} source coverage. Main drivers: ${driverText}`;
}

export function buildExpertAssessment({ volcano, officialNotices, earthquakes, history, diagnostics }) {
  const drivers = [];
  const notices = officialNotices?.items ?? [];
  const text = buildNoticeText(volcano, notices);
  const codes = analyzeCodes(volcano, notices, drivers);
  let score = 12;
  score += codes.score;
  score += analyzeText(text, drivers);
  score += analyzeEarthquakes(earthquakes, drivers);
  score += analyzeHistory(volcano, history, drivers);
  score = clamp(Math.round(score));

  const likelihood = { label: likelihoodLabel(score), score };
  const confidenceValue = confidence({ volcano, notices, earthquakes, history, diagnostics });
  const intensity = inferIntensity(codes, text, score);
  const timeframe = inferTimeframe(score, codes, text, history);

  return {
    disclaimer: DISCLAIMER,
    likelihood,
    timeframe,
    confidence: confidenceValue,
    intensity,
    drivers: drivers.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)),
    uncertainties: uncertainties({ volcano, notices, earthquakes, history, diagnostics }),
    explanation: explanation(volcano, likelihood, confidenceValue, drivers),
    modelVersion: "heuristic-volcano-v1",
  };
}

export { DISCLAIMER as MODEL_DISCLAIMER };
