"""Explicit operator installer. Run on the existing Ghost VPS, not the web app.

No package installs, Ghost DB writes, new ports, or changes to neighbouring services.
Existing config/database are preserved; --activate is a separate deliberate step.
"""
import argparse
import grp
import json
import os
from pathlib import Path
import pwd
import shutil
import subprocess
import sys


def run(*args):
    subprocess.run(args, check=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--integration", required=True, help="Existing Ghost Content integration ID, never an API key")
    parser.add_argument("--activate", action="store_true")
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise RuntimeError("root required")
    account = "masterok-publication"
    try:
        pwd.getpwnam(account)
    except KeyError:
        run("useradd", "--system", "--user-group", "--home-dir", "/nonexistent", "--no-create-home", "--shell", "/usr/sbin/nologin", account)
    uid, gid = pwd.getpwnam(account).pw_uid, grp.getgrnam(account).gr_gid
    source = Path(__file__).resolve().parent
    target, config_dir, state = Path("/opt/masterok-publication"), Path("/etc/masterok-publication"), Path("/var/lib/masterok-publication")
    for directory, owner, group, mode in [(target, 0, 0, 0o755), (config_dir, 0, gid, 0o750), (state, uid, gid, 0o700)]:
        directory.mkdir(exist_ok=True)
        os.chown(directory, owner, group)
        directory.chmod(mode)
    # Stop only OUR timer/service during file replacement. Never touch Ghost/views/rebuild.
    if Path("/etc/systemd/system/masterok-publication.service").exists():
        run("systemctl", "stop", "masterok-publication.timer", "masterok-publication.service")
    for name in ("worker.py", "state.py", "verify_public.py"):
        shutil.copyfile(source / name, target / name)
        (target / name).chmod(0o644)
    config_file = config_dir / "config.json"
    if not config_file.exists():
        run("node", str(source / "bootstrap-config.cjs"), args.integration)
    os.chown(config_file, 0, gid)
    config_file.chmod(0o640)
    if args.activate:
        config = json.loads(config_file.read_text())
        config["mode"] = "active"
        temporary = config_dir / "config.next.json"
        with temporary.open("x") as handle:
            os.fchmod(handle.fileno(), 0o640)
            os.fchown(handle.fileno(), 0, gid)
            json.dump(config, handle)
        temporary.replace(config_file)
    units = ("masterok-publication.service", "masterok-publication.timer", "masterok-publication-health.service", "masterok-publication-health.timer")
    for name in units:
        destination = Path("/etc/systemd/system") / name
        shutil.copyfile(source / name, destination)
        destination.chmod(0o644)
    run("systemd-analyze", "verify", *[str(Path("/etc/systemd/system") / name) for name in units])
    run("systemctl", "daemon-reload")
    run("systemctl", "start", "masterok-publication.service")
    run("systemctl", "enable", "--now", "masterok-publication.timer", "masterok-publication-health.timer")
    run("runuser", "-u", account, "--", "/usr/bin/python3", str(target / "worker.py"), "--status")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"error": "publication_install_failed", "type": type(error).__name__}), file=sys.stderr)
        sys.exit(1)
