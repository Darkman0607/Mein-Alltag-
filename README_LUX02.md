# Mein Alltag V0.27.3 – LUX02 (13.11.2026)

Update 2 von 6: Punkte 5, 10, 15, 23 und 24 der Lagerhaus-UX-Liste.

## Funktionen
- Auf der Lagerhaus-Startseite stehen die fünf zuletzt bearbeiteten Artikel mit „+ Einlagern“ / „− Entnehmen“. Erst die ausdrückliche Bestätigung löst eine Buchung aus.
- Bei Handschuhen sind 1 / 2 Paar, bei Reiniger 50 / 100 ml, bei Stückartikeln 1 / 2 Stück als Schnellmengen verfügbar. Die zentrale `bookStock()`-Logik verhindert Überentnahmen.
- Bei gleichnamigen Artikeln muss man sich für „Vorhandenen Bestand erhöhen“ oder „Trotzdem neu anlegen“ entscheiden. Bei ungeeigneter Einheit/Artikelart ist das Aufstocken deaktiviert.
- Neue Schnellvorlagen: Handschuhe, Reiniger, Putztücher, Müllbeutel, Schrauben und Kabel.
- Die detaillierte Artikelverwaltung bekommt ebenfalls passende Mengen-Presets und Duplikat-Hinweise.

## Fehlerursache und Korrektur für die Versionsanzeige
Bei 0.27.2 war `version.json` bereits 0.27.2, aber `assets/app.js` enthielt noch `APP_VERSION='0.27.1'`. Darum stand am Startbildschirm weiterhin 0.27.1. Das ist ein Codefehler der Anzeige, **kein sicherer Beleg**, dass die Dateien nicht aktualisiert wurden. In 0.27.3 ist `APP_VERSION` aktualisiert.

Die PWA sucht auf Start, beim Wiederaufwecken und nach Wiederherstellung des Internets nach Updates. Der neue Service Worker lädt zuerst 80 Kern-Dateien; optionale Galerie-Bilder blockieren die Installation nicht. Die vorhandenen Daten in IndexedDB bleiben erhalten.

## Abnahme
- Automatische Datentests und bestehende Putzmanager-Regressionen bestanden.
- Chromium/Android-Echtbedienung in dieser Laufzeit nicht möglich (lokale Testadresse administrativ geblockt).
- GitHub-Pages-Liveanzeige auf deinem Handy offen.

## Auf dem Handy (ohne Datenverlust)
1. Vorher vollständige Sicherung unter „Mehr & Einstellungen“ durchführen.
2. App bei aktiviertem WLAN öffnen → „Mehr & Einstellungen“ → „Auf Updates prüfen“.
3. Falls die Version noch alt ist: App vollständig schließen und neu öffnen; gegebenenfalls die GitHub-Pages-Seite einmal in Chrome online öffnen.
4. Nicht „Daten löschen“, „Speicherinhalt löschen“ oder die Testdaten-Zurücksetzung drücken, wenn du deine Bestände behalten möchtest.
