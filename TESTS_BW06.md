# BW06 – Testprotokoll / Abnahme

Stand: 04.11.2026 · Release V0.24.6

| Prüfung | Ergebnis |
|---|---|
| `node test-bw01-data.mjs` bis `node test-bw06-series.mjs` | 6/6 bestanden |
| `node test-f01-backup.mjs`, `node test-p01-data.mjs`, `node test-l17-quick.mjs` | bestanden |
| `node test-ls02-crypto.mjs`, `node test-startup-import.mjs` | bestanden |
| `node test-w012-room-editor.mjs`, `node test-w013-room-editor.mjs`, `node test-w02-hf02-data.mjs`, `node test-w02-kitchen.mjs` | bestanden |
| 100 SVGs, 100 eindeutige Namen/Nummern/IDs/Dateihashes | bestanden |
| 4 x 25 / 7 Seltenheiten, 100 Offline-Cache-Einträge | bestanden |
| Import: zuvor bearbeitete Karte bleibt unverändert, keine Münzen/Exemplare, Wiederholung idempotent, Backup/Restore | bestanden |
| Korrupte Doppelbelegung: Import vollständig abgebrochen | bestanden |
| BW04-Shop und BW05-Booster isoliertes Chromium (320/390/412) | bestanden |
| BW06-Album isoliertes Chromium (320/390/412) | bestanden |
| Historische `test-d01-drive.mjs`, `test-hf01-release.mjs`, `test-w013-release.mjs` | nicht anwendbar – alte festcodierte Versionsnummern, im Original belassen |
| Öffentlicher Pages-HTTPS-Aufruf, PWA auf echtem Android-Gerät, Restore auf Zweitgerät | offen / nicht geprüft |

**Wichtig:** Tests sind automatisiert oder isoliert in Chromium, nicht die Abnahme auf deinem Handy.
