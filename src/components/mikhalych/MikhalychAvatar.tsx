interface Props {
  /** Размер стороны в px (квадрат). */
  size?: number;
  className?: string;
}

/**
 * Аватар Михалыча. Обычный <img> (не next/image) намеренно: иконка статичная,
 * лёгкая (17 КБ), а в проекте images.unoptimized — next/image пользы не даст.
 * eslint-disable здесь, чтобы не плодить его по всем местам использования.
 */
export default function MikhalychAvatar({ size = 32, className = "" }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/mikhalych-avatar.png"
      alt=""
      width={size}
      height={size}
      className={`object-cover shrink-0 ${className}`}
      aria-hidden="true"
    />
  );
}
