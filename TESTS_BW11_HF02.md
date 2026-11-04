# BW11-HF02 – Prüfprotokoll

**Release:** 0.25.2 (04.11.2026)

## Positiv
- [x] Eingehender Einmal-Öffnungsklick führt nach abgeschlossener Datenbankaktion sichtbar zur Packbühne.
- [x] Paketeinlauf, Aufreiß-/Lichtwelle und gestaffeltes Anzeigen fünf verdeckter Karten (CSS-Animationsnamen im Chromium-Test überprüft).
- [x] Einzelnes Aufdecken, fünf sofort aufdecken, kostenlose Vorschau, Wiederholung ohne zusätzliche Ziehung.
- [x] Einstellungen Full/Reduced/Off und `prefers-reduced-motion: reduce` respektiert.
- [x] Isolierte Chromium-Sichtprüfung 320, 390, 412 Pixel ohne horizontalen Überlauf oder JavaScript-Laufzeitfehler.
- [x] Ein reales Öffnungsereignis ergibt genau 5 simulierte Instanzen; keine zusätzliche Gutschrift durch erneutes Abspielen/Schließen.
- [x] Bestehende Kern- und UI-Regressionen BW01–BW09 und BW11 erfolgreich.
- [x] Kein Eingriff in bestehende `reward-opening.js`-Transaktionen, keine lokale Datenbankmigration.

## Grenzen
- [ ] Android-Praxistest mit echter installierter PWA und echten gespeicherten Nutzerdaten.
- [ ] HTTPS-Liveabnahme nach Service-Worker-Aktualisierung.
- [ ] Restore auf zweitem physischen Gerät, GPU-/Akkuverhalten.

Siehe außerdem `README_BW11_HF02.md` und `DOKUMENTATION/BW11_HF02_Packoeffnung_390px.png`.
