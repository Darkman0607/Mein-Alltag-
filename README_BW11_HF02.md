# Mein Alltag – BW11-HF02 / Version 0.25.2

Datum: 04.11.2026 · Behebung des vom Nutzer auf Android gemeldeten fehlenden Booster-Öffnungseffekts.

## Ursache

Die Versionen 0.24.8–0.25.1 zeigten erst **nach** einer atomar gespeicherten Boosteröffnung fünf verdeckte Karten und ermöglichten danach einen kurzen Flip pro einzelner Karte. Eine eigentliche animierte Packöffnung war **nicht implementiert**. Dies war eine funktionale Lücke der ursprünglichen BW11-Abnahme, keine Nutzungsfrage.

## Korrektur

- Der bestehende Klick **„Jetzt öffnen ✨“** zieht die fünf Karten weiterhin einmalig und speichert sie atomar. **Nach erfolgreichem Commit** öffnet sich nun die BW11-Packbühne im Vollbild. Einlaufendes Boosterpack, Aufreißen, Lichtblitz, sich ausbreitende Welle, Funken und fünf nacheinander auftauchende verdeckte Karten.
- Jede Karte lässt sich einzeln per 3D-Flip aufdecken. Alternative: **„Alle 5 Karten aufdecken“**, **„Effekt noch einmal ansehen“** (nur Darstellung, ohne weitere Karten), **„Zur Booster-Übersicht“**. Nach Schließen liegen die fünf Ergebnisse wie bisher im Inventar-Resultat und im Journal.
- Im Booster-Inventar ist **„✨ Booster-Öffnung kostenlos testen“** dauerhaft sichtbar, auch ohne verfügbare Booster. Es zeigt eine ausdrücklich als Vorschau gekennzeichnete Öffnung, ohne Münzabbuchung, Boosterverbrauch, Kartengutschrift, XP oder Journalbuchung.
- Modus „Volle Effekte“ steuert die aufwendigen Transformationen. „Reduziert“/„Aus“ und die Systemoption „Bewegung reduzieren“ unterdrücken Animationen, **nicht** die Bedienung oder Kartenanzeige. Ton bleibt optional und standardmäßig aus.
- Für alle Ansichten Touch- und Tastaturbedienung, Escape-Schließen und sichtbarer Fokus. Keine externen Bilder oder Ton-Dateien für den neuen Effekt.
- Komponenten: `assets/reward-pack-stage.js`, `assets/reward-pack-effects.css`. Die bereits vorhandene Ziehlogik `assets/reward-opening.js` bleibt unverändert. Kein DB-Schemawechsel oder Datenmigration.

## Installation / Kontrolle

1. **Vorher Gesamtbackup** deiner installierten App erstellen und extern sichern. App **nicht deinstallieren**, Browserdaten **nicht löschen**.
2. GitHub-Pages-PWA auf **V0.25.2** aktualisieren, ggf. App vollständig schließen und neu öffnen.
3. In der Belohnungswelt **Booster** öffnen, **„✨ Booster-Öffnung kostenlos testen“** anklicken. Es dürfen weder Karten, Booster noch Münzen verändert werden.
4. Optional im Album bzw. Booster unter **Premium-Karteneffekte** auf **„Volle Effekte“** schalten und Android-Einstellung „Bewegung reduzieren“ prüfen.
5. Ein bereits gekaufter, ungeöffneter Booster öffnet nach Kaufbestätigung sichtbar die Packbühne. Fünf Karten aufdecken, Bühne schließen, Kartenbestand prüfen.

## Tests

- `python test-bw11-pack-effects-ui.py`: Erfolg auf Chromium 320/390/412 Pixel, tatsächliche Animation (`bw-pack-burst`), kostenloser Demo-Modus, Replay, Einzeltap, Fünfer-Aufdeckung, gespeicherter Kauf und keine doppelten Ziehungen; reduzierte, abgeschaltete und OS-reduzierte Effekte geprüft.
- Vorhandene Node-Regressionen BW01–BW09/BW11: bestanden. Shop- und Booster-UI-Test bei 320/390/412 Pixel: bestanden.
- **Offen:** Echte Android-PWA auf deinem Gerät, Android GPU-/Akkuverhalten, GitHub-Pages-HTTPS-Liveabnahme, kompletter Restore auf zweitem Gerät.
