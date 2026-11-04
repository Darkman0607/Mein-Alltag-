# BW09 – Testprotokoll (04.11.2026)

## Automatisch bestanden

- Strenge Einstellungen und unabhängige ausdrückliche Aktivierung; Laden vergibt **nichts**.
- Pro lokalem Kalendertag höchstens **ein** Tagesgeschenk, wiederholtes Abholen nur Replay.
- Verifizierte Putzmanager-Journalbuchungen **nach Aktivierung** zählen für 5-Aufgaben-Bonus; frühere, manipulierte oder fachfremde Quellen nicht.
- Eigenständiger Aufgabenbonus nur einmal pro Tag; Datum/Zeitzonenfenster und Monatsnavigation geprüft.
- Meilensteine 3/7/14/30 Tage: **kumulativ** und ohne Streak-Strafen; Fehltage vermindern den Fortschritt nicht.
- Doppelauszahlungsschutz über stabile journalisierte IDs; Guthaben und Journal in derselben Transaktion.
- Kontolimit-Überlauf führt zu vollständigem Rollback; keine unvollständigen Belohnungen.
- Vollständiger Backup-/Restore-Roundtrip inkl. Freigaben, Journal und Wallet.
- Isoliertes Chromium bei 320/390/412 px: Aktivierung, 42 Tagesfelder, Geschenk und Aufgabenbonus, Buttonsperre, Monatsnavigation, keine horizontale Scrollbar.
- Vorhandene BW01/BW02/BW03/BW04/BW05/BW07/BW08/BW11-Node-Regressionen, BW04-Shop-UI (nach Fixture-Reparatur), BW08-Missions-UI und BW11-Album/Booster-UI erneut bestanden. Der historische BW05-UI-Test wurde in diesem Durchlauf nicht abgeschlossen und wird nicht als erfolgreich gezählt.
- Offline-Cache referenziert vorhandene, eindeutige Dateien; App/Service-Worker/Version.json auf **0.25.0** abgeglichen.

## Abnahme ausstehend

- Echter Chrome-Test auf Android inkl. Installations-, Offline- und Updateverhalten.
- Öffentlicher GitHub-Pages-Browser-Test.
- Wiederherstellung auf zweitem physischen Gerät.

## Hinweis

Die App benutzt lokale Gerätezeit, da die private Offline-PWA keine vertrauenswürdige externe Zeitquelle verlangt. Vorsätzliche Uhrmanipulation kann nicht vollständig ausgeschlossen werden. Das Testprotokoll ersetzt keine reale Geräteabnahme.
