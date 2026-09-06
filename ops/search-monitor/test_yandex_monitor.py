import tempfile,unittest,sys,json
from datetime import datetime,timezone,timedelta
from pathlib import Path
from unittest.mock import patch
import yandex_monitor as y
class H:
 def __init__(self,replies): self.replies=list(replies); self.urls=[]
 def get(self,url,headers): self.urls.append(url); return self.replies.pop(0)
class T(unittest.TestCase):
 def ok(self): return [(200,b'{"user_id":7}'),(200,b'{"hosts":[{"ascii_host_url":"https://getmasterok.ru/","host_id":"https:getmasterok.ru:443"}]}'),(200,b'{"sqi":1,"excluded_pages_count":0,"searchable_pages_count":2}'),(200,b'{"count":0,"samples":[]}')]
 def test_run_and_host(self):
  r=y.run(H(self.ok()),"x","2030-01-01T00:00:00+00:00",datetime(2026,1,1,tzinfo=timezone.utc)); self.assertEqual(r['hostId'],'https:getmasterok.ru:443'); self.assertEqual(r['inSearch']['state'],'empty')
 def test_no_host(self):
  with self.assertRaises(y.MonitorError): y.run(H([(200,b'{"user_id":7}'),(200,b'{"hosts":[]}')]),'x','2030-01-01T00:00:00+00:00')
 def test_auth_and_rate_are_safe(self):
  for code in (401,403,429):
   with self.assertRaises(y.MonitorError) as e: y.run(H([(code,b'x')]),'x','2030-01-01T00:00:00+00:00')
   self.assertEqual(e.exception.code,'user_http_'+str(code))
 def test_samples_bounded_and_truncated(self):
  rows=b'{"samples":[{"url":"https://getmasterok.ru/blog/a/"}'+b',{"url":"https://getmasterok.ru/blog/a/"}'*99+b'],"count":9999}'
  h=H([(200,b'{"user_id":7}'),(200,b'{"hosts":[{"ascii_host_url":"https://getmasterok.ru/","host_id":"h"}]}'),(200,b'{"sqi":1,"excluded_pages_count":0,"searchable_pages_count":2}')]+[(200,rows)]*5); r=y.run(h,'x','2030-01-01T00:00:00+00:00'); self.assertTrue(r['inSearch']['truncated']); self.assertEqual(len(h.urls),8)
 def test_invalid_json_and_main(self):
  self.assertEqual(y.Yandex(H([(200,b'[]')]),'x').user()['_error'],'invalid_json')
  with tempfile.TemporaryDirectory() as d:
   r={'state':'ok','generatedAt':datetime.now(timezone.utc).isoformat(),'tokenExpiresAt':(datetime.now(timezone.utc)+timedelta(days=31)).isoformat()}; y.write_snapshot(r,Path(d)); self.assertEqual(y.status(Path(d),True),0)
 def test_partial_summary_failure_and_failure_health(self):
  r=y.run(H([(200,b'{"user_id":7}'),(200,b'{"hosts":[{"ascii_host_url":"https://getmasterok.ru/","host_id":"h"}]}'),(200,b'{}'),(429,b'')]),'x','2030-01-01T00:00:00+00:00'); self.assertEqual(r['state'],'partial'); self.assertEqual(r['summary']['state'],'unavailable')
  with tempfile.TemporaryDirectory() as d:
   state=Path(d); y.write_snapshot({'state':'ok','generatedAt':datetime.now(timezone.utc).isoformat(),'tokenExpiresAt':(datetime.now(timezone.utc)+timedelta(days=31)).isoformat()},state); y.write_failure(state,'http_429'); self.assertEqual(y.status(state,True),1)
 def test_main_fake_token_file(self):
  with tempfile.TemporaryDirectory() as d:
   base=Path(d); token=base/'token.json'; token.write_text(json.dumps({'token':'x'*40,'expires_at':'2030-01-01T00:00:00+00:00'}))
   with patch.object(y,'Http',lambda:H(self.ok())), patch.object(sys,'argv',['yandex','--token',str(token),'--state',str(base/'state')]): self.assertEqual(y.main(),0)
 def test_failed_snapshot_does_not_erase_failure(self):
  with tempfile.TemporaryDirectory() as d:
   base=Path(d); token=base/'token.json'; token.write_text(json.dumps({'token':'x'*40,'expires_at':'2030-01-01T00:00:00+00:00'})); state=base/'state'
   with patch.object(y,'Http',lambda:H(self.ok())), patch.object(y,'write_snapshot',side_effect=OSError('disk unavailable')), patch.object(sys,'argv',['yandex','--token',str(token),'--state',str(state)]):
    self.assertEqual(y.main(),1); self.assertEqual(y.load_failure(state),'unexpected_error')
if __name__=='__main__': unittest.main()
