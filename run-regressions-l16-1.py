"""Replay existing Node regression checks with only their expected build labels rebased to L16.1.
Do not modify production code or historical tests."""
import subprocess,sys,re
from pathlib import Path
root=Path(__file__).resolve().parent
names=sorted(root.glob('release-check*.mjs'))
old=[p for p in names if p.name!='release-check-l16-1.mjs']
errors=[]
for p in old:
 s=p.read_text()
 s=re.sub(r'0\.(?:12\.2|13\.0|14\.0|15\.0|16\.0)', '0.16.1', s)
 s=re.sub(r'mein-alltag-v0-(?:12-2|13-0|14-0|15-0|16-0)','mein-alltag-v0-16-1',s)
 s=re.sub(r"(['\"])L(?:12-HF02|13|14|15|16)\1", lambda m:m[1]+'L16.1'+m[1],s)
 temp=root/'TEMP_L161_REGRESSION.mjs'
 try:
  temp.write_text(s)
  run=subprocess.run(['node',str(temp)],cwd=root,text=True,capture_output=True)
  if run.returncode:
   errors.append(p.name)
   print('FAIL',p.name,(run.stderr+run.stdout)[-300:])
  else:print('PASS',p.name)
 finally:temp.unlink(missing_ok=True)
print(f'{len(old)-len(errors)}/{len(old)} legacy modules passed')
sys.exit(bool(errors))