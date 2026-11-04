# BW04 – Testprotokoll · V0.24.4

## Sicherheits- und Funktionsprüfungen (Node)

PASS: 7 Booster-Typen werden angelegt, bisherige fünf Module und vorhandene Albumdaten bleiben unberührt.
PASS: Ohne mindestens fünf gültige passende Katalogkarten ist kein Kauf möglich; noch nicht gestaltete Albumplätze gelten nicht als Kartenpool.
PASS: Mix, Premium und Event sind mit einem passenden Pool kaufbar; Themen-Booster werden je Kategorie korrekt gesperrt/freigeschaltet.
PASS: Seltenheits-Chancen werden nur aus echten, aktuell passenden Karten und Gewichtungen berechnet; 0 % für nicht enthaltene Seltenheiten; gültige Pools summieren sich auf 100 %.
PASS: Favoriten setzen/entfernen und Boosterpreis 1–500 Münzen speichern; ungültige Preise werden abgewiesen.
PASS: 1–10-Packs-Kauf belastet Münzkonto, erzeugt individuelle Packs und Journalatomar; richtige Menge und Kaufpreis in jedem Pack gespeichert.
PASS: Dieselbe Kauf-ID erneut verwendet: kein zweiter Münzabzug und kein zusätzliches Pack. Abweichende Menge bei gleicher ID wird abgewiesen.
PASS: Zu wenig Guthaben, fehlender Kartenpool und beschädigtes Münzkonto erzeugen kein Pack und keinen Journaleintrag.
PASS: Bereits gekaufte Packs behalten Kartenpool/Kaufpreis auch nach Preis- oder Katalogänderung.
PASS: Vollbackup/Restore enthält alle Packs, Kaufjournal, Preise und Favoriten. Kein Phantom-Kartenbesitz und keine künstlichen Startmünzen.

## Regressionen

PASS: `test-bw01-data.mjs`, `test-bw02-album.mjs`, `test-bw03-economy.mjs` (ausschließlich die historischen Versionsprüfungen auf aktuelle V0.24.4 gesetzt, Logik nicht abgeschwächt).
PASS: `test-f01-backup.mjs`, `test-p01-data.mjs`, `test-l17-quick.mjs`, `test-ls02-crypto.mjs`, `test-startup-import.mjs`, `test-w012-room-editor.mjs`, `test-w013-room-editor.mjs`, `test-w02-hf02-data.mjs`, `test-w02-kitchen.mjs`.
PASS: Syntax sämtlicher `.js` und `.mjs`-Dateien mittels `node --check`.
PASS: Alle im Offline-Service-Worker gelisteten Dateien existieren in der ZIP.

## Isolierte mobile Oberfläche

PASS: `python test-bw04-ui.py` in Chromium 320 / 390 / 412 Pixel: Laden, dynamisches Shop-Filtering, Favoriten, Mengenwahl, virtueller Kauf, Preisänderung, Inventar, kein horizontaler Überlauf und keine Browser-Ausnahme.

**Einschränkung:** Die Chromium-Prüfung verwendet Testkonten und Testkarten ausschließlich im Testskript. Keine erfundenen Münzen oder Karten in der gelieferten App. HTTP-Localhost-Aufruf der vollständigen PWA wurde mit `net::ERR_BLOCKED_BY_ADMINISTRATOR` gesperrt.

## Weiterhin offen

- Echte Prüfung der live veröffentlichten GitHub-Pages-Adresse auf Android inklusive Offline/Service-Worker-Aktualisierung.
- BW05: Fünf Karten aus dem beim Kauf fixierten Pool ziehen, sichere Transaktion für Packöffnung und Kartenexemplare; Ziehstatistik und Garantien gesondert testen.
- Ein realer Restore auf Zweitgerät mit produktiven Daten, nur nach vorheriger Nutzersicherung.
- Endgültige individuelle Kartenmotive/Quelldateien.
