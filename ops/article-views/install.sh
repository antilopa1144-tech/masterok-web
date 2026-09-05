#!/bin/sh
# Run as root from an uploaded, reviewed ops/article-views package.
set -eu
cd "$(dirname "$0")"
python3 -m unittest -v test_server.py
if ! id masterok-views >/dev/null 2>&1; then
    useradd --system --no-create-home --shell /usr/sbin/nologin masterok-views
fi
install -d -m 755 /opt/masterok-views
install -m 644 server.py /opt/masterok-views/server.py
install -m 644 masterok-views.service masterok-views-backup.service masterok-views-backup.timer /etc/systemd/system/
install -m 644 nginx-zone.conf /etc/nginx/conf.d/masterok-views.conf
install -m 644 nginx-location.conf /etc/nginx/snippets/masterok-views.conf
systemctl daemon-reload
systemctl enable --now masterok-views.service
systemctl restart masterok-views.service
systemctl is-active --quiet masterok-views.service

# Only add one include to the existing CMS HTTPS vhost. Preserve other services.
python3 - <<'PY'
from pathlib import Path
import shutil
target = Path('/etc/nginx/sites-enabled/cms.getmasterok.ru').resolve(strict=True)
source = target.read_text()
marker = '    location / {'
include = '    include /etc/nginx/snippets/masterok-views.conf;'
if include not in source:
    if source.count(marker) != 1:
        raise SystemExit('Unexpected CMS vhost; refusing to edit')
    backup = Path('/var/backups/masterok-views')
    backup.mkdir(mode=0o700, exist_ok=True)
    destination = backup / 'cms.getmasterok.ru.before-counter'
    if destination.exists():
        raise SystemExit('Existing backup without include; inspect before retrying')
    shutil.copy2(target, destination)
    target.write_text(source.replace(marker, include + '\n\n' + marker, 1))
PY
if ! nginx -t; then
    target=$(readlink -f /etc/nginx/sites-enabled/cms.getmasterok.ru)
    cp /var/backups/masterok-views/cms.getmasterok.ru.before-counter "$target"
    echo 'nginx config check failed; CMS vhost restored, live nginx not reloaded' >&2
    exit 1
fi
systemctl reload nginx
systemctl enable --now masterok-views-backup.timer
systemctl start masterok-views-backup.service
systemctl is-active nginx ghost masterok-views.service
echo 'Article view service installed. Validate public GET/CORS before deploying the website.'
