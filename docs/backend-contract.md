# Backend Contract

The backend wraps official public volcano, notice, earthquake, and historical
records in one JSON envelope for the frontend. It also returns a clearly labeled
non-official heuristic assessment. The assessment score is a heuristic activity
signal index, not an eruption probability. Do not present the assessment as an
official forecast, warning, evacuation notice, or travel directive.

## Shared Envelope

All endpoints return JSON:

```json
{
  "ok": true,
  "generatedAt": "2026-05-11T00:00:00.000Z",
  "endpoint": "/api/volcanoes",
  "data": {},
  "meta": {},
  "sources": [],
  "diagnostics": { "degraded": false, "errors": [] },
  "disclaimer": "..."
}
```

- `sources[]` contains upstream source metadata, request URL, cache state,
  status (`fresh`, `cached`, `stale`, or `failed`), notes, and any error.
- `diagnostics.degraded` is `true` when one or more sources failed or stale
  cache was used.
- Partial data can still return HTTP `200`; check `diagnostics` before
  presenting source freshness.

## `GET /api/volcanoes`

Returns USGS VSC volcano records plus a virtual `hawaii-island` record that
combines the primary Big Island volcano context used by the public dashboard.

Optional query params:

- `q`: searches name, region, VNUM, volcano code, alert level, and color code.
- `region`: case-insensitive region filter.
- `limit`: default `250`, clamped to `1..1000`.
- `offset`: default `0`.
- `refresh`: optional cache-busting flag. When present, upstream in-memory
  caches are bypassed for this request.

`data[]` item:

```json
{
  "id": "332010",
  "vnum": "332010",
  "volcanoCd": "hi3",
  "slug": "kilauea",
  "name": "Kilauea",
  "coordinates": { "lat": 19.421, "lon": -155.287 },
  "observatory": "hvo",
  "region": "Hawaii",
  "officialUrl": "https://www.usgs.gov/volcanoes/kilauea",
  "imageUrl": "...",
  "statusIconUrl": "...",
  "notice": { "id": "...", "synopsis": "...", "url": "..." },
  "alertLevel": "ADVISORY",
  "colorCode": "YELLOW",
  "alertDate": "2026-05-10 19:00:41",
  "colorDate": "2026-05-10 19:00:41",
  "nvewsThreat": "Very High Threat",
  "sourceIds": ["usgs-vsc"]
}
```

## `GET /api/volcano/:id/dashboard?days=7`

`:id` can be a VNUM, USGS `volcanoCd`, slug, volcano name, or the virtual
`hawaii-island` dashboard. `hawaii-island` merges Kilauea and Mauna Loa HANS
notices, HVO status context, Big Island earthquake collection, and NOAA/NWS
hazard alerts.

Optional query params:

- `days`: HANS notice and earthquake lookback, default `7`, clamped to `1..30`.
- `radiusKm`: earthquake radius around volcano coordinates, default `100`,
  clamped to `5..200`.
- `noaa`: set `0` to skip optional NOAA/NWS active alerts.
- `refresh`: optional cache-busting flag. When present, upstream in-memory
  caches are bypassed for this request.

`data` contains:

- `volcano`: same normalized volcano object as `/api/volcanoes`.
- `officialNotices`: `{ total, items[] }`; `items[].text` is stripped HANS HTML.
- `earthquakes`: events, stats, and daily counts from USGS FDSN GeoJSON.
- `history`: Smithsonian GVP volcano profile, eruption-history metadata, and
  HANS-derived official episode records when present in the selected lookback.
- `weatherAlerts`: optional NOAA/NWS active alerts near the volcano point.
  The `hawaii-island` dashboard checks multiple Big Island points so tsunami
  and sudden severe-weather alerts are less likely to be missed.
- `weather`: NOAA/NWS point metadata, daily forecast, and hourly forecast
  near the volcano point. Weather is travel context and is not used as
  volcano-prediction evidence.
- `assessment`: non-official expert model output.

`earthquakes.events[]` item:

```json
{
  "id": "hv74412345",
  "time": "2026-05-10T18:23:14.120Z",
  "mag": 2.4,
  "depthKm": 3.1,
  "place": "6 km S of Volcano, Hawaii",
  "type": "earthquake",
  "status": "reviewed",
  "url": "https://earthquake.usgs.gov/earthquakes/eventpage/hv74412345",
  "coordinates": { "lat": 19.381, "lon": -155.242 },
  "sourceIds": ["usgs-earthquakes"]
}
```

`history.episodes[]` item:

```json
{
  "id": "hans-HVO-2026-05-12-episode-47",
  "episodeNumber": 47,
  "start": "2026-05-12",
  "end": "2026-05-14",
  "windowLabel": "May 12 - May 14, 2026",
  "title": "Episode 47 forecast window",
  "status": "Forecast window",
  "source": "USGS HVO",
  "summary": "Official HVO window: May 12 - May 14, 2026.",
  "noticeId": "...",
  "url": "https://volcanoes.usgs.gov/hans2/view/notice/...",
  "sentUtc": "2026-05-12T19:00:00Z",
  "sourceIds": ["usgs-hans"]
}
```

Episode records are parsed from HANS notice text inside the `days` lookback.
The parser prefers forecast-window/onset/expected/likely episode context over
earlier mentions such as “Episode 46 ended”. Records are deduplicated by
`episodeNumber`; the newest notice keeps `sentUtc`, `url`, and status metadata,
while an earlier official window is preserved when the newest notice only
mentions the same episode generically. A shorter `days` value can omit older
HANS notices and therefore remove `history.episodes[]` entries.

