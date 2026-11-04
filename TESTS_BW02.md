# BW02 – Prüfbericht

| Test | Ergebnis |
|---|---|
| Datenbank/Album 100 eindeutige Plätze, Kategorien, Fortschritt | PASS |
| Nur tatsächliche Exemplare zählen; doppelte Kopien korrekt gezählt | PASS |
| Filter, Suche, Favoriten, stabile Katalog-ID und Kartenbearbeitung | PASS |
| Schutz vor ungültigen Kartendaten | PASS |
| Favoriten/Karten im Backup; Altbackup mit bestehenden Belohnungsdaten | PASS |
| Isolierte Chromium-UI 320/390/412 px, Dialoge, keine Überbreite | PASS |
| F01, P01, W02, W01.2, W01.3, HF02, L17, ESM-Import | PASS |
| Browser mit echter HTTPS-URL / HTTP-Server | BLOCKIERT durch Umgebungsrichtlinie |
| GitHub-Pages-Liveprüfung / echtes Android-Gerät | OFFEN |
| Originale 100 Kartenbilder | NICHT VORHANDEN |

Die isolierte Chromium-Prüfung arbeitet mit synthetischen Prüfdaten und prüft keine persistente Handy-Datenbank. Browser-IndexedDB wurde mit dem Node-Mock inklusive verschlüsselter Sicherung geprüft; die echte Chromium-IndexedDB-Laufzeit über HTTP war hier nicht erreichbar.
