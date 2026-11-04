# Mein Alltag – BW03 · Version 0.24.3

Stand 04.11.2026 · Ausgangsbasis: bestätigte ZIP BW02 V0.24.2.

## Neu: XP, Münzen und Putzmanager-Belohnungen

- BW03-Belohnungskonto: XP, virtuelle Münzen, Splitter. Splitter bleiben zunächst 0, weil die Verwertung erst in BW06 folgt.
- Buchungsjournal mit **stabiler Ereignis-ID** pro tatsächlich abgeschlossener Raumreinigung; historische Buchungen sind in der Belohnungswelt → Missionen einsehbar.
- Datenschutzstandard: **keine Freigabe aktiv**. Nur die Quelle „Putzmanager → Raumreinigung abschließen“ ist in BW03 freischaltbar. Lagerhaus, Familienplaner, Hausservice und insbesondere Frauengesundheit sind nicht verbunden.
- Freigabe nur nach ausdrücklicher Bestätigung. Sie gilt ausschließlich für Raumreinigungen, die **danach gestartet** werden; keine rückwirkenden Gutschriften.
- Konfigurierbare Standardwerte (keine Echtgeldwerte): 2 XP je erledigter Teilaufgabe, 5 Münzen pro vollständigem Raumabschluss, 1 Bonus-Münze je vollen 10 Minuten, mindestens eine Minute und eine Teilaufgabe. Standardmäßig müssen **alle** Teilaufgaben des Raums erledigt sein. Werte lassen sich vor der Durchführung ändern.
- 1.000 XP und 250 Münzen als Sicherheitsobergrenze pro Reinigung. Der Abschluss mit Fehler oder Abbruch wird nicht belohnt.
- **Eine gemeinsame IndexedDB-Transaktion** für Putz-Abschluss, Lagerabbuchung, XP-/Münz-Konto und Buchungsjournal. Ein Fehler rollt den gesamten Vorgang zurück. Neue Bestände und abgeschlossene Sitzungen bleiben damit konsistent.
- Korrekte doppelungssichere Vergabe bei Doppelklick und erneuter App-Nutzung. Historische Daten und alle 14 bisherigen Datenbank-Stores bleiben unverändert; kein Schema-Upgrade notwendig.
- App-Version, Offline-Cache und Offline-Ressourcen auf V0.24.3 aktualisiert. Eigenständige Dateien `assets/reward-economy.js`, `assets/reward-economy-ui.js`, `assets/reward-economy.css`.

## Bedienung

1. **Vor dem Update** die bisherige App-Datenbank über „Mehr“ manuell verschlüsselt sichern und extern aufbewahren.
2. Unter **Belohnungswelt → Missionen** die Freigabe „Putzmanager: Raumreinigung“ aktivieren. Die Seite dient derzeit der XP-/Münzverwaltung; tägliche/wöchentliche Missionen kommen erst in BW07.
3. XP-/Münz- und Zeit-/Aufgabenregeln bei Bedarf bearbeiten und speichern.
4. Danach im **Putzmanager einen neuen Reinigungsdurchgang starten**, Teilaufgaben abhaken und abschließen. Wird die gewählte Mindestzeit und Vollständigkeit erreicht, wird die Belohnung zusammen mit der Lagerabbuchung gespeichert.
5. Unter **Belohnungswelt → Missionen** den Kontostand und den Buchungsverlauf ansehen. Bei einem Fehler bleibt die begonnene Reinigung erhalten.

Die App vergibt weder Gratis-Boosters noch Kartenexemplare. Shop, Booster-Öffnungen, weitere Quellmodule und die 100 Originalmotive bleiben offen. Es gibt keine Echtgeld- oder Glücksspiel-Funktion.

## Teststatus

- PASS: `node test-bw03-economy.mjs` (Freigabe, keine Rückwirkung, anpassbare Regeln, reale Reinigungsabschlüsse, Wallet, Journal, Dubletten, Gesamtrollback inklusive Lagerverbrauch, Backup/Restore).
- PASS: `python test-bw03-ui.py` (isoliertes Chromium mit echtem BW03-UI-Code; 320/390/412 Pixel; Regeländerung, Freigabe, Verlauf und keine horizontale Überbreite).
- PASS: `node test-startup-import.mjs`, `node test-bw02-album.mjs`, `node test-f01-backup.mjs`, `node test-p01-data.mjs`, `node test-l17-quick.mjs`, `node test-w012-room-editor.mjs`, `node test-w013-room-editor.mjs`, `node test-w02-kitchen.mjs`, `node test-w02-hf02-data.mjs`.
- PASS: statischer JS-Syntaxcheck und Prüfung aller 81 Service-Worker-Ressourcen auf vorhandene Dateien.
- AUSSTEHEND: Echte Android-/PWA-Abnahme, realer GitHub-Pages-Livetest und vollständiger End-to-End-Browserlauf unter echter HTTPS-Origin. Einzelne isolierte UI-Tests sind kein Ersatz dafür.

**Versionsführung:** Nach dem Upload GitHub-Commit und Word-Checkliste abgleichen. `DOKUMENTATION/BW03_XP_Muenzen_390px.png` enthält simulierte Testdaten und stellt **nicht** den Spielstand des Nutzers dar.
