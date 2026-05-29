import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { trpc } from "@/providers/trpc";
import {
  HeartPulse,
  Plus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Clock,
  Calendar,
  Pencil,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const statusConfig = {
  cleared: { label: "Допущен", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle },
  limited: { label: "Ограничен", color: "text-amber-500", bg: "bg-amber-500/10", icon: AlertTriangle },
  not_cleared: { label: "Не допущен", color: "text-red-500", bg: "bg-red-500/10", icon: XCircle },
};

const injuryStatusConfig = {
  active: { label: "Активная", color: "bg-red-500" },
  recovering: { label: "Восстановление", color: "bg-amber-500" },
  healed: { label: "Вылечена", color: "bg-emerald-500" },
};

export default function Medical() {
  const { user } = useCustomAuth();
  const utils = trpc.useUtils();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"cards" | "injuries" | "metrics">("cards");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
    const [metricDialogOpen, setMetricDialogOpen] = useState(false);
  const [injuryDialogOpen, setInjuryDialogOpen] = useState(false);
  const [metricForm, setMetricForm] = useState({
    weight: "",
    restingHr: "",
    cooperDistance: "",
    height: "",
    bloodPressureSys: "",
    bloodPressureDia: "",
    recordedAt: new Date().toISOString().split("T")[0],
  });
  const [injuryForm, setInjuryForm] = useState({
    type: "",
    description: "",
    dateOccurred: new Date().toISOString().split("T")[0],
    recoveryDays: 7,
    status: "active" as "active" | "recovering" | "healed",
  });

  const { data: teams } = trpc.team.list.useQuery(
    user?.id ? { userId: user.id } : undefined,
    { enabled: !!user }
  );

  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const { data: playersWithStatus, isLoading } = trpc.medical.listPlayersWithStatus.useQuery(
    { teamId: selectedTeamId ?? 0 },
    { enabled: !!selectedTeamId }
  );

  const { data: healthData } = trpc.medical.listHealthMetrics.useQuery(
    { playerId: selectedPlayerId ?? 0 },
    { enabled: !!selectedPlayerId && activeTab === "metrics" }
  );

  const { data: injuriesList } = trpc.medical.listInjuries.useQuery(
    { playerId: selectedPlayerId ?? 0 },
    { enabled: !!selectedPlayerId && activeTab === "injuries" }
  );

  const createMetricMutation = trpc.medical.createHealthMetric.useMutation({
    onSuccess: () => {
      utils.medical.listHealthMetrics.invalidate();
      setMetricDialogOpen(false);
      toast.success("Показатели добавлены");
    },
  });

  const deleteMetricMutation = trpc.medical.deleteHealthMetric.useMutation({
    onSuccess: () => {
      utils.medical.listHealthMetrics.invalidate();
      toast.success("Показатели удалены");
    },
  });

  const [editingInjuryId, setEditingInjuryId] = useState<number | null>(null);

  const createInjuryMutation = trpc.medical.createInjury.useMutation({
    onSuccess: () => {
      utils.medical.listInjuries.invalidate();
      utils.medical.listPlayersWithStatus.invalidate();
      setInjuryDialogOpen(false);
      setEditingInjuryId(null);
      toast.success("Травма добавлена");
    },
  });

  const updateInjuryMutation = trpc.medical.updateInjury.useMutation({
    onSuccess: () => {
      utils.medical.listInjuries.invalidate();
      utils.medical.listPlayersWithStatus.invalidate();
      setInjuryDialogOpen(false);
      setEditingInjuryId(null);
      toast.success("Травма обновлена");
    },
  });

  const deleteInjuryMutation = trpc.medical.deleteInjury.useMutation({
    onSuccess: () => {
      utils.medical.listInjuries.invalidate();
      utils.medical.listPlayersWithStatus.invalidate();
      toast.success("Травма удалена");
    },
  });

  // Medical calculations
  const calculateMetrics = (metrics: NonNullable<typeof healthData>[0]) => {
    const weight = Number(metrics.weight);
    const height = Number(metrics.height) / 100;
    const restingHr = metrics.restingHr;
    const cooperDist = Number(metrics.cooperDistance);

    const player = playersWithStatus?.find((p) => p.player.id === selectedPlayerId)?.player;
    const age = player?.birthDate
      ? new Date().getFullYear() - new Date(player.birthDate).getFullYear()
      : 25;

    const bmi = weight && height ? (weight / (height * height)).toFixed(1) : null;
    const hrMax = 208 - 0.7 * age;
    const targetHrLow = restingHr ? Math.round(((hrMax - restingHr) * 0.5) + restingHr) : null;
    const targetHrHigh = restingHr ? Math.round(((hrMax - restingHr) * 0.85) + restingHr) : null;
    const vo2max = cooperDist ? (22.351 * cooperDist - 11.288).toFixed(1) : null;

    return { bmi, hrMax: Math.round(hrMax), targetHrLow, targetHrHigh, vo2max, age };
  };

  const chartData = {
    labels: (healthData ?? []).map((h) => new Date(h.recordedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })),
    datasets: [
      {
        label: "Вес (кг)",
        data: (healthData ?? []).map((h) => Number(h.weight)),
        borderColor: "#96f7b9",
        backgroundColor: "rgba(150, 247, 185, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        yAxisID: "y",
      },
      {
        label: "Пульс покоя",
        data: (healthData ?? []).map((h) => h.restingHr),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        yAxisID: "y1",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    scales: {
      y: { type: "linear" as const, display: true, position: "left" as const, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#9ca3af" } },
      y1: { type: "linear" as const, display: true, position: "right" as const, grid: { drawOnChartArea: false }, ticks: { color: "#9ca3af" } },
      x: { grid: { display: false }, ticks: { color: "#9ca3af" } },
    },
    plugins: { legend: { labels: { color: "#9ca3af" } } },
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Медицина</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Медицинские карты и показатели</p>
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

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
          {[
          { key: "cards" as const, label: "Медкарты", icon: HeartPulse },
          { key: "metrics" as const, label: "Показатели", icon: Activity },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 h-10 px-4 rounded-md text-sm font-medium transition-colors
              ${activeTab === tab.key ? "bg-[#96f7b9] text-[#1e2c20]" : "bg-white dark:bg-[#191a1b] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2a2b2c] hover:border-[#96f7b9]"}`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            [1, 2, 3].map((i) => <div key={i} className="bg-white dark:bg-[#191a1b] rounded-[10px] h-48 animate-pulse" />)
          ) : playersWithStatus && playersWithStatus.length > 0 ? (
            playersWithStatus.map(({ player, latestRecord, activeInjuries }) => {
              const status = latestRecord ? statusConfig[latestRecord.status as keyof typeof statusConfig] : statusConfig.cleared;
              const StatusIcon = status.icon;
              return (
                <div key={player.id}
                  onClick={() => { setSelectedPlayerId(player.id); setActiveTab("metrics"); }}
                  className="bg-white dark:bg-[#191a1b] rounded-[10px] shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#96f7b9]/20 flex items-center justify-center text-[#96f7b9] text-sm font-bold">
                      {player.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{player.name}</h3>
                      <p className="text-xs text-gray-500">
                        {player.height ? `${Math.round(Number(player.height))} см` : ""}
                        {player.height && player.weight ? " · " : ""}
                        {player.weight ? `${player.weight} кг` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${status.bg} ${status.color}`}>
                      <StatusIcon size={12} />
                      {status.label}
                    </span>
                  </div>
                  {latestRecord?.examinationDate && (
                    <p className="text-xs text-gray-500 mt-3">
                      Последний осмотр: {new Date(latestRecord.examinationDate).toLocaleDateString("ru-RU")}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-full bg-white dark:bg-[#191a1b] rounded-[10px] p-12 text-center">
              <HeartPulse className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Нет данных</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "injuries" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Травмы</h3>
            {selectedPlayerId && (
              <button
                onClick={() => { setEditingInjuryId(null); setInjuryForm({ type: "", description: "", dateOccurred: new Date().toISOString().split("T")[0], recoveryDays: 7, status: "active" }); setInjuryDialogOpen(true); }}
                className="flex items-center gap-2 h-10 px-4 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md"
              >
                <Plus size={16} /> Добавить травму
              </button>
            )}
          </div>

          {!selectedPlayerId && (
            <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-8 text-center">
              <p className="text-gray-500">Выберите игрока в разделе "Медкарты"</p>
            </div>
          )}

          {selectedPlayerId && injuriesList && injuriesList.length > 0 ? (
            <div className="space-y-3">
              {injuriesList.map((injury) => {
                const status = injuryStatusConfig[injury.status as keyof typeof injuryStatusConfig];
                return (
                  <div key={injury.id} className="bg-white dark:bg-[#191a1b] rounded-[10px] shadow-sm p-5 group">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-semibold text-gray-900 dark:text-white">{injury.type}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] text-white ${status.color}`}>{status.label}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{injury.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {injury.dateOccurred ? new Date(injury.dateOccurred).toLocaleDateString("ru-RU") : "—"}</span>
                          {injury.recoveryDays && <span className="flex items-center gap-1"><Clock size={12} /> {injury.recoveryDays} дней восст.</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => {
                          setEditingInjuryId(injury.id);
                          setInjuryForm({
                            type: injury.type,
                            description: injury.description || "",
                            dateOccurred: injury.dateOccurred ? new Date(injury.dateOccurred).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                            recoveryDays: injury.recoveryDays || 7,
                            status: injury.status as "active" | "recovering" | "healed",
                          });
                          setInjuryDialogOpen(true);
                        }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md">
                          <Pencil size={14} className="text-gray-500" />
                        </button>
                        <button onClick={() => { if (confirm("Удалить травму?")) deleteInjuryMutation.mutate({ id: injury.id }); }}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md">
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : selectedPlayerId ? (
            <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-8 text-center">
              <p className="text-gray-500">Нет травм</p>
            </div>
          ) : null}
        </div>
      )}

      {activeTab === "metrics" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Показатели здоровья</h3>
            {selectedPlayerId && (
              <button onClick={() => setMetricDialogOpen(true)}
                className="flex items-center gap-2 h-10 px-4 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md"
              >
                <Plus size={16} /> Добавить показатели
              </button>
            )}
          </div>

          {!selectedPlayerId && (
            <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-8 text-center">
              <p className="text-gray-500">Выберите игрока в разделе "Медкарты"</p>
            </div>
          )}

          {selectedPlayerId && healthData && healthData.length > 0 && (
            <>
              {/* Calculated metrics */}
              {(() => {
                const latest = healthData[healthData.length - 1];
                const calc = calculateMetrics(latest);
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "BMI", value: calc.bmi, desc: "Индекс массы тела", color: Number(calc.bmi) > 25 || Number(calc.bmi) < 18.5 ? "text-amber-500" : "text-emerald-500" },
                      { label: "HRmax", value: `${calc.hrMax} уд/мин`, desc: "Tanaka формула", color: "text-blue-500" },
                      { label: "Целевой HR", value: calc.targetHrLow && calc.targetHrHigh ? `${calc.targetHrLow}-${calc.targetHrHigh}` : "—", desc: "Karvonen формула", color: "text-purple-500" },
                      { label: "VO2max", value: calc.vo2max ? `${calc.vo2max} мл/кг/мин` : "—", desc: "Cooper тест", color: "text-emerald-500" },
                    ].map((item) => (
                      <div key={item.label} className="bg-white dark:bg-[#191a1b] rounded-[10px] p-4 shadow-sm">
                        <p className="text-xs text-gray-500 uppercase">{item.label}</p>
                        <p className={`text-xl font-bold ${item.color} mt-1`}>{item.value ?? "—"}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Chart */}
              <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-5 shadow-sm mb-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Динамика показателей</h4>
                <div className="h-64">
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>

              {/* History table */}
              <div className="bg-white dark:bg-[#191a1b] rounded-[10px] shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-[#1e2021]">
                      <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Дата</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Вес</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Пульс</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Дистанция Купера</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase">Давление</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#2a2b2c]">
                    {healthData.slice().reverse().map((h) => (
                      <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] group">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{new Date(h.recordedAt).toLocaleDateString("ru-RU")}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{h.weight ? `${h.weight} кг` : "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{h.restingHr ? `${h.restingHr} уд/мин` : "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{h.cooperDistance ? `${h.cooperDistance} км` : "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {h.bloodPressureSys && h.bloodPressureDia ? `${h.bloodPressureSys}/${h.bloodPressureDia}` : "—"}
                        </td>
                        <td className="px-2 py-3">
                          <button onClick={() => { if (confirm("Удалить показатели?")) deleteMetricMutation.mutate({ id: h.id }); }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md">
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {selectedPlayerId && (!healthData || healthData.length === 0) && (
            <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-8 text-center">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Нет показателей. Добавьте первые измерения.</p>
            </div>
          )}
        </div>
      )}

      {/* Metric Dialog */}
      <Dialog open={metricDialogOpen} onOpenChange={setMetricDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#191a1b] border-gray-200 dark:border-[#2a2b2c] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Новые показатели</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!selectedPlayerId) return;
            createMetricMutation.mutate({
              playerId: selectedPlayerId,
              weight: metricForm.weight || undefined,
              restingHr: metricForm.restingHr ? Number(metricForm.restingHr) : undefined,
              cooperDistance: metricForm.cooperDistance || undefined,
              height: metricForm.height || undefined,
              bloodPressureSys: metricForm.bloodPressureSys ? Number(metricForm.bloodPressureSys) : undefined,
              bloodPressureDia: metricForm.bloodPressureDia ? Number(metricForm.bloodPressureDia) : undefined,
              recordedAt: metricForm.recordedAt,
            });
          }} className="space-y-4 mt-2"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Вес (кг)</label>
                <input type="text" value={metricForm.weight} onChange={(e) => setMetricForm({ ...metricForm, weight: e.target.value })}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]" placeholder="75.5" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Рост (см)</label>
                <input type="text" value={metricForm.height} onChange={(e) => setMetricForm({ ...metricForm, height: e.target.value })}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]" placeholder="180" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Пульс покоя</label>
                <input type="text" value={metricForm.restingHr} onChange={(e) => setMetricForm({ ...metricForm, restingHr: e.target.value })}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]" placeholder="60" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Дистанция Купера (км)</label>
                <input type="text" value={metricForm.cooperDistance} onChange={(e) => setMetricForm({ ...metricForm, cooperDistance: e.target.value })}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]" placeholder="2.4" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1.5">Дата измерения</label>
              <input type="date" value={metricForm.recordedAt} onChange={(e) => setMetricForm({ ...metricForm, recordedAt: e.target.value })}
                className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={createMetricMutation.isPending}
                className="flex-1 h-10 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md disabled:opacity-50">
                {createMetricMutation.isPending ? "Сохранение..." : "Сохранить"}
              </button>
              <button type="button" onClick={() => setMetricDialogOpen(false)}
                className="flex-1 h-10 bg-gray-100 dark:bg-[#2a2b2c] text-gray-600 dark:text-gray-300 text-sm rounded-md">Отмена</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Injury Dialog */}
      <Dialog open={injuryDialogOpen} onOpenChange={(open) => { if (!open) setEditingInjuryId(null); setInjuryDialogOpen(open); }}>
        <DialogContent className="bg-white dark:bg-[#191a1b] border-gray-200 dark:border-[#2a2b2c] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">{editingInjuryId ? "Редактировать травму" : "Новая травма"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!selectedPlayerId) return;
            if (editingInjuryId) {
              updateInjuryMutation.mutate({ id: editingInjuryId, ...injuryForm });
            } else {
              createInjuryMutation.mutate({ playerId: selectedPlayerId, ...injuryForm });
            }
          }} className="space-y-4 mt-2"
          >
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1.5">Тип травмы *</label>
              <input type="text" value={injuryForm.type} onChange={(e) => setInjuryForm({ ...injuryForm, type: e.target.value })}
                className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]" placeholder="Растяжение связок" required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1.5">Описание</label>
              <textarea value={injuryForm.description} onChange={(e) => setInjuryForm({ ...injuryForm, description: e.target.value })}
                className="w-full h-20 px-3 py-2 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9] resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Дата</label>
                <input type="date" value={injuryForm.dateOccurred} onChange={(e) => setInjuryForm({ ...injuryForm, dateOccurred: e.target.value })}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Срок восст. (дней)</label>
                <input type="number" value={injuryForm.recoveryDays} onChange={(e) => setInjuryForm({ ...injuryForm, recoveryDays: Number(e.target.value) })}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1.5">Статус</label>
              <select value={injuryForm.status} onChange={(e) => setInjuryForm({ ...injuryForm, status: e.target.value as "active" | "recovering" | "healed" })}
                className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
              >
                <option value="active">Активная</option>
                <option value="recovering">Восстановление</option>
                <option value="healed">Вылечена</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={createInjuryMutation.isPending || updateInjuryMutation.isPending}
                className="flex-1 h-10 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md disabled:opacity-50">
                {createInjuryMutation.isPending || updateInjuryMutation.isPending ? "Сохранение..." : "Сохранить"}
              </button>
              <button type="button" onClick={() => setInjuryDialogOpen(false)}
                className="flex-1 h-10 bg-gray-100 dark:bg-[#2a2b2c] text-gray-600 dark:text-gray-300 text-sm rounded-md">Отмена</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
