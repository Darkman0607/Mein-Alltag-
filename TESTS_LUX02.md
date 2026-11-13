# LUX02 – Testprotokoll

**Bestanden**
- `node test-lux02-data.mjs`: Vorlagen, zuletzt verwendet, Duplikate, Buchungs-Presets, Stück/Paar/Packung, Überentnahme, Putzmanager-Kompatibilität, HTML-Struktur.
- `node test-lux02-sw.cjs`: Service-Worker installiert 80 Kern-Dateien statt alle 227 als harte Voraussetzung.
- `node test-lux01-data.mjs`, `node test-l17-quick.mjs`, `node test-p03-data.mjs`, `node test-p04-data.mjs`: Regressionen.
- `node test-startup-import.mjs`: Modulimporte.
- `node --check` für geänderte JavaScript-Module: Syntax gültig.
- Versionsabgleich: `version.json`, `APP_VERSION` und `sw.js` enthalten 0.27.3.

**Nicht vollständig getestet**
- Ein echter Browserdurchlauf scheitert an `net::ERR_BLOCKED_BY_ADMINISTRATOR` auf `127.0.0.1` in dieser Testumgebung; das ist kein festgestellter Laufzeitfehler der App.
- Android-Installation, GitHub Pages Live-Deployment und reale WLAN/Offline-Übergänge müssen auf dem Endgerät geprüft werden.

**Datenrisiko**
- Kein automatisches Zurücksetzen oder Migrieren von Artikelbeständen. Vor dem Einspielen ein Backup erstellen.
