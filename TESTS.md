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
