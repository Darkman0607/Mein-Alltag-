# Mein Alltag – BW05 · V0.24.5

**04.11.2026 · Belohnungswelt: Fünf-Karten-Öffnung**  
**Grundlage:** BW04 V0.24.4 – unveränderte lokale Datenbank V2, kein Löschen vorhandener Daten.

## Umsetzung

- Im Booster-Inventar erscheint für jedes gekaufte Pack **„Jetzt öffnen ✨“**. Nach Bestätigung werden **genau fünf Karten** mithilfe von `crypto.getRandomValues` gezogen. Jede Ziehung erfolgt unabhängig **mit Zurücklegen**. Doppelte Karten sind deshalb möglich; keine Seltenheits- oder Diamant-Garantie.
- Ausschließlich der beim **Kauf gespeicherte Kartenpool mit Gewichten** zählt. Eine spätere Preisänderung oder neue Karte im aktuellen Shop verändert die Ziehchancen bereits gekaufter Packs nicht.
- Ein **einziger IndexedDB-Readwrite-Transaktionsblock** (`bw-unopened`, `bw-instances`, `bw-journal`, `bw-catalog`) prüft den Pack-Zustand, legt fünf Kartenexemplare an, protokolliert die Öffnung und löscht erst im selben Commit das ungeöffnete Pack.
- Bereits geöffnete Packs werden über eine feste Öffnungs-ID erkannt; erneute Anfragen liefern den alten Verlauf **ohne neue Karten**.
- Bei fehlerhaftem Pack, manipulierten Gewichten oder gelöschter Karte wird die Transaktion abgebrochen. Das ungeöffnete Pack bleibt erhalten. Vor dem erneuten Öffnen fehlende Albumkarten aus der Sicherung wiederherstellen.
- Die Oberfläche zeigt fünf **einzeln aufdeckbare Karten**, eine „Alle aufdecken“-Funktion, Name, Seltenheit, Kartennummer und Kennzeichnung für Dubletten. Ein Öffnungsverlauf bleibt auch nach App-Neustart verfügbar.
- Der Sammelfortschritt wird weiter aus den **real gespeicherten Kartenexemplaren** berechnet. Ein selbst gestalteter Kartenplatz ohne Exemplar ist weiterhin *nicht gesammelt*.
- Verschlüsselte Backups enthalten Pack-Inventar, fünf Kopien pro Öffnung, Wallet und Journal. Bestehende Module und ihre Daten bleiben unangetastet.
- Der Shop verwendet weiterhin nur virtuelle Münzen aus freigegebenen Aufgaben. BW05 fordert **keine weiteren Münzen** beim Öffnen.

## Bedienung

1. Zuerst in **Mehr → Verschlüsseltes Backup herunterladen** eine Sicherung der aktuellen Daten erstellen.
2. Version **0.24.5** prüfen. Unter **Belohnungswelt → Booster** eines der bereits gekauften Packs auswählen.
3. **„Jetzt öffnen ✨“** bestätigen und die fünf Karten einzeln oder zusammen aufdecken.
4. Über **„Zum Kartenalbum“** die gesammelten Exemplare und den Fortschritt kontrollieren. Im Booster-Inventar unter **Öffnungsverlauf** jederzeit erneut nachsehen.
5. Vor einem Kauf müssen mindestens fünf passende selbst angelegte Katalogkarten vorhanden sein. Keine Originalbilder werden automatisch erfunden.

## Einschränkungen

Die **100 individuellen Originalkartenmotive** liegen weiterhin nicht vor; man kann eigene Karten im Album gestalten. Bei nachträglich gelöschten Katalogkarten muss das Album vor der Öffnung repariert werden; ein Pack wird dabei *nicht* verbraucht. Kartenhandel, Herstellung, Booster-Mehrfachöffnung, Bonus-/Garantiesysteme und der Belohnungskalender sind nicht Bestandteil von BW05.

## Prüfnachweise

`node test-bw05-opening.mjs` kontrolliert Ziehung, fünf Kopien, Dublettenschutz, Poolintegrität, Rückabwicklung, statistische Gewichte und Backup/Restore. `python test-bw05-ui.py` prüft die isolierte mobile Chromium-Oberfläche bei 320/390/412 Pixel. Relevante Regressionen der bisherigen Funktionen wurden erneut ausgeführt. Details: `TESTS_BW05.md`.

**Noch offen:** End-to-End-Test der auf GitHub Pages veröffentlichten HTTPS-PWA, Android-Installation/Offline-Update und Restore mit realen Nutzerdaten auf einem zweiten Gerät. Isoliertes Chromium ist kein Ersatz für diesen Praxistest.
