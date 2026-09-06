#!/bin/sh
set -eu
# Run manually on the VPS after copying the service-account JSON to /etc/masterok-search/.
install -d -m 0755 /opt/masterok-search /etc/masterok-search
id masterok-search >/dev/null 2>&1 || useradd --system --home-dir /var/lib/masterok-search --shell /usr/sbin/nologin masterok-search
chown root:masterok-search /etc/masterok-search; chmod 0750 /etc/masterok-search
install -d -m 0700 -o masterok-search -g masterok-search /var/lib/masterok-search
install -m 0644 monitor.py requirements.txt /opt/masterok-search/
install -m 0644 masterok-search-monitor.service masterok-search-monitor.timer /etc/systemd/system/
install -m 0644 yandex_monitor.py /opt/masterok-search/
install -m 0644 masterok-yandex-monitor.service masterok-yandex-monitor.timer /etc/systemd/system/
test -f /etc/masterok-search/google-service-account.json
chown root:masterok-search /etc/masterok-search/google-service-account.json; chmod 0640 /etc/masterok-search/google-service-account.json
python3 -m venv /opt/masterok-search/venv
/opt/masterok-search/venv/bin/pip install --requirement /opt/masterok-search/requirements.txt
systemctl daemon-reload
systemctl start masterok-search-monitor.service
echo "Manual run finished; inspect /var/lib/masterok-search/latest.json, then activate deliberately: systemctl enable --now masterok-search-monitor.timer"
if test -f /etc/masterok-search/yandex-webmaster-token.json; then
  chown root:masterok-search /etc/masterok-search/yandex-webmaster-token.json
  chmod 0640 /etc/masterok-search/yandex-webmaster-token.json
  systemctl start masterok-yandex-monitor.service
  echo "Inspect Yandex report separately, then activate deliberately: systemctl enable --now masterok-yandex-monitor.timer"
fi
