/** Compact inline list of source links showing each source's hostname. */
export default function SourceLinks({ urls }: { urls: string[] | null }) {
  if (!urls || urls.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
      <span className="font-medium text-slate-400">
        {urls.length > 1 ? "Sources:" : "Source:"}
      </span>
      {urls.map((url, i) => (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
        >
          {hostOf(url)}
          <span aria-hidden>↗</span>
        </a>
      ))}
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
