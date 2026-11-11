# P02 – Qualitätsprüfung vom 11.11.2026

## Bestanden

- `node test-p02-data.mjs`: Küchen-, WC- und Badezimmervorlagen ohne 3D, individuelle Schnelllisten, Einzelaufgaben, Stoppuhr, Materialreservierung, Mengenprüfung inkl. mehrfacher Schnelltipps, 1 Paar = 2 Stück, einmalige atomare Lagerabbuchung.
- `node test-p01-data.mjs`: bestehender Raum-Putz-Workflow mit 3D-Objekten, Geräteausnahme, Bestandsschutz, Rückabwicklung bei Fehler und doppelsicherem Abschluss.
- `python test-p02-mobile.py`: 9 simulierte mobile Chromium-Durchläufe, jeweils 320, 390 und 412 px × Badezimmer/WC/Küche: Raum-Start, Schnelllisten-Umschaltung, Material-Schnellauswahl, manueller Verbrauch, Häkchen, Abschluss, Historie, ohne JavaScript-Fehler und horizontalen Überlauf.
- `python test-p01-mobile.py`: 3 bestehende mobile P01-Durchläufe, auch nach Verschieben der Materialeingabe.
- `node test-p02-release.mjs`: Version 0.26.0 synchron, 223 einmalig gelistete Offline-Assets vorhanden, Cache-Name richtig.
- JavaScript-Syntaxprüfung des Hauptmodules, der Reinigungs-UI, App-Einstiegsdatei und des Service Workers erfolgreich.

## Grenzen

- Die P02-/P01-Datenprüfungen verwenden eine transaktionsfähige IndexedDB-Simulation; die Browser-UI-Prüfung verwendet simulierte Datenmodule. Ein echtes Browser-End-to-End mit IndexedDB war hier wegen `ERR_BLOCKED_BY_ADMINISTRATOR` beim Aufruf der lokalen Test-URL nicht durchführbar.
- Kein Test auf dem tatsächlichen Vivo-Android-Gerät, kein gesicherter GitHub-Pages-Neulade-/Offline-Test.
- Die App kann tatsächliche Mengen nicht selbst messen. Die gewählte Menge muss vom Nutzer bestätigt bzw. korrigiert werden.

## Datenschutz

Alle Testdaten sind erfunden. Das ZIP enthält keine privaten Fotos oder Live-Daten des Geräts. Bei Updates im selben Browserprofil bleiben bestehende IndexedDB-Daten unangetastet; vorher ein vollständiges Backup durchführen.
