"""One-time operator import over SSH stdin. Never prints credentials."""
import json
import os
from pathlib import Path
import pwd
import re
import sys
from datetime import datetime, timedelta, timezone

token = sys.stdin.read(4097).strip()
if os.geteuid() != 0 or not re.fullmatch(r'[A-Za-z0-9_-]{30,1024}', token):
    raise SystemExit('invalid_import')
target = Path('/etc/masterok-search/yandex-webmaster-token.json')
account = pwd.getpwnam('masterok-search')
os.umask(0o077)
with target.open('x') as stream:
    now = datetime.now(timezone.utc)
    json.dump({'token': token, 'created_at': now.isoformat(), 'expires_at': (now + timedelta(seconds=15552000)).isoformat()}, stream)
os.chown(target, 0, account.pw_gid)
target.chmod(0o640)
print('token_saved_on_vps')
