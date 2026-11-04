# Mein Alltag – BW02 · Version 0.24.2

Datum: 04.11.2026 · Ausgangsbasis: BW01 V0.24.1.

## Neu: Kartenalbum (ohne künstlich erzeugte Gewinne)

- 100 **geplante und nummerierte Kartenplätze** in vier Kategorien: Anime-Frauen, Anime-Tiere, Traktoren & Maschinen, Monster (25 je Thema).
- Alle Plätze sind zunächst **nicht gestaltet** und **nicht gesammelt**. Es wurden **keine 100 Originalkartenbilder erstellt**.
- 4 abgestimmte Kategorie-Vorlagen als CSS und sieben Seltenheitsrahmen.
- Filter: Kategorien, alle/gesammelt/fehlend/Favoriten; Suche nach Name oder Kartennummer.
- Große Karten-Detailansicht, Exemplarübersicht (falls später Karten gezogen werden), Favoriten, echte Fortschrittsberechnung.
- Per Karte eigene Angaben anlegen/bearbeiten: Name, Seltenheit, Beschreibung, je Kategorie spezielle Details und eigenes Bild (PNG/JPEG/WebP, höchstens 8 MB beim Import, lokal komprimiert).
- Neue Dateien: `assets/reward-album.js`, `assets/reward-album-ui.js`.
- Bestehende IndexedDB V2 und das vollständige AES-Backup bleiben unverändert; Favoriten liegen im eigenen `belohnungswelt`-Bereich, Kartendaten in `bw-catalog`.
- Versions-/Cachekennung V0.24.2; `sw.js` enthält beide neuen Dateien für Offline-Betrieb.

## Verhalten und Grenzen

Eine angelegte Karte ist nur ein Eintrag im **Katalog**. Der Besitzstand wird ausschließlich aus `bw-instances` berechnet. Es werden keine XP oder Münzen vergeben. Shop, Booster, Tausch, Herstellung und Missionen sind noch nicht spielbar. Für 100 Originalkartenmotive werden individuelle Motive oder Vorlagen benötigt; sie wurden vom Nutzer für dieses Update nicht bereitgestellt.

### Installation

1. **Vorher verschlüsseltes Backup der installierten App erstellen und extern sichern.**
2. Die **Dateien aus der ZIP** in das GitHub-Repository `Darkman0607/Mein-Alltag-` auf `main` / `(root)` veröffentlichen. Nicht nur das ZIP als Datei hochladen.
3. Web-App aktualisieren; unter Mehr wird Version `0.24.2` angezeigt. Album über Belohnungswelt → Album öffnen.
4. Im Album eine Nummer antippen → **Karte gestalten**. Die eigene Grafik wird optimiert offline in der Datenbank gespeichert. Favoriten bleiben nach Neuladen erhalten.
5. Android-Liveprüfung: eigene Karte speichern, App neu starten, Sicherung testen; bei Problemen bitte die alte Sicherung bereithalten.

## Testprotokoll

- **PASS** `node test-bw02-album.mjs`: 100 Slots, 4 Kategorien, Sortierung/Filter, Besitz und Mehrfachexemplare, Favoriten, Kartendetails, keine Doppelnummern durch Bearbeiten, Gesamtbackup und Altbackup.
- **PASS** `python test-bw02-ui.py`: isolierter Chromium-UI-Test, 320/390/412 px, Kartenansicht, Dialog und Formular, keine horizontale Überbreite.
- **PASS** 8 vorhandene Node-Regressionstests aus BW01 zu Backup, Lagerhaus, Putzmanager und 3D-Funktionen.
- **BLOCKIERT** `python test-bw02-browser.py`: die Navigation zu simulierten HTTPS-Hosts ist in der Testumgebung durch `ERR_BLOCKED_BY_ADMINISTRATOR` gesperrt.
- **OFFEN** Live-Test GitHub Pages und PWA auf echtem Android; niemand kann diesen mit den isolierten Tests gleichsetzen.

Abbildungen unter `DOKUMENTATION/BW02_*` zeigen künstliche Testdaten, keine Karten des Nutzers.
