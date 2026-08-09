import { PieChart, Pie, Cell } from "recharts";

export default function DonutParite({ pctFilles, pctGarcons }) {
  const data = [
    { name: "Filles", value: pctFilles },
    { name: "Garçons", value: pctGarcons },
  ];
  const couleurs = ["#C4562F", "#1E3A5F"];

  return (
    <div className="flex items-center gap-4">
      <PieChart width={92} height={92}>
        <Pie
          data={data}
          dataKey="value"
          innerRadius={30}
          outerRadius={44}
          startAngle={90}
          endAngle={-270}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={couleurs[i]} />
          ))}
        </Pie>
      </PieChart>
      <div className="font-body text-sm">
        <p className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-craie-600" />
          Filles <span className="font-mono font-semibold">{pctFilles}%</span>
        </p>
        <p className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-encre-800" />
          Garçons <span className="font-mono font-semibold">{pctGarcons}%</span>
        </p>
      </div>
    </div>
  );
}
