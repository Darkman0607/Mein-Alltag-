from pathlib import Path
import re,subprocess,sys
root=Path(__file__).parent
checks=sorted(root.glob('release-check*.mjs'))
fail=[]
for file in checks:
 c=file.read_text()
 c=re.sub(r'0\.(?:[1-9]|1[0-7])\.(?:[0-9]+)', '0.17.0',c)
 c=re.sub(r'mein-alltag-v0-(?:[1-9]|1[0-7])-(?:[0-9]+)','mein-alltag-v0-17-0',c)
 c=re.sub(r"(['\"])L(?:1[0-6]|[1-9])(?:\.\d+|\-HF\d+)?\1",lambda m:m[1]+'D01 Google Drive Anmeldung und verschlüsseltes Backup'+m[1],c)
 c=c.replace('F01 Datenschutz + Frauengesundheit','D01 Google Drive Anmeldung und verschlüsseltes Backup').replace('F02 Untersuchungen & Notizen','D01 Google Drive Anmeldung und verschlüsseltes Backup').replace('F03 Schwangerschaft und Tests','D01 Google Drive Anmeldung und verschlüsseltes Backup')
 t=root/'TEMP_D01_CHECK.mjs';t.write_text(c)
 try:
  p=subprocess.run(['node',t.name],cwd=root,capture_output=True,text=True,timeout=35)
  if p.returncode:fail.append(file.name);print('FAIL',file.name,(p.stdout+p.stderr)[-750:])
  else:print('PASS',file.name)
 finally:t.unlink(missing_ok=True)
print('D01 historical Node checks:',len(checks)-len(fail),'/',len(checks))
sys.exit(bool(fail))
