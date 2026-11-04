# Mein Alltag – BW09 · Version 0.25.0

**Datum:** 04.11.2026  
**Basis:** BW08 V0.24.9  
**Bereich:** Belohnungswelt → Belohnungskalender  
**Verbindliche Abfolge:** BW11 ✓ → BW08 ✓ → BW09 ✓ → **BW10 Diamantgarantie** → später weitere Updates.

## Neu

- Ein neuer **echter Monatskalender** mit vergangenen, heutigen und künftigen Tagen, Monatsnavigation und sichtbaren Häkchen für tatsächlich abgeholte Geschenke.
- **Tagesgeschenk:** Nach freiwilliger einmaliger Aktivierung kann pro lokalem Kalendertag **ein Geschenk mit 6 XP und 5 virtuellen Münzen** abgeholt werden; keine automatische Auszahlung.
- **Bestätigter Aufgabenbonus:** Für **5 oder mehr neue bestätigte Putzaufgaben am selben Kalendertag** kann einmalig zusätzlich **10 XP und 6 virtuelle Münzen** abgeholt werden. Grundlage sind ausschließlich journalisierte, von BW03 freigegebene Putzmanager-Reinigungen **nach Kalenderaktivierung**.
- **Dauerhafte Meilensteine:** Nach 3 (15 XP/10 Münzen), 7 (35 XP/25 Münzen), 14 (75 XP/50 Münzen) und 30 (150 XP/100 Münzen) **unterschiedlichen abgeholten Geschenktagen** gibt es je eine manuell abholbare Einmalprämie. Die Anzahl muss **nicht aufeinanderfolgen**. Auslassen einzelner Tage verliert keine Fortschritte.
- **Exakte einmalige Buchung:** Die Wallet-Änderung und der neue Journal-Eintrag erfolgen gemeinsam in **einer IndexedDB-Transaktion**. Dieselbe Tages-/Meilenstein-ID zahlt nicht zweimal aus, auch nach einem doppelten Klick oder Neuladen nicht.
- Freigabe, Guthaben, Geschenk- und Bonusjournal werden durch die vorhandene vollständige **verschlüsselte Gesamtbackupsicherung** abgedeckt; keine Datenbank-Migration, keine Veränderung alter Karten oder Booster.
- Verlinkung von Belohnungswelt-Start, Missionen und „Mehr“ zum neuen Kalender. Der neue Programmcode und CSS befinden sich im Offline-Cache.

## Bedienung

1. Unter **Mehr → Backup** ein verschlüsseltes Backup erstellen und extern aufbewahren.
2. App aktualisieren; unter **Mehr → App-Version** muss **0.25.0** stehen.
3. **Belohnungswelt → Belohnungskalender** öffnen und **Belohnungskalender aktivieren** auswählen.
4. Für das erste Tagesgeschenk **Jetzt abholen** antippen.
5. Für den Aufgabenbonus sind bestätigte Putzmanager-Aufgaben erforderlich und die Freigabe der **BW03 Putzprämien** muss aktiv sein. Missionen und Kalender können unabhängig voneinander aktiviert werden.
6. Beim Erreichen eines Meilensteins dessen Prämie separat abholen. Ein Tag ohne Besuch ist kein Rückschritt.
7. Erneut ein Backup erstellen.

## Grenzen und Ehrlichkeit

- Keine Echtgeld-Belohnungen, keine geschenkten Booster, keine zufällige geheime Wahrscheinlichkeit und keine automatischen Zahlungen. Ein Tagesgeschenk besteht derzeit aus XP und virtuellen Münzen.
- Keine rückwirkende Geschenk- oder Aufgabenvergabe für vergangene Zeiträume. Der Kalender ist lokal und besitzt **keine vertrauenswürdige Serverzeit**: manuelle Änderungen der Geräteuhr sind nicht vollständig verhinderbar.
- Gesundheits-, Familien- und Hausservice-Daten werden nicht ausgewertet. Ein selbst eingetragenes Aufgaben-Häkchen ohne bestätigte Reinigung löst keinen Bonus aus.
- **Nicht abgenommen:** reale Android-PWA, Live-Installation/Update auf GitHub Pages, Wiederherstellung auf zweitem physischen Gerät.
- **BW10 Diamantgarantie** bleibt offen. Keine heimlich geänderten Ziehchancen.

## Tests

Siehe `TESTS_BW09.md`, `TESTS_BW09.log` sowie die Node- und isolierten Chromium-Regressionen. Die vollständige Anwendung konnte im Testcontainer über Dateischema nicht geöffnet werden (`ERR_BLOCKED_BY_ADMINISTRATOR`); isolierte UI-Tests sind keine Android-Abnahme.
