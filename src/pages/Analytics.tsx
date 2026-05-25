import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { trpc } from "@/providers/trpc";
import { BarChart3, TrendingUp, Activity } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Radar, Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  RadialLinearScale, ArcElement, Title, Tooltip, Legend, Filler
);

export default function Analytics() {
  const { user } = useCustomAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  const { data: teams } = trpc.team.list.useQuery(
    user?.id ? { userId: user.id } : undefined,
    { enabled: !!user }
  );

  const { data: players } = trpc.player.list.useQuery(
    { teamId: selectedTeamId ?? 0 },
    { enabled: !!selectedTeamId }
  );

  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  useEffect(() => {
    if (players && players.length > 0 && !selectedPlayerId) {
      setSelectedPlayerId(players[0].id);
    }
  }, [players, selectedPlayerId]);

  const { data: kpiData } = trpc.analytics.getPlayerKpi.useQuery(
    { playerId: selectedPlayerId ?? 0, teamId: selectedTeamId ?? 0 },
    { enabled: !!selectedPlayerId && !!selectedTeamId }
  );

  const { data: attendanceDynamics } = trpc.analytics.getAttendanceDynamics.useQuery(
    { teamId: selectedTeamId ?? 0 },
    { enabled: !!selectedTeamId }
  );

  const { data: matchActivity } = trpc.analytics.getPlayerMatchActivity.useQuery(
    { playerId: selectedPlayerId ?? 0 },
    { enabled: !!selectedPlayerId }
  );

  
  const radarData = {
    labels: ["Голы", "Передачи", "Посещаемость", "Игровое время", "Дисциплина"],
    datasets: kpiData?.radar ? [{
      label: "KPI игрока",
      data: [
        kpiData.radar.goals,
        kpiData.radar.assists,
        kpiData.radar.attendance,
        kpiData.radar.minutes,
        kpiData.radar.discipline,
      ],
      backgroundColor: "rgba(150, 247, 185, 0.2)",
      borderColor: "#96f7b9",
      borderWidth: 2,
      pointBackgroundColor: "#96f7b9",
      pointBorderColor: "#11131a",
      pointBorderWidth: 2,
    }] : [],
  };

  const attendanceChartData = {
    labels: (attendanceDynamics ?? []).slice(-10).map((d) =>
      new Date(d.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
    ),
    datasets: [{
      label: "Посещаемость %",
      data: (attendanceDynamics ?? []).slice(-10).map((d) => d.rate),
      borderColor: "#96f7b9",
      backgroundColor: "rgba(150, 247, 185, 0.1)",
      borderWidth: 2,
      fill: true,
      tension: 0.4,
    }],
  };

  const activityChartData = {
    labels: (matchActivity ?? []).slice(-10).map((m) => m.opponent.length > 12 ? m.opponent.slice(0, 11) + "…" : m.opponent),
    datasets: [
      { label: "Голы", data: (matchActivity ?? []).slice(-10).map((m) => m.goals), backgroundColor: "#96f7b9", borderRadius: 4 },
      { label: "Передачи", data: (matchActivity ?? []).slice(-10).map((m) => m.assists), backgroundColor: "#3b82f6", borderRadius: 4 },
    ],
  };

  const disciplineData = {
    labels: ["Желтые карточки", "Красные карточки"],
    datasets: [{
      data: [kpiData?.raw.totalYellowCards || 0, kpiData?.raw.totalRedCards || 0],
      backgroundColor: ["#f59e0b", "#ef4444"],
      borderWidth: 0,
    }],
  };

  const radarOptions = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      r: { beginAtZero: true, max: 100, ticks: { display: false },
        grid: { color: "rgba(255,255,255,0.08)" },
        angleLines: { color: "rgba(255,255,255,0.05)" },
        pointLabels: { color: "#9ca3af", font: { size: 12 } },
      },
    },
    plugins: { legend: { display: false } },
  };

  const commonOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "#9ca3af" } } },
    scales: {
      y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#9ca3af" } },
      x: { grid: { display: false }, ticks: { color: "#9ca3af" } },
    },
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Аналитика</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">KPI и статистика команды</p>
        </div>
        <div className="flex gap-3">
          <select value={selectedTeamId ?? ""} onChange={(e) => setSelectedTeamId(Number(e.target.value))}
            className="h-10 px-3 bg-white dark:bg-[#191a1b] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
          >
            {teams?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={selectedPlayerId ?? ""} onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
            className="h-10 px-3 bg-white dark:bg-[#191a1b] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
          >
            {players?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Score */}
      {kpiData && (
        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-6 shadow-sm mb-4 flex items-center gap-6">
          <div className="flex-1">
            <p className="text-sm text-gray-500">Общий KPI</p>
            <p className="text-4xl font-bold text-[#96f7b9]">{kpiData.kpi}%</p>
          </div>
          <div className="grid grid-cols-3 gap-4 flex-1">
            {[
              { label: "Матчи", value: kpiData.raw.totalMatches, icon: BarChart3 },
              { label: "Голы", value: kpiData.raw.totalGoals, icon: TrendingUp },
              { label: "Передачи", value: kpiData.raw.totalAssists, icon: Activity },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{item.value}</p>
                <p className="text-xs text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar KPI */}
        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">KPI игрока</h3>
          <div className="h-64">
            {kpiData?.radar ? <Radar data={radarData} options={radarOptions} /> : <p className="text-gray-400 text-sm text-center pt-20">Нет данных</p>}
          </div>
        </div>

        {/* Attendance dynamics */}
        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Динамика посещаемости</h3>
          <div className="h-64">
            {attendanceDynamics && attendanceDynamics.length > 0 ? <Line data={attendanceChartData} options={commonOptions} /> : <p className="text-gray-400 text-sm text-center pt-20">Нет данных</p>}
          </div>
        </div>

        {/* Match activity */}
        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Игровая активность</h3>
          <div className="h-64">
            {matchActivity && matchActivity.length > 0 ? <Bar data={activityChartData} options={commonOptions} /> : <p className="text-gray-400 text-sm text-center pt-20">Нет данных</p>}
          </div>
        </div>

        {/* Discipline */}
        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Дисциплина</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="w-48 h-48">
              <Doughnut data={disciplineData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: "bottom" as const, labels: { color: "#9ca3af" } } },
              }} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
