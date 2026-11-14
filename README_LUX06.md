# Mein Alltag – LUX06 (0.27.7)

Abschlussupdate Lagerhaus: überprüfbare verschlüsselte Backup-Datei, lokale Bestandsdiagnose,
sichere Schnellwahl für Testdaten-Rücksetzung und Belastungstests mit synthetischen Artikeln.

## Neue Funktionen
- **Einstellungen → Lagerhaus-Datenprüfung:** Nur lesende Prüfung von IDs, Lagerorten, Mengen und Mindestbestand.
- **Einstellungen → Verschlüsseltes Gesamtbackup → Sicherungsdatei prüfen:** Passwort prüfen,
  AES-GCM entschlüsseln und Anzahl der Datensätze sowie Prüfhinweise anzeigen, ohne Daten zurückzuschreiben.
- Neue Sicherungsdateien werden vor Download bzw. Drive-Upload durch Probe-Entschlüsselung verifiziert.
- **Testdaten zurücksetzen → Lagerhaus + Putzmanager wählen:** Auswahlhilfe, keine sofortige Löschung.
  Löschwort, Bestätigungskästchen und separate Sicherheitsabfrage bleiben erforderlich.
- Konsistente Version 0.27.7 in App, Manifest-Datei und PWA-Cache; Offline-Modul ergänzt.

## Grenzen und Vorsicht
Ein bestandener Backup-Datei-Check bedeutet nicht, dass eine Wiederherstellung auf dem persönlichen
Handy getestet wurde. Die bestehenden Backups bleiben AES-256-GCM verschlüsselt und das Passwort
wird nicht gespeichert. Lokale Daten werden durch dieses App-Update nicht migriert oder gelöscht.
Keine automatischen Tests mit deinen privaten Artikeln, Bildern oder Gesundheitsdaten.

## Veröffentlichung
GitHub: https://github.com/Darkman0607/Mein-Alltag-

