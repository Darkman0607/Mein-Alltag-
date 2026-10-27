# Testplan V0.0.1

## Automatisiert überprüfbar
- [ ] Alle fünf Moduldateien vorhanden und unabhängig ladbar
- [ ] HTML, JS, Manifest korrekt strukturiert
- [ ] Service Worker nennt alle für den Offline-Start erforderlichen App-Dateien
- [ ] Keine Netzwerk- oder Cloud-Zwangsverbindung in den Moduldateien
- [ ] App-Icons (192px, 512px) vorhanden
- [ ] Der ZIP-Inhalt besitzt `index.html` im Stammverzeichnis

## Auf GitHub Pages / Android manuell überprüfen
- [ ] Startseite zeigt fünf Module; 2×2 + breite Hausservice-Kachel
- [ ] Jede Kachel öffnet genau den eigenen Modulbereich
- [ ] Zurück-Taste / Android-Browser-Zurück öffnet vorherige Seite
- [ ] Start, Kalender, Suche und Mehr sind bedienbar
- [ ] Kalender vor/zurück wechselt den Monat
- [ ] Suche filtert Module nach Namen
- [ ] Notiz in jedem Modul speichern; nach Neustart laden
- [ ] Notizen verschiedener Module überschreiben sich nicht
- [ ] App lässt sich in Chrome installieren
- [ ] Nach einmaligem vollständigen Laden funktioniert sie offline
- [ ] Neue Version wird nach einem Folge-Update erkannt

Wichtig: Automatisierte Tests sind kein Ersatz für reale Tests auf dem Vivo X300 Pro.

## V0.0.2 – Installationshilfe
- [x] Installationsschaltfläche und Chrome-Menühilfe hinzugefügt
- [x] Ereignisse `beforeinstallprompt` und `appinstalled` eingebunden
- [x] `manifest.webmanifest` als JSON geprüft (192/512, start_url, scope, display, prefer_related_applications)
- [x] Service-Worker-Cacheversion auf v0-0-2 erhöht
- [ ] Auf Vivo X300 Pro: native Installationsdialoge, Google-Play-Dienste und Browsermenü prüfen
- [ ] Nach Installation: Offline-Start, Datenbank und Updateverhalten auf Gerät prüfen


## L01 (27.10.2026) – Teststand
- PASS: JS-Syntax aller Module (`node --check`).
- PASS: SVG-Rendering, HTML-Escaping, Routing-/Offline-Cache-/DB-Store-Statischkonsistenz (`unit_test.mjs`).
- NICHT AUSGEFÜHRT: Browser-End-to-End-Test (lokales Chromium ist durch Administratorrichtlinie für Navigation gesperrt).
- NOCH OFFEN: Android-Gerätetest mit Installation und tatsächlicher Offline-Nutzung.

## L03 (27.10.2026) – Prüfstand
- [x] Node-Test für 15 Möbel, Größen/Drehungen, Kollisions-/Grenzprüfung, Raster/Positionslogik und SVG-Escaping.
- [x] JavaScript-Syntax aller Module und Manifest-JSON geprüft.
- [x] ZIP-Vollständigkeit und Dokumentation kontrolliert.
- [ ] Browser-E2E (Chromium: `ERR_BLOCKED_BY_ADMINISTRATOR`).
- [ ] Realer Finger-Test und Offline-Retest auf Android.
- [x] GitHub-Veröffentlichung: L02/L03 + Hotfix V0.3.1 auf `main`, Commit `143207b22814587631650d793cce9d30fed01f1c`.

## L03-HF01 V0.3.1 – Versionsabgleich
- [x] App-Versionskonstante / Cache / version.json stimmen überein.
- [x] Updatesuche fragt serverseitige version.json mit Cache-Bypass ab.
- [x] Keine Änderung von DB_NAME oder DB_VERSION; vorhandene Daten bleiben in derselben Datenbank.
- [x] Auf GitHub main alle Release-Dateien veröffentlicht und über GitHub-Dateiabruf kontrolliert.
- [ ] GitHub Pages im Android-Browser tatsächlich live kontrolliert.
- [ ] Auf Android mit der bereits installierten App Updatebanner testen; lokale Räume und Lagerobjekte prüfen.


