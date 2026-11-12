# P03 – technisches Testprotokoll vom 12.11.2026

PASS: JavaScript-Syntaxprüfung der fünf relevanten Dateien.
PASS: `node test-p03-data.mjs` – P01/P02-Regression, Gruppen-Häkchen, rückgängig, ungültige Gruppe, Material-Storno und transaktionssicherer Lagerabzug.
PASS: `python test-p03-mobile.py` – Chromium-Mocktests für Bad, WC und Küche bei 320, 390, 412 px mit Material und Abschluss.
PASS: `python test-p03-rooms-ui.py` – Raumverwaltung, Schnellliste, keine 3D-Oberfläche und kein horizontaler Überlauf bei 320, 390, 412 px.
PASS: Die sieben geänderten Laufzeitdateien stimmen per Git-Blob-SHA mit GitHub main überein.

OFFEN: Echte Android-Chrome-Installation, Offline-Neustart, echte IndexedDB-PWA-End-to-End-Integration und reale Lagerbuchung am Nutzergerät.

Die Browser-Mocks testen die Interaktion, aber ersetzen nicht den vollständigen Gerätetest. Vor Update lokale Daten sichern.
