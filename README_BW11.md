# Mein Alltag – BW11 / V0.24.8 (04.11.2026)

**Grundlage:** geprüfte BW07 V0.24.7, alle vorhandenen Karten und Speicherbereiche bleiben erhalten.

## Umsetzung

- Wiederverwendbare Premium-Designs für alle sieben Seltenheitsstufen: Gewöhnlich, Ungewöhnlich, Selten, Episch, Legendär, Mythisch, Diamant.
- Kartenalbum: Seltenheitsrahmen in der Kachel und Großansicht, Diamant-Spezialglanz, dezente Lichtreflexe bei seltenen/hohen Stufen. Die 100 originalen BW06-SVG-Motive bleiben unverändert.
- Booster-Inventar: individuelle farbliche Seltenheitsrahmen und kurzer Kartenflip beim Aufdecken. **Alle fünf sofort aufdecken** unterdrückt Animationen und Ton.
- Drei Leistungsmodi **Volle Effekte / Reduziert / Aus**. Volle Animationen sind auf ausgewählte Großkarten oder aufgedeckte Karten beschränkt, nicht auf alle 100 Albumkarten gleichzeitig.
- Optionale kurze synthetische Klangfolge bei einer einzeln aufgedeckten Karte. **Ton standardmäßig deaktiviert.** Keine externen Audiofiles oder Autoplay.
- Das Betriebssystem-Flag `prefers-reduced-motion` erzwingt Null-Animation auch bei gewähltem Volleffekte-Modus.
- Einstellungen werden im vorhandenen IndexedDB-Speicherbereich `belohnungswelt` unter `bw11:visual-preferences` abgelegt und sind im verschlüsselten Gesamtbackup enthalten. Keine DB-Schemaänderung, keine Änderung der Karten-/Booster-/Wallet-Transaktionen.
- CSS `assets/reward-premium.css` und JS `assets/reward-premium.js` sind Offline-Cache-Bestandteil; Service-Worker-Cache und App-Version auf `0.24.8` erhöht.

## Mobile Bedienung

1. Vorher vollständiges verschlüsseltes App-Backup extern aufbewahren.
2. **Mehr → App-Version** zeigt `0.24.8`; notfalls Chrome vollständig neu laden.
3. **Belohnungswelt → Album**: bei **Premium-Karteneffekte** den Modus ändern und optional Ton aktivieren.
4. Eine wirklich gesammelte Episch/Legendär/Mythisch/Diamant-Karte öffnen, um die animierten Lichtreflexe zu sehen. Noch nicht gesammelte Karten erzeugen keine falschen Besitzanzeigen.
5. **Booster**: bereits gekauften Booster öffnen, einzelne Karten antippen; alternativ „Alle 5 sofort aufdecken“.
6. Einmal **Reduziert / Aus** wählen und wieder auf **Volle Effekte** schalten; App neu starten und Einstellungen prüfen.
7. Beim Löschen/Neuinstallieren der App gehen lokal gespeicherte Daten ohne vorherige Sicherung möglicherweise verloren.

## Alte und neue Nummerierung

Die ursprüngliche BW08/BW09-Checkliste benannte teils andere Themen. Verbindlich neu: **BW11 Premium → BW08 Missionen → BW09 Belohnungskalender → BW10 Diamantgarantie → übrige Updates**. Die historischen Abschnitte in den Masterdokumenten sind als Archiv markiert; es wurden keine nicht implementierten Missionen oder Garantien angekreuzt.

## Grenzen / Tests

Automatisierte Node- und isolierte Chromium-Tests bestanden. **Nicht geprüft:** reale Android-Hardware, offizielle GitHub-Pages-Liveabnahme einschließlich Service-Worker-Wechsel und Restore auf anderem Gerät. Geräteperformance/Akkubelastung muss praktisch beurteilt werden. Ein Holo-Effekt im Browser ist kein echtes physisches Hologramm.
