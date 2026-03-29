/**
 * Google Apps Script — OAuth proxy for Decap CMS + GitHub.
 *
 * Деплой:
 * 1. Открой https://script.google.com → Новый проект
 * 2. Вставь этот код в Code.gs
 * 3. Замени CLIENT_ID и CLIENT_SECRET на свои
 * 4. Деплой → Новый деплой → Тип: Веб-приложение
 *    - Выполнять от: Меня
 *    - Доступ: Все
 * 5. Скопируй URL деплоя (вида https://script.google.com/macros/s/AKfy.../exec)
 * 6. Вставь URL в public/admin/index.html → base_url
 * 7. В GitHub OAuth App → Authorization callback URL:
 *    https://script.google.com/macros/s/AKfy.../exec
 */

const CLIENT_ID = "Ov23li2shLB9QOSAAUel";
const CLIENT_SECRET = "ВСТАВЬ_СВОЙ_CLIENT_SECRET";

function doGet(e) {
  var params = e.parameter;

  // Step 1: Redirect to GitHub authorize
  if (params.provider === "github") {
    var state = params.state || Utilities.getUuid();
    var scope = params.scope || "repo,user";
    var url = "https://github.com/login/oauth/authorize"
      + "?client_id=" + CLIENT_ID
      + "&redirect_uri=" + encodeURIComponent(ScriptApp.getService().getUrl())
      + "&scope=" + encodeURIComponent(scope)
      + "&state=" + state;
    return HtmlService.createHtmlOutput(
      '<script>window.location.href="' + url + '";</script>'
    );
  }

  // Step 2: Exchange code for token
  if (params.code) {
    var response = UrlFetchApp.fetch("https://github.com/login/oauth/access_token", {
      method: "post",
      contentType: "application/json",
      headers: { "Accept": "application/json" },
      payload: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: params.code,
        state: params.state || ""
      })
    });

    var data = JSON.parse(response.getContentText());

    if (data.error || !data.access_token) {
      return HtmlService.createHtmlOutput(renderMessage("error", data.error || "unknown_error"));
    }

    return HtmlService.createHtmlOutput(renderMessage("success", data.access_token));
  }

  return HtmlService.createHtmlOutput("Bad request");
}

function renderMessage(status, content) {
  var msg;
  if (status === "success") {
    msg = "authorization:github:success:" + JSON.stringify({ token: content, provider: "github" });
  } else {
    msg = "authorization:github:error:" + content;
  }

  return '<!DOCTYPE html><html><body><script>'
    + '(function() {'
    + '  function receiveMessage(e) {'
    + '    window.opener.postMessage("authorizing:github", e.origin);'
    + '    window.opener.postMessage(' + JSON.stringify(msg) + ', e.origin);'
    + '  }'
    + '  window.addEventListener("message", receiveMessage, false);'
    + '  window.opener.postMessage("authorizing:github", "*");'
    + '})();'
    + '</script></body></html>';
}
