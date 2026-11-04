# Mein Alltag – BW06 · Version 0.24.6

**Datum:** 04.11.2026 · **Bereich:** Belohnungswelt / Startkollektion · **Basis:** BW05 V0.24.5

## Neu

- 100 eigenständige, originale **stilisierte SVG-Vektormotive** (4 Kategorien × 25) in `assets/card-art/<kategorie>/001.svg` bis `025.svg`. Es handelt sich bewusst um programmatisch gestaltete Vektorgrafiken, **nicht** um 100 handgemalte Premium-Illustrationen oder Fotorealismus.
- Je Karte eigener Name, Beschreibung, Kategorie-Eigenschaften, Serien-ID, stabile technische Karten-ID, Nummer, Seltenheit und Motivpfad. Vier wiederverwendbare Kategorien-Designvorlagen plus sieben Seltenheitsrahmen bleiben von Daten und Bildern getrennt.
- Verteilung je Kategorie: 9 gewöhnlich, 6 ungewöhnlich, 4 selten, 3 episch, 1 legendär, 1 mythisch, 1 Diamant. Bei 4 × 25: 36/24/16/12/4/4/4.
- Im **Album** kann die Startserie durch ausdrückliches Antippen von **„Fehlende Kartenplätze füllen“** installiert werden. Import ergänzt **nur freie Plätze** und verändert weder individuelle Karten noch gesammelte Exemplare, Münzen, XP, Booster oder Journaleinträge. Wiederholtes Importieren ist wirkungslos.
- Eigene Benutzerbilder haben weiterhin Vorrang vor Startmotiven. Die originalen, quellenoffenen SVG-Bilder können in einem späteren Update oder nach eigenem Entwurf ersetzt werden; bestehende Katalogdaten bleiben bearbeitbar.
- Die Booster-Öffnung zeigt nach BW06 bei passenden Karten die Motivbilder aus dem Album (sofern der Kartendatensatz das Startmotiv oder ein eigenes Bild besitzt).
- Die 100 SVG-Assets und beide Moduldateien sind im Offline-Cache eingetragen. `assets/reward-series-data.js` enthält die unveränderlichen Katalogdefinitionen.

## Wichtig – kein Geschenk / keine gefälschten Sammelkarten

Die Startkollektion definiert **Karten, die gezogen werden können**, aber sie vergibt **keine bereits gesammelten Karten**. 0/100 gesammelt bleibt 0/100, bis ein tatsächlich gekaufter Booster geöffnet wird. Münzen und XP bleiben unverändert. Im bestehenden Shop können nach dem Import die themenbezogenen Booster einen vollständigen Kartenpool besitzen, sobald genug Münzen verdient wurden. Gekaufte Packs behalten weiterhin ihren ursprünglichen Kartenpool; der Import ändert **keine** alten Käufe.

## Installation

1. Vorher manuell ein verschlüsseltes Backup der bisherigen App anlegen und **extern** aufbewahren.
2. ZIP-Inhalt ins Repository-Root einspielen (GitHub Pages verwendet `main` → `/(root)`).
3. App in Chrome neu laden; unter „Mehr“ muss **0.24.6** angezeigt werden.
4. **Belohnungswelt → Album → Fehlende Kartenplätze füllen** öffnen, Einwilligung bestätigen; nur freie Plätze werden ergänzt.
5. Shop und Album auf 100 gestaltete Plätze prüfen. Bestehende Sammlungen und Münzen unverändert.
6. Neues manuelles Backup erstellen.

## Datenhaltung / Backup-Hinweis

Das verschlüsselte Gesamtbackup enthält die Datenbank (inkl. Referenzen auf `assets/card-art/…`), **aber die SVG-Quelldateien werden mit der App-/ZIP-Version ausgeliefert und nicht noch einmal in die Datenbank kopiert**. Zur Wiederherstellung müssen die BW06-Assets vorhanden sein. Eigene hochgeladene PNG/JPG/WebP-Bilder bleiben als Bilddaten im Backup enthalten.

## Tests / Abnahme

- 18 vorhandene und neue automatisierte Node-Testskripte geprüft: 15 bestanden, 3 alte historische Release-Snapshottests enthalten fest verdrahtete Versionsnummern 0.17.0 / 0.23.2 / 0.22.3 und sind unverändert **nicht mehr auf die aktuelle Version anwendbar**. Diese werden nicht als erfolgreiche BW06-Tests ausgegeben.
- `node test-bw06-series.mjs`: bestanden (100 eindeutige Motive, gültige ID-/Seltenheitsverteilung, atomarer Import, Individualkarten geschützt, Backup/Restore, keine Gratiswährung/Karten, Schutz gegen Doppelbelegung).
- `python test-bw06-ui.py`: bestanden (isoliertes Chromium bei 320/390/412 px, kein horizontaler Überlauf, Import-Button, Kartendetail, alter Bestand bleibt erhalten).
- `python test-bw04-ui.py` / `python test-bw05-ui.py`: bestanden (Shop / Booster-Öffnung weiterhin funktionsfähig).
- 100 SVG-Dateien werden als XML validiert, ihre Referenzen existieren, und 100 Einträge sind in der Service-Worker-Assetliste enthalten.
- **Nicht getestet:** echte Android-PWA mit Installation und Web-Updates, GitHub Pages öffentlich per HTTPS und Restore auf einem zweiten Gerät. Lokaler Browser-HTTP-Aufruf scheitert hier mit `net::ERR_BLOCKED_BY_ADMINISTRATOR`.

## Noch offen

- Hochwertige, individuell handgezeichnete Premium-Motive sind **nicht** Bestandteil dieses Releases; die Startmotive sind eine ursprüngliche stilisierte Vektorserie.
- Das ursprünglich als „BW06 Kartenschutz, Handel und Herstellung“ vorgesehene Projektpaket ist weiterhin **nicht implementiert** (Exemplare sperren, Verwertung, Splitter und Herstellung). Dies wird separat umgesetzt, nicht unzutreffend abgehakt.
- Diamant-Garantie, Belohnungskalender, Kartentausch und Eventregeln bleiben offen.
