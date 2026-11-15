# Mein Alltag – P05, Version 0.28.1 (15. November 2026)

## Neu im Putzmanager
- **Zwei Oberflächen:** Hell und Dunkel, jederzeit über zwei Knöpfe umschaltbar. Die Auswahl wird auf diesem Gerät gespeichert. Andere Module bleiben im vorhandenen Design.
- **Raumkarten:** Zweispaltige Übersicht mit Raumname, fälligen Bereichen, heute erledigten Bereichen und Fortschrittsanzeige. Vorhandenes erstes Raumfoto wird als Titelbild verwendet; ohne Foto erscheint ein grafischer Platzhalter.
- **Fälligkeit pro Bereich:** Täglich, 2/3 Tage, wöchentlich, 14 Tage, monatlich, nur bei Bedarf oder frei 1–365 Tage. Voreinstellungen nach Bereich: Geschirrspüler, Arbeitsplatte, Tisch, Mistkübel, Spüle täglich; Kühlschrank, Backofen, Dunstabzug und Fenster monatlich; übrige Bereiche wöchentlich.
- **Nachprüfbare Historie:** Neue abgeschlossene Reinigungssitzungen speichern die Namen erledigter Einzelschritte und vollständig erledigter Bereiche, Datum, Zeit und Lagerverbrauch. Die bisherige Historie bleibt erhalten.
- **Keine erfundenen alten Häkchen:** Bei bisherigen Einträgen mit z. B. „11/21 Aufgaben“ sind die erledigten Aufgaben nicht rekonstruierbar. Die App kennzeichnet diese als ältere Einträge ohne Einzelnachweis und markiert entsprechende Bereiche nicht automatisch als erledigt.
- **Integrierte Lagerbuchung:** Der bestehende atomare Lagerabzug beim Abschluss wird nicht verändert. Eine abgebrochene Reinigung bucht nichts ab. Die Stoppuhr bleibt bestehen.

## Bedienung
1. Putzmanager öffnen und bei Bedarf oben „Hell“ oder „Dunkel“ wählen.
2. Raumkarte öffnen. Unter jeder Aufgabe zeigt die App den Status und die letzte nachgewiesene Reinigung.
3. Mit „Rhythmus“ täglich, wöchentlich, monatlich usw. einstellen. Für einen eigenen Abstand „Eigene Tagezahl“ wählen, Zahl eingeben und speichern.
4. Reinigung starten, einzelne Bereiche oder Schritte abhaken und „Reinigung abschließen“. Erst dann wird der Status gespeichert und die nächste Fälligkeit berechnet.
5. „Vollständige Reinigungshistorie“ aufklappen, um die erledigten Schritte und etwaige Lagerabzüge nachzusehen.
6. Ein früher erledigter Bereich ist auch vor seiner nächsten Fälligkeit erneut reinigbar; es gibt keine harte Sperre.

## Daten/Technik
- IndexedDB bleibt Version 2, kein Datenreset und keine Migration vorhandener Räume, Fotos, Artikel, Aufgaben oder Sitzungen.
- Neue Einstellungen unter `putzmanager/cleaning.schedule.v1`. Einzelabschlüsse unter `putzmanager/cleaning.sessions.v1` im bestehenden Store.
- Der Farbmodus wird als lokale Geräte-Einstellung in `localStorage` unter `pm.ui.theme.v1` gespeichert.
- PWA-Cache: `mein-alltag-v0-28-1-p05-lux07` und neue Moduldatei im Offline-Paket enthalten.
- Wichtig: Die Fortschrittsanzeige zeigt den Anteil aktuell nicht fälliger Bereiche; „Heute erledigt“ zählt heute abgeschlossene vollständige Bereiche. Bereits teilweise erledigte Schritte zählen nicht als ganze Bereiche.

## Prüfumfang / Einschränkungen
- JS-Syntax und P05-Datenlogik geprüft; P03/P04-Datenregressionen bestanden.
- Statisches Chromium-Layout bei 390 px für beide Farbstile geprüft, ohne horizontalen Überlauf; die Vorschau ist keine echte App-Sitzung.
- Vollständiger Browser-E2E-Lauf wurde durch Umgebungsregel `ERR_BLOCKED_BY_ADMINISTRATOR` vor der Navigation blockiert. Ein echter Android-Test bleibt offen.