import { trpc } from "@/providers/trpc";

const levelColors: Record<string, { bg: string; dot: string; label: string }> = {
  low: { bg: "bg-emerald-500/10", dot: "bg-emerald-500", label: "Низкий" },
  medium: { bg: "bg-amber-500/10", dot: "bg-amber-500", label: "Средний" },
  elevated: { bg: "bg-orange-500/10", dot: "bg-orange-500", label: "Повышенный" },
  high: { bg: "bg-red-500/10", dot: "bg-red-500", label: "Высокий" },
};

const positionLabels: Record<string, string> = {
  GK: "ВР",
  DEF: "ЗАЩ",
  MID: "ПЗ",
  FWD: "НАП",
};

export default function RiskScoreBoard({ teamId }: { teamId: number }) {
  const { data: riskScores } = trpc.analytics.getPlayerRiskScores.useQuery(
    { teamId },
    { refetchInterval: 60000 }
  );

  if (!riskScores || riskScores.length === 0) return null;

  const atRisk = riskScores.filter((p) => p.level === "elevated" || p.level === "high");
  const shown = riskScores.slice(0, 8);

  return (
    <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Индекс риска травмы
        </h3>
        {atRisk.length > 0 && (
          <span className="text-xs text-red-500 font-medium">
            {atRisk.length} игрок{(atRisk.length % 10 === 1 && atRisk.length % 100 !== 11) ? "а" : atRisk.length > 1 && atRisk.length < 5 ? "а" : "ов"} в зоне риска
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {shown.map((p) => {
          const colors = levelColors[p.level];
          return (
            <div
              key={p.playerId}
              className={`rounded-lg p-3 ${colors.bg} border border-transparent hover:border-gray-200 dark:hover:border-[#2a2b2c] transition-colors`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${colors.dot} flex-shrink-0`} />
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {p.playerName}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {positionLabels[p.position] || p.position}
                  {p.age > 0 && <span className="ml-1">· {p.age} лет</span>}
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-16 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors.dot}`}
                      style={{ width: `${p.score}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    p.level === "high" ? "text-red-500" :
                    p.level === "elevated" ? "text-orange-500" :
                    p.level === "medium" ? "text-amber-500" :
                    "text-emerald-500"
                  }`}>
                    {p.score}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {riskScores.length > 8 && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          Показано 8 из {riskScores.length} игроков
        </p>
      )}
    </div>
  );
}
