# BW07 – Testnachweis V0.24.7 (04.11.2026)

## Bestanden

- `node test-bw07-cards.mjs`: 100 BW06-Startkarten validiert; Exemplarsperre; letztes Exemplar; seltene Karte; idempotente Operationen; atomare Transaktion mit Wallet und Journal; virtuelle Verkaufserlöse, Splitterverwertung und Herstellung; Diamant nicht herstellbar; editierbare Preise; Rollback; verschlüsseltes Backup und Restore.
- `python test-bw07-ui.py`: isoliertes Chromium in 320/390/412 Pixel, Gruppierung, Sperren, Verkauf, Herstellung, Suche und Favoriten, horizontaler Überlauf ausgeschlossen.
- `node test-bw01-data.mjs`, `test-bw02-album.mjs`, `test-bw03-economy.mjs`, `test-bw04-shop.mjs`, `test-bw05-opening.mjs`: bestanden.
- `python test-bw04-ui.py`, `python test-bw05-ui.py`: bestanden für 320/390/412 Pixel.
- `node --check` der neuen/geänderten JS-Dateien; Stylesheet und SW-Assetreferenzen geprüft.

## Grenzen

- Isoliertes Chromium ist kein Test auf dem tatsächlichen Android-Gerät und kein End-to-End-Livetest von GitHub Pages.
- Echte manuelle Nutzerabnahme von Backup/Restore, Service-Worker-Update und Gerätewechsel ausstehend.
- Alte historische Tests mit hart codierten Versionsnummern außerhalb BW01–BW07 sind nicht automatisch ein Nachweis für dieses Release.
