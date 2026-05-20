import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { trpc } from "@/providers/trpc";
import { useNavigate } from "react-router";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Shield,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const categories = [
  { value: "main", label: "Основная" },
  { value: "youth", label: "Молодежная" },
  { value: "children", label: "Детская" },
];

export default function Teams() {
  const navigate = useNavigate();
  const { user } = useCustomAuth();
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "main",
    ageGroup: "",
    color: "#96f7b9",
    description: "",
  });

  const { data: teams, isLoading } = trpc.team.list.useQuery(
    user?.id ? { userId: user.id } : undefined,
    { enabled: !!user }
  );

  const createMutation = trpc.team.create.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast.success("Команда создана");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.team.update.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate();
      setDialogOpen(false);
      setEditingTeam(null);
      resetForm();
      toast.success("Команда обновлена");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.team.delete.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate();
      toast.success("Команда удалена");
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setFormData({ name: "", category: "main", ageGroup: "", color: "#96f7b9", description: "" });
  };

  const openEdit = (team: NonNullable<typeof teams>[0]) => {
    setEditingTeam(team.id);
    setFormData({
      name: team.name,
      category: team.category,
      ageGroup: team.ageGroup || "",
      color: team.color || "#96f7b9",
      description: team.description || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Введите название команды");
      return;
    }
    if (!user) return;

    if (editingTeam) {
      updateMutation.mutate({ id: editingTeam, ...formData });
    } else {
      createMutation.mutate({
        name: formData.name,
        category: formData.category,
        ageGroup: formData.ageGroup,
        color: formData.color,
        description: formData.description,
        userId: user.id,
      });
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Команды</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Управление составами команд
          </p>
        </div>
        <button
          onClick={() => { setEditingTeam(null); resetForm(); setDialogOpen(true); }}
          className="flex items-center gap-2 h-10 px-4 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md transition-colors"
        >
          <Plus size={16} />
          Добавить команду
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-[#191a1b] rounded-[10px] h-40 animate-pulse" />
          ))}
        </div>
      ) : teams && teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-white dark:bg-[#191a1b] rounded-[10px] shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => navigate(`/players?teamId=${team.id}`)}
            >
              {/* Color bar */}
              <div className="h-1 rounded-t-[10px]" style={{ backgroundColor: team.color || "#96f7b9" }} />
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {team.name}
                    </h3>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                      {categories.find((c) => c.value === team.category)?.label || team.category}
                      {team.ageGroup ? ` · ${team.ageGroup}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(team); }}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors"
                    >
                      <Pencil size={14} className="text-gray-500" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Удалить команду?")) deleteMutation.mutate({ id: team.id });
                      }}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
                  <Users size={14} />
                  <span>
                    {/* Player count would come from a join query */}
                    Нажмите для просмотра игроков
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-12 text-center">
          <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Нет команд
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Создайте первую команду, чтобы начать работу
          </p>
          <button
            onClick={() => { setEditingTeam(null); resetForm(); setDialogOpen(true); }}
            className="inline-flex items-center gap-2 h-10 px-4 bg-[#96f7b9] text-[#1e2c20] text-sm font-medium rounded-md hover:bg-[#86d9a3] transition-colors"
          >
            <Plus size={16} />
            Создать команду
          </button>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#191a1b] border-gray-200 dark:border-[#2a2b2c] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {editingTeam ? "Редактировать команду" : "Новая команда"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Название *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
                placeholder="ФК Локомотив"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Категория</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Возрастная группа</label>
              <input
                type="text"
                value={formData.ageGroup}
                onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
                placeholder="2010"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Цвет</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-10 h-10 rounded-md cursor-pointer"
                />
                <span className="text-sm text-gray-500">{formData.color}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">Описание</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full h-20 px-3 py-2 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9] resize-none"
                placeholder="Описание команды..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 h-10 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Сохранение..."
                  : editingTeam
                  ? "Сохранить"
                  : "Создать"}
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
