import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { trpc } from "@/providers/trpc";
import {
  AlertTriangle,
  Clock,
  Calendar,
  Plus,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const injuryStatusConfig = {
  active: { label: "Активная", color: "bg-red-500", text: "text-red-500", bg: "bg-red-500/10" },
  recovering: { label: "Восстановление", color: "bg-amber-500", text: "text-amber-500", bg: "bg-amber-500/10" },
  healed: { label: "Вылечена", color: "bg-emerald-500", text: "text-emerald-500", bg: "bg-emerald-500/10" },
};

const injuryTypes = [
  "Растяжение",
  "Вывих",
  "Перелом",
  "Ушиб",
  "Разрыв связок",
  "Мышечная травма",
  "Сотрясение",
  "Другое",
];

export default function Injuries() {
  const { user } = useCustomAuth();
  const utils = trpc.useUtils();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    playerId: 0,
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

  const { data: players } = trpc.player.list.useQuery(
    { teamId: selectedTeamId ?? 0 },
    { enabled: !!selectedTeamId }
  );

  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const { data: allInjuries, isLoading } = trpc.medical.listInjuries.useQuery(undefined);

  const createMutation = trpc.medical.createInjury.useMutation({
    onSuccess: () => {
      utils.medical.listInjuries.invalidate();
      utils.medical.listPlayersWithStatus.invalidate();
      setDialogOpen(false);
      toast.success("Травма добавлена");
    },
  });

  // Filter injuries for selected team's players
  const teamPlayerIds = new Set((players ?? []).map((p) => p.id));
  const filteredInjuries = (allInjuries ?? []).filter((i) => {
    const matchTeam = teamPlayerIds.has(i.playerId);
    const matchStatus = statusFilter ? i.status === statusFilter : true;
    return matchTeam && matchStatus;
  });

  // Get player name for injury
  const getPlayerName = (playerId: number) => {
    return players?.find((p) => p.id === playerId)?.name || `ID: ${playerId}`;
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Травмы</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Учет травм и восстановление</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedTeamId ?? ""}
            onChange={(e) => setSelectedTeamId(Number(e.target.value))}
            className="h-10 px-3 bg-white dark:bg-[#191a1b] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
          >
            {teams?.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 h-10 px-4 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md"
          >
            <Plus size={16} /> Добавить
          </button>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setStatusFilter("")}
          className={`h-9 px-3 rounded-md text-sm transition-colors ${!statusFilter ? "bg-[#96f7b9] text-[#1e2c20]" : "bg-white dark:bg-[#191a1b] border border-gray-200 dark:border-[#2a2b2c] text-gray-600 dark:text-gray-400"}`}
        >
          Все
        </button>
        {Object.entries(injuryStatusConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? "" : key)}
            className={`h-9 px-3 rounded-md text-sm transition-colors flex items-center gap-1.5
              ${statusFilter === key ? config.bg + " " + config.text : "bg-white dark:bg-[#191a1b] border border-gray-200 dark:border-[#2a2b2c] text-gray-600 dark:text-gray-400"}`}
          >
            <span className={`w-2 h-2 rounded-full ${config.color}`} />
            {config.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {Object.entries(injuryStatusConfig).map(([key, config]) => {
          const count = filteredInjuries.filter((i) => i.status === key).length;
          return (
            <div key={key} className="bg-white dark:bg-[#191a1b] rounded-[10px] p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${config.color}`} />
                <span className="text-sm text-gray-500">{config.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Injuries list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-[#191a1b] rounded-[10px] h-24 animate-pulse" />
          ))}
        </div>
      ) : filteredInjuries.length > 0 ? (
        <div className="space-y-3">
          {filteredInjuries.map((injury) => {
            const status = injuryStatusConfig[injury.status as keyof typeof injuryStatusConfig];
            return (
              <div key={injury.id} className="bg-white dark:bg-[#191a1b] rounded-[10px] shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {injury.type}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium text-white ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{injury.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {injury.dateOccurred ? new Date(injury.dateOccurred).toLocaleDateString("ru-RU") : "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {injury.recoveryDays ? `${injury.recoveryDays} дней` : "—"}
                      </span>
                      <span className="text-[#96f7b9]">{getPlayerName(injury.playerId)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Нет травм</h3>
          <p className="text-sm text-gray-500 mt-1">Отличные новости!</p>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#191a1b] border-gray-200 dark:border-[#2a2b2c] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Новая травма</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!formData.playerId || !formData.type.trim()) {
                toast.error("Заполните обязательные поля");
                return;
              }
              createMutation.mutate(formData);
            }}
            className="space-y-4 mt-2"
          >
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1.5">Игрок *</label>
              <select
                value={formData.playerId}
                onChange={(e) => setFormData({ ...formData, playerId: Number(e.target.value) })}
                className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
                required
              >
                <option value={0}>Выберите игрока</option>
                {players?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1.5">Тип травмы *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
                required
              >
                <option value="">Выберите тип</option>
                {injuryTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1.5">Описание</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full h-20 px-3 py-2 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Дата</label>
                <input
                  type="date"
                  value={formData.dateOccurred}
                  onChange={(e) => setFormData({ ...formData, dateOccurred: e.target.value })}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Срок восст.</label>
                <input
                  type="number"
                  value={formData.recoveryDays}
                  onChange={(e) => setFormData({ ...formData, recoveryDays: Number(e.target.value) })}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 h-10 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md disabled:opacity-50"
              >
                {createMutation.isPending ? "Сохранение..." : "Сохранить"}
              </button>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="flex-1 h-10 bg-gray-100 dark:bg-[#2a2b2c] text-gray-600 dark:text-gray-300 text-sm rounded-md"
              >
                Отмена
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