## L04 V0.4.0 – Lagerhierarchie (27.10.2026)
- [x] Node-Unit-Prüfung: alte Räume und Möbel erhalten IDs, automatisch eindeutige stabile Kennungen.
- [x] Node-Unit-Prüfung: Lagerbereich, Raum, Möbel, Fach – Pfad bleibt bei Umbenennung aktuell.
- [x] Node-Unit-Prüfung: Fach in anderes Möbel (raumübergreifend) ohne Änderung der ID, Kennung oder Metadaten.
- [x] Node-Unit-Prüfung: Speicher-Snapshot/Reload, Standardfächer, ungültiges Ziel abgelehnt.
- [x] Syntax aller JS-Dateien, Cache-Liste, Manifest, Versionsgleichheit, 15 Modelle bestanden.
- [x] Gleiche IndexedDB-Kennung und -Schemaversion; Transaktions-Schnittstelle für zwei Lagerhaus-Werte hinzugefügt.
- [ ] Echter Browser-E2E-Test: lokales Chromium `ERR_BLOCKED_BY_ADMINISTRATOR`.
- [ ] Android: Bereiche anlegen, Fach umbenennen, Möbel/Fächer zwischen Räumen bewegen und nach Neustart prüfen.
- [ ] App offline aktualisieren und gespeicherte V0.3.1-Daten am Gerät kontrollieren.


## L05 (27.10.2026) – Artikelkarte V0.5.0
- [x] Node-Logiktests: Anlage, Änderung, Anzeige der Lagerpfade, Entfernung, Mengen-/Standortvalidierung und konstante Artikelcodes nach Löschen.
- [x] Referenztests: Fachverschiebung bei unveränderter Artikelzuordnung; Sperre beim Löschen belegter Lagerorte; bestehende Raum-IDs bleiben erhalten.
- [x] JavaScript-Syntax und Service-Worker-Precache vollständig, getrennte Modulspeicher, Version konsistent.
- [ ] Echtes Chrome-/Android-End-to-End: lokale Chromium-Navigation `ERR_BLOCKED_BY_ADMINISTRATOR`; auf deinem Handy nachprüfen.
- [ ] Datenmigration mit echten Bestandsdaten auf dem Androidgerät nachprüfen; technische L04/L05-Datenstruktur bleibt gleich.

## L06 (27.10.2026) – Artikeltypen und Feldvorlagen V0.6.0
- [x] Alle Dateien mit `node --check` syntaktisch geprüft.
- [x] `node release-check.mjs` und `node release-check-l05.mjs`: L04/L05-Regressionsprüfung bestanden.
- [x] `node release-check-l06.mjs`: 8 Vorlagen, drei typabhängige Eigenschaftsgruppen und Schnellerfassung geprüft.
- [x] Altartikel ohne `properties` geladen/editiert; unveränderte ID, Artikelcode und Erstellungsdatum.
- [x] Datums- und Zeichenlängenprüfung, Datenbereinigung, Typwechsel, fehlende Vorlagen abgefangen.
- [x] Versionskonstante, `version.json`, Service-Worker-Cache und Cache-Dateiliste abgestimmt.
- [ ] Realer Browser-End-to-End-Test: lokaler Headless-Chromium-Aufruf endet mit Timeout; nicht als bestanden bewertet.
- [ ] Auf Android: Auswahlliste/Vorlage testen, Pflichtfelder, Öffnen der erweiterten Angaben, Speichern/Offline und alte Artikel prüfen.

## L07 – Bestandsmanager V0.7.0
- PASS: Syntax aller JavaScript-Dateien.
- PASS: `release-check.mjs`, `release-check-l05.mjs`, `release-check-l06.mjs` (Regression).
- PASS: `release-check-l07.mjs` – Gesamt-/Teilbestände, Lagerorte, Buchungen, Packungsgrößen, Mindestbestände, Präzision, Negativschutz, Rollback, Bestandsschutz, Altartikel, Cache-Manifest.
- PASS: ZIP-Struktur, App-Version, SW-Präcache und aktualisierte Word-Checkliste (nach Erstellung).
- **OFFEN:** interaktiver Chromium-End-to-End-Test; Headless-Chromium lief lokal in einen Timeout. Keine Behauptung, dass Touch-Praxistest/Cache-Umstieg am Android durchgeführt wurden.

## L08 · Teststatus 27.10.2026
Automatisierte Testläufe: `node release-check.mjs`, `node release-check-l05.mjs`, `node release-check-l06.mjs`, `node release-check-l07.mjs`, `node release-check-l08.mjs` – PASS. Zusätzlich `node --check` für alle produktiven JS-Dateien – PASS. Geprüft: Gebinde anlegen/öffnen/teilverbrauchen/leer, Umlagerungen, Einzelgeräte-Seriennummern, Zustand/Ausbuchung, parallele Arten von Beständen, Artikel-/Lagerort-Löschschutz, Kennungen nach Löschung, alte Artikel und Versions-/SW-Abgleich. Echter Chromium-Aufruf wurde von Admin-Policy blockiert, Android-Praxistest offen.

