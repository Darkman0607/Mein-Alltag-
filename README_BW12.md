# Mein Alltag – BW12: 20 Anime-Frauen-Karten (Version 0.25.3)

**05.11.2026 – Grundlage: V0.25.2 BW11-HF02.**

## Umsetzung

- 20 neue, eigenständig gestaltete Anime-Frauen-Illustrationen: z. B. Kirschblüte, Eismagie, Feuer, Wald, Goldkrone, Mondkatze, Cyberpop, Wasser, Schmetterlinge, Herbst, Drache, Tierbegleitung, Kimono, Sternenlicht, Musik, traditionelle Blumen, Wind, Werkstatt, Fuchsmaske und Kristall.
- Die Motive ersetzen **ausschließlich das Standardbild** der bestehenden Karten **Anime-Frauen #001–#020**. Es gibt weiterhin **100 Kartenplätze**, davon 25 Anime-Frauen. Es werden keine zusätzlichen Kartenexemplare, Münzen oder XP verteilt.
- Die bisherigen eindeutigen Karten-IDs, Namen, Nummern, Seltenheiten und tatsächlichen Besitzdaten bleiben unverändert. Das ist wichtig für deine gesammelten Karten und gekauften Booster.
- Selbst gewählte/bearbeitete Upload-Bilder (`imageData`) haben Vorrang und werden nicht überschrieben. Keine Datenbankmigration oder automatischen Änderungen an deinen gespeicherten Daten.
- Der sichere Standardbild-Lookup wird zentral in `assets/reward-series.js` angepasst; Album, Kartendetail, Booster-Öffnung und Booster-Ergebnis nutzen dieselben 20 Bilder. 20 optimierte WebP-Dateien unter `assets/card-art/anime-frauen/001.webp` bis `020.webp`.
- Neue Bilder sind in der Offline-Precache-Liste (`sw.js`) aufgenommen; Cacheversion `mein-alltag-v0-25-3`; App und Versionsdatei melden `0.25.3`.

## Nach dem Installieren / Prüfen

1. **Vor der Aktualisierung** ein Gesamtbackup der App durchführen und sicher außerhalb des Browsers aufbewahren. Die App **nicht deinstallieren** und keine Browserdaten löschen.
2. Neue Version über GitHub Pages bereitstellen oder lokal aus einem Webserver aufrufen. `Mehr → App-Version` kontrollieren: `0.25.3`.
3. `Belohnungswelt → Album → Anime-Frauen` öffnen und Motive #001 bis #020 prüfen.
4. Eine bereits gesammelte Karte in der Detailansicht öffnen und kontrollieren, dass Besitzanzahl, Favorit und Name unverändert sind.
5. Unter `Booster` die kostenlose Öffnungsanimation öffnen, Karten aufdecken und neuen Look ansehen.
6. Eigene hochgeladene Kartenbilder werden niemals ersetzt. Die letzten fünf Standardkarten #021–#025 behalten ihre bisherigen Vektorzeichnungen.

## Quellen / Grenzen

- Die 20 Illustrationen wurden für dieses Update KI-generiert. Der Bildsatz wurde aus einer generierten Kartenübersicht in einzelne, mobile WebP-Bilder aufbereitet. Großansichten haben daher eine geringere Quellauflösung als einzeln generierte Druckgrafiken.
- Die 20 verschiedenen Motive sind **visuelle Ersatzmotive**, keine 20 neuen Datensätze. Wer zusätzliche Sammelplätze möchte, braucht ein eigenständiges Datenmodell-Update.
- Automatisierte Browser-/Node-Tests sind keine echte Android-Praxisabnahme. **GitHub main V0.25.3 veröffentlicht und verifiziert**: Commit `a4c24aa7`, 141 geänderte Dateien, alle 20 WebP-Bilder und beide Word-Checklisten stimmen mit der ZIP überein. GitHub-Pages-Deployment zu diesem Commit erfolgreich (Actions-Run `42035480013`). Ein echter Android-PWA-Neustart und Offline-Test bleiben offen.
