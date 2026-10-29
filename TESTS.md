## LS03 – Rich-Text-Editor (V0.20.0)

- `python test-ls03-editor.py`: isolierter mobiler Chromium-Test (390 px). Browser-Oberfläche echt; Datenspeicher und Crypto-Adapter simuliert. Prüft Authentifizierung, Erstellung von Thema/Kapitel/Unterkapitel, Lektion, HTML-Paste, Sicherheit, Vorschau, Entwurf, Veröffentlichung, Wiederladen.
- `python test-ls02-ui.py`, `python test-ls01-ui.py`, `node test-ls02-crypto.mjs`: Regressionen.
- `node --check`: JavaScript-Syntax.
- Kein echter HTTPS-/IndexedDB-/Android-End-to-End-Test im Container möglich (HTTP-Navigation blockiert).

---

## LS02 – Lernschule Admin-Zugang V0.19.0

- `node test-ls02-crypto.mjs`: 14 reale WebCrypto-PBKDF2-Prüfungen mit simuliertem IndexedDB-Adapter (kein echter Browser-Datenbank-Test); Setup, Salt/Hash, falsche Passwörter, Anmeldung, Recovery, Rotation und frische JS-Sitzung.
- `python test-ls02-ui.py`: 390-px-Chromium-Komponententest; WebCrypto-Interface simuliert (da Netzwerk/HTTPS in Testumgebung blockiert), Admin-UI, Login, Reset, Suche und unveränderte Gesundheitsnavigation.
- `python test-ls01-ui.py`: Regression der sieben Themen und 19 Kapitel, Live-Suche und getrennte Tagebuchdatensätze.
- Offline-Service-Worker-Asset-Liste, JavaScript-Syntax und Version unabhängig geprüft.
- **Offen**: echte Android-Installation, echter HTTPS-/Pages-Test, Browser-IndexedDB-End-to-End.

---

# F05 0.16.7 – Prüfprotokoll 28.10.2026

- PASS `python test-f05-ui.py`: mobiler Chromium-F05-Komponententest (390 px) mit fiktiven Angaben, Filtern, Bearbeitung/Löschung, Neustart im lokalen Test-Adapter.
- PASS `python run-regressions-f05.py`: 18/18 historische Node-Tests nach Anpassung der erwarteten Versionskennung.
- PASS `node test-f01-backup.mjs`: Passwort-verschlüsselter Backup-/Restore-Roundtrip.
- BLOCKIERT `python test-f03-realapp.py`: HTTP-Aufruf 127.0.0.1 in dieser Umgebung administrativ gesperrt; daher kein vollständiger Real-HTTP-/Android-Test.
- Kein Test mit persönlichen Gesundheitsdaten, keine automatischen medizinischen Schlussfolgerungen.

---

# F04 – Abnahme V0.16.6 (28.10.2026)

- [x] Chromium mobil 390px: Blutungsbeginn, -ende, Schmierblutung, Stärke und Schmerz dokumentierbar.
- [x] Periodenkalender, Monatsmarkierungen, Periodenverlauf, Zykluslänge, Start-zu-Start-Abstände und Prognose getestet.
- [x] Vorhersage ausdrücklich als unsicher gekennzeichnet; zukünftige Blutungseinträge abgewiesen.
- [x] Bearbeiten, Löschen, erneutes Öffnen über den Modell-Speicheradapter; F02- und F03-Oberflächen erreichbar.
- [x] Verschlüsselter Gesamtsicherungs-Roundtrip (inkl. F01-Vorgang) bestanden.
- [x] 18/18 historische Node-Regressionstests bestanden; aktualisierte Version und Offline-Cache geprüft.
- [x] GitHub main: 6/6 geänderte App-Dateien bytegleich zum ZIP; Code-Commit `18fee2dc6921ae1f9defd293d72701c924eb02b9`.
- [ ] Vollständiger lokaler HTTP/PWA-/IndexedDB-Browsertest: Testumgebung blockiert Loopback und Dateizugriff.
- [ ] Reales Vivo-/Android-Chrome-Gerät: Installation, Offline-Start, Anzeige V0.16.6 und Datenpersistenz prüfen.
- [ ] Öffentliche GitHub Pages-Auslieferung der Versionsdatei unabhängig verifizieren.

