import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { trpc } from "@/providers/trpc";
import {
  Plus,
  Trophy,
  Calendar,
  Pencil,
  Trash2,
  Swords,
  Goal,
  Crosshair,
  Square,
  Minimize2,
  Clock,
  LayoutGrid,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import TacticsBoard from "@/components/TacticsBoard";

const matchStatusColors: Record<string, string> = {
  scheduled: "bg-blue-500",
  played: "bg-gray-500",
  cancelled: "bg-red-500",
};

const matchStatusLabels: Record<string, string> = {
  scheduled: "Запланирован",
  played: "Сыгран",
  cancelled: "Отменен",
};

const resultColors: Record<string, string> = {
  win: "text-emerald-500",
  draw: "text-amber-500",
  loss: "text-red-500",
};

export default function Matches() {
  const { user } = useCustomAuth();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<"calendar" | "tactics">("calendar");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    opponent: "",
    matchDate: "",
    scoreHome: 0,
    scoreAway: 0,
    isHome: true,
    location: "",
    notes: "",
    status: "scheduled" as "scheduled" | "played" | "cancelled",
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

  const { data: matchesList, isLoading } = trpc.match.list.useQuery(
    selectedTeamId ? { teamId: selectedTeamId } : undefined,
    { enabled: !!selectedTeamId }
  );

  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [statsMatchId, setStatsMatchId] = useState<number | null>(null);
  const [playerStats, setPlayerStats] = useState<Record<number, { goals: number; assists: number; yellowCards: number; redCards: boolean; minutesPlayed: string }>>({});

  const { data: teamPlayers } = trpc.player.list.useQuery(
    selectedTeamId ? { teamId: selectedTeamId } : undefined,
    { enabled: !!selectedTeamId }
  );

  const { data: existingStats } = trpc.match.getPlayerStats.useQuery(
    statsMatchId ? { matchId: statsMatchId } : undefined,
    { enabled: !!statsMatchId }
  );

  const statsMutation = trpc.match.savePlayerStats.useMutation({
    onSuccess: () => { toast.success("Статистика сохранена"); setStatsDialogOpen(false); },
  });

  const openStats = (matchId: number) => {
    setStatsMatchId(matchId);
    setStatsDialogOpen(true);
  };

  const currentMatch = matchesList?.find((m) => m.id === statsMatchId);
  const ourGoals = currentMatch
    ? (currentMatch.isHome ? (currentMatch.scoreHome ?? 0) : (currentMatch.scoreAway ?? 0))
    : 0;
  const maxGoals = ourGoals || 999;

  useEffect(() => {
    if (existingStats && statsMatchId) {
      const stats: Record<number, { goals: number; assists: number; yellowCards: number; redCards: boolean; minutesPlayed: string }> = {};
      for (const s of existingStats) {
        stats[s.playerId] = {
          goals: s.goals ?? 0,
          assists: s.assists ?? 0,
          yellowCards: s.yellowCards ?? 0,
          redCards: (s.redCards ?? 0) > 0,
          minutesPlayed: String(s.minutesPlayed ?? ""),
        };
      }
      setPlayerStats(stats);
    } else if (statsMatchId) {
      setPlayerStats({});
    }
  }, [existingStats, statsMatchId]);

  const incPlayerGoals = (playerId: number) => {
    setPlayerStats((prev) => {
      const total = Object.values(prev).reduce((s, p) => s + (p?.goals ?? 0), 0);
      if (total >= maxGoals) return prev;
      return { ...prev, [playerId]: { ...(prev[playerId] ?? { goals: 0, assists: 0, yellowCards: 0, redCards: false, minutesPlayed: "" }), goals: (prev[playerId]?.goals ?? 0) + 1 } };
    });
  };

  const decPlayerGoals = (playerId: number) => {
    setPlayerStats((prev) => {
      const current = prev[playerId]?.goals ?? 0;
      if (current <= 0) return prev;
      return { ...prev, [playerId]: { ...prev[playerId], goals: current - 1 } };
    });
  };

  const incPlayerYC = (playerId: number) => {
    setPlayerStats((prev) => {
      const current = prev[playerId]?.yellowCards ?? 0;
      if (current >= 2) return prev;
      return { ...prev, [playerId]: { ...prev[playerId], yellowCards: current + 1 } };
    });
  };

  const decPlayerYC = (playerId: number) => {
    setPlayerStats((prev) => {
      const current = prev[playerId]?.yellowCards ?? 0;
      if (current <= 0) return prev;
      return { ...prev, [playerId]: { ...prev[playerId], yellowCards: current - 1 } };
    });
  };

  const incPlayerAssists = (playerId: number) => {
    setPlayerStats((prev) => {
      const total = Object.values(prev).reduce((s, p) => s + (p?.assists ?? 0), 0);
      if (total >= maxGoals) return prev;
      const playerGoals = prev[playerId]?.goals ?? 0;
      const playerMaxAssists = maxGoals - playerGoals;
      if ((prev[playerId]?.assists ?? 0) >= playerMaxAssists) return prev;
      return { ...prev, [playerId]: { ...(prev[playerId] ?? { goals: 0, assists: 0, yellowCards: 0, redCards: false, minutesPlayed: "" }), assists: (prev[playerId]?.assists ?? 0) + 1 } };
    });
  };

  const decPlayerAssists = (playerId: number) => {
    setPlayerStats((prev) => {
      const current = prev[playerId]?.assists ?? 0;
      if (current <= 0) return prev;
      return { ...prev, [playerId]: { ...prev[playerId], assists: current - 1 } };
    });
  };

  const togglePlayerRC = (playerId: number) => {
    setPlayerStats((prev) => ({
      ...prev,
      [playerId]: { ...(prev[playerId] ?? { goals: 0, assists: 0, yellowCards: 0, redCards: false, minutesPlayed: "" }), redCards: !(prev[playerId]?.redCards ?? false) },
    }));
  };

  const setPlayerMinutes = (playerId: number, minutes: string) => {
    setPlayerStats((prev) => ({
      ...prev,
      [playerId]: { ...(prev[playerId] ?? { goals: 0, assists: 0, yellowCards: 0, redCards: false, minutesPlayed: "" }), minutesPlayed: minutes },
    }));
  };

  const handleSaveStats = () => {
    if (!statsMatchId || !teamPlayers) return;
    const data = teamPlayers.map((p) => {
      const s = playerStats[p.id] ?? { goals: 0, assists: 0, yellowCards: 0, redCards: false, minutesPlayed: "" };
      return {
        matchId: statsMatchId,
        playerId: p.id,
        goals: s.goals,
        assists: s.assists,
        yellowCards: s.yellowCards,
        redCards: s.redCards ? 1 : 0,
        minutesPlayed: Number(s.minutesPlayed) || 0,
      };
    });
    statsMutation.mutate(data);
  };

  const createMutation = trpc.match.create.useMutation({
    onSuccess: () => { utils.match.list.invalidate(); setDialogOpen(false); toast.success("Матч добавлен"); },
  });

  const updateMutation = trpc.match.update.useMutation({
    onSuccess: () => { utils.match.list.invalidate(); setDialogOpen(false); setEditingMatch(null); toast.success("Матч обновлен"); },
  });

  const deleteMutation = trpc.match.delete.useMutation({
    onSuccess: () => { utils.match.list.invalidate(); toast.success("Матч удален"); },
  });

  const openEdit = (match: NonNullable<typeof matchesList>[0]) => {
    setEditingMatch(match.id);
    setFormData({
      opponent: match.opponent,
      matchDate: match.matchDate ? new Date(match.matchDate).toISOString().split("T")[0] : "",
      scoreHome: match.scoreHome || 0,
      scoreAway: match.scoreAway || 0,
      isHome: match.isHome ?? true,
      location: match.location || "",
      notes: match.notes || "",
      status: match.status as "scheduled" | "played" | "cancelled",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !formData.opponent.trim()) { toast.error("Заполните обязательные поля"); return; }
    if (editingMatch) {
      updateMutation.mutate({ id: editingMatch, ...formData });
    } else {
      createMutation.mutate({ ...formData, teamId: selectedTeamId });
    }
  };

  const getResult = (match: NonNullable<typeof matchesList>[0]) => {
    if (!match.isHome) {
      if ((match.scoreAway || 0) > (match.scoreHome || 0)) return "win";
      if ((match.scoreAway || 0) < (match.scoreHome || 0)) return "loss";
      return "draw";
    }
    if ((match.scoreHome || 0) > (match.scoreAway || 0)) return "win";
    if ((match.scoreHome || 0) < (match.scoreAway || 0)) return "loss";
    return "draw";
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Матчи</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Календарь матчей и статистика</p>
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
          <button onClick={() => { setEditingMatch(null); setFormData({ opponent: "", matchDate: "", scoreHome: 0, scoreAway: 0, isHome: true, location: "", notes: "", status: "scheduled" }); setDialogOpen(true); }}
            className="flex items-center gap-2 h-10 px-4 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md transition-colors"
          >
            <Plus size={16} /> Добавить
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex items-center gap-2 h-10 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "calendar" ? "bg-[#96f7b9] text-[#1e2c20]" : "bg-white dark:bg-[#191a1b] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2a2b2c] hover:border-[#96f7b9]"
          }`}
        >
          <Trophy size={16} />
          Календарь
        </button>
        <button
          onClick={() => setActiveTab("tactics")}
          className={`flex items-center gap-2 h-10 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "tactics" ? "bg-[#96f7b9] text-[#1e2c20]" : "bg-white dark:bg-[#191a1b] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2a2b2c] hover:border-[#96f7b9]"
          }`}
        >
          <LayoutGrid size={16} />
          Тактика
        </button>
      </div>

      {activeTab === "tactics" && selectedTeamId ? (
        <TacticsBoard teamId={selectedTeamId} />
      ) : activeTab === "calendar" && isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-[#191a1b] rounded-[10px] h-20 animate-pulse" />
          ))}
        </div>
      ) : activeTab === "calendar" && matchesList && matchesList.length > 0 ? (
        <div className="space-y-3">
          {matchesList.map((match) => {
            const result = getResult(match);
            const teamName = teams?.find((t) => t.id === match.teamId)?.name || "Команда";
            return (
              <div key={match.id} className="bg-white dark:bg-[#191a1b] rounded-[10px] shadow-sm p-5 group">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Date */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 min-w-[120px]">
                    <Calendar size={14} />
                    {match.matchDate ? new Date(match.matchDate).toLocaleDateString("ru-RU") : "—"}
                  </div>

                  {/* Teams */}
                  <div className="flex-1 flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{match.isHome ? teamName : match.opponent}</span>
                    <span className={`text-lg font-bold ${resultColors[result]}`}>
                      {match.status === "played" ? `${match.scoreHome} : ${match.scoreAway}` : "vs"}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{match.isHome ? match.opponent : teamName}</span>
                    {match.isHome && <span className="text-[10px] bg-[#96f7b9]/10 text-[#96f7b9] px-2 py-0.5 rounded">Дома</span>}
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-[10px] text-white ${matchStatusColors[match.status]}`}>
                      {matchStatusLabels[match.status]}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {match.status === "played" && (
                        <button onClick={() => openStats(match.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md"
                          title="Статистика игроков">
                          <Swords size={14} className="text-gray-500" />
                        </button>
                      )}
                      <button onClick={() => openEdit(match)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md">
                        <Pencil size={14} className="text-gray-500" />
                      </button>
                      <button onClick={() => { if (confirm("Удалить матч?")) deleteMutation.mutate({ id: match.id }); }}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : activeTab === "calendar" ? (
        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-12 text-center">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Нет матчей</h3>
          <p className="text-sm text-gray-500 mt-1">Добавьте первый матч</p>
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#191a1b] border-gray-200 dark:border-[#2a2b2c] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">{editingMatch ? "Редактировать матч" : "Новый матч"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1.5">Соперник *</label>
              <input type="text" value={formData.opponent} onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
                className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Дата *</label>
                <input type="date" value={formData.matchDate} onChange={(e) => setFormData({ ...formData, matchDate: e.target.value })}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]" required />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Статус</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as "scheduled" | "played" | "cancelled" })}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
                >
                  <option value="scheduled">Запланирован</option>
                  <option value="played">Сыгран</option>
                  <option value="cancelled">Отменен</option>
                </select>
              </div>
            </div>
            {formData.status === "played" && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 uppercase mb-1.5">Голы (дома)</label>
                  <input type="number" value={formData.scoreHome} onChange={(e) => setFormData({ ...formData, scoreHome: Number(e.target.value) })}
                    className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase mb-1.5">Голы (гости)</label>
                  <input type="number" value={formData.scoreAway} onChange={(e) => setFormData({ ...formData, scoreAway: Number(e.target.value) })}
                    className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 h-10">
                    <input type="checkbox" checked={formData.isHome} onChange={(e) => setFormData({ ...formData, isHome: e.target.checked })}
                      className="w-4 h-4 rounded accent-[#96f7b9]" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Дома</span>
                  </label>
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1.5">Место</label>
              <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
                placeholder="Стадион" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1.5">Заметки</label>
              <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full h-20 px-3 py-2 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9] resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 h-10 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md disabled:opacity-50">
                {createMutation.isPending || updateMutation.isPending ? "Сохранение..." : editingMatch ? "Сохранить" : "Добавить"}
              </button>
              <button type="button" onClick={() => setDialogOpen(false)}
                className="flex-1 h-10 bg-gray-100 dark:bg-[#2a2b2c] text-gray-600 dark:text-gray-300 text-sm rounded-md">Отмена</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Player Stats Dialog */}
      <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
        <DialogContent style={{ maxWidth: "65vw" }} className="bg-white dark:bg-[#191a1b] border-gray-200 dark:border-[#2a2b2c] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Статистика игроков</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-2">
            {teamPlayers && teamPlayers.length > 0 ? (
              teamPlayers.map((player) => {
                const stats = playerStats[player.id] ?? { goals: false, assists: false, yellowCards: false, redCards: false, minutesPlayed: "" };
                return (
                  <div key={player.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c]">
                    <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[140px] truncate">{player.name}</span>
                    <span className="text-[10px] text-gray-500 uppercase min-w-[32px]">{player.position}</span>
                    <div className="flex-1 flex items-center gap-4">
                      {/* Goals counter */}
                      <div className="flex items-center gap-1">
                        <Goal size={14} className="text-emerald-500" />
                        <button type="button" onClick={() => decPlayerGoals(player.id)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 dark:bg-[#2a2b2c] text-gray-600 dark:text-gray-300 text-xs hover:bg-gray-300 dark:hover:bg-[#3a3b3c] disabled:opacity-30"
                          disabled={stats.goals <= 0}>–</button>
                        <span className="text-xs font-mono text-gray-900 dark:text-white min-w-[12px] text-center">{stats.goals}</span>
                        <button type="button" onClick={() => incPlayerGoals(player.id)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 dark:bg-[#2a2b2c] text-gray-600 dark:text-gray-300 text-xs hover:bg-gray-300 dark:hover:bg-[#3a3b3c]">+</button>
                        <span className="text-[10px] text-gray-400">Гол</span>
                        {ourGoals > 0 && (
                          <span className="text-[10px] text-gray-500 ml-1">
                            {Object.values(playerStats).reduce((s, p) => s + (p?.goals ?? 0), 0)}/{ourGoals}
                          </span>
                        )}
                      </div>
                      {/* Assists counter */}
                      <div className="flex items-center gap-1">
                        <Crosshair size={14} className="text-blue-500" />
                        <button type="button" onClick={() => decPlayerAssists(player.id)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 dark:bg-[#2a2b2c] text-gray-600 dark:text-gray-300 text-xs hover:bg-gray-300 dark:hover:bg-[#3a3b3c] disabled:opacity-30"
                          disabled={stats.assists <= 0}>–</button>
                        <span className="text-xs font-mono text-gray-900 dark:text-white min-w-[12px] text-center">{stats.assists}</span>
                        <button type="button" onClick={() => incPlayerAssists(player.id)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 dark:bg-[#2a2b2c] text-gray-600 dark:text-gray-300 text-xs hover:bg-gray-300 dark:hover:bg-[#3a3b3c] disabled:opacity-30"
                          disabled={stats.assists >= maxGoals - stats.goals}>+</button>
                        <span className="text-[10px] text-gray-400">Пас</span>
                        {ourGoals > 0 ? (
                          <span className="text-[10px] text-gray-500 ml-1">
                            {Object.values(playerStats).reduce((s, p) => s + (p?.assists ?? 0), 0)}/{ourGoals}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-600 ml-1">без лимита</span>
                        )}
                      </div>
                      {/* Yellow cards counter (max 2) */}
                      <div className="flex items-center gap-1">
                        <Square size={14} className="text-yellow-500" />
                        <button type="button" onClick={() => decPlayerYC(player.id)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 dark:bg-[#2a2b2c] text-gray-600 dark:text-gray-300 text-xs hover:bg-gray-300 dark:hover:bg-[#3a3b3c] disabled:opacity-30"
                          disabled={stats.yellowCards <= 0}>–</button>
                        <span className="text-xs font-mono text-gray-900 dark:text-white min-w-[12px] text-center">{stats.yellowCards}</span>
                        <button type="button" onClick={() => incPlayerYC(player.id)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-gray-200 dark:bg-[#2a2b2c] text-gray-600 dark:text-gray-300 text-xs hover:bg-gray-300 dark:hover:bg-[#3a3b3c] disabled:opacity-30"
                          disabled={stats.yellowCards >= 2}>+</button>
                        <span className="text-[10px] text-gray-400">ЖК</span>
                      </div>
                      {/* Red card checkbox */}
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={stats.redCards} onChange={() => togglePlayerRC(player.id)}
                          className="w-4 h-4 rounded accent-[#ef4444]" />
                        <Minimize2 size={14} className="text-red-500" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">КК</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-gray-400" />
                        <input type="number" min="0" max="120" value={stats.minutesPlayed} onChange={(e) => setPlayerMinutes(player.id, e.target.value)}
                          className="w-16 h-7 px-2 bg-white dark:bg-[#191a1b] border border-gray-200 dark:border-[#2a2b2c] rounded text-xs text-gray-900 dark:text-white text-center"
                          placeholder="мин" />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Нет игроков в команде</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSaveStats} disabled={statsMutation.isPending}
              className="flex-1 h-10 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md disabled:opacity-50">
              {statsMutation.isPending ? "Сохранение..." : "Сохранить статистику"}
            </button>
            <button type="button" onClick={() => setStatsDialogOpen(false)}
              className="flex-1 h-10 bg-gray-100 dark:bg-[#2a2b2c] text-gray-600 dark:text-gray-300 text-sm rounded-md">Отмена</button>
          </div>
        </DialogContent>
      </Dialog>

    </Layout>
  );
}
