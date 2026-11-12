# Mein Alltag – Version 0.27.0 – P03 (12. November 2026)

## Putzmanager ohne 3D-Bedienoberfläche

Die interaktive 3D-/Grundrissansicht mit Kamerabewegung, Import und Export wurde aus dem sichtbaren Putzmanager entfernt. Aus Sicherheitsgründen bleiben alte Raum- und 3D-Daten als internes Legacy-Format für vorhandene Reinigungsobjekte erhalten.

## Neue schnelle Bedienung
1. Raum wählen: Bad, WC, Küche oder selbst erstellter Raum.
2. Reinigung starten und Raum-Stoppuhr laufen lassen.
3. Reinigungsbereiche mit einem Häkchen vollständig abhaken; Einzelschritte sind optional einblendbar.
4. Material-Schnellauswahl für lagernde Handschuhe, Reiniger und Tücher nutzen.
5. Beim bestätigten Abschluss wird Material atomar im Lagerhaus abgebucht; Zeit und Reinigungsverlauf bleiben gespeichert.

Fotos, Zusatzobjekte und Raumeinstellungen sind in einem optionalen ausklappbaren Bereich untergebracht.

## Tests und Grenzen
Geprüft: JavaScript-Syntax, Datenregression/Transaktionssimulation, Chromium-Mocktests mit 320/390/412 px und Dateihash-Vergleich zur ZIP. **Nicht** als bestanden behauptet: echter Android-/Offline-Praxistest, vollständiger Live-PWA-E2E-Test und öffentliche GitHub-Pages-Auslieferung auf dem Gerät.

**Vor dem Update lokale Daten sichern.** GitHub Pages veröffentlicht aus main; nach dem PWA-Update die Cache-Version 0.27.0 überprüfen. Die ZIP enthält die fortgeführte Word-Checkliste `bauhaus.docx`.