## L09 – Fachverwaltung im 3D-Lager V0.9.0
- [x] SVG-Fachmarkierungen in der Raumansicht; Vorschaubilder ohne Bedienmarkierungen.
- [x] Liste und 3D nutzen dieselben Fach-IDs; Suche nach Fachcode, -name, Möbel, Artikel.
- [x] Fachbuchungen (Einlagern/Entnehmen/Umlagern) und Reservierungsschutz im L09-Logiktest.
- [x] JavaScript-Syntax, Versions- und Offline-Precache-Prüfung.
- [x] L04–L08-Logiktests erneut ausgeführt.
- [ ] Interaktive Chrome-/Android-Touch- und Offline-Prüfung am Endgerät.

## L10 · Beta V0.10.0
- `node release-check.mjs` und `node release-check-l05.mjs` bis `node release-check-l10.mjs` – PASS.
- `node --check` für alle produktiven JS-Module – PASS.
- `python test_photo_canvas.py` (lokale Prüfroutine, nicht Teil der Veröffentlichungs-ZIP): Chromium `about:blank`, JPG-Quelle 2400×1800 Pixel: Original nicht verändert, optimierte Datei kleiner und maximal 2048 px – PASS.
- Modelltests: Hauptfoto-/Kategorienverwaltung, stabile Eigentümer-IDs, isolierte Artikel-/Lagerortbilder, Fotolöschung, Indexserialisierung – PASS.
- Komplettes Browser-End-to-End `http://127.0.0.1:8765/#/lagerhaus/items` – NICHT bestanden (Testumgebung `ERR_BLOCKED_BY_ADMINISTRATOR`), daher keine Aussage über reales Laden/Speichern in Chrome möglich.
- Android-Kamera, Galerie, IndexedDB-Wiederöffnung, Offline und Updates – OFFEN (echtes Endgerät erforderlich).


## L11 · Beta V0.11.0 (27.10.2026)
- [x] L04–L10-Regressionstests erneut unter V0.11.0 bestanden. Die Versions-Assertions der alten Tests wurden auf die neue Versionsnummer aktualisiert.
- [x] Neuer Test `node release-check-l11.mjs`: Phasen, Reihen, optionale Daten, L10-Altbilder, chronologische Sortierung, kombinierte Filter, Suche, Vorher-/Nachher-Vorschlag, Vergleichseigentümer-Isolation, Hauptbildersetzung, Einzellöschung, bestehende Keys.
- [x] JavaScript-Syntax aller produktiven Module, Service-Worker-Dateiliste und Versionskonstanten geprüft.
- [ ] Vollständiger Chrome-Browser-End-to-End-Test über localhost: durch ERR_BLOCKED_BY_ADMINISTRATOR gesperrt, **nicht** als bestanden gewertet.
- [ ] Echtes Android/Chrome: Fotoauswahl, Bildvergleich, Download, IndexedDB-Wiederöffnung, Offline und Update auf dem Nutzergerät zu prüfen.


## L12 – größeres 3D-Regal und reale Gebinde (27.10.2026)
- PASS: `node release-check-l12.mjs`: echte Fachbestände, 3D-Packungssymbole, nicht eingeräumte Positionen, voll/angebrochen, Bestandsanpassung, Buchung/Transfer, kein Doppelzählen, Offline-Assetliste und Versionsgleichheit.
- PASS: L05–L11-Regressionsskripte mit ausschließlich auf 0.12.0 / L12 angepassten Release-Metadaten; alle Logikprüfungen bestanden.
- PASS: `node --check` aller produktiven JS-Dateien.
- OFFEN: volle lokale Browsernavigation: `net::ERR_BLOCKED_BY_ADMINISTRATOR` bei `http://127.0.0.1:8765/`.
- OFFEN: realer Android-Chrome-Test für Pinch-Zoom, Vollbild, Touch-Auswahl, Lagerorte und Offline-Verhalten; Benutzerdaten liegen nur auf dem jeweiligen Gerät.

## L12-HF01 V0.12.1 – Prüfprotokoll 27.10.2026
- [x] Logik-/Regressionstests `node release-check.mjs`, `node release-check-l05.mjs` bis `node release-check-l12.mjs` sowie `node release-check-l12-hf01.mjs` erfolgreich.
- [x] Quelltexte mit Node-Syntaxcheck geprüft, PWA-Version 0.12.1 und Service-Worker-V0.12.1 konsistent; neue Offline-Moduldatei enthalten.
- [x] H04: 100 Handschuhe = 50 Paar, Verbrauch 3 Paar reduziert um 6 Stück, Einzelhandschuh bleibt berücksichtigt, keine Doppelzählung.
- [x] H03: Unzugeordnete Raumartikel nicht fiktiv im Regal gezeigt; Regal-Positionen aus tatsächlich erfassten Standorten.
- [x] H01/H02: JavaScript-DOM-Verkabelung, 3D-Zoom-Handler und direkte Detailroute statisch geprüft.
- [ ] Visueller Chrome-End-to-End-Test: lokaler Playwright-Chromium-Aufruf endet mit `ERR_BLOCKED_BY_ADMINISTRATOR`.
- [ ] Echter Android-Touch- und Offline-/Cache-Test auf dem Vivo X300 Pro durch Nutzer.

