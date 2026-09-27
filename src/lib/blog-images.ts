/** Ghost's native resized files; the original stays in metadata and the fallback img. */
export function ghostCoverSrcSet(src: string): string | undefined {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return undefined;
  }
  if (url.origin !== "https://cms.getmasterok.ru" ||
    !/^\/content\/images\/\d{4}\/\d{2}\/.+\.(?:webp|png|jpe?g|avif)$/i.test(url.pathname)) {
    return undefined;
  }
  return [600, 1000, 1200].map((width) => {
    const resized = new URL(url);
    resized.pathname = url.pathname.replace("/content/images/", `/content/images/size/w${width}/`);
    return `${resized.href} ${width}w`;
  }).join(", ");
}
