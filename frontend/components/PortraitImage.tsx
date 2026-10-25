import type { Portrait } from "@/lib/api";

/** A politician's photo, square and cropped from the top so the face stays in
 *  frame; their initials when there is no free-licensed photo. The size comes
 *  from `className` (e.g. "h-12 w-12"), so it can change with the breakpoint. */
export default function PortraitImage({
  portrait,
  name,
  pixels,
  alt = "",
  title,
  className,
  initialsClassName = "text-base",
}: {
  portrait: Portrait | null | undefined;
  name: string;
  /** Largest rendered size, for the image's intrinsic width and height. */
  pixels: number;
  /** Empty when the name is shown next to the photo. */
  alt?: string;
  title?: string;
  className: string;
  initialsClassName?: string;
}) {
  const box = `shrink-0 overflow-hidden bg-slate-100 ${className}`;
  if (!portrait) {
    const words = name.split(/\s+/).filter(Boolean);
    const initials = [words[0], words.length > 1 ? words[words.length - 1] : undefined]
      .map((w) => w?.[0] ?? "")
      .join("")
      .toUpperCase();
    return (
      <span
        aria-hidden
        className={`${box} flex items-center justify-center font-semibold text-slate-400 ${initialsClassName}`}
      >
        {initials}
      </span>
    );
  }
  return (
    // A plain <img>: the files are already small thumbnails served as static
    // assets, so there is nothing for an image optimizer to do.
    <img
      src={`/portraits/${portrait.file}`}
      alt={alt}
      title={title}
      width={pixels}
      height={pixels}
      loading="lazy"
      decoding="async"
      className={`${box} object-cover object-top`}
    />
  );
}
