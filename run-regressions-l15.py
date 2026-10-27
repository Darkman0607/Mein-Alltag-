"""Run historical cases against L15, updating only old version assertions; preserve originals."""
from pathlib import Path
import re,sys,subprocess
root=Path(__file__).resolve().parent
failed=[]; paths=sorted(root.glob('release-check*.mjs'))
for test in paths:
 if test.name=='release-check-l15.mjs':continue
 content=test.read_text()
 # Keep all test logic; change only build/version/cache-string expectations.
 content=re.sub(r"0\.(?:\d{1,2})\.(?:\d{1,2})",lambda m:'0.15.0' if m.group() in {'0.12.2','0.13.0','0.14.0'} else m.group(),content)
 content=content.replace('mein-alltag-v0-12-2','mein-alltag-v0-15-0').replace('mein-alltag-v0-13-0','mein-alltag-v0-15-0').replace('mein-alltag-v0-14-0','mein-alltag-v0-15-0')
 content=content.replace('L12-HF02','L15')
 scratch=root/'TEMP_L15_REGRESSION.mjs'
 try:
  scratch.write_text(content)
  r=subprocess.run(['node',str(scratch)],text=True,capture_output=True,cwd=root)
  if r.returncode:
   failed.append(test.name)
   print('FAIL',test.name,r.stderr[-1100:],r.stdout[-200:])
  else:print('PASS',test.name)
 finally:scratch.unlink(missing_ok=True)
print(f'{len(paths)-1-len(failed)}/{len(paths)-1} alte Regressionen bestanden')
sys.exit(bool(failed))