# Mein Alltag – Beta V0.4.0

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


## Lagerhaus Update L02 – Version 0.2.0 (27.10.2026)
- 15 unterscheidbare Lagermöbelmodelle in fünf Kategorien; Größe kompakt/standard/groß; Material Metall/Holz/Kunststoff.
- Möbel beim Hinzufügen benennen und später Bezeichnung/Größe/Material ändern.
- Mehrere gleiche Möbel je Raum einfügen; Modellvarianten werden lokal gespeichert.
- L01-Datenmodell und alte Möbelkennungen bleiben kompatibel.
- Es handelt sich weiterhin um eine schematische 3D-Lageransicht, nicht um einen freien 3D-Editor.
- Unit- und Syntaxprüfungen bestanden. Browser-E2E und echter Android-Test nicht abgeschlossen (Umgebungsbeschränkung).

## Lagerhaus Update L03 – Version 0.3.0 (27.10.2026)
- Finger-/Maus-Drag im schematischen 3D-Raum, mit 8-Pixel-Bewegungsschwelle (Tippen bleibt Auswahl).
- 25-cm-Raster, Wandmagnetismus, ein-/ausblendbare Rasterlinien und Positionstasten.
- Kollisionserkennung auf Basis der 2D-Möbelgrundflächen einschließlich Größenvariante und Drehung.
- 90°-Drehung nur bei freiem Platz; automatische konfliktfreie Startplatzwahl.
- Rückgängig für die letzten 15 Möbeländerungen je Raum während der Sitzung.
- Daten dauerhaft in bestehendem Offline-Lagerhaus-Store, Version 0.3.0 des App-Caches.
- Einschränkung: Schematische Raumkoordinaten, noch kein maßstabstreuer frei konfigurierbarer 3D-Editor.

## Hotfix L03-HF01 – V0.3.1 (27.10.2026)

- Grund für alte Anzeige: GitHub `main` hatte App-V0.1.0 und einen alten Service-Worker, die ZIP war bereits V0.3.0.
- Versionsdatei `version.json` für eindeutigen Online-Abgleich ergänzt.
- Anzeige in Start und Einstellungen nutzt V0.3.1; der Bereichskopf zeigt dieselbe Version.
- Service-Worker-Cache auf `mein-alltag-v0-3-1` gesetzt; lokaler IndexedDB-Speicher bleibt unverändert.
- In **Mehr → Auf Updates prüfen** kann die veröffentlichte Version ohne Cache abgefragt werden.
- Nach Upload auf GitHub Pages muss der neue Service-Worker installiert bzw. das Updatebanner bestätigt werden.

## Lagerhaus L04 – V0.4.0 (27.10.2026)
- Neue Lagerbereichsebene: Bereich → Raum → Möbel → Fach/Schublade/Box.
- Stabile automatisch vergebene Kennungen und Übernahme vorhandener Raum-/Möbel-IDs.
- Räume zwischen Lagerbereichen verschieben; Möbel zwischen Räumen verschieben; Fächer zwischen Möbeln verschieben, ohne ID/Kennung zu verlieren.
- Standardfächer passend zu 15 Möbelmodellen, einzelne Fächer anlegen/umbenennen/entfernen.
- IndexedDB `mein-alltag-v0` und Schema `1` bleiben bestehen; beide Lagerhaus-Keys werden gemeinsam in einer Transaktion geschrieben.
- Code- und Migrationstests bestanden. Browser-E2E lokal blockiert; echte Android-Tests offen.
- Neue Version: `0.4.0` in App, `sw.js`, `version.json`; Offline-Shell umfasst `lagerhaus-hierarchy.js`.


## Update L05 · Beta V0.5.0 (27.10.2026)
Im Modul **Lagerhaus** gibt es die Seite **Artikel verwalten**. Dort kannst du lokale Artikelkarten anlegen, anzeigen, bearbeiten, suchen und löschen. Felder: Bezeichnung, Typ, Kategorie, Menge, Einheit, Marke, Artikelnummer, Zustand, Notizen sowie optional ein Raum, Möbel oder Fach. Ein Fotoplatzhalter ist vorhanden; echte Fotofunktion erst L10.

Artikel bleiben in `lagerhaus/items.v1` und der fortlaufende Kennungszähler in `lagerhaus/items.sequence.v1`. Alte Räume/Möbel/Fächer bleiben in `rooms.v1`, `areas.v1` unverändert; ebenso alle anderen App-Module. Standortreferenzen verwenden beständige IDs: wenn ein Fach oder Möbel verschoben wird, zeigt die Artikelkarte automatisch den neuen Pfad. Das Löschen belegter Lagerorte und Undo mit dadurch verlorenen Artikelorten wird verhindert.

Lagerbestand-Buchungsjournal, mehrere Orte pro Artikel, echte Bilder, Geräte-Serviceintervalle und Scanner folgen in ihren geplanten Updates. **Keine Synchronisation oder Cloud-Sicherung.**

Test: `node release-check.mjs && node release-check-l05.mjs`. Browser-/Android-Praxistest ausstehend, da lokale Chromium-Navigation durch Richtlinie blockiert.

### L06 V0.6.0 – Artikeltypen und Feldvorlagen (27.10.2026)

