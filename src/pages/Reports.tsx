import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/layout/Layout";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { trpc } from "@/providers/trpc";
import {
  FileText,
  Download,
  Users,
  BarChart3,
  HeartPulse,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const reportTemplates = [
  {
    id: "player_stats",
    title: "Статистика игрока",
    description: "Полная статистика выбранного игрока: голы, передачи, карточки, KPI",
    icon: Users,
    format: "pdf" as const,
    color: "bg-blue-500",
  },
  {
    id: "team_stats",
    title: "Статистика команды",
    description: "Сводная статистика команды: матчи, тренировки, посещаемость",
    icon: BarChart3,
    format: "pdf" as const,
    color: "bg-emerald-500",
  },
  {
    id: "attendance",
    title: "Посещаемость",
    description: "Отчет о посещаемости тренировок в формате Excel",
    icon: Calendar,
    format: "excel" as const,
    color: "bg-purple-500",
  },
  {
    id: "medical",
    title: "Медицинские показатели",
    description: "Динамика здоровья игроков в формате Excel",
    icon: HeartPulse,
    format: "excel" as const,
    color: "bg-red-500",
  },
  {
    id: "summary",
    title: "Сводный отчет",
    description: "Полный сводный отчет по команде",
    icon: FileText,
    format: "pdf" as const,
    color: "bg-amber-500",
  },
];

function generateHtmlReport(title: string, tables: { caption: string; headers: string[]; rows: string[][] }[]) {
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>${title}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a2e; }
  h1 { font-size: 24px; margin-bottom: 8px; }
  .subtitle { color: #666; font-size: 14px; margin-bottom: 32px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
  caption { font-size: 16px; font-weight: 600; margin-bottom: 8px; text-align: left; }
  th { background: #f3f4f6; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: #666; }
  td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
  tr:last-child td { border-bottom: none; }
  .footer { margin-top: 40px; font-size: 11px; color: #999; text-align: center; }
</style></head><body>
  <h1>${title}</h1>
  <p class="subtitle">Сгенерировано ${new Date().toLocaleDateString("ru-RU")}</p>
  ${tables.map(t => `
  <table>
    <caption>${t.caption}</caption>
    <thead><tr>${t.headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${t.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>`).join("")}
  <p class="footer">FootballManager — система управления футбольным клубом</p>
</body></html>`;
}

function downloadPdf(html: string, filename: string) {
  const win = window.open("", "_blank");
  if (!win) { toast.error("Разрешите всплывающие окна"); return; }
  win.document.write(html);
  win.document.close();
  win.document.title = filename;
  setTimeout(() => { win.focus(); win.print(); }, 500);
}

export default function Reports() {
  const { user } = useCustomAuth();
  const utils = trpc.useUtils();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const { data: teams } = trpc.team.list.useQuery(
    user?.id ? { userId: user.id } : undefined,
    { enabled: !!user }
  );

  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const { data: teamPlayers } = trpc.player.list.useQuery(
    selectedTeamId ? { teamId: selectedTeamId } : undefined,
    { enabled: !!selectedTeamId }
  );

  const { data: teamStats } = trpc.analytics.getTeamStats.useQuery(
    selectedTeamId ? { teamId: selectedTeamId } : undefined,
    { enabled: false }
  );

  const { data: attendanceData } = trpc.analytics.getAttendanceDynamics.useQuery(
    selectedTeamId ? { teamId: selectedTeamId } : undefined,
    { enabled: false }
  );

  const { data: matchActivity } = trpc.analytics.getMatchActivity.useQuery(
    selectedTeamId ? { teamId: selectedTeamId } : undefined,
    { enabled: false }
  );

  const { data: playersWithStatus } = trpc.medical.listPlayersWithStatus.useQuery(
    { teamId: selectedTeamId ?? 0 },
    { enabled: !!selectedTeamId }
  );

  const { data: playerKpi } = trpc.analytics.getPlayerKpi.useQuery(
    selectedTeamId && selectedPlayerId ? { playerId: selectedPlayerId, teamId: selectedTeamId } : undefined,
    { enabled: false }
  );

  const { data: physicalData } = trpc.analytics.getPhysicalDynamics.useQuery(
    selectedPlayerId ? { playerId: selectedPlayerId } : undefined,
    { enabled: false }
  );

  const generateReport = useCallback(async (templateId: string) => {
    if (!selectedTeamId) { toast.error("Выберите команду"); return; }
    setGenerating(templateId);

    try {
      const team = teams?.find(t => t.id === selectedTeamId);
      const teamName = team?.name || "Команда";

      if (templateId === "team_stats") {
        const stats = await utils.client.analytics.getTeamStats.query({ teamId: selectedTeamId });
        const activity = await utils.client.analytics.getMatchActivity.query({ teamId: selectedTeamId });
        const attendance = await utils.client.analytics.getAttendanceDynamics.query({ teamId: selectedTeamId });

        const html = generateHtmlReport(`Статистика команды «${teamName}»`, [
          {
            caption: "Общая статистика",
            headers: ["Показатель", "Значение"],
            rows: [
              ["Игроков", String(stats.playerCount)],
              ["Всего матчей", String(stats.totalMatches)],
              ["Побед", String(stats.wins)],
              ["Ничьих", String(stats.draws)],
              ["Поражений", String(stats.losses)],
              ["Тренировок", String(stats.totalTrainings)],
              ["Активных травм", String(stats.activeInjuries)],
            ],
          },
          {
            caption: "Последние матчи",
            headers: ["Дата", "Соперник", "Счёт", "Голы", "Передачи"],
            rows: activity.slice(-10).map(m => [
              new Date(m.date).toLocaleDateString("ru-RU"),
              m.opponent,
              `${m.scoreHome}:${m.scoreAway}`,
              String(m.goals),
              String(m.assists),
            ]),
          },
          {
            caption: "Посещаемость тренировок",
            headers: ["Дата", "Тренировка", "Присутствовало", "Всего", "%"],
            rows: attendance.map(a => [
              new Date(a.date).toLocaleDateString("ru-RU"),
              a.name,
              String(a.present),
              String(a.total),
              `${a.rate}%`,
            ]),
          },
        ]);
        downloadPdf(html, `team_stats_${teamName}`);
        toast.success("Отчёт сгенерирован");
      }

      else if (templateId === "player_stats") {
        if (!selectedPlayerId) { toast.error("Выберите игрока"); setGenerating(null); return; }
        const player = teamPlayers?.find(p => p.id === selectedPlayerId);
        if (!player) { toast.error("Игрок не найден"); setGenerating(null); return; }

        const kpi = await utils.client.analytics.getPlayerKpi.query({ playerId: selectedPlayerId, teamId: selectedTeamId });
        const physical = await utils.client.analytics.getPhysicalDynamics.query({ playerId: selectedPlayerId });

        const html = generateHtmlReport(`Статистика игрока ${player.name}`, [
          {
            caption: "Общая информация",
            headers: ["Параметр", "Значение"],
            rows: [
              ["Имя", player.name],
              ["Позиция", { GK: "Вратарь", DEF: "Защитник", MID: "Полузащитник", FWD: "Нападающий" }[player.position] || player.position],
              ["Номер", player.jerseyNumber ? String(player.jerseyNumber) : "—"],
              ["Дата рождения", player.birthDate ? new Date(player.birthDate).toLocaleDateString("ru-RU") : "—"],
            ],
          },
          {
            caption: "KPI (Radar)",
            headers: ["Показатель", "Значение"],
            rows: kpi ? [
              ["Голы", `${kpi.radar.goals}%`],
              ["Передачи", `${kpi.radar.assists}%`],
              ["Посещаемость", `${kpi.radar.attendance}%`],
              ["Игровое время", `${kpi.radar.minutes}%`],
              ["Дисциплина", `${kpi.radar.discipline}%`],
              ["Общий KPI", `${kpi.kpi}%`],
            ] : [["Нет данных", "—"]],
          },
          {
            caption: "Сырая статистика",
            headers: ["Показатель", "Значение"],
            rows: kpi ? [
              ["Матчей", String(kpi.raw.totalMatches)],
              ["Голы", String(kpi.raw.totalGoals)],
              ["Передачи", String(kpi.raw.totalAssists)],
              ["Минуты", String(kpi.raw.totalMinutes)],
              ["Жёлтые карточки", String(kpi.raw.totalYellowCards)],
              ["Красные карточки", String(kpi.raw.totalRedCards)],
            ] : [["Нет данных", "—"]],
          },
          {
            caption: "Физические показатели",
            headers: ["Дата", "Вес", "Пульс", "Давление"],
            rows: physical.slice(-20).map(m => [
              new Date(m.recordedAt).toLocaleDateString("ru-RU"),
              m.weight ? `${m.weight} кг` : "—",
              m.restingHr ? `${m.restingHr} уд/мин` : "—",
              m.bloodPressureSys && m.bloodPressureDia ? `${m.bloodPressureSys}/${m.bloodPressureDia}` : "—",
            ]),
          },
        ]);
        downloadPdf(html, `player_stats_${player.name}`);
        toast.success("Отчёт сгенерирован");
      }

      else if (templateId === "summary") {
        const stats = await utils.client.analytics.getTeamStats.query({ teamId: selectedTeamId });
        const activity = await utils.client.analytics.getMatchActivity.query({ teamId: selectedTeamId });
        const attendance = await utils.client.analytics.getAttendanceDynamics.query({ teamId: selectedTeamId });

        const html = generateHtmlReport(`Сводный отчёт «${teamName}»`, [
          {
            caption: "Общая статистика",
            headers: ["Показатель", "Значение"],
            rows: [
              ["Игроков", String(stats.playerCount)],
              ["Матчей", String(stats.totalMatches)],
              ["Побед", String(stats.wins)],
              ["Ничьих", String(stats.draws)],
              ["Поражений", String(stats.losses)],
              ["Тренировок", String(stats.totalTrainings)],
              ["Активных травм", String(stats.activeInjuries)],
            ],
          },
          {
            caption: "Матчи",
            headers: ["Дата", "Соперник", "Счёт", "Голы", "Передачи"],
            rows: activity.slice(-20).map(m => [
              new Date(m.date).toLocaleDateString("ru-RU"),
              m.opponent,
              `${m.scoreHome}:${m.scoreAway}`,
              String(m.goals),
              String(m.assists),
            ]),
          },
          {
            caption: "Посещаемость",
            headers: ["Дата", "Тренировка", "%"],
            rows: attendance.map(a => [
              new Date(a.date).toLocaleDateString("ru-RU"),
              a.name,
              `${a.rate}%`,
            ]),
          },
          {
            caption: "Игроки",
            headers: ["Имя", "Позиция", "Статус", "Травмы"],
            rows: (playersWithStatus ?? []).map(p => [
              p.player.name,
              { GK: "ВР", DEF: "ЗАЩ", MID: "ПЗ", FWD: "НАП" }[p.player.position] || p.player.position,
              p.latestRecord ? ({ cleared: "Допущен", limited: "Ограничен", not_cleared: "Не допущен" }[p.latestRecord.status] || "—") : "—",
              String(p.activeInjuries.length),
            ]),
          },
        ]);
        downloadPdf(html, `summary_${teamName}`);
        toast.success("Сводный отчёт сгенерирован");
      }

      else if (templateId === "attendance") {
        const attendance = await utils.client.analytics.getAttendanceDynamics.query({ teamId: selectedTeamId });

        const data = attendance.map(a => ({
          "Дата": new Date(a.date).toLocaleDateString("ru-RU"),
          "Тренировка": a.name,
          "Присутствовало": a.present,
          "Всего игроков": a.total,
          "Процент посещаемости": `${a.rate}%`,
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Посещаемость");

        const colWidths = [
          { wch: 12 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 20 },
        ];
        ws["!cols"] = colWidths;

        XLSX.writeFile(wb, `attendance_${teamName}.xlsx`);
        toast.success("Excel-отчёт скачан");
      }

      else if (templateId === "medical") {
        const players = await utils.client.medical.listPlayersWithStatus.query({ teamId: selectedTeamId });
        const data: Record<string, unknown>[] = [];

        for (const p of players) {
          const metrics = await utils.client.medical.listHealthMetrics.query({ playerId: p.player.id });
          for (const m of metrics) {
            data.push({
              "Игрок": p.player.name,
              "Позиция": { GK: "ВР", DEF: "ЗАЩ", MID: "ПЗ", FWD: "НАП" }[p.player.position] || p.player.position,
              "Дата": new Date(m.recordedAt).toLocaleDateString("ru-RU"),
              "Вес (кг)": m.weight ?? "—",
              "Рост (см)": m.height ? Math.round(Number(m.height)) : "—",
              "Пульс покоя": m.restingHr ?? "—",
              "Дистанция Купера (км)": m.cooperDistance ?? "—",
              "Давление (сист)": m.bloodPressureSys ?? "—",
              "Давление (диа)": m.bloodPressureDia ?? "—",
            });
          }
          if (metrics.length === 0) {
            data.push({
              "Игрок": p.player.name,
              "Позиция": { GK: "ВР", DEF: "ЗАЩ", MID: "ПЗ", FWD: "НАП" }[p.player.position] || p.player.position,
              "Дата": "—",
              "Вес (кг)": "—",
              "Рост (см)": "—",
              "Пульс покоя": "—",
              "Дистанция Купера (км)": "—",
              "Давление (сист)": "—",
              "Давление (диа)": "—",
            });
          }
        }

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Медицина");
        XLSX.writeFile(wb, `medical_${teamName}.xlsx`);
        toast.success("Excel-отчёт скачан");
      }
    } catch (err) {
      console.error(err);
      toast.error("Ошибка при генерации отчёта");
    }

    setGenerating(null);
  }, [selectedTeamId, selectedPlayerId, teamPlayers, teams, playersWithStatus, utils.client, utils]);

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Отчеты</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Генерация и экспорт отчетов</p>
        </div>
        <select
          value={selectedTeamId ?? ""}
          onChange={(e) => setSelectedTeamId(Number(e.target.value))}
          className="h-10 px-3 bg-white dark:bg-[#191a1b] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
        >
          {teams?.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Player selector for player-specific reports */}
      <div className="mb-6">
        <select
          value={selectedPlayerId ?? ""}
          onChange={(e) => setSelectedPlayerId(e.target.value ? Number(e.target.value) : null)}
          className="h-10 px-3 bg-white dark:bg-[#191a1b] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
        >
          <option value="">— Выберите игрока —</option>
          {(teamPlayers ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTemplates.map((template) => {
          const Icon = template.icon;
          const isGenerating = generating === template.id;
          const needsPlayer = template.id === "player_stats" || template.id === "medical";
          const canGenerate = selectedTeamId && (!needsPlayer || selectedPlayerId);

          return (
            <div
              key={template.id}
              className="bg-white dark:bg-[#191a1b] rounded-[10px] shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg ${template.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {template.title}
                    </h3>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded
                      ${template.format === "pdf" ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                      {template.format}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                  <button
                    onClick={() => generateReport(template.id)}
                    disabled={isGenerating || !canGenerate}
                    className="flex items-center gap-2 mt-4 h-9 px-4 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? (
                      "Генерация..."
                    ) : (
                      <>
                        <Download size={14} />
                        Сгенерировать
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
