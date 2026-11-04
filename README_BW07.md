# Mein Alltag – BW07 | V0.24.7

Datum: 04.11.2026 · Belohnungswelt · Aufbauend auf BW06/V0.24.6.

## Umsetzung

- Neue Bildschirmseite **Belohnungswelt → Karten verwalten** (bisher vorbereiteter Eintrag „Herstellung“), mit Übersicht über tatsächlich gezogene Kartenexemplare, Suchfeld, Favoriten, Sperrstatus, Belegen und virtuellem Buchungsjournal.
- Individuelles **Sperren/Entsperren** einzelner Kartenexemplare; gesperrte Exemplare können nicht verkauft oder verwertet werden.
- **Virtueller Verkauf** einzelner Karten gegen Münzen oder **Splitterverwertung** in einem einzigen atomaren Datenbankvorgang: Exemplar entfernen, Kontostand erhöhen und Journal schreiben, oder alles zurückrollen.
- Schutz vor versehentlichem Abgeben des **letzten Exemplars** und von seltenen Karten (Legendär, Mythisch, Diamant) durch zusätzliche ausdrückliche Bestätigungen.
- **Kartenherstellung** aus vorhandenen Splittern (gewöhnlich bis mythisch), mit atomarer Splitterabbuchung, Kartenanlage und Journal. **Diamantkarten können nicht hergestellt werden.**
- **Einstellbare virtuelle Verkaufserlöse, Splittererlöse und Herstellungskosten** (1–10000, Herstellungskosten über Verwertungserlös); keine Echtgeldpreise oder Märkte.
- Jede Aktion verwendet eine eindeutige Buchungs-ID und verhindert eine Doppelgutschrift bei Wiederholung. Vorhandene Karten, Guthaben, Booster und Nutzerdaten werden beim Update nicht pauschal überschrieben.
- Mobile Darstellung (320, 390, 412 px), neue Styles und Offline-Cache; vollständige App und Word-Checklisten im ZIP.

## Beachtung

**Dies ist kein Kartentausch zwischen Personen/Geräten.** Externe Tauschfunktionen, Diamant-Garantien, Kalender und besondere Eventregeln bleiben offen. Alle Wechselkurse sind bewusst vorläufige Einstellungen für die private Belohnungswelt, nicht mit realem Geld verbunden.

**Sicherheit:** Vorher ein externes Backup in der App anlegen. Bei Verkauf/Verwertung werden Exemplare aus der Sammlung endgültig entfernt; ein früheres Backup wäre die einzige Wiederherstellungsmöglichkeit. Es werden keine Gratis-Münzen oder Gratis-Karten gutgeschrieben.

## Installation / Abnahme auf Android

1. ZIP-Inhalt komplett ins Root von `main` einspielen (oder auf GitHub veröffentlichte Version aufrufen).
2. App in Chrome neu laden, Versionsanzeige unter **Mehr** auf `0.24.7` prüfen.
3. Vor Kartenverkauf einmalige Sicherung anlegen.
4. **Belohnungswelt → Karten verwalten** öffnen. Zuerst eine doppelte, verzichtbare Karte sperren und Entsperren prüfen.
5. Eine solche Karte testweise gegen Münzen verkaufen oder in Splitter verwerten, anschließend Vorgangsverlauf/Kontostand prüfen.
6. Nach ausreichend Splittern eine gewöhnliche Karte herstellen und den Bestand prüfen.
7. Optional Backup erstellen und auf sicherem Weg separat speichern.

## Teststatus

- `node test-bw07-cards.mjs`: bestanden (atomare Aktionen, Rollbacks, Schutzfälle, Idempotenz, Preisänderungen, Sicherung/Wiederherstellung, Diamantverbot).
- `python test-bw07-ui.py`: bestanden (Chromium 320/390/412 Pixel, Bedienelemente, keine horizontale Überläufe).
- BW01–BW05 Kern-Node- und BW04/BW05-UI-Regressionsprüfungen bestanden.
- **Ausstehend:** physischer Android-PWA-Test, GitHub-Pages-live mit Service-Worker-Update, Restore auf zweitem Gerät.