- Unter **Lagerhaus → Meine Artikel → + Artikel** kann eine passende Vorlage gewählt werden.
- Eine neue Artikelkarte benötigt nur Name und Menge; Typ/Einheit/Lagerort werden einfach ausgewählt.
- Unter **Weitere Angaben und typabhängige Eigenschaften** lassen sich Geräte-, Verbrauchs- und Einzelstückfelder ergänzen.
- Alte L05-Artikel bleiben bearbeitbar; App-Datenbank, Datenbankversion und lokaler Schlüssel `items.v1` bleiben unverändert.
- Änderungen aus L07 (Bestandsbuchung/Mehrfachlagerort) gehören nicht zu diesem Update.
- Android- und echtes Browser-End-to-End-Verhalten ist noch nicht nachgewiesen.

## L07 – Bestandsmanager (V0.7.0)
Die Artikelseite im Lagerhaus bietet jetzt drei Buchungsarten: Einlagern, Entnehmen und Umlagern. Ein Artikel kann gleichzeitig Mengen an mehreren Standorten haben. Jeder Standort wird separat angezeigt; der Gesamtbestand ist deren Summe. Mindestbestand und Packungsgröße werden in den Artikeldetails gepflegt. Buchungen können in Grundeinheiten oder in Packungen durchgeführt werden, mit höchstens drei Dezimalstellen. Die letzten fünf Buchungen eines Artikels werden angezeigt.

**Daten:** bestehende L05/L06-Artikel werden beim ersten Buchungsvorgang ohne Löschung übernommen. IndexedDB `mein-alltag-v0`, Lagerhaus-Schlüssel `items.v1`, `items.sequence.v1` und neuer `items.movements.v1`. Buchungs- und Lagerort-Änderungen nutzen gemeinsame IndexedDB-Transaktionen. Bitte Chrome-Speicherdaten nicht löschen; Android-Praxistest bleibt offen.

## L08 · Beta V0.8.0 – Gebinde und Einzelgeräte
Über „Meine Artikel“ können bei Verbrauchsmaterialien einzelne Gebinde (voll / angebrochen / leer) und bei Maschinen mit Einheit „Stück“ Einzelgeräte samt eindeutiger Seriennummer geführt werden. Bereits vorhandene Mengen können ohne Erhöhung des Bestands gekennzeichnet werden. Neue Zugänge erhöhen die Gesamtmenge. Jede Umlagerung/Entnahme beachtet separat gebundene Mengen; Buchungen sind atomar. Alte Artikel bleiben ohne Migration verfügbar. Details siehe `UPDATE_L08.txt`.

## L09 – Fachverwaltung im schematischen 3D-Lager (0.9.0)
- Sichtbare, antippbare Fachmarkierungen auf Möbeln der Raumansicht, per Tastatur aktivierbar.
- Durchsuchbare Fachliste mit Artikelbeständen und gleicher Fach-ID wie in 3D.
- Atomare Bestandsbuchungen für Einlagerung, Entnahme, Fach-zu-Fach-Umlagerung; gegen reservierte Gebinde/Geräte geschützt.
- Keine Änderung des Datenbankschemas oder der bestehenden IDs.
- Tests: `node release-check.mjs`, `node release-check-l05.mjs` bis `node release-check-l09.mjs`.

## L10 – Lokales Fotoarchiv (V0.10.0)
Über **Lagerhaus → Meine Artikel → 📷 Fotoarchiv** oder **Fotos** an einer Artikelkarte lassen sich Artikel- und Lagerortfotos aufnehmen/importieren. Es gibt eine Bildvorschau, ein frei wählbares Hauptbild, Kategorien und Beschreibungen. Fotos werden als einzelne Binary-Blobs lokal in IndexedDB gespeichert, Vorschaubilder und Verknüpfungen separat in `photos.index.v1`. Bilder bleiben an stabile Artikel-/Fachkennungen gebunden, nicht an deren Namen. Originale können unverändert gespeichert werden; sonst wird eine kleinere WebP-Datei mit 2048-Pixel-Limit vorgeschlagen (nur wenn kleiner). Löschvorgänge sind transaktional. **Wichtig:** Kein Backup für Fotos und keine Cloud-Synchronisation vorhanden. Der ZIP-Download der App enthält keine persönlichen lokalen Daten. Android-End-to-End-Test offen.


## L11 – Fotohistorie und Vorher/Nachher-Vergleich (Beta V0.11.0)
Für jeden Artikel und Lagerort können einzelne Fotos der Zustandsphase Vorher, Nachher, Zwischenstand oder Bestandsaufnahme zugewiesen und über eine frei benannte Vergleichsreihe verknüpft werden. Das Aufnahmedatum wird optional manuell eingetragen und als solches gekennzeichnet; ältere Fotos zeigen ohne das Datum nur den Importtag. Die Fotoübersicht lässt sich chronologisch sortieren, nach Kategorie/Zustandsphase filtern und durchsuchen. Zwei Bilder desselben Artikels/Fachs lassen sich groß vergleichen; weitere Bilder bleiben unangetastet. Einzeldownload, Hauptbildwechsel und Bildlöschung sind verfügbar.
Alle Bilder bleiben lokal in IndexedDB; die ZIP archiviert **keine** persönlichen Bilder. Im Gerätebrowser kann die Installation/Offlinefunktion abweichen. Der Android-Praxistest ist ausständig.
