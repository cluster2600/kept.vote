/** Footer with a short methodology / credibility note. */
export default function SiteFooter() {
  return (
    <footer
      id="methodology"
      className="mt-16 border-t border-slate-200 bg-slate-50"
    >
      <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-600">
        <h2 className="text-sm font-semibold text-slate-900">Methodology</h2>
        <p className="mt-2 max-w-2xl leading-relaxed">
          Each promise is assessed against primary sources — laws, official
          records, and government data — and assigned a status: <em>Kept</em>,{" "}
          <em>Broken</em>, <em>In Progress</em>, or <em>No Action</em>. A
          confidence score reflects the strength of the available evidence. Every
          verdict links to its sources so you can check the record yourself.
        </p>
        <p className="mt-4 text-xs text-slate-400">
          kept.vote — a non-partisan promise tracker. Prototype.
        </p>
      </div>
    </footer>
  );
}
