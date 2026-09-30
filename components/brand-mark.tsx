/** The Investor OS app mark (top-left logo). Same artwork as the favicon in app/icon.png. */
export function BrandMark({ size = 38 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/investor-os-mark.png"
      alt="Investor OS"
      width={size}
      height={size}
      className="os-brand-mark"
    />
  );
}
