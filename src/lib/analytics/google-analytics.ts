export function getGoogleAnalyticsInitScript(measurementId: string): string {
  const id = JSON.stringify(measurementId);

  return `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', ${id}, { send_page_view: false });`;
}
