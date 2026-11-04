# BW11 – Testnachweis / Version 0.24.8

**Bestanden:**

- `node test-bw11-premium.mjs`: strikte Settingvalidierung, Standardzustand, sicheres Speichern, kein Schreibzugriff auf Karten/Währung, verschlüsseltes Backup und Restore, kein Ton-Autoplay.
- `python test-bw11-ui.py`: isoliertes Chromium 320/390/412 px, 100 Albumplätze, Settings-Umschaltung, Einstellungen, Kartendetail, Diamant-Rarität, keine horizontalen Überläufe.
- `python test-bw11-booster-ui.py`: isoliertes Chromium 320/390/412 px, fünf Raritätskarten, Einzelaufdeckung mit Lichtreflex und Flip, „Alle fünf sofort“ ohne Animation, kein horizontaler Überlauf.
- Chromium mit `prefers-reduced-motion: reduce`: Kartenanimation deaktiviert.
- `node test-bw01-data.mjs`, `node test-bw02-album.mjs`, `node test-bw03-economy.mjs`, `node test-bw04-shop.mjs`, `node test-bw05-opening.mjs`, `node test-bw07-cards.mjs`: bestanden.
- `python test-bw07-ui.py`: bestehende Kartenverwaltung bei 320/390/412 px ohne Regression.
- `node --check` für neue/geänderte JS-Dateien; Service-Worker-Assetliste lokal geprüft.

**Grenzen:** Browser-HTTP-Tests von localhost sind in dieser Umgebung durch `net::ERR_BLOCKED_BY_ADMINISTRATOR` blockiert. Die UI-Tests verwenden echte UI-Renderer in isolierten DOM-Fixtures, aber nicht den kompletten geladenen App-Bootstrap über HTTPS. Physischer Android-Test, Live-Pages-Ladevorgang/Update und zweites Gerät sind offen. Kein Benchmark der tatsächlichen Bildwiederholrate oder Batterieverbrauch.
