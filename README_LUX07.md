# Mein Alltag – LUX07 / Version 0.28.0

Änderungen:
- Artikelbild und Großansicht in der Schnellübersicht; Platzhalter und Foto-hinzufügen-Knopf direkt am Artikel.
- Deutlich größerer Artikelname und kontrastreiche Systemschrift auf dunklem Hintergrund.
- Sichtbarer Löschknopf mit Sicherheitsabfrage. Lagerhaus-Artikel, Fotodateien, Fotoindex, Lagerbuchungen und zugehörige Gerätebelege werden atomar entfernt.
- Bestehende Bestände anderer Artikel und Artikelnummernfolge bleiben erhalten. Vor Löschung Backup erstellen.
- Vollständiger Browser-End-to-End-Test ist in dieser Umgebung wegen Navigationseinschränkung nicht möglich; statischer Chromium-Layouttest und Löschlogiktest bestanden.