- [x] GitHub main V0.12.1 veröffentlicht und version.json, sw.js sowie lagerhaus-consumption.js erneut vom Branch abgerufen (Commit 8efcd5b).


## L12-HF02 · V0.12.2 · Regal-Detaildialog (27.10.2026)
- [x] Modal ist natives `<dialog>` mit `showModal()` im Top Layer; App-Titelleiste kann nicht überlagern.
- [x] Responsiver Kopf: Titel/Untertitel und Schließen-Knopf bleiben getrennt; Test bei 320, 360, 412, 768 CSS-Pixeln.
- [x] Chromium-Komponententest: Button wird getroffen, schließt Dialog, Escape schließt ebenfalls; kein Horizontalüberlauf.
- [x] Node-Regressionen L04–L12-HF01 und HF02 sowie Produktiv-JavaScript-Syntax PASS.
- [x] Version APP_VERSION/version.json v0.12.2, Service Worker Cache v0-12-2.
- [ ] Realer Voll-App-Browser-End-to-End-Test (Chromium-URL-Zugriff lokal durch `ERR_BLOCKED_BY_ADMINISTRATOR` gesperrt).
- [ ] Bedienung und App-Update auf dem echten Android-Gerät vom Nutzer bestätigt.
- [x] GitHub main V0.12.2 hochgeladen und Quell-/Versionsdateien danach erneut von main gelesen (Commit 61eb3f16b).


## L13 – Kategorien / Suche / Filter / Favoriten V0.13.0
- [x] `node release-check-l13.mjs`: Kategorie-Migration/ID-Erhalt, Kindkategorien, Umbenennen, Löschen gesperrter Kategorien, Schlagwörter, Synonymsuche und Favoriten.
- [x] Sammelkategorie und Realbestand, angebrochene 100er-Packung mit 37 Stück nach Kategorieänderung unverändert.
- [x] 11 frühere Node-Prüfsuiten L04–L12 mit ausschließlich aktualisierter Versions-Assertion PASS.
- [x] Node-Syntax aller 19 produktiven JavaScript-Quelldateien PASS.
- [x] GitHub `main` veröffentlicht; Release-Dateien nach Upload nochmals per GitHub-API abgerufen. Letzter Release-Commit `db43a02366d8bd0e8f2ca0e11cb5ff13228f0344`.
- [ ] Vollständige Browser-E2E- und IndexedDB-Neuladeprüfung – Chromium `ERR_BLOCKED_BY_ADMINISTRATOR`.
- [ ] Android Chrome/PWA mit bestehenden realen Benutzerdaten, Favoriten/Filter, Touch und Offline-/Update-Mechanismus testen.

## L14 (V0.14.0)
- PASS: `node release-check-l14.mjs` – reine Ziellogik, Suche/Filter, Mehrfachbestände ohne Doppelzählung, Routen zu Raum/Regal/Fach, Offlinecache, Version.
- PASS: 12 vorhandene Node-Regressionen (temporär an Versionsstand V0.14.0 angepasst; Produktionsdateien unverändert).
- PASS: JavaScript-Syntaxprüfungen aller produktiven JS-Dateien; JSON-Manifest und version.json gültig.
- OFFEN: Browser-End-to-End via Playwright. Chromium blockiert `http://127.0.0.1` mit `net::ERR_BLOCKED_BY_ADMINISTRATOR`.
- OFFEN: Android-Praxistests für Touch, Scrolling, Regal-Markierung, Offline und installierte GitHub-Pages-Version.

## L15 – Geräte- und Serviceakten (V0.15.0, 27.10.2026)
- PASS `node release-check-l15.mjs`: pro Gerät separate Serviceakte, Null-/Grenz-/Datumsprüfungen, Herstellerdaten nur manuell, Zählerstand, abgehakte Wartungscheckliste, Fälligkeiten ohne erfundene Basis, Lagerbestände/IDs nicht verändert.
- PASS `python run-regressions-l15.py`: 13 von 13 früheren automatischen Node-Testmodulen (nur vergangene Versionskonstanten in temporären Testkopien angepasst; Originaltests nicht verändert).
- PASS `node --check`: alle produktiven JS-Module.
- BLOCKIERT `python browser-test-l15.py`: lokales Chromium schlägt bereits beim Aufruf der Webseite mit `net::ERR_BLOCKED_BY_ADMINISTRATOR` fehl. Es liegt *kein* erfolgreicher E2E-Durchlauf vor.
- AUSSTEHEND: Installation, manuelle Bedienung, lokaler Speicher, echtes Offline-Verhalten und GitHub-Pages-Praxis auf Android.