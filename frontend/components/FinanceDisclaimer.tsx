import type { Dictionary } from "@/app/[lang]/dictionaries";
import { rich } from "@/lib/i18n/format";

/** Provenance note at the top of the Finances tab. Disclosure regimes differ
 *  by country, so the wording follows the politician's country: France's HATVP
 *  declarations, Switzerland's register of interests, or a generic note. */
export default function FinanceDisclaimer({
  countryCode,
  dict,
}: {
  countryCode: string | null;
  dict: Dictionary;
}) {
  const d = dict.finances.disclaimer;
  const text =
    countryCode === "FR"
      ? rich(d.france, {
          hatvp: <abbr title={dict.finances.hatvpFull}>HATVP</abbr>,
        })
      : countryCode === "CH"
        ? d.switzerland
        : d.default;
  return (
    <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
      {text}
    </p>
  );
}