Hinweis: Der Chromium-Komponententest verwendet eine fiktive Speicheranbindung und Testdaten, keine privaten Gesundheitsdaten. Getrennt vom echten Gerätetest bewerten.

---

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

## L16 – Wartung, Reparatur, Garantien (V0.16.0, 28.10.2026)
- [x] `node release-check-l16.mjs`: Servicehistorie / L15-Übernahme, Kosten ohne erfundene Nullwerte, Reparaturen, Betriebsstundenbasis, Garantiefristen, Sperrstatus, Dateisignaturen und Einzelgeräte-Isolation.
- [x] `python run-regressions-l16.py`: 14 frühere Module (historische Versionen nur in flüchtigen Testkopien aktualisiert).
- [x] `node --check`: sämtliche produktiven JavaScript-Module und Service-Worker.
- [ ] `python browser-test-l16.py`: Chromium verweigert localhost mit `ERR_BLOCKED_BY_ADMINISTRATOR` – vor App-Laden abgebrochen.
- [ ] Echter Android-Praxistest: Geräte-Status, neue Reparatur, Belegimport/-download, Offline-Neustart, Cache-/Versionswechsel und Datenpersistenz.
- [ ] Bestätigung, dass GitHub-Pages-PWA auf dem echten Endgerät V0.16.0 anzeigt.

## L16.1 – Bodenlager und Stellplätze

- `node release-check-l16-1.mjs`: PASS – alte Raum-/Regalkennungen, Geräte-ID und Bestand, `P-`-Kennungen, Lagerort-Auswahl, SVG-Projektion, 6×4-Kollisionen, Platzfindung, 90°-Drehung, Artikelschutz, Standortbuchung ohne Mengenerhöhung, Schutz vor Löschen belegter Zonen, Offline-Assetliste.
- `python run-regressions-l16-1.py`: PASS – 15 frühere Regressionstestmodule (nur Versionslabels in temporären Testkopien angepasst).
- `node --check` für alle produktiven Module, Assets und SW: PASS.
- Browser-E2E: BLOCKIERT – `net::ERR_BLOCKED_BY_ADMINISTRATOR`, sogar für lokale `file:`- und `data:`-URLs; **nicht als bestanden gewertet**.
- Android-Praxistest: OFFEN – tatsächliches Tippen/Ziehen/Drehen/Neuladen und IndexedDB-Persistenz auf dem Nutzergerät sind vor dem produktiven Einsatz zu bestätigen.

## L16.2 – Kompakte Bedienung und Schnellzugriffe

- `node release-check-l16-2.mjs`: PASS – Bestands-/3D-/Service-L16.1-Logik weiter kompatibel, angepasste Versions- und Offline-Kennungen.
- `python run-regressions-l16-2.py`: PASS – 16 frühere historische Logiktests, nur erwartete App-/Cache-Version in temporären Kopien an V0.16.2 angepasst.
- `python test-ui-l16-2.py`: PASS – HTML der echten `roomDetails()` gerendert und auf 6 zunächst eingeklappte Gruppen, beide Schnellaktionen, bestehende Formulare, erreichbaren Vollbildknopf, externe Boden-Dialogebene und eindeutige IDs geprüft.
- `node --check` für alle produktiven JS-Dateien und die Offline-Assetliste prüfen.
- **Offen:** echter Android-/Touch-E2E-Test, Datenpersistenz auf Android und Live-GitHub-Bestätigung.

- Nach GitHub-Commit 0174c42539 wurden V0.16.2, importierte Klappmoduldatei und Offline-Cache auf `main` nachgelesen: PASS.

