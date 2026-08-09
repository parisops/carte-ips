export default function Badge({ children, tone = "neutre" }) {
  const tones = {
    neutre: "bg-sable-200 text-encre-950",
    encre: "bg-encre-950 text-sable-50",
    tableau: "bg-tableau-100 text-tableau-700",
    alerte: "bg-craie-100 text-craie-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 font-body text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
