# BW12 – Prüfergebnis 0.25.3 · 05.11.2026

## Erfolgreich

- [x] 20 unterschiedliche WebP-Dateien, gültige RIFF/WebP-Signatur, eindeutige SHA256-Hashes und geringe Dateigröße.
- [x] Jede Datei wird über die unveränderte BW06-Karten-ID und sichere lokale Startbildreferenz erkannt.
- [x] Alle 20 Bild-URLs in den Offline-Cache aufgenommen, keine fehlende Datei und kein doppelter Cache-Eintrag.
- [x] Benutzerbilder werden im Album vor Standardbildern gewählt.
- [x] Album, Shop und Booster-Packbühne verwenden dieselbe sichere Standardbildauflösung.
- [x] Node-Regressionen BW01, BW02, BW03, BW04, BW05, BW07, BW08, BW09 und BW11 bestanden.
- [x] Chromium-Album BW11 auf 320/390/412 px, reduzierte Animation, Modal, Bestand, Overflow bestanden.
- [x] Chromium-Boostertest BW11-HF02 auf 320/390/412 px, kostenlose Vorschau, echte simulierte Ziehung, Wiederholung ohne erneute Buchung, Accessibility der Bedienung bestanden.
- [x] Chromium-Browser-Navigationsprüfung der echten App auf 320/390/412 px bestanden.
- [x] App-Version 0.25.3 stimmt mit `version.json` und Service Worker überein.

## Nicht durch dieses Prüfprotokoll abgedeckt

- [ ] Physischer Test auf Android (Installations-/Cache-Update und echte Bestandsdaten).
- [ ] Verifizierter GitHub-Main-Commit einschließlich 20 Bildassets und Word-Dateien.
- [ ] Öffentliche GitHub-Pages-Liveabnahme und Offline-Start nach GitHub-Push.
- [ ] Langzeittest auf Android bezüglich Ressourcen und Akkubelastung.
