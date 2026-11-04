# Mein Alltag – BW08 Missionen · Version 0.24.9

**Stand: 04.11.2026** · Entwicklung auf Grundlage von BW11 V0.24.8.

## Neu – echte Missionen statt Demo-Fortschritt

Die Registerkarte **Belohnungswelt → Missionen** enthält zwölf konkrete Aufgaben:

| Zeitraum | Mission | Ziel | Auszahlung |
|---|---|---:|---:|
| Täglich | Ein Raum geschafft | 1 bestätigte Reinigung | 12 XP + 5 Münzen |
| Täglich | Fünf Aufgaben erledigt | 5 bestätigte Putzaufgaben | 8 XP + 4 Münzen |
| Täglich | Booster-Moment | 1 echte Boosteröffnung | 8 XP + 3 Münzen |
| Wöchentlich | Drei Räume | 3 Reinigungen | 30 XP + 15 Münzen |
| Wöchentlich | 15 Häkchen | 15 Putzaufgaben | 25 XP + 10 Münzen |
| Wöchentlich | Zwei Booster | 2 Boosteröffnungen | 18 XP + 6 Münzen |
| Monatlich | Zehn Räume | 10 Reinigungen | 80 XP + 35 Münzen |
| Monatlich | Fünf Booster | 5 Boosteröffnungen | 45 XP + 20 Münzen |
| Dauerhaft | Sammlerstart | 5 unterschiedliche vorhandene Karten | 15 XP + 8 Münzen |
| Dauerhaft | Kartenschatz | 20 unterschiedliche Karten | 50 XP + 25 Münzen |
| Dauerhaft | Großer Sammler | 50 unterschiedliche Karten | 125 XP + 60 Münzen |
| Dauerhaft | Komplettalbum | 100 unterschiedliche Karten | 300 XP + 150 Münzen |

### Nutzung

1. **Vor dem Update:** In „Mehr“ ein verschlüsseltes Gesamtbackup anlegen und extern sichern.
2. Die Aktualisierung ins Repository-Hauptverzeichnis (`main`, `/(root)`) übernehmen, anschließend Chrome/PWA schließen und neu laden. Unter „Mehr“ Version `0.24.9` prüfen.
3. Belohnungswelt → Missionen → **Missionen jetzt starten** einmalig bestätigen. Ab jetzt werden nur neue, tatsächlich in der Datenbank verbuchte Ereignisse berücksichtigt. Die bestehende BW03-Putzmanager-Freigabe muss für Reinigungsmissionen eingeschaltet sein (Regeln und Freigaben unten aufklappen).
4. Nach einer passenden Reinigung/Boosteröffnung Missionen öffnen. Bei erreichten Zielen **Belohnung abholen** drücken; erst dann werden XP und Münzen gutgeschrieben.
5. Bereits gesammelte **unterschiedliche** Karten zählen nur für die dauerhaften Sammlerziele. Alle vorherigen Reinigungs- oder Boosterereignisse bleiben bewusst unberücksichtigt.

### Datenschutz / Datenintegrität

- Keine externen Nutzerkonten, keine Cloud-Analyse, keine sensiblen Gesundheitsdaten. Die Missionen lesen nur bestätigte Belohnungsjournalereignisse und die tatsächlich gespeicherten Kartenexemplare.
- Jede Auszahlung schreibt `bw-wallet` und `bw-journal` in einer **einzigen IndexedDB-Transaktion**. Feste Mission-/Zeitfenster-IDs schützen gegen Doppelklick, App-Neustart und erneutes Abholen.
- Tägliche Missionszeiträume orientieren sich an der **lokalen Geräteuhr**, Wochen beginnen Montag; Monatsgrenzen werden lokal berechnet. Bei Umstellung von Uhrzeit/Zeitzone können Offline-Daten nicht serverseitig abgesichert werden.
- Keine automatische Münz-/XP-Vergabe beim Lesen oder Anzeigen. Die Missionen bleiben vor ausdrücklicher Aktivierung ohne Vergütung. Booster-Käufe selbst sind keine Missionen.
- Einstellungen, Fortschrittsgrundlagen und Buchungen liegen in bereits vorhandenen Datenbank-Stores und sind Teil des verschlüsselten Gesamtbackups. Ein neuer Datenbank-Upgrade ist nicht erforderlich.
- Belohnungen in BW08 sind fest definiert, noch **nicht** als freie Regelvorlagen editierbar. Ereignisse anderer Module sind noch nicht angebunden. Belohnungskalender BW09 und Diamantgarantie BW10 bleiben offen.

### Prüfungen

- `node test-bw08-missions.mjs` – feste Missionen, Wochen-/Monatswechsel, Aktivierungsgrenze, tatsächliche Ereignisse, keine doppelte Auszahlung, atomare Fehlerbehandlung, Backup/Restore.
- `python test-bw08-ui.py` – echte UI-Funktionen in isoliertem Chromium bei 320/390/412 px.
- BW01–BW07/11 Kernregressionen, einschließlich Kartenverwaltung und Premium-Booster, erneut überprüft. Veralteter BW05-UI-Testfixture an den seit BW11 benötigten Premium-Renderer angepasst; kein Produktionscode dafür verändert.
- `node --check` für neue/geänderte JavaScript-Dateien, Cache-Dateipfade und ZIP-Integrität geprüft.
- **Nicht nachgewiesen:** tatsächliche Android-PWA-Installation, Browser-Cache-Update auf dem Zielgerät, manuelles Restore auf einem zweiten Gerät. Der vollständige lokale Chromium-HTTP-Aufruf wird durch die Laufzeitumgebung blockiert.

> Die Grafik `DOKUMENTATION/BW08_Missionen_390px.png` stammt aus einem **isolierten Test mit ausdrücklich simulierten Fortschrittswerten**, nicht aus dem persönlichen Datenbestand oder einer Live-App.
