# BW08 – Testprotokoll (04.11.2026)

## Bestanden

- 12 einzigartige Missions-IDs, definierte Dauern und Auszahlungen
- Freigabe vor erster Bewertung; erneute Aktivierung ohne Neuanfang/Neuvergabe
- Keine rückwirkende Vergütung alter Reinigungs-/Boosterereignisse
- Für Missionsfortschritt nur verifizierte `cleaning-complete`-Einträge aus `putzmanager` und `booster-open` aus dem Belohnungsjournal; Gesundheitseinträge ausgeschlossen
- Zahl der Putzaufgaben, Zahl der Raumreinigungen und Boosteröffnungen korrekt ausgewertet
- Einzigartige vorhandene Kartentypen für Sammelmissionen, Katalog ohne Besitz zahlt nichts aus
- Tages-, Monats- und Wochenfenster (Montag als Wochenstart), Zeitfensterwechsel und UTC-Zeitstempel
- Keine Auszahlungen beim Anzeigen; nur nach explizitem Benutzerklick
- Einmalige Buchung pro Mission und Zeitraum, wiederholte Anfrage nur als Replay
- Wallet + Journal im selben `readwrite`-Vorgang; Kontoüberlauf bricht den ganzen Vorgang ab
- Vollständiger Backup/Restore-Roundtrip mit Missionsfreigabe, Wallet, Journal und Kartensammlung
- Isolierte Chromium-UI-Tests bei 320/390/412 px: Aktivierung, Fortschrittsanzeige, deaktivierte Buttons, einmalige Auszahlung, Zeitfilter, bestehende BW03-Einstellungen, kein horizontaler Überlauf
- Bestehende BW01–BW07- und BW11-Regressionen ausgeführt und bestanden (Details in TESTS_BW08.log)

## Einschränkungen

- Keine echte Android-Hardwareprüfung und kein öffentlicher GitHub-Pages-Browser-Abnahmetest.
- Ein vollständiger HTTP-Browseraufruf auf localhost wird in dieser Umgebung blockiert (`ERR_BLOCKED_BY_ADMINISTRATOR`), daher sind responsive UI-Tests ausdrücklich isolierte Tests.
- Lokale Geräteeinstellungen können die Zeitfenster verschieben; eine offline-only App besitzt keine vertrauenswürdige Serverzeit.
