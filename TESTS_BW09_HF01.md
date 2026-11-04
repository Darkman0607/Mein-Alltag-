# BW09-HF01 · Tests und Grenzen

Datum: 04.11.2026; App-Version: 0.25.1.

## Fehler und Abhilfe

Fehler in `assets/app.js`: `hashRoute()` kannte `belohnungskalender` nicht, obwohl `renderReward()` den Kalender rendern und die Schaltflächen auf `#/reward/belohnungskalender` navigieren konnten. Dadurch erschien wieder die Startansicht. Die Route wurde in der Allowlist ergänzt; Version und Cache-Key wurden aktualisiert.

## Erfolgreich

- `python test-bw09-navigation.py`: **PASS** bei 320/390/412 px; benutzt die echten 53 App-Moduldateien, den tatsächlichen Hash-Router und reale HTML-Klickpfade über Startansicht, direkten URL-Hash und `Mehr`. Browserausführung innerhalb einer von realen URLs getrennten Importmap-Testumgebung.
- `python test-bw09-ui.py`: **PASS** bei 320/390/412 px: Kalenderaktivierung, Tagesgeschenk, Aufgabenbonus, Monatsnavigation, kein Overflow. Isolierter Kalender-/UI-Harness; keine direkte Verbindung zur gesamten IndexedDB-App.
- `node test-bw09-calendar.mjs`: **PASS**, atomare/duplikatfreie Prämien, Test des verschlüsselten Backups und Rücksicherung.
- `node test-bw08-missions.mjs`, `node test-bw11-premium.mjs`: **PASS**.
- `node test-bw01-data.mjs`, `test-bw02-album.mjs`, `test-bw03-economy.mjs`, `test-bw04-shop.mjs`, `test-bw05-opening.mjs`: **PASS**, Versionsassertions für 0.25.1 aktualisiert.
- `node --check assets/app.js` und `node --check sw.js`: **PASS**.

## Was nicht getestet wurde

Echter HTTP-/HTTPS-E2E-Test und physische Android-PWA-Abnahme sind weiterhin offen, weil Chromium im Container echte Seitenaufrufe mit `ERR_BLOCKED_BY_ADMINISTRATOR` verweigert. Unter about:blank ist IndexedDB gesperrt; deswegen testet der neue App-Routetest nur die Navigation, während die bisherigen Datenbank- und Kalender-Tests die Speicher- und Prämienlogik prüfen. Kein behaupteter Test der echten GitHub-Pages-Verteilung oder des PWA-Update-Rollouts.

## Datensicherheit

Keine Migration; keine Manipulation von Wallet, Journal, Kartenkatalog, Missionen, Booster oder persönlichen Daten. Das Update ändert nur Routenparsing, Versions-/Cache-Dateien, Tests und Dokumentation.
