import Image, { type ImageProps } from "next/image";
import { ghostCoverSrcSet } from "@/lib/blog-images";

type Props = Omit<ImageProps, "src"> & { src: string; sizes: string };

export default function BlogCoverImage({ src, sizes, ...props }: Props) {
  const srcSet = ghostCoverSrcSet(src);
  return (
    <picture>
      {srcSet && <source srcSet={srcSet} sizes={sizes} />}
      <Image {...props} src={src} sizes={sizes} />
    </picture>
  );
}
