# Mein Alltag 0.27.9 — LUX06-HF02

**Fehler:** Die Schnell-Entnahme mit Lagerort „Ohne Lagerort“ wurde trotz vorhandener Bestände durch HTML-Formularvalidierung blockiert.

**Korrektur:** Der `required`-Zwang beim Quelllagerort wurde entfernt, da die leere Standort-ID `''` im Datenmodell ein gültiger Lagerort ist. `bookStock` prüft weiterhin Standortgültigkeit und Bestand atomar. Bereits veröffentlichter HF01-Handschuh-Packung/Speichern-Fix bleibt erhalten.

**Geprüft:** Node-Buchungstests für 1/2 Paare, Überbestand, nicht existierende Lagerorte, Einlagerung und vollständige Entnahme; native Chromium-Formularvalidierung auf 320/390/412 px. Android-PWA-Praxistest noch ausständig. Keine DB-Migration, kein Löschen bestehender Daten.
