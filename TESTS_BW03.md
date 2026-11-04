# BW03 Testprotokoll – Mein Alltag 0.24.3

## Automatische Datenbank- und Sicherheitstests

PASS · Freigabe standardmäßig deaktiviert, andere Module inklusive Frauengesundheit nicht angebunden.
PASS · XP- und Münz-Belohnungsregeln veränderbar, ungültige negative oder unbekannte Felder werden abgewiesen.
PASS · Nur vollständiger bestätigter Raumabschluss nach vorheriger Aktivierung erhält virtuelle Punkte.
PASS · Nachträgliche Aktivierung vergütet bereits begonnene oder abgeschlossene Sitzungen nicht.
PASS · Verschiedene Reinigungen erzeugen verschiedene Buchungsschlüssel; derselbe Schlüssel kann nicht doppelt vergüten.
PASS · Wallet, unveränderliches Buchungsjournal, Lagerabbuchung und Putzabschluss in EINER IndexedDB-Transaktion.
PASS · Beschädigtes Wallet verhindert Abschluss und Lagerabbuchung; nach Korrektur ist dieselbe offene Reinigung erneut abschließbar.
PASS · Abschalten stoppt zukünftige Vergabe, lässt die schon verdienten Münzen erhalten.
PASS · Gesamtsicherung enthält Journal, Regeln und Wallet. Wiederherstellung stellt den vorherigen Zustand wieder her.

## Bestehende Module

PASS · Neun Regressionstests (Album BW02, Startimport, Backup F01, Putz P01, Lager L17, 3D W012/W013/W02/W02-HF02).
PASS · Javascript Syntax aller 41 app-internen .js-Dateien.
PASS · 81 Service-Worker-Einträge verweisen auf vorhandene Dateien.

## Isolierte Oberfläche

PASS · Chromium Android-artige Viewports 320, 390, 412 px – Regeländerung, Freigabe, Liste, kein horizontaler Überlauf.
HINWEIS · Das Testbild zeigt einen **künstlichen** Testkontostand und kein Guthaben des Nutzers.

## Noch offen

- Echte HTTPS-GitHub-Pages- und Android-PWA-Abnahme.
- Echte Wiederherstellung einer produktiv genutzten lokalen Sicherung auf einem zweiten Gerät; ohne Freigabe wird nicht automatisch migriert oder Daten zurückgesetzt.
- Weitere Modulanbindungen und zusätzliche Tätigkeitstypen.
