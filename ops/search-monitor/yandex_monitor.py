#!/usr/bin/env python3
"""Read-only Yandex.Webmaster daily snapshotter.

Official GET contracts: https://yandex.com/dev/webmaster/doc/en/concepts/getting-started
https://yandex.com/dev/webmaster/doc/en/reference/host-id-summary
https://yandex.com/dev/webmaster/doc/en/reference/hosts-indexing-insearch-samples
"""
from __future__ import annotations
import argparse, json, os, re, tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote
from monitor import Http, MonitorError

API="https://api.webmaster.yandex.net/v4"; SITE="https://getmasterok.ru/"
STATE_DIR=Path("/var/lib/masterok-search/yandex"); MAX_PAGES=5; PAGE_SIZE=100

def safe_json(body):
 try:
  value=json.loads(body)
  if not isinstance(value,dict): raise ValueError()
  return value
 except (TypeError,ValueError,json.JSONDecodeError): raise MonitorError("invalid_json")

def iso(value):
 try:
  parsed=datetime.fromisoformat(value.replace("Z","+00:00")); return parsed if parsed.tzinfo else None
 except (AttributeError,ValueError): return None

def token_data(path):
 try: data=safe_json(Path(path).read_bytes())
 except (OSError,MonitorError): raise MonitorError("token_unavailable") from None
 token=data.get("token"); expires=data.get("expires_at")
 expiry=iso(expires)
 if not isinstance(token,str) or not re.fullmatch(r'[A-Za-z0-9_-]{30,1024}',token) or not expiry or expiry <= datetime.now(timezone.utc): raise MonitorError("token_invalid")
 return token, expires

class Yandex:
 def __init__(self,http,token): self.http=http; self.headers={"Authorization":f"OAuth {token}","Accept":"application/json"}
 def get(self,path):
  try: status,body=self.http.get(API+path,self.headers)
  except MonitorError as exc: return {"_error":exc.code}
  if not 200<=status<300: return {"_error":f"http_{status}"}
  try: return safe_json(body)
  except MonitorError: return {"_error":"invalid_json"}
 def user(self): return self.get("/user")
 def hosts(self,uid): return self.get(f"/user/{quote(str(uid),safe='')}/hosts")
 def summary(self,uid,host): return self.get(f"/user/{uid}/hosts/{quote(host,safe='')}/summary")
 def samples(self,uid,host,offset): return self.get(f"/user/{uid}/hosts/{quote(host,safe='')}/search-urls/in-search/samples?offset={offset}&limit={PAGE_SIZE}")

def choose_host(reply):
 hosts=reply.get("hosts") if isinstance(reply,dict) else None
 if not isinstance(hosts,list): raise MonitorError("hosts_invalid")
 for host in hosts:
  if isinstance(host,dict) and host.get("ascii_host_url")==SITE and isinstance(host.get("host_id"),str): return host["host_id"]
 raise MonitorError("target_host_missing")

def samples(client,uid,host):
 urls=[]; truncated=False
 for page in range(MAX_PAGES):
  reply=client.samples(uid,host,page*PAGE_SIZE)
  if "_error" in reply: return {"state":"unavailable","code":reply["_error"],"urls":None,"truncated":False}
  rows=reply.get("samples")
  if not isinstance(rows,list): return {"state":"unavailable","code":"samples_invalid","urls":None,"count":None,"truncated":False}
  if any(not isinstance(x,dict) or not isinstance(x.get("url"),str) for x in rows): return {"state":"unavailable","code":"samples_row_invalid","urls":None,"count":None,"truncated":False}
  urls += [x["url"] for x in rows]
  total=reply.get("count")
  if not isinstance(total,int) or total<0: return {"state":"unavailable","code":"samples_count_invalid","urls":None,"count":None,"truncated":False}
  if len(rows)<PAGE_SIZE or (isinstance(total,int) and len(urls)>=total): break
 else: truncated=True
 return {"state":"rows" if urls else "empty","urls":urls,"count":total,"truncated":truncated}

