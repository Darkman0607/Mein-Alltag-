# Mein Alltag – BW04 · V0.24.4

**Stand:** 04.11.2026  
**Vorgänger:** BW03 · V0.24.3  
**Bereich:** Belohnungswelt → Booster-Shop / Booster-Inventar

## Neues im Booster-Shop

- Sieben dauerhaft definierte Booster-Angebote: Entdecker-Mix, vier Themen-Booster, Premium und Event. Jedes gekaufte Booster hat **fünf zukünftige Kartenslots**.
- Kategorien, Textsuche, Favoriten, Filter für kaufbereite Booster und Booster mit Chancen auf Selten oder höher.
- Preis je Booster-Typ individuell zwischen 1 und 500 virtuellen Münzen einstellbar. Standardpreise: Mix 20, Thema 25, Premium 60, Event 40.
- Der vollständige **aktuell passende Kartenpool** und die daraus berechnete **theoretische Wahrscheinlichkeit je Kartenplatz** können eingesehen werden. Die Berechnung nutzt Gewichtung * Anzahl passender Karten pro Seltenheit. Unmögliche Raritäten erhalten 0 %; angezeigte Werte summieren sich auf 100 %, wenn ein Pool existiert.
- **Keine gekauften Booster ohne Inhalt:** Mindestens fünf eigenständig im Album angelegte, zum Booster passende Karteneinträge sind Voraussetzung. Unbearbeitete der 100 Albumplätze zählen nicht. Einzelne Eventkarten können in der Kartenbearbeitung markiert werden; Event-Booster benötigen mindestens fünf markierte Karten.
- Käufe von 1 bis 10 Booster pro Buchung. Preisabzug, Erstellung aller einzelnen ungeöffneten Booster und Journal werden atomar in einer IndexedDB-Transaktion geschrieben. Limit 200 ungeöffnete Booster insgesamt.
- Kauf-IDs verhindern Mehrfachabbuchung beim Wiederholen desselben Vorgangs. Bei nicht ausreichenden Münzen, beschädigtem Wallet oder unvollständigem Pool wird vollständig abgebrochen.
- Jedes Pack erhält eine feste individuelle ID, Kaufdatum, Kaufpreis, Fünf-Slot-Konfiguration und eine **Momentaufnahme von Kartenpool, Gewichten und Chancen**. Spätere Änderungen am Katalog oder Shoppreis ändern gekaufte Packs nicht.
- Das eigene **Booster-Inventar** zeigt ungeöffnete Packs gruppiert, mit Kaufhistorie, Kaufdatum und Status „Versiegelt“. Verschlüsselte Gesamtsicherungen enthalten alle Daten automatisch, da die bestehenden Rewardspeicher genutzt werden.

## Wichtige Grenzen

**BW04 ist ein Shop für virtuelle, lokal verdiente Münzen. Kein Echtgeld und keine echten Waren.** Es gibt keine kostenlosen Startmünzen. Ohne mindestens fünf konfigurierte Karten kann noch kein Booster gekauft werden. Die **100 Originalbilder sind nicht enthalten** und werden nicht vorgetäuscht. Die Bilder können weiterhin im Album selbst eingefügt werden; die reine Kartengestaltung zählt nicht als Kartenbesitz.

**Das Öffnen, Ziehen, Zufallsalgorithmus und Anlegen der fünf Kartenexemplare folgen erst in BW05.** Die Wahrscheinlichkeiten beschreiben das dokumentierte künftige Ziehmodell mit unabhängigen Plätzen und Zurücklegen; sie sind noch kein erfolgreich getesteter Ziehalgorithmus. Es gibt keine Raritäten-Garantie und keinen automatischen Diamant-Gewinn.

Die Gesundheitsdaten und sämtliche anderen Quellmodule bleiben unverändert getrennt. Nur die bereits in BW03 ausdrücklich freigegebene Putzmanager-Verknüpfung kann Münzen erzeugen.

## Update / Installation

1. Vor dem Update die aktuelle verschlüsselte `.meinalltag`-Sicherung aus der bisherigen App erstellen und extern aufbewahren.
2. Für GitHub Pages die **entpackten Dateien** aus diesem ZIP in `main` → `/(root)` veröffentlichen, nicht nur das ZIP hochladen.
3. Im Browser auf V0.24.4 prüfen; bei altem Service-Worker-Caching App vollständig schließen und erneut öffnen oder in „Mehr“ die Updateprüfung ausführen.
4. Belohnungswelt → Album: mindestens fünf passende Karten selbst benennen/gestalten (für Themen-Booster fünf aus einer Kategorie; für Event-Booster fünf als Event markierte Karten).
5. Unter Missionen eine neue Reinigungsaufgabe nach vorheriger Freigabe abschließen, um Münzen zu verdienen. Unter Shop Booster auswählen, die theoretischen Chancen lesen und kaufen. Gekaufte Booster erscheinen unter Booster.

## Teststatus

Automatisiert: `node test-bw04-shop.mjs`; `python test-bw04-ui.py`; plus die aktualisierten BW01–BW03-, Putz-, Lager-, 3D- und Backup-Regressionen. Details in `TESTS_BW04.md`.

**Offen:** Echte GitHub-Pages-HTTPS-Abnahme, Android-Installations-/Offline-Test, Restore-Test mit realen Nutzerdaten und BW05-Öffnung. Die isolierte Chromium-Prüfung ersetzt keine vollständige Browser-PWA-Abnahme.
