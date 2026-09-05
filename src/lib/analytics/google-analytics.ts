/**
 * Product interaction origins are not acquisition sources. Keep the legacy
 * Metrika contract, but namespace this parameter at the Google transport edge.
 * Never mutate params: the same object is also passed to Metrika.
 */
export function getGoogleAnalyticsEventParams(
  params: object,
): object {
  if (!("source" in params)) return params;
  const { source, ...eventParams } = params;
  return { ...eventParams, interaction_source: source };
}

export function getGoogleAnalyticsInitScript(measurementId: string): string {
  const id = JSON.stringify(measurementId);

  return `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', ${id}, { send_page_view: false });`;
}
