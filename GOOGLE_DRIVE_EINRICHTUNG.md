# Mein Alltag · D01 · Google Drive einrichten

Diese Version unterstützt **manuelles, verschlüsseltes Google-Drive-Backup** und Wiederherstellung direkt in der App. Es gibt keinen permanenten Cloud-Sync. Die fünf lokalen Modul-Datenbanken bleiben beim Anmelden unverändert.

## Einmalig: Google-Zugang für die eigene PWA vorbereiten

Eine PWA auf GitHub Pages benötigt für Google OAuth eine eigene öffentliche **OAuth-Client-ID**. Diese kann nicht sinnvoll automatisch erzeugt werden. Bitte **keine Client-Secrets, Kontopasswörter oder API-Schlüssel** hier eingeben.

1. Öffne https://console.cloud.google.com/ und erstelle ein Google-Cloud-Projekt oder verwende ein eigenes.
2. **APIs & Services → Library**: aktiviere **Google Drive API**.
3. **Google Auth Platform / OAuth consent screen**: App einrichten, Nutzerverwaltung passend zu deinem Google-Konto wählen. Bei *Testing* dein eigenes Google-Konto als **Testnutzer** hinzufügen. Für diesen Zweck wird ausschließlich der Scope `https://www.googleapis.com/auth/drive.file` benötigt. Es werden keine Google-Passwörter abgefragt.
4. **Clients → Create client → Web application**: unter *Authorized JavaScript origins* die Adresse `https://darkman0607.github.io` (ohne Slash am Ende und **ohne** `/Mein-Alltag-/`) eintragen. Für localhost-Tests gegebenenfalls `http://localhost:8000` als zusätzliche Quelle eintragen. Bei dieser reinen Browser-Popup-/Token-Variante wird keine serverseitige Redirect-URI benötigt.
5. Die erstellte **Client-ID** (endet auf `.apps.googleusercontent.com`) kopieren. Sie ist eine öffentliche Kennung, **kein** geheimer Schlüssel.
6. Öffne **Mein Alltag → Mehr → Google Drive einmalig einrichten**, füge die Client-ID ein und tippe auf **Client-ID auf diesem Gerät speichern**. Anschließend **Mit Google anmelden** und dem Zugriff auf die von dieser App erstellten Drive-Dateien zustimmen.

Die Client-ID wird nur auf diesem Gerät im lokalen Browserprofil hinterlegt; der Google-Zugriffstoken wird nicht dauerhaft gespeichert. Nach einem vollständigen Neuladen/Neustart erneut **Mit Google anmelden** wählen. Bei fehlender Internetverbindung funktioniert die Offline-Dateisicherung weiterhin.

## Backup erstellen

1. **Mehr → Backup-Passwort** (mindestens 12 Zeichen) eingeben und bei **Passwort wiederholen** ein zweites Mal eingeben.
2. Google-Anmeldung durchführen.
3. **Verschlüsseltes Backup in Google Drive speichern** tippen. Die App legt bei Bedarf im sichtbaren **Meine Ablage** den Ordner **Mein Alltag Backups** an und speichert die verschlüsselte Datei `Mein_Alltag_Backup_....meinalltag` dort. Alte Sicherungen werden nicht überschrieben.
4. Prüfe nach dem Upload die Bestätigung. **Backups in Drive anzeigen / aktualisieren** zeigt die über dieses OAuth-Projekt erstellten Dateien an.

## Wiederherstellen

1. Erst auf dem bisherigen Gerät eine Sicherung anlegen. Sicherungen enthalten sensible private Informationen; bewahre das Passwort **getrennt** auf.
2. Auf dem Zielgerät die App öffnen, Client-ID einrichten (falls dort noch nicht vorhanden) und **Mit Google anmelden**.
3. **Backups in Drive anzeigen / aktualisieren**, gewünschte Sicherung auswählen und das **Passwort dieser Sicherung** eingeben.
4. Das Kästchen zum Ersetzen der lokalen Daten ankreuzen und auf **Aus Google Drive wiederherstellen** tippen.
5. Nach Passwort-/Integritätsprüfung die ausdrückliche Bestätigungsfrage bestätigen. **Alle fünf lokalen Module** werden anschließend in einer gemeinsamen IndexedDB-Transaktion ersetzt. Die App lädt danach neu.

**Achtung:** Diese Sicherung enthält die App-Daten, nicht das HTML/JavaScript der App. Google Drive erstellt keinen automatischen Gerätesync. Eine in einem anderen Google-Cloud-Projekt/mit einer anderen OAuth-Client-ID eingerichtete App kann unter `drive.file` nicht ohne weiteres die Dateien dieses Projekts lesen; für alle Geräte **dieselbe Client-ID** verwenden. Die Dateien sind im normalen Drive-Ordner auch manuell herunterladbar. Die alternative **Verschlüsseltes Backup herunterladen**-Funktion bleibt erhalten.

## Grenzen und Sicherheitsprüfung

- Alle Daten werden **vor dem Upload lokal** per AES-256-GCM verschlüsselt. Das Passwort bleibt lokal im Eingabefeld und wird nicht an Google übermittelt. Google sieht die verschlüsselte Datei und ihren Dateinamen, nicht den entschlüsselten Inhalt.
- Es wird nur der Google-Scope `drive.file` verwendet, keine vollständige Drive-Berechtigung und keine Hintergrund-Synchronisierung. Verfügbare Sicherungen sind durch den App-Zugriff des OAuth-Projekts begrenzt.
- Google OAuth benötigt Internet, einen kompatiblen Browser und erlaubte Popups. Die lokale Dateisicherung ist auch offline nutzbar.
- Falls Google die App im Modus *Testing* auslaufen lässt, kann eine erneute Berechtigung notwendig werden. Einstellungen zu OAuth und erlaubten Testnutzern im Google-Cloud-Projekt prüfen.
- **Nur technische Tests mit simulierten Drive-Antworten** sind Bestandteil dieses ZIP-Updates. Ein echter Google-Login/Upload auf deinem Konto und ein echter Android-PWA-Test müssen nach Einrichtung auf deinem Gerät abgenommen werden.

Offizielle Referenzen:
- https://developers.google.com/identity/oauth2/web/guides/use-token-model
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://developers.google.com/workspace/drive/api/guides/manage-uploads
