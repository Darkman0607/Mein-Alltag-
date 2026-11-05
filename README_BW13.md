# BW13 – Verbesserte Anime-Kartenansicht (Mein Alltag 0.25.4)

## Behebung
Der BW12-Bildsatz hatte bereits in der Bilddatei einen überflüssigen unteren Nebelbereich, eine eingedruckte Kartennummer und aufwendige doppelte Rahmen. Die Karten im Album wirkten deshalb klein und unruhig.

- 20 WebP-Standardbilder auf den eigentlichen Figurenbild-Ausschnitt reduziert (360 × 450 px, 4:5), ohne zusätzliche Bild-generierte Beschriftungen.
- Pro Karte nur noch ein sauberer App-Rahmen; Kartennummer als UI-Badge.
- 2 Spalten auf dem Handy bis 649 px, 3 ab 650 px, 4 ab 900 px.
- Name, Seltenheit, Besitzstatus und Favoriten besser lesbar.
- Karten-Detailansicht nutzt das neue Portrait.
- Version 0.25.4 + neuer PWA-Cache.

## Datensicherheit
Keinerlei Migration oder Änderung der IndexedDB. Kartenstammdaten, eigene Bilder, Besitzstände, Guthaben, Booster, Preise und Favoriten bleiben erhalten. Eine App-Deinstallation ist nicht erforderlich und würde lokale Daten gefährden.

## Kontrollen
`node test-bw12-anime.mjs` und `python test-bw13-ui.py` sowie bestehende BW02–BW09/BW11 Tests.
Test-Screenshots sind im Ordner `DOKUMENTATION/` enthalten.
Realer Android-/Offline-Test muss am Gerät erfolgen.

## Veröffentlichung
- GitHub main Commit: `51ddd12302cf75c8555918a23c2c96b9463bbbe5`
- GitHub Pages Actions-Run: `42050180710` (erfolgreich)
- Android-Handy-Abnahme weiterhin offen.
