# In-page Notifications

This project keeps notifications inside the browser only. It does not send
email, manage server-side subscribers, or run background push delivery.

The notification center stores preferences and history in `localStorage`:

```text
voc-info-volcano-preferences-v2
voc-info-notification-center-v1
```

## Default Channels

- USGS/HVO volcano alert level and aviation color changes at advisory/watch/warning levels.
- HVO official EP windows or model-estimate windows.
- Heuristic activity-signal threshold crossings.
- Significant USGS earthquakes: M3.0+ records an event, and M5.0+ is marked as danger.
- NOAA/NWS tsunami alerts.
- NOAA/NWS sudden severe-weather alerts, including warning/emergency wording, flash flood, high wind, hurricane, tropical storm, coastal flood, high surf, red flag, volcanic ash, and special marine alerts.
- Optional source-degradation alerts.

The default dashboard is the virtual `hawaii-island` view, so earthquake and
hazard notifications use the merged Big Island data collection rather than only
the Kilauea 50 km view.
