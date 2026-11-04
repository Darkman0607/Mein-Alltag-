# BW05 Prüfprotokoll – 04.11.2026

## Automatisierte Tests

- **BW05 Backend:** `node test-bw05-opening.mjs` – fünf Exemplare pro Pack, Pack wird nur atomar zusammen mit Kopien und Journal entfernt, Öffnungs-ID verhindert Doppelziehungen, 2 verschiedene Packs ergeben 10 Exemplare.
- **Ungültiger Kartenpool:** gewichtsungültiges Pack und fehlende Katalogkarte brechen ohne Verlust des ungeöffneten Packs ab.
- **Statistischer Test:** Gewichteter Zufallsselektor über 40.000 deterministische Simulationswerte gegen erwartete 60% (Toleranz ±2 Prozentpunkte); der eigentliche Ziehpfad verwendet `crypto.getRandomValues`, kein `Math.random`.
- **Wiederherstellung:** Paket-Inventar, Exemplare, Sammlungsfortschritt und Öffnungsjournal über Snapshot-Roundtrip erhalten.
- **Rückwärtskompatibilität:** BW01, BW02, BW03 und BW04 plus vorhandene Daten-/3D-/Backup-Regressionstests erneut bestanden; versionsabhängige Assertions an 0.24.5 angepasst.
- **Mobile Chromium-Ansicht:** `python test-bw05-ui.py` bei 320 / 390 / 412 px: individuelles Aufdecken, alle fünf Karten, Inventar minus eins, Öffnungsverlauf nach Neuaufbau der UI, kein Horizontalüberlauf.
- **Vorhandener Shop:** `python test-bw04-ui.py` bleibt erfolgreich; Styling und Kaufablauf nicht beschädigt.
- **Syntax-/Offline-Prüfung:** `node --check` über JS-Dateien und Service Worker; alle in `sw.js` referenzierten Offline-Assets existieren.

## Noch nicht nachgewiesen

- Echte GitHub-Pages-HTTP-/HTTPS-Navigation, Installation auf Android und physische Offline-/Service-Worker-Cache-Aktualisierung.
- Wiederherstellung auf einem zweiten Gerät mit echten Nutzerbeständen; vor dem Upgrade zunächst Backup erstellen.
- Echte kartenbasierte End-to-End-Öffnung im installierten Android-Chrome des Nutzers (ist durch Funktionstests vorbereitet, aber nicht als absolviert zu kennzeichnen).

**Kein Echtgeld; keine versteckten Garantien, keine künstlichen Münzen oder Karten.**
