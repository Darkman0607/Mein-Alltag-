# Mein Alltag – Putzmanager P05-HF01 (Version 0.28.2)

**Datum:** 15. November 2026  
**Ausgangspunkt:** GitHub `main` / v0.28.1, mit LUX07.

## Fehler

In P05 wurden Häkchen einer Reinigungs-Sitzung zwar im aktiven Datensatz gespeichert, für die Hauptseite und Fälligkeiten aber erst nach „Reinigung abschließen“ berücksichtigt. Ein allein ausgeräumter Geschirrspüler blieb auf der Startseite weiter „fällig“.

## Behebung

- Jedes Häkchen eines Reinigungsbereichs wird **sofort** lokal als eigener Eintrag (`cleaning.sessions.v1.taskEvents`) in IndexedDB gespeichert. Eine laufende Stoppuhr und „Reinigung abschließen“ sind nicht erforderlich.
- Abhakbare Einzelschritte ohne aktive Sitzung werden in `quickSteps` ebenfalls sofort gespeichert; bei vollständig erledigtem Bereich folgt der Einzelnachweis.
- Hauptübersicht: `Heute erledigt`, `Jetzt fällig`, `Überfällig`, Raumkarten und die neue Liste **„Heute abgehakt“** verwenden diese Nachweise und die abgeschlossenen Sitzungen; doppelte Nachweise desselben Bereichs zählen nur einmal.
- Raumansicht: Häkchen und „Heute erledigt“ bleiben beim erneuten Aufrufen erhalten. Beim Tageswechsel gilt wieder der individuell eingestellte Rhythmus.
- Ein am selben Tag gesetztes Häkchen kann rückgängig gemacht werden. Teilweise abgehakte Einzelschritte bleiben erhalten.
- Geschirrspüler **einräumen/ausräumen** zählt als eigene tägliche Aufgabe; Frontreinigung und Siebprüfung können getrennt über die Schnellliste als optionale Pflege ergänzt werden.
- Einzelne Häkchen erscheinen in der Reinigungs-Historie mit Zeitpunkt. Alte unvollständige Sitzungsdaten (z. B. 11/21) werden nicht als Beweis für eine bestimmte Aufgabe interpretiert.
- Lagerbestand wird **erst** bei ausdrücklich bestätigtem Reinigungsabschluss abgebucht, nicht beim schnellen Abhaken. Stoppuhr und bestehende Sessions bleiben erhalten.
- Datenkompatible Erweiterung: Bestehende Lagerhaus-/Putz-/Reward-Daten und LUX07-Funktionen bleiben erhalten. Neue Daten bleiben lokal auf diesem Gerät.

## Teststatus

**Bestanden:** Node-Datentests P01, P02, P03, P04, P05, neuer P05-HF01, Lagerhaus LUX07 und ESM-Startimport; statische JS-Syntaxkontrolle.  
**Noch offen:** tatsächlicher Chromium-Browser-End-to-End-Test (Navigation wird in dieser Umgebung durch `ERR_BLOCKED_BY_ADMINISTRATOR` blockiert), Android- und GitHub-Pages-Praxistest. Keine Behauptung eines erfolgreichen Handytests.

## Installation und Prüfung

1. Vor dem Update persönliche Daten per App-ZIP sichern.
2. Auf GitHub Pages installierte PWA aktualisieren und Version **0.28.2** kontrollieren.
3. Küche öffnen, **ohne** „Reinigung starten“ den Geschirrspüler abhaken. Zur Hauptübersicht zurück: `Heute erledigt +1`, `Jetzt fällig −1`, Name unter „Heute abgehakt“.
4. Küche erneut öffnen und App komplett neu starten: Häkchen bleibt gespeichert. Keine Materialabbuchung.
5. Am nächsten Tag wird die Aufgabe entsprechend dem täglichen Intervall erneut fällig. Andere Aufgaben bleiben unverändert.

**Wichtige Abgrenzung:** Der Hotfix kann bei früheren, nicht zugeordneten 11/21-Zählerständen nicht rekonstruieren, was konkret geputzt wurde.
