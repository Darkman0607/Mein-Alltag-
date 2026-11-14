# LUX06 – Prüfergebnisse (14.11.2026)

Bestanden (Node 22, synthetische Testdaten):
- LUX01–LUX05 Lagerhaus-Regressionssuite (Mengen/Paare, Schnellaktionen, Suche, Lagerorte, 3D, Putzmanager).
- Bestehende F01-Backup-Rücksicherung mit Lagerfoto und PDF/File.
- LUX06 Probe-Verschlüsselung und Entschlüsselung, falsches Passwort und manipuliertes Backup abgewiesen.
- LUX06 Lager-Integritätsdiagnose: doppelte IDs/Codes, abweichende Bestände, unbekannte Lagerorte,
  gebrochene Stück-Einheiten; read-only, keine automatische Datenänderung.
- P04 gezielter Reset, atomarer Rollback bei simuliertem Fehler, andere Module erhalten.
- LUX06 UI-Isolattest mit Playwright: 320/390/412 Pixel; Schnellwahl, Sicherungsschranken, kein Overflow.
- Synthetische Belastungsprobe: 200, 500 und 1.000 Artikel, Suche/Buchung/Datenprüfung.

Richtwerte aus einer Testausführung (Node unter Linux, **keine Android-Messung**):
200 Artikel: Suche ca. 2,3 ms; 500 Artikel: ca. 2,9 ms; 1.000 Artikel: ca. 5,7 ms.
Diese Werte schwanken je nach Gerät und Testdaten. Es wurden keine Nutzerdaten geladen.

Noch offen:
- Vollständiger Browser-/Service-Worker-Integrationstest durch Testnetzwerk-Sperre blockiert.
- Updateanzeige, Backup-Datei-Download, Backup-Datei-Prüfung und Praxisleistung in installierter Android-PWA.
- Rücksicherung eines echten, selbst erstellten Handysicherungsstandes auf separatem Testgerät.

Sicherheitsregel: Vor jedem Datenreset lokal sichern, die Sicherungsdatei separat aufbewahren,
mit dem neuen „Prüfen“-Knopf kontrollieren und die App nicht deinstallieren.