Assessment shape:

```json
{
  "disclaimer": "This is a non-official activity signal index...",
  "likelihood": { "label": "elevated", "score": 52 },
  "timeframe": "weeks_or_condition_dependent",
  "confidence": { "label": "moderate", "score": 0.68 },
  "intensity": { "label": "moderate", "score": 42 },
  "drivers": [
    {
      "name": "alert_level",
      "direction": "raises",
      "weight": 12,
      "detail": "Official volcano alert level is ADVISORY.",
      "sourceIds": ["usgs-vsc"]
    }
  ],
  "uncertainties": [],
  "explanation": "...",
  "modelVersion": "heuristic-volcano-v1"
}
```

`likelihood.score` is retained for frontend compatibility, but it should be
displayed as a non-official activity signal index / heuristic score. It is not a
percent chance or probability of eruption, and `likelihood.label` is a bucket
for that index, not an official probability category.

`confidence.score` is also retained for frontend compatibility. Display it as
source/evidence coverage for the heuristic assessment, not forecast certainty.

Enums:

- `likelihood.label`: `very_low`, `low`, `elevated`, `high`, `very_high`
- `timeframe`: `official_notice_window`, `current_to_days`,
  `days_to_one_week`, `days_to_weeks`, `weeks_or_condition_dependent`,
  `no_short_term_official_window`
- `confidence.label`: `low`, `moderate`, `high`
- `intensity.label`: `background`, `minor`, `moderate`, `high`, `severe`

## Model Inputs

The model combines:

- USGS alert level and aviation color code, with dampening so paired
  alert/color codes do not double-count a single official status.
- USGS VSC synopsis and HANS current-activity text keywords, including current
  eruption/lava, ash, forecast window, inflation, tremor, gas, paused, and
  low-activity language.
- USGS earthquake frequency, shallow-event ratio, and max magnitude.
- Smithsonian GVP last eruption year, volcano profile, and evidence category as
  low-weight background context rather than short-term probability evidence.
- USGS NVEWS threat rank as low-weight background context; it reflects hazard
  exposure/history and does not force a short-term activity score.

Shallow earthquake ratio uses `depthKm <= 5`.

HANS text analysis is intentionally narrow. The parser prefers current-activity
sections such as Summary, Overview, Current Activity, Observations, Summit,
Rift Zone, Analysis, Prognosis, Outlook, and Remarks. It stops before generic
Background, Hazards, Resources, More Information, Contact, References, and Next
Notice sections so evergreen hazard/resource language does not trigger ash,
tephra, plume, or similar current-activity factors.

Confidence is also heuristic. It reflects source/evidence coverage from
available official status, notices, earthquake data, history records, notice
recency, and diagnostics. It is capped below 1.0 because the backend does not
ingest direct live deformation, gas, infrasound, webcam, or field-observation
feeds except where official notices summarize them. It should not be displayed
as certainty in a forecast.

## Official Sources

- USGS VSC volcano API:
  `https://volcanoes.usgs.gov/vsc/api/volcanoApi/geojson`
- USGS HANS public search:
  `POST https://volcanoes.usgs.gov/hans-public/api/search/search`
- USGS Earthquake FDSN GeoJSON:
  `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson`
- Smithsonian GVP WFS:
  `https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows`
- Optional NOAA/NWS active alerts:
  `https://api.weather.gov/alerts/active?point=lat,lon`
- NOAA/NWS point lookup:
  `https://api.weather.gov/points/{lat},{lon}`
- NOAA/NWS forecast endpoints resolved from the point lookup:
  `properties.forecast` and `properties.forecastHourly`
- Frontend map layers keep local SVG fallback tiles under `/map-tiles/*.svg`
  for deterministic validation and network failure recovery. The UI now uses
  external provider tiles by default for a real basemap; disable them with
  `?externalTiles=0` or `VITE_ENABLE_EXTERNAL_MAP_TILES=false`.

## Defensive Parsing

- USGS VSC is parsed as GeoJSON. Missing VNUM, volcano code, coordinates,
  status, color, notice, or image fields are returned as `null`.
- HANS field names are parsed defensively. The backend strips HTML and extracts
  alert/color codes from notice text when present. The expert model only scores
  the current-activity portion of notice text where possible.
- USGS earthquake depth comes from `geometry.coordinates[2]`; missing or
  nonnumeric values become `null`.
- Smithsonian WFS title-case properties such as `Volcano_Number` and
  `Last_Eruption_Year` are treated as optional.
- NOAA/NWS alerts and forecasts are optional travel/weather context and are
  not model prediction evidence.

## Cache And Failure Behavior

Default upstream timeout is 8 seconds (`API_TIMEOUT_MS`). User agent can be
overridden with `API_USER_AGENT`.

In-memory cache:

- USGS VSC volcanoes: 5 minute TTL, stale fallback up to 6 hours.
- HANS notices: 2 minute TTL, stale fallback up to 1 hour.
- USGS earthquakes: 30 second TTL, stale fallback up to 30 minutes.
- Smithsonian GVP: 24 hour TTL, stale fallback up to 7 days.
- NOAA/NWS alerts: 1 minute TTL, stale fallback up to 30 minutes.
- NOAA/NWS point metadata: 12 hour TTL, stale fallback up to 7 days.
- NOAA/NWS forecast/hourly: 3 minute TTL, stale fallback up to 2 hours.