## Frauengesundheit F02 – Untersuchungen & Notizen (V0.16.4)
- [x] Chromium (isolierte Vorschau mit Test-Datenbank): Termin anlegen, Fragen und Symptome eintragen, 21:00 als Uhrzeit, nächster Termin auf Startseite, PDF als Anhang speichern, Termin bearbeiten, Status auf abgeschlossen, Befund/ärztliche Einschätzung/Nachkontrolle ergänzen, Dateianhang entfernen, Eintrag löschen.
- [x] Echte UI-Klassen und Handler des Gesundheitsmoduls bei 390px Browserbreite ausgeführt.
- [x] Strenge Datumsprüfung verwirft 31. Februar.
- [x] 18/18 frühere Node-Release-Prüfsuiten nach ausschließlich angepassten Versions-/Build-Assertions.
- [x] JavaScript-Syntax und Service-Worker-Assetliste geprüft.
- [ ] Realer Android-Chrome-/GitHub-Pages-/Offline-Test inklusive Browser-Neustart und echter IndexedDB-Persistenz steht aus.
- [ ] GitHub-Pages-Live-Veröffentlichung / identischer Stand 0.16.4 muss nach Commit separat bestätigt werden.

- [x] F02 GitHub main: sechs Release-Kerndateien über die GitHub-Schnittstelle nach Upload zurückgelesen; Git-Blob-SHA stimmt bytegenau mit lokalem ZIP-Projekt überein. Letzter Commit 9038a51774a415c9b7f8d17641631980301a7c85.

## Frauengesundheit F03 – Schwangerschaft & Tests (V0.16.5)
- [x] Chromium-UI: Status speichern und beim Neustart wiederherstellen, Test erfassen/bearbeiten, keine automatische Änderung des Status.
- [x] SSW und Geburtstermin aus letzter Periode, optionales ärztliches Datum, UTC-Datumsarithmetik um Zeitumstellung.
- [x] Zukunftsdatum für Test abweisen; F02-Fragen/Untersuchungen unverändert editierbar.
- [ ] Echter Android-Gerätetest / Pages-Cache-Abgleich durch Nutzer offen.

## D01 – Google Drive Backup V0.17.0

Technische Tests: `node --check assets/google-drive.js`, `node --check assets/app.js`, `node --check modules/lagerhaus-app.js`, `node --check sw.js`; `node test-d01-drive.mjs`; `node test-f01-backup.mjs`; `python test-d01-ui.py`; `python test-f07-ui.py`; `python run-regressions-d01.py`.

Noch auf realem Android-Chrome mit demselben Google-Cloud-OAuth-Client zu prüfen (ausdrücklich NICHT als bestanden markieren): Google-Popup öffnen; Drive-Zugriff autorisieren; verschlüsseltes Backup erstellen; Datei im sichtbaren Drive-Ordner kontrollieren; vorhandene lokale Daten separat sichern; auf einem anderen Gerät das Backup laden, entschlüsseln und importieren; bei falschem Passwort darf nichts verändert werden; Offline-Export weiter möglich; Service-Worker lädt V0.17.0 korrekt.


## D02 – Sichtbare Bestätigungen V0.17.1

- `python test-d02-feedback.py`: echte mobile Chromium-Oberfläche (390 × 844), simuliertes OAuth/Drive-Backend. Testet ungültige Client-ID, erfolgreiches Speichern mit Inline-Meldung, erfolgreiche Anmeldung, Backup-Upload, fehlgeschlagenen Upload, Abmeldung, sichtbare Statusmeldung und horizontale Überläufe.
- `python run-regressions-d02.py`: 18/18 historische Regressionstests bestanden (Versionsprüfungen auf D02 normalisiert).
- Keine echten Zugangsdaten oder Live-Drive-Inhalte verwendet. Nutzer-Screenshot mit Status „verbunden“ belegt keine erfolgreich hochgeladene Sicherung.
