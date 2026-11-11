# P02 – Schnellstart Bad/WC/Küche + Material direkt auswählen (V0.26.0)

Stand: 11.11.2026 · Quelle: Mein Alltag V0.25.5 BW14. Keine Neuinstallation nötig.

## Neue Funktionen

1. **Badezimmer**: Waschbecken, Spiegel, Dusche, WC und Mistkübel als Startauswahl; Badewanne und Schränke optional über „Schnellliste anpassen“.
2. **Separates WC**: WC-Schüssel, Handwaschbecken, Spiegel und Mistkübel als Startauswahl.
3. **Küche**: Arbeitsplatte, Spüle, Herd, Kühlschrank, Geschirrspüler, Mistkübel und Tisch als Startauswahl; Dunstabzug optional.
4. **Ohne 3D-Plan startfähig**: Boden-Aufgaben sind immer vorhanden; Schnelllisten erzeugen passende Aufgaben für Einrichtungsgegenstände, die noch nicht im 3D-Raum eingetragen sind. Bereits vorhandene 3D-Objekte bleiben in der Liste und werden nicht doppelt ergänzt. Vor dem Start sind die Vorlagen pro Raum anpassbar und werden lokal gespeichert.
5. **Material-Schnellauswahl**: Bekannte Verbrauchsartikel aus dem Lagerhaus wie Handschuhe, Müllsäcke, Putztücher und Reiniger erscheinen sofort oberhalb der Aufgaben. Ein Tipp merkt eine vorgegebene Menge vor; alternative Lagerorte/Einheiten und exakte Mengen bleiben unter „Anderen Artikel oder genaue Menge wählen“ erreichbar.
6. **Mengen-Schutz**: Bereits vorgemerkte Mengen werden berücksichtigt. Zusätzliche Schnelltipps, die den verfügbaren Bestand überschreiten, werden abgewiesen. Handschuhe zählen weiter paarweise (1 Paar = 2 Stück), wenn der Artikel dafür geeignet ist.
7. **Buchungssicherheit**: Lagerhaus-Artikel werden ausschließlich beim bestätigten Abschluss der Reinigung abgebucht, atomar mit dem Putzprotokoll und nur einmal. Stoppuhr und Häkchen bleiben wie bisher lokal erhalten.

## Praxistest morgen

- In der App zuerst **Mehr → Verschlüsseltes Gesamtbackup** erstellen und die Datei extern sichern (oder eine andere vollständige Sicherung der Daten durchführen).
- Putzmanager → vorhandenes Badezimmer, WC oder Küche öffnen. Falls noch keiner vorhanden: „Raum anlegen“, Raumart wählen und ohne Maße speichern.
- Unter „Schnellliste anpassen“ genau die vorhandenen Einrichtungen auswählen; den Raum mit einem Tipp starten.
- Oben bei „Material-Schnellauswahl“ z. B. Handschuhe vormerken; im Lagerhaus vor Abschluss prüfen, dass sich nichts verändert hat.
- Aufgaben abhaken, Reinigung beenden und bestätigen; danach die Menge im Lagerhaus prüfen. Einen zweiten Abschluss darf es nicht geben.
- Falls falscher Verbrauch vorgemerkt wurde, vor dem Abschluss mit × entfernen oder korrigieren. Eine bereits bestätigte Buchung muss bewusst im Lagerhaus gegengebucht werden.

## Grenzen

- Die App kann den wirklichen Materialverbrauch nicht automatisch messen. Die Wahl der Menge erfolgt bewusst durch Nutzerin/Nutzer.
- Die Schnellliste bestimmt, *welche Aufgaben angezeigt werden*, nicht ob diese objektiv erledigt wurden.
- Der echte Test im installierten Android-PWA-Modus und nach Handy-Neustart steht aus; simulierte mobile Chromium-Tests ersetzen ihn nicht.
- Die Datenbankstruktur und der Bestand der anderen Module wurden nicht migriert. Keine Live-Synchronisierung.

## Technische Prüfung

- `node test-p02-data.mjs`: Putz- und Lagertransaktionen mit IndexedDB-Transaktionssimulation, Vorlagen pro Raum, Überbuchungs-Schutz, keine Doppelbuchung.
- `python test-p02-mobile.py`: 320/390/412 px für alle drei Raumarten, Bedienfluss, Material und Layout; simulierte Datenmodule.
- `node test-p01-data.mjs` sowie `python test-p01-mobile.py`: bestehende Funktionen regressionsgeprüft.
- `node test-p02-release.mjs`: Versionsgleichheit und Precache-Vollständigkeit.

**Wichtiger Hinweis:** Private Wohnungs-/Lagerdaten bleiben lokal. Die im ZIP enthaltenen Test-Screenshots zeigen ausschließlich künstliche Daten.
