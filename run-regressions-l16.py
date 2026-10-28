"""Run historical L05–L15 logic tests against L16, updating ONLY expected release/version constants in temporary test copies."""
from pathlib import Path
import subprocess,sys,re
root=Path(__file__).resolve().parent
version_re=re.compile(r'0\.(?:12\.2|13\.0|14\.0|15\.0)')
tests=sorted(root.glob('release-check*.mjs'))
errors=[]
for f in tests:
 if f.name=='release-check-l16.mjs':continue
 s=f.read_text()
 s=version_re.sub('0.16.0',s)
 s=re.sub(r'mein-alltag-v0-(?:12-2|13-0|14-0|15-0)', 'mein-alltag-v0-16-0',s)
 s=s.replace("'L12-HF02'","'L16'").replace("'L15'","'L16'")
 scratch=root/'TEMP_L16_REGRESSION.mjs'
 try:
  scratch.write_text(s)
  cmd=subprocess.run(['node',str(scratch)],cwd=root,text=True,capture_output=True)
  if cmd.returncode:errors.append(f.name);print('FAIL',f.name,cmd.stderr[-700:],cmd.stdout[-200:])
  else:print('PASS',f.name)
 finally:scratch.unlink(missing_ok=True)
print(f'{len(tests)-1-len(errors)}/{len(tests)-1} frühere Testmodule bestanden')
sys.exit(bool(errors))