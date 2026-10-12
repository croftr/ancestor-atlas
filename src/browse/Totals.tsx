/** The row of headline counts at the top of a browse page ("26 species · 470 fossil sites ..."). */
export interface Total { label: string; value: number; title?: string }

export default function Totals({ items }: { items: Total[] }) {
  return (
    <dl className="br-totals">
      {items.map((t) => (
        <div key={t.label} title={t.title}>
          <dt>{t.label}</dt>
          <dd>{t.value.toLocaleString("en-US")}</dd>
        </div>
      ))}
    </dl>
  );
}
