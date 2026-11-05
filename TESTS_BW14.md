# BW14 – Testprotokoll (0.25.5)

- [x] Alle 25 Anime-Frauen-WebP-Bilder vorhanden, 360 × 450 px, unterschiedliche Prüfsummen.
- [x] Die fünf neuen Dateien #021–#025 sind unter 120 KB, im Offline-Cache erfasst und korrekt zugeordnet.
- [x] Katalog enthält unverändert 100 Kartenplätze; Namen, IDs, Besitz und Seltenheiten unverändert.
- [x] Eigene Kartenbilder haben Vorrang; unbekannte fremde Asset-Pfade werden nicht als Standardbild zugelassen.
- [x] Browser-/Chromium-Tests bei 320 / 390 / 412 px erfolgreich: zwei Spalten, alle fünf neuen Motive und Kartendetails öffnen, kein horizontaler Überlauf.
- [x] Node-Regressionsprüfungen BW02, BW03, BW04, BW05, BW07, BW08, BW09, BW11, BW12, BW14 erfolgreich.
- [x] version.json, APP_VERSION und Service-Worker-Kennung stimmen auf 0.25.5 überein.
- [x] GitHub main Code-Commit d41a8825, Pages-Run 42057688699 erfolgreich.
- [ ] Echte Android-Offline-/Cache-/Bestandsprüfung mit vorhandenen Nutzerdaten steht aus.

Hinweis: Die ältere Datei `release-check.mjs` aus dem Grundgerüst verwendet noch die fest einprogrammierte Versionsnummer 0.12.2 und ist kein aktueller Release-Gate-Test. Die versionsspezifischen BW-Regressionsprüfungen wurden angepasst und bestanden.
