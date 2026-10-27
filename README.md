# Mein Alltag – Beta V0.1.0

Das erste funktionsfähige Grundgerüst (G01 / V0) mit fünf klar getrennten Bereichen:
1. Lagerhaus
2. Frauengesundheit
3. Familienplaner
4. Putzmanager
5. M.R Hausservice

## Funktionen der V0
- Dunkles Premium-Design nach Bildreferenz **Vorschlag 2**; 3D-Symbole direkt aus der hochgeladenen Referenz ausgeschnitten.
- Große Touch-Kacheln, responsiv für Android und Desktop.
- Navigation (Start, Kalender, Suche, Mehr) und Rücknavigation über Hash-Routing samt Browserverlauf.
- Klare Moduldateien unter `modules/`.
- IndexedDB mit **fünf strikt separaten Object Stores** für die Module plus `meta`.
- Lokale Startnotiz pro Modul als überprüfbarer Speichertest; keine Cloud-Verbindung oder Kontopflicht.
- Progressive Web App (Manifest, Icons, offlinefähiger Service Worker, Updatehinweis).
- Monatskalender und Modulsuche bereits bedienbar. Fachfunktionen (Lagerverwaltung, Zyklus, Kundenverwaltung usw.) folgen in späteren Updates.

## Veröffentlichung mit GitHub Pages
Repository `Darkman0607/Mein-Alltag-`, Branch `main`, Verzeichnis `/(root)`.
Für die Veröffentlichung muss der **Inhalt des Ordners `app/` direkt ins Repository-Stammverzeichnis** hochgeladen werden, insbesondere `index.html`.
Danach: **Settings → Pages → Build and deployment → Deploy from a branch → main → /(root) → Save**.

Online-Adresse nach erfolgreicher Veröffentlichung:
`https://darkman0607.github.io/Mein-Alltag-/`

## Prüfung
Die technische Testliste steht in `TESTS.md` und im separat mitgelieferten Word-Dokument. Browser- und Android-Gerätetests müssen vor der Freigabe auf dem jeweiligen Gerät überprüft werden.

## Datenschutz
Persönliche Daten werden nur im lokalen Browserprofil per IndexedDB gespeichert. Es gibt derzeit **keine Verschlüsselung, PIN, Datensicherung oder Synchronisierung**. Insbesondere sensible Gesundheitsdaten sollten erst nach Implementierung eines passenden Schutzkonzepts eingetragen werden. App deinstallieren oder Browserdaten löschen kann lokale Daten entfernen.

## Installationshilfe V0.0.2
- Native Chrome-Installation, soweit `beforeinstallprompt` vom Browser bereitgestellt wird, über **App installieren** auslösbar.
- Andernfalls wird die korrekte Android-Chrome-Menüfolge angezeigt; eine WebAPK kann nicht erzwungen werden.
- Installationsstatus in **Mehr**; aktualisierter Offline-Cache; eindeutig als `any` deklarierte App-Icons.
- Kein Eingriff in die fünf Modulicons, Moduldaten oder die Kachelanordnung.


## Lagerhaus Update L01 – Version 0.1.0 (27.10.2026)
- Neues Lagerhaus: Garage, Kellerabteil, Lagerraum, Werkstatt und freie Räume erstellen, umbenennen und löschen.
- Abmessungen optional: fertige kleine/mittlere/große Vorlagen oder eigene Länge/Breite/Höhe.
- Schematische isometrische 3D-Vorschau (noch nicht maßstabsgetreu).
- Fünf erste Möbeltypen: Metallregal, Holzregal, Schrank, Lagerbox, Werkbank.
- Möbel auswählen, mit Pfeiltasten bewegen und in 90°-Schritten drehen. Finger-Drag-and-drop folgt in L03.
- Die Daten bleiben getrennt im bisherigen lagerhaus-IndexedDB-Store erhalten.
- Mastercheckliste: `DOKUMENTATION/bauhaus.docx` mit 36 nummerierten Updates, L01 angekreuzt.
- Noch keine Artikel-/Fachverwaltung und noch keine externe Datensicherung!

### Prüfstatus L01
JavaScript-Syntax (`node --check`) sowie statische und gezielte Rendering-Unitprüfungen bestanden.
Browser-End-to-End-Test lokal durch Umgebungsrichtlinie blockiert; echter Android/Chrome-Gerätetest nach GitHub-Veröffentlichung erforderlich.
