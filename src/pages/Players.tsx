import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import Layout from "@/components/layout/Layout";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { trpc } from "@/providers/trpc";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const positions = [
  { value: "GK", label: "ВР", color: "bg-amber-500" },
  { value: "DEF", label: "ЗЩ", color: "bg-blue-500" },
  { value: "MID", label: "ПЗ", color: "bg-emerald-500" },
  { value: "FWD", label: "НП", color: "bg-red-500" },
];

export default function Players() {
  const { user } = useCustomAuth();
  const [searchParams] = useSearchParams();
  const urlTeamId = searchParams.get("teamId");

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(
    urlTeamId ? Number(urlTeamId) : null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    position: "FWD" as "GK" | "DEF" | "MID" | "FWD",
    birthDate: "",
    height: "",
    weight: "",
    phone: "",
    email: "",
    jerseyNumber: undefined as number | undefined,
  });

  const utils = trpc.useUtils();

  const { data: teams } = trpc.team.list.useQuery(
    user?.id ? { userId: user.id } : undefined,
    { enabled: !!user }
  );

  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const { data: players, isLoading } = trpc.player.list.useQuery(
    selectedTeamId ? { teamId: selectedTeamId } : undefined,
    { enabled: !!selectedTeamId }
  );

  const createMutation = trpc.player.create.useMutation({
    onSuccess: () => {
      utils.player.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast.success("Игрок добавлен");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.player.update.useMutation({
    onSuccess: () => {
      utils.player.list.invalidate();
      setDialogOpen(false);
      setEditingPlayer(null);
      resetForm();
      toast.success("Игрок обновлен");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.player.delete.useMutation({
    onSuccess: () => {
      utils.player.list.invalidate();
      toast.success("Игрок удален");
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setFormData({
      name: "", position: "FWD", birthDate: "", height: "", weight: "",
      phone: "", email: "", jerseyNumber: undefined,
    });
  };

  const openEdit = (player: NonNullable<typeof players>[0]) => {
    setEditingPlayer(player.id);
    setFormData({
      name: player.name,
      position: player.position as "GK" | "DEF" | "MID" | "FWD",
      birthDate: player.birthDate ? new Date(player.birthDate).toISOString().split("T")[0] : "",
      height: player.height ? String(player.height) : "",
      weight: player.weight ? String(player.weight) : "",
      phone: player.phone || "",
      email: player.email || "",
      jerseyNumber: player.jerseyNumber ?? undefined,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !selectedTeamId) {
      toast.error("Заполните обязательные поля");
      return;
    }
    const data = { ...formData, teamId: selectedTeamId };
    if (editingPlayer) {
      updateMutation.mutate({ id: editingPlayer, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredPlayers = (players ?? []).filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPosition = positionFilter ? p.position === positionFilter : true;
    return matchSearch && matchPosition;
  });

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Игроки</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Управление составом команды
          </p>
        </div>
        <div className="flex gap-3">
          {/* Team selector */}
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
            onClick={() => { setEditingPlayer(null); resetForm(); setDialogOpen(true); }}
            className="flex items-center gap-2 h-10 px-4 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md transition-colors"
          >
            <Plus size={16} />
            Добавить игрока
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по ФИО..."
            className="w-full h-10 pl-9 pr-3 bg-white dark:bg-[#191a1b] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
          />
        </div>
        <div className="flex gap-2">
          {positions.map((pos) => (
            <button
              key={pos.value}
              onClick={() => setPositionFilter(positionFilter === pos.value ? "" : pos.value)}
              className={`h-10 px-3 rounded-md text-sm font-medium transition-colors
                ${positionFilter === pos.value
                  ? "bg-[#96f7b9] text-[#1e2c20]"
                  : "bg-white dark:bg-[#191a1b] border border-gray-200 dark:border-[#2a2b2c] text-gray-600 dark:text-gray-400 hover:border-[#96f7b9]"}`}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </div>

      {/* Players grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-[#191a1b] rounded-[10px] h-48 animate-pulse" />
          ))}
        </div>
      ) : filteredPlayers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlayers.map((player) => {
            const pos = positions.find((p) => p.value === player.position);
            const bmi = player.weight && player.height
              ? (Number(player.weight) / (Number(player.height) / 100) ** 2).toFixed(1)
              : null;
            return (
              <div
                key={player.id}
                className="bg-white dark:bg-[#191a1b] rounded-[10px] shadow-sm hover:shadow-md transition-all group"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-full ${pos?.color || "bg-gray-500"} flex items-center justify-center text-white font-bold text-sm`}>
                        {player.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                          {player.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded text-white ${pos?.color || "bg-gray-500"}`}>
                            {pos?.label}
                          </span>
                          {player.jerseyNumber && (
                            <span className="text-xs text-gray-500">#{player.jerseyNumber}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(player)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md"
                      >
                        <Pencil size={14} className="text-gray-500" />
                      </button>
                      <button
                        onClick={() => { if (confirm("Удалить игрока?")) deleteMutation.mutate({ id: player.id }); }}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">Рост</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {player.height ? `${Math.round(Number(player.height))} см` : "—"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">Вес</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {player.weight ? `${player.weight} кг` : "—"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">BMI</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {bmi ?? "—"}
                      </p>
                    </div>
                  </div>

                  {player.birthDate && (
                    <p className="text-xs text-gray-500 mt-3">
                      Дата рождения: {new Date(player.birthDate).toLocaleDateString("ru-RU")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Нет игроков</h3>
          <p className="text-sm text-gray-500 mt-1">Добавьте первого игрока в команду</p>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#191a1b] border-gray-200 dark:border-[#2a2b2c] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {editingPlayer ? "Редактировать игрока" : "Новый игрок"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">ФИО *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
                placeholder="Иванов Иван Иванович"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Позиция</label>
              <select
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value as "GK" | "DEF" | "MID" | "FWD" })}
                className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
              >
                {positions.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Дата рождения</label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Номер</label>
                <input
                  type="number"
                  value={formData.jerseyNumber ?? ""}
                  onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
                  placeholder="10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Рост (см)</label>
                <input
                  type="text"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
                  placeholder="180"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Вес (кг)</label>
                <input
                  type="text"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
                  placeholder="75"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Телефон</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
                  placeholder="+7..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
                  placeholder="email@..."
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 h-10 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Сохранение..."
                  : editingPlayer ? "Сохранить" : "Добавить"}
              </button>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="flex-1 h-10 bg-gray-100 dark:bg-[#2a2b2c] text-gray-600 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-200 dark:hover:bg-[#333] transition-colors"
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
