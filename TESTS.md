# Testplan V0.0.1

## Automatisiert überprüfbar
- [ ] Alle fünf Moduldateien vorhanden und unabhängig ladbar
- [ ] HTML, JS, Manifest korrekt strukturiert
- [ ] Service Worker nennt alle für den Offline-Start erforderlichen App-Dateien
- [ ] Keine Netzwerk- oder Cloud-Zwangsverbindung in den Moduldateien
- [ ] App-Icons (192px, 512px) vorhanden
- [ ] Der ZIP-Inhalt besitzt `index.html` im Stammverzeichnis

## Auf GitHub Pages / Android manuell überprüfen
- [ ] Startseite zeigt fünf Module; 2×2 + breite Hausservice-Kachel
- [ ] Jede Kachel öffnet genau den eigenen Modulbereich
- [ ] Zurück-Taste / Android-Browser-Zurück öffnet vorherige Seite
- [ ] Start, Kalender, Suche und Mehr sind bedienbar
- [ ] Kalender vor/zurück wechselt den Monat
- [ ] Suche filtert Module nach Namen
- [ ] Notiz in jedem Modul speichern; nach Neustart laden
- [ ] Notizen verschiedener Module überschreiben sich nicht
- [ ] App lässt sich in Chrome installieren
- [ ] Nach einmaligem vollständigen Laden funktioniert sie offline
- [ ] Neue Version wird nach einem Folge-Update erkannt

Wichtig: Automatisierte Tests sind kein Ersatz für reale Tests auf dem Vivo X300 Pro.
