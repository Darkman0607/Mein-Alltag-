# P05 – Prüfprotokoll

| Prüfung | Resultat |
| --- | --- |
| JS-Syntaxprüfung der 5 geänderten/neu angelegten Dateien | BESTANDEN |
| P05-Intervalltest (täglich, wöchentlich, Monatsende, eigene Tage, bei Bedarf) | BESTANDEN |
| Alte Sitzungen ohne Aufgabenidentität bleiben nicht als erledigt markiert | BESTANDEN |
| P03 Datenregression inkl. Start/Pause, Gruppenhäkchen, Lagerabzug, atomare Rückabwicklung | BESTANDEN |
| P04 Datenreset-Regression | BESTANDEN |
| LUX06-HF02 Formular-HTML-Test | BESTANDEN |
| Statisches Chromium-Layout 390px, Hell/Dunkel | BESTANDEN (kein horizontaler Überlauf) |
| Browser-E2E über HTTP und file:// / Android-Praxistest | NICHT ABSCHLIESSBAR: `ERR_BLOCKED_BY_ADMINISTRATOR` |
| Älterer LUX06-Datentest mit hartkodiertem Versionsvergleich 0.27.9 | Versionsassertion erwartbar fehlgeschlagen (0.28.1) |

## Akzeptanztests auf dem Handy (noch offen)
1. Einmal vollständiges ZIP-Backup durchführen.
2. Putzmanager öffnen, zwei Räume kontrollieren, von Dunkel zu Hell wechseln und umgekehrt.
3. Küche → Geschirrspüler → Rhythmus täglich; Reinigung starten, Geschirrspüler abhaken, abschließen.
4. Prüfen, ob „Nicht fällig“ erscheint, heutiges Erledigt zählt und in der Historie die drei erledigten Schritte stehen.
5. App komplett schließen, wieder öffnen, Einstellungen und Historie prüfen.
6. Lagerartikel-Verbrauch separat testen; beim Abbruch muss keine Buchung entstehen.
7. Flugmodus: App neu starten und Räume/Verlauf ohne Internet aufrufen.