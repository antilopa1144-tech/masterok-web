#!/usr/bin/env python3
"""Run as root on the monitor VPS; only the public certificate leaves it."""
import json
import os
from pathlib import Path
import subprocess
import tempfile

DIRECTORY = Path('/etc/masterok-search')
EMAIL = 'masterok-search-monitor@gen-lang-client-0742552370.iam.gserviceaccount.com'


def main():
    if os.geteuid() != 0:
        raise SystemExit('root_required')
    os.umask(0o077)
    DIRECTORY.mkdir(mode=0o700, exist_ok=True)
    target = DIRECTORY / 'google-service-account.json'
    certificate = DIRECTORY / 'google-public-certificate.pem'
    if target.exists() or certificate.exists():
        raise SystemExit('existing_key_preserved')
    with tempfile.TemporaryDirectory(prefix='masterok-search-key-') as temporary:
        private = Path(temporary) / 'private.pem'
        subprocess.run([
            'openssl', 'req', '-x509', '-nodes', '-newkey', 'rsa:2048',
            '-keyout', str(private), '-out', str(certificate), '-days', '365',
            '-subj', '/CN=masterok-search-monitor',
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        payload = {
            'type': 'service_account', 'project_id': 'gen-lang-client-0742552370',
            'client_email': EMAIL,
            'token_uri': 'https://oauth2.googleapis.com/token',
            'private_key': private.read_text(),
        }
        with target.open('x') as stream:
            json.dump(payload, stream)
        target.chmod(0o600)
    certificate.chmod(0o644)
    print('created_on_vps; public_certificate_ready; rotation_required_within_365_days')


if __name__ == '__main__':
    main()
