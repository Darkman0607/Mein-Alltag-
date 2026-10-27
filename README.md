# Mein Alltag ‚Äì Beta V0.0.1

Das erste funktionsf√§hige Grundger√ºst (G01 / V0) mit f√ºnf klar getrennten Bereichen:
1. Lagerhaus
2. D@0IùFrauengesundheit
3. Familienplaner
4. Putzmanager
5. M.R Hausservice

## Funktionen der V0
- Dunkles Premium-Design nach Bildreferenz *D@0Iù*Vorschlag 2**; 3D-Symbole direkt aus der hochgeladenen Referenz ausgeschnitten.
- Gro√üe Touch-Kacheln, responsiv f√ºr Android und DesD@0Iùktop.
- Navigation (Start, Kalender, Suche, Mehr) und R√ºcknavigation √ºber Hash-Routing samt Browserverlauf.
- Klare Moduldateien unteD@0Iùr `modules/`.
- IndexedDB mit **f√ºnf strikt separaten Object Stores** f√ºr die Module plus `meta`.
- Lokale Startnotiz pro Modul als √D@0Iùºberpr√ºfbarer Speichertest; keine Cloud-Verbindung oder Kontopflicht.
- Progressive Web App (Manifest, Icons, offlinef√§higer Service D@0IùWorker, Updatehinweis).
- Monatskalender und Modulsuche bereits bedienbar. Fachfunktionen (Lagerverwaltung, Zyklus, Kundenverwaltung usD@0Iùw.) folgen in sp√§teren Updates.

## Ver√∂ffentlichung mit GitHub Pages
Repository `Darkman0607/Mein-Alltag-`, Branch `main`, VerzeichnD@0Iùis `/(root)`.
F√ºr die Ver√∂ffentlichung muss der **Inhalt des Ordners `app/` direkt ins Repository-Stammverzeichnis** hochgeladen werdD@0Iùen, insbesondere `index.html`.
Danach: **Settings ‚Üí Pages ‚Üí Build and deployment ‚Üí Deploy from a branch ‚Üí main ‚Üí /(root) ‚Üí D@0IùSave**.

Online-Adresse nach erfolgreicher Ver√∂ffentlichung:
`https://darkman0607.github.io/Mein-Alltag-/`

## Pr√ºfung
Die technischeD@0Iù Testliste steht in `TESTS.md` und im separat mitgelieferten Word-Dokument. Browser- und Android-Ger√§tetests m√ºssen vor der Freigabe D@0Iùauf dem jeweiligen Ger√§t √ºberpr√ºft werden.

## Datenschutz
Pers√∂nliche Daten werden nur im lokalen Browserprofil per IndexedDB gespD@0Iùeichert. Es gibt derzeit **keine Verschl√ºsselung, PIN, Datensicherung oder Synchronisierung**. Insbesondere sensible Gesundheitsdaten D@0Iùsollten erst nach Implementierung eines passenden Schutzkonzepts eingetragen werden. App deinstallieren oder Browserdaten l√∂schen kannD@0Iù lokale Daten entfernen.
