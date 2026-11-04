# Mein Alltag – BW01 · V0.24.1

Stand: 04.11.2026. Ausgangsbasis: BW00 V0.24.0 und verbindliche Design-1-Vorlage. **Kein Karten-/Booster-Gameplay** in diesem Update.

## Änderungen

- IndexedDB-Version 1 → 2, additive Migration ohne Löschen der fünf bisherigen Modulspeicher oder ihrer Daten.
- Sechster Modulspeicher `belohnungswelt` + sieben getrennte Stores `bw-series`, `bw-catalog`, `bw-booster-types`, `bw-instances`, `bw-wallet`, `bw-unopened` und `bw-journal`. 14 Stores insgesamt inkl. `meta`.
- Neues `assets/reward-data.js`: versioniertes Datensatzschema, sichere IDs, Kategorien/seltene Stufen, validiertes Anlegen und Lesen, Übersichtsabfrage. Vier Themen à 25 **geplante**, noch nicht erzeugte Karten.
- Neue vollständige passwortverschlüsselte Backups sichern alle 14 Stores. Alte Fünf-Modul-Sicherungen bleiben importierbar. Bei Altbackup-Restore bleiben bereits gespeicherte Belohnungsdaten erhalten; die alten fünf Bereiche und Metadaten werden ersetzt. Die App zeigt vor dem Restore den Umfang an.
- Belohnungswelt-Mehr-Ansicht meldet den aktiven Speicherzustand. Bildsprache und Design 1 unverändert. Version/Service Worker aktualisiert.

## Tests

- `node test-bw01-data.mjs` – PASSED: v1→v2-Migration, alte Bestände, UUIDs, Dublettenschutz, Wallet-/Karten-/Booster-Testdatensätze, AES-GCM-Backup und Restore, rückwärtskompatibles Altbackup, beschädigte Storelisten abgewiesen.
- `node test-f01-backup.mjs` – PASSED
- `node test-p01-data.mjs` – PASSED
- `node test-w02-kitchen.mjs` – PASSED
- `node test-w013-room-editor.mjs` – PASSED
- `node test-w012-room-editor.mjs` – PASSED
- `node test-w02-hf02-data.mjs` – PASSED
- `node test-l17-quick.mjs` – PASSED
- JS-Syntax-/ESM-Prüfung; 73 gelistete Offline-Dateien vorhanden.

**Nicht getestet:** Chromium-HTTP-Test gegen echte IndexedDB scheiterte an `net::ERR_BLOCKED_BY_ADMINISTRATOR` auf localhost. Daher keine echte Android-Abnahme, kein physischer PWA-/Cache-Live-Test. Das Browser-Skript `test-bw01-browser.py` bleibt als reproduzierbarer E2E-Test in der ZIP enthalten.

## Installation

1. Zuerst manuelles verschlüsseltes Backup aus der bisherigen App erstellen und extern sichern.
2. Für GitHub Pages Dateien aus diesem ZIP im Repository-Root veröffentlichen, nicht das ZIP als einzige Datei ablegen.
3. App in Chrome neu laden und unter „Mehr“ Version 0.24.1 sowie Datenbank v2 / 14 Speicher prüfen.
4. Vor Wiederherstellung einer Alt-Sicherung den beschriebenen Ersetzungsumfang im Dialog lesen.

**Offen:** Bilder/Vorlagen für BW02, echtes Kartenalbum, XP, Shop, Booster und Kartenöffnungen. Das Sammelsystem ist noch nicht spielbar.