def run(http,token,expires_at,now=None):
 client=Yandex(http,token); user=client.user()
 if "_error" in user: raise MonitorError("user_"+user["_error"])
 uid=user.get("user_id")
 if not isinstance(uid,(str,int)) or not str(uid).isdigit(): raise MonitorError("user_invalid")
 hosts=client.hosts(uid)
 if "_error" in hosts: raise MonitorError("hosts_"+hosts["_error"])
 host=choose_host(hosts); summary=client.summary(uid,host)
 required=("sqi","excluded_pages_count","searchable_pages_count")
 summary_value={"state":"unavailable","code":summary.get("_error","summary_missing_fields")} if "_error" in summary or not all(isinstance(summary.get(k),int) for k in required) else {"state":"data","value":summary}
 indexed=samples(client,uid,host)
 partial=summary_value["state"]=="unavailable" or indexed["state"]=="unavailable"
 return {"state":"partial" if partial else "ok","generatedAt":(now or datetime.now(timezone.utc)).isoformat(),"site":SITE,"hostId":host,"tokenExpiresAt":expires_at,"summary":summary_value,"inSearch":indexed}

def load_latest(state):
 try:
  value=safe_json((state/"latest.json").read_bytes())
  if not iso(value.get("generatedAt")) or not isinstance(value.get("state"),str): raise MonitorError("state_corrupt")
  return value
 except FileNotFoundError: return None
 except (OSError,MonitorError): return {"_corrupt":True}
def write_snapshot(report,state):
 state.mkdir(mode=0o700,parents=True,exist_ok=True); os.chmod(state,0o700)
 stamp=report["generatedAt"].replace(":","-"); payload=json.dumps(report,ensure_ascii=False,sort_keys=True)+"\n"
 for target in (state/f"snapshot-{stamp}.json",state/"latest.json"):
  with tempfile.NamedTemporaryFile("w",encoding="utf8",dir=state,delete=False) as h: h.write(payload); name=h.name
  os.replace(name,target)
 for old in sorted(state.glob("snapshot-*.json"))[:-30]: old.unlink()
def status(state,health=False):
 latest=load_latest(state); now=datetime.now(timezone.utc); age=None if not latest or latest.get("_corrupt") else (now-iso(latest["generatedAt"])).total_seconds()/3600
 expiry=None if not latest or latest.get("_corrupt") else iso(latest.get("tokenExpiresAt"))
 failure=load_failure(state); bad=age is None or age>36 or latest.get("state")!="ok" or expiry is None or (expiry-now).total_seconds()<30*86400 or failure is not None
 print(json.dumps({"state":"error" if bad else "ok","ageHours":age,"lastError":failure})); return 1 if health and bad else 0
def load_failure(state):
 try:
  value=safe_json((state/"last-failure.json").read_bytes())
  return value.get("code") if isinstance(value.get("code"),str) and iso(value.get("at")) else "failure_corrupt"
 except FileNotFoundError: return None
 except (OSError,MonitorError): return "failure_corrupt"
def write_failure(state,code):
 state.mkdir(mode=0o700,parents=True,exist_ok=True)
 with tempfile.NamedTemporaryFile("w",encoding="utf8",dir=state,delete=False) as h: json.dump({"code":code,"at":datetime.now(timezone.utc).isoformat()},h); name=h.name
 os.replace(name,state/"last-failure.json")
def main():
 p=argparse.ArgumentParser(); p.add_argument("--token",default="/etc/masterok-search/yandex-webmaster-token.json"); p.add_argument("--state",default=str(STATE_DIR)); p.add_argument("--status",action="store_true"); p.add_argument("--health",action="store_true"); a=p.parse_args(); state=Path(a.state)
 if a.status or a.health: return status(state,a.health)
 try:
  token,expires=token_data(a.token); report=run(Http(),token,expires); write_snapshot(report,state)
  if report['state']=='ok': (state/'last-failure.json').unlink(missing_ok=True)
  print(json.dumps({"state":report["state"],"generatedAt":report["generatedAt"]})); return 1 if report["state"]!="ok" else 0
 except Exception as exc:
  code=exc.code if isinstance(exc,MonitorError) else "unexpected_error"; write_failure(state,code); print(json.dumps({"state":"error","code":code})); return 1
if __name__=="__main__": raise SystemExit(main())
