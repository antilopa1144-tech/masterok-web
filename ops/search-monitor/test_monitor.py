import json, unittest, tempfile, sys
from datetime import date
from pathlib import Path
from unittest.mock import patch
import monitor
from monitor import MonitorError, SearchConsole, canonical_blog_urls, final_dates, run

SITE="https://getmasterok.ru/"; URL=SITE+"blog/a-post/"
class FakeHttp:
 def __init__(self, sitemap, replies): self.sitemap=sitemap; self.replies=list(replies)
 def get(self, url): return 200,self.sitemap
 def post(self,*_): return self.replies.pop(0)
def sitemap(url=URL): return f"<urlset><url><loc>{url}</loc></url></urlset>".encode()
class MonitorTests(unittest.TestCase):
 def test_invalid_url_is_rejected(self):
  with self.assertRaises(MonitorError): canonical_blog_urls(sitemap(SITE+"blog/a-post/?x=1"))
 def test_final_dates(self): self.assertEqual(final_dates(date(2026,9,10)), ("2026-09-01","2026-09-07"))
 def test_no_rows_is_not_zero(self):
  replies=[(200,b'{"inspectionResult":{"indexStatusResult":{"verdict":"PASS"}}}'),(200,b'{}'),(200,b'{}')]; r=run(FakeHttp(sitemap(),replies),SearchConsole(FakeHttp(b'',replies),"x"),date(2026,9,10)); self.assertEqual(r["analytics"]["web"]["state"],"no_rows"); self.assertIsNone(r["analytics"]["web"]["rows"])
 def test_empty_rows_is_no_rows(self):
  replies=[(200,b'{"inspectionResult":{"indexStatusResult":{"verdict":"PASS"}}}'),(200,b'{"rows":[]}'),(200,b'{"rows":[]}')]; r=run(FakeHttp(sitemap(),replies),SearchConsole(FakeHttp(b'',replies),"x"),date(2026,9,10)); self.assertEqual(r["analytics"]["web"]["state"],"no_rows")
 def test_inspection_pass_only(self):
  replies=[(200,b'{"inspectionResult":{"indexStatusResult":{"verdict":"NEUTRAL"}}}'),(200,b'{"rows":[]}'),(200,b'{"rows":[]}')]; r=run(FakeHttp(sitemap(),replies),SearchConsole(FakeHttp(b'',replies),"x"),date(2026,9,10)); self.assertNotIn(URL,r["firstObservedIndexed"])
 def test_google_auth_errors_are_safe(self):
  for status in (401,403,429):
   self.assertEqual(SearchConsole(FakeHttp(b'',[(status,b'token')]),"x").inspect(URL)["_error"],f"google_http_{status}")
 def test_discover_403_preserves_inspection_and_web(self):
  replies=[(200,b'{"inspectionResult":{"indexStatusResult":{"verdict":"PASS"}}}'),(200,b'{"rows":[]}'),(403,b'')]; r=run(FakeHttp(sitemap(),replies),SearchConsole(FakeHttp(b'',replies),"x"),date(2026,9,10)); self.assertEqual(r["inspections"][URL]["verdict"],"PASS"); self.assertEqual(r["analytics"]["discover"]["code"],"google_http_403")
 def test_main_writes_snapshot_with_fake_auth(self):
  with tempfile.TemporaryDirectory() as folder, patch.object(monitor,"Http",lambda: FakeHttp(sitemap(),[(200,b'{"inspectionResult":{"indexStatusResult":{"verdict":"PASS"}}}'),(200,b'{}'),(200,b'{}')])), patch.object(monitor,"service_token",lambda _:"token"), patch.object(sys,"argv",["monitor","--state",folder]):
   self.assertEqual(monitor.main(),0); self.assertTrue((Path(folder)/"latest.json").exists())
 def test_corrupt_snapshot_is_safe(self):
  with tempfile.TemporaryDirectory() as folder:
   (Path(folder)/"latest.json").write_text("not-json")
   self.assertTrue(monitor.load_latest(Path(folder))["_corrupt"])
 def test_main_safe_service_account_failure(self):
  with tempfile.TemporaryDirectory() as folder, patch.object(monitor,"service_token",side_effect=MonitorError("service_account_unavailable")), patch.object(sys,"argv",["monitor","--state",folder]):
   with self.assertRaises(MonitorError): monitor.main()
   self.assertEqual(json.loads((Path(folder)/'last-failure.json').read_text())['code'],'service_account_unavailable')
 def test_missing_inspection_status_is_error(self):
  replies=[(200,b'{}'),(200,b'{}'),(200,b'{}')]
  with tempfile.TemporaryDirectory() as folder:
   r=run(FakeHttp(sitemap(),replies),SearchConsole(FakeHttp(b'',replies),'x'),state_dir=Path(folder))
   self.assertEqual(r['state'],'partial'); self.assertEqual(r['inspections'][URL]['code'],'inspection_missing_status')
 def test_semantically_corrupt_state_is_not_reset(self):
  with tempfile.TemporaryDirectory() as folder:
   (Path(folder)/'latest.json').write_text('[]')
   self.assertTrue(monitor.load_latest(Path(folder))['_corrupt'])
 def test_api_json_array_is_invalid(self):
  self.assertEqual(SearchConsole(FakeHttp(b'',[(200,b'[]')]),'x').inspect(URL)['_error'],'google_invalid_json')
 def test_null_api_payload_does_not_drop_other_results(self):
  replies=[(200,b'{"inspectionResult":null}'),(200,b'{"rows":null}'),(200,b'{"rows":{}}')]
  with tempfile.TemporaryDirectory() as folder:
   r=run(FakeHttp(sitemap(),replies),SearchConsole(FakeHttp(b'',replies),'x'),state_dir=Path(folder))
   self.assertEqual(r['state'],'partial'); self.assertEqual(r['analytics']['web']['state'],'no_rows'); self.assertEqual(r['analytics']['discover']['code'],'analytics_invalid_rows')
 def test_health_missing_and_corrupt_are_unhealthy(self):
  with tempfile.TemporaryDirectory() as folder, patch.object(sys,'argv',['monitor','--state',folder,'--health']):
   self.assertEqual(monitor.main(),1)
   (Path(folder)/'latest.json').write_text('[]')
   self.assertEqual(monitor.main(),1)
if __name__=="__main__": unittest.main()
