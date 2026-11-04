# BW09-HF01 – Navigation zum Belohnungskalender repariert

Version **0.25.1**, 04.11.2026, baut auf **BW09 V0.25.0** auf.

## Ursache

In `assets/app.js` war `belohnungskalender` zwar als UI-Registerkarte und Klickziel vorhanden, fehlte aber in `hashRoute()` in der Liste der zugelassenen `#/reward/...`-Abschnitte. Dadurch wurde `#/reward/belohnungskalender` stets zu `start` normalisiert. Der Button wirkte funktionslos.

## Korrektur

- `belohnungskalender` ist jetzt ausdrücklich als gültige Hash-Route zugelassen.
- Links auf der Startansicht und unter `Mehr` erreichen nun tatsächlich den Kalender.
- Die bestehende BW09-Kalenderlogik, Datenbank und Wallet-Buchungen bleiben unverändert; es gibt keine Migration oder automatische Auszahlung.
- Version und Offline-Service-Worker-Cache sind auf **0.25.1** erhöht. Das Update wird dadurch von der PWA getrennt von 0.25.0 erkannt.
- Neuer Regressionstest prüft den Weg vom echten Startseitenbutton bis zur Kalenderansicht, inklusive direkter URL und Zurücknavigation. Ein rein isolierter Kalendertest hätte diesen Fehler nicht finden können.

## Installation und Daten

Vorher ein manuelles Backup der bestehenden Daten erstellen. ZIP-Inhalt in das GitHub-Repository-Root einspielen; die hier gelieferte Version ist zusätzlich direkt veröffentlicht. App bei bestehender PWA über `Mehr → Auf Updates prüfen` und ggf. erneutes Laden aktualisieren. Unter `Mehr` muss **0.25.1** angezeigt werden. Anschließend **Belohnungswelt → Zum Belohnungskalender → Aktivieren** prüfen.

## Bekannte Grenzen

Echter Android-PWA-Test auf deinem physischen Gerät, Update-Cache-Rollout des öffentlichen GitHub-Pages-Dienstes und Datenwiederherstellung auf Zweitgerät sind weiterhin offen. Keine Änderung an BW10 und späteren Funktionen.
