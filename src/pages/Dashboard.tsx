import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { trpc } from "@/providers/trpc";
import {
  Users,
  Calendar,
  Trophy,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Bell,
  ChevronRight,
} from "lucide-react";
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
import { Line, Radar } from "react-chartjs-2";
import { Link } from "react-router";

ChartJS.register(
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
  Filler
);

function KpiCard({
  title,
  value,
  trend,
  trendValue,
  icon,
  to,
}: {
  title: string;
  value: number | string;
  trend: "up" | "down" | "same";
  trendValue: string;
  icon: React.ReactNode;
  to?: string;
}) {
  const content = (
    <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center">
          {icon}
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-medium
          ${trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-gray-500"}`}
        >
          {trend === "up" ? <TrendingUp size={14} /> : trend === "down" ? <TrendingDown size={14} /> : <Minus size={14} />}
          {trendValue}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-3">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{title}</p>
    </div>
  );

  if (to) return <Link to={to} className="block cursor-pointer">{content}</Link>;
  return content;
}

export default function Dashboard() {
  const { user } = useCustomAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  const { data: teams } = trpc.team.list.useQuery(
    user?.id ? { userId: user.id } : undefined,
    { enabled: !!user }
  );

  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const { data: teamStats } = trpc.analytics.getTeamStats.useQuery(
    { teamId: selectedTeamId ?? 0 },
    { enabled: !!selectedTeamId }
  );

  const { data: attendanceData } = trpc.analytics.getAttendanceDynamics.useQuery(
    { teamId: selectedTeamId ?? 0 },
    { enabled: !!selectedTeamId }
  );

  const utils = trpc.useUtils();

  useEffect(() => {
    utils.notification.list.invalidate();
  }, []);

  const { data: notifications } = trpc.notification.list.useQuery(
    user?.id ? { userId: user.id } : undefined,
    { enabled: !!user }
  );

  const recentNotifications = notifications?.slice(0, 5) ?? [];

  const attendanceChartData = {
    labels: (attendanceData ?? []).slice(-7).map((d) =>
      new Date(d.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
    ),
    datasets: [
      {
        label: "Посещаемость %",
        data: (attendanceData ?? []).slice(-7).map((d) => d.rate),
        borderColor: "#96f7b9",
        backgroundColor: "rgba(150, 247, 185, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#11131a",
        pointBorderColor: "#96f7b9",
        pointBorderWidth: 2,
      },
    ],
  };

  const radarData = {
    labels: ["Голы", "Передачи", "Посещаемость", "Игровое время", "Дисциплина"],
    datasets: [
      {
        label: "Средняя команда",
        data: [65, 70, 85, 75, 90],
        backgroundColor: "rgba(150, 247, 185, 0.2)",
        borderColor: "#96f7b9",
        borderWidth: 2,
        pointBackgroundColor: "#96f7b9",
        pointBorderColor: "#11131a",
        pointBorderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: { color: "#9ca3af", font: { size: 11 } },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#9ca3af", font: { size: 11 } },
      },
    },
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: { display: false, stepSize: 20 },
        grid: { color: "rgba(255,255,255,0.08)" },
        angleLines: { color: "rgba(255,255,255,0.05)" },
        pointLabels: { color: "#9ca3af", font: { size: 12 } },
      },
    },
  };

  return (
    <Layout>
      {/* Page header with team selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Обзор активности команды
          </p>
        </div>
        {teams && teams.length > 0 && (
          <select
            value={selectedTeamId ?? ""}
            onChange={(e) => setSelectedTeamId(Number(e.target.value))}
            className="h-10 px-3 bg-white dark:bg-[#191a1b] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9] focus:ring-1 focus:ring-[#96f7b9]/20"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Игроков в составе"
          value={teamStats?.playerCount ?? 0}
          trend="up"
          trendValue="+5%"
          icon={<Users size={20} className="text-[#96f7b9]" />}
          to="/players"
        />
        <KpiCard
          title="Тренировок на неделе"
          value={teamStats?.totalTrainings ?? 0}
          trend="up"
          trendValue="+2"
          icon={<Calendar size={20} className="text-blue-500" />}
          to="/training"
        />
        <KpiCard
          title="Матчей в месяце"
          value={teamStats?.totalMatches ?? 0}
          trend="down"
          trendValue="-1"
          icon={<Trophy size={20} className="text-amber-500" />}
          to="/matches"
        />
        <KpiCard
          title="Активных травм"
          value={teamStats?.activeInjuries ?? 0}
          trend={teamStats?.activeInjuries && teamStats.activeInjuries > 0 ? "up" : "same"}
          trendValue={teamStats?.activeInjuries && teamStats.activeInjuries > 0 ? "+1" : "0"}
          icon={<Activity size={20} className="text-red-500" />}
          to="/injuries"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        {/* Attendance chart */}
        <div className="lg:col-span-3 bg-white dark:bg-[#191a1b] rounded-[10px] p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            Динамика посещаемости
          </h3>
          <div className="h-64">
            {attendanceData && attendanceData.length > 0 ? (
              <Line data={attendanceChartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Нет данных о посещаемости
              </div>
            )}
          </div>
        </div>

        {/* Radar chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#191a1b] rounded-[10px] p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            KPI команды
          </h3>
          <div className="h-64">
            <Radar data={radarData} options={radarOptions} />
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent events */}
        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            Последние события
          </h3>
          <div className="space-y-3">
            {attendanceData && attendanceData.length > 0 ? (
              attendanceData.slice(-5).reverse().map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/[0.03] rounded-lg"
                >
                  <div className="w-8 h-8 rounded-md bg-[#96f7b9]/10 flex items-center justify-center flex-shrink-0">
                    <Calendar size={14} className="text-[#96f7b9]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(item.date).toLocaleDateString("ru-RU")} — Посещаемость: {item.rate}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">Нет данных</p>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Уведомления
            </h3>
            <Link
              to="/notifications"
              className="text-xs text-[#96f7b9] hover:underline flex items-center gap-1"
            >
              Все <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentNotifications.length > 0 ? (
              recentNotifications.map((note) => (
                <div
                  key={note.id}
                  className={`flex gap-3 p-3 rounded-lg border-l-2
                    ${note.type === "error" ? "border-l-red-500 bg-red-500/5" : note.type === "warning" ? "border-l-amber-500 bg-amber-500/5" : "border-l-blue-500 bg-blue-500/5"}`}
                >
                  <Bell size={14} className={`mt-0.5 flex-shrink-0
                    ${note.type === "error" ? "text-red-400" : note.type === "warning" ? "text-amber-400" : "text-blue-400"}`} />
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">{note.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{note.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">Нет уведомлений</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
