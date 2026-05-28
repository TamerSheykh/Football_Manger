import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { trpc } from "@/providers/trpc";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ru } from "date-fns/locale";

const trainingTypes = [
  { value: "general", label: "Общая", color: "bg-blue-500" },
  { value: "tactical", label: "Тактическая", color: "bg-purple-500" },
  { value: "physical", label: "Физическая", color: "bg-red-500" },
  { value: "technical", label: "Техническая", color: "bg-emerald-500" },
];

export default function Training() {
  const { user } = useCustomAuth();
  const utils = trpc.useUtils();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
    const [dialogOpen, setDialogOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<number | null>(null);
  const [attendanceData, setAttendanceData] = useState<Record<number, { status: "present" | "absent" | "late"; notes: string }>>({});
  const [formData, setFormData] = useState({
    name: "",
    sessionDate: format(new Date(), "yyyy-MM-dd"),
    sessionTime: "18:00",
    location: "",
    type: "general" as "general" | "tactical" | "physical" | "technical",
    description: "",
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

  const { data: trainings } = trpc.training.list.useQuery(
    selectedTeamId ? { teamId: selectedTeamId } : undefined,
    { enabled: !!selectedTeamId }
  );

  const { data: attendancePlayers } = trpc.training.getPlayersForAttendance.useQuery(
    { trainingId: selectedTraining ?? 0, teamId: selectedTeamId ?? 0 },
    { enabled: !!selectedTraining && !!selectedTeamId }
  );

  const createMutation = trpc.training.create.useMutation({
    onSuccess: () => {
      utils.training.list.invalidate();
      setDialogOpen(false);
      toast.success("Тренировка создана");
    },
  });

  const saveAttendanceMutation = trpc.training.saveAttendance.useMutation({
    onSuccess: () => {
      utils.training.getPlayersForAttendance.invalidate();
      toast.success("Посещаемость сохранена");
      setAttendanceDialogOpen(false);
    },
  });

  const deleteMutation = trpc.training.delete.useMutation({
    onSuccess: () => {
      utils.training.list.invalidate();
      toast.success("Тренировка удалена");
    },
  });

  // Calendar logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { locale: ru });
  const calendarEnd = endOfWeek(monthEnd, { locale: ru });

  const calendarDays: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const getTrainingsForDate = (date: Date) => {
    return (trainings ?? []).filter((t) => {
      const tDate = new Date(t.sessionDate);
      return isSameDay(tDate, date);
    });
  };

  const openAttendance = (trainingId: number) => {
    setSelectedTraining(trainingId);
    setAttendanceDialogOpen(true);
  };

  useEffect(() => {
    if (attendancePlayers) {
      const data: Record<number, { status: "present" | "absent" | "late"; notes: string }> = {};
      attendancePlayers.forEach((ap) => {
        data[ap.player.id] = { status: ap.status, notes: ap.notes };
      });
      setAttendanceData(data);
    }
  }, [attendancePlayers]);

  const handleSaveAttendance = () => {
    if (!selectedTraining) return;
    const records = Object.entries(attendanceData).map(([playerId, data]) => ({
      trainingId: selectedTraining,
      playerId: Number(playerId),
      status: data.status,
      notes: data.notes,
    }));
    saveAttendanceMutation.mutate(records);
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Тренировки</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Расписание и посещаемость</p>
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
            className="flex items-center gap-2 h-10 px-4 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md transition-colors"
          >
            <Plus size={16} />
            Создать
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-[#191a1b] rounded-[10px] shadow-sm p-6">
        {/* Calendar header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
            {format(currentMonth, "LLLL yyyy", { locale: ru })}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors"
            >
              <ChevronLeft size={18} className="text-gray-500" />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="h-10 px-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors"
            >
              Сегодня
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors"
            >
              <ChevronRight size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-px mb-2">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 uppercase py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-px">
          {calendarDays.map((date, i) => {
            const dayTrainings = getTrainingsForDate(date);
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isToday = isSameDay(date, new Date());
            return (
              <div
                key={i}
                                className={`min-h-[100px] p-2 border border-gray-100 dark:border-[#2a2b2c]/50 cursor-pointer transition-colors
                  ${!isCurrentMonth ? "bg-gray-50/50 dark:bg-white/[0.02] text-gray-300 dark:text-gray-600" : "bg-white dark:bg-[#191a1b]"}
                  ${isToday ? "ring-1 ring-[#96f7b9] ring-inset" : ""}
                  hover:bg-gray-50 dark:hover:bg-white/[0.03]`}
              >
                <span className={`text-sm font-medium ${isToday ? "text-[#96f7b9]" : "text-gray-900 dark:text-white"}`}>
                  {format(date, "d")}
                </span>
                <div className="mt-1 space-y-1">
                  {dayTrainings.slice(0, 2).map((t) => {
                    const type = trainingTypes.find((tt) => tt.value === t.type);
                    return (
                      <div key={t.id} className="flex items-center gap-0.5 group/item">
                        <button
                          onClick={(e) => { e.stopPropagation(); openAttendance(t.id); }}
                          className={`flex-1 text-left px-1.5 py-0.5 rounded text-[10px] text-white ${type?.color || "bg-gray-500"} truncate`}
                        >
                          {t.sessionTime?.slice(0, 5)} {t.name}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (confirm("Удалить тренировку?")) deleteMutation.mutate({ id: t.id }); }}
                          className="opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-white/20 rounded shrink-0"
                        >
                          <Trash2 size={10} className="text-white/70" />
                        </button>
                      </div>
                    );
                  })}
                  {dayTrainings.length > 2 && (
                    <p className="text-[10px] text-gray-500 pl-1.5">+{dayTrainings.length - 2} еще</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Training Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#191a1b] border-gray-200 dark:border-[#2a2b2c] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Новая тренировка</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedTeamId) return;
              createMutation.mutate({ ...formData, teamId: selectedTeamId });
            }}
            className="space-y-4 mt-2"
          >
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1.5">Название *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Дата *</label>
                <input
                  type="date"
                  value={formData.sessionDate}
                  onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Время</label>
                <input
                  type="time"
                  value={formData.sessionTime}
                  onChange={(e) => setFormData({ ...formData, sessionTime: e.target.value })}
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1.5">Место</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
                placeholder="Стадион Центральный"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1.5">Тип</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as "general" | "tactical" | "physical" | "technical" })}
                className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9]"
              >
                {trainingTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
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
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 h-10 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md disabled:opacity-50"
              >
                {createMutation.isPending ? "Создание..." : "Создать"}
              </button>
              <button type="button" onClick={() => setDialogOpen(false)} className="flex-1 h-10 bg-gray-100 dark:bg-[#2a2b2c] text-gray-600 dark:text-gray-300 text-sm rounded-md">
                Отмена
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#191a1b] border-gray-200 dark:border-[#2a2b2c] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Посещаемость</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {attendancePlayers && attendancePlayers.length > 0 ? (
              <>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {attendancePlayers.map(({ player }) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/[0.03] rounded-lg"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#96f7b9]/20 flex items-center justify-center text-[#96f7b9] text-xs font-bold flex-shrink-0">
                        {player.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white truncate">{player.name}</p>
                      </div>
                      <div className="flex gap-2">
                        {(["present", "absent", "late"] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() =>
                              setAttendanceData((prev) => ({
                                ...prev,
                                [player.id]: { ...(prev[player.id] || { notes: "" }), status },
                              }))
                            }
                            className={`h-8 px-3 rounded-md text-xs font-medium transition-colors
                              ${attendanceData[player.id]?.status === status
                                ? status === "present"
                                  ? "bg-emerald-500 text-white"
                                  : status === "absent"
                                  ? "bg-red-500 text-white"
                                  : "bg-amber-500 text-white"
                                : "bg-gray-200 dark:bg-[#2a2b2c] text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-[#333]"
                              }`}
                          >
                            {status === "present" ? "Присутствовал" : status === "absent" ? "Отсутствовал" : "Опоздал"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSaveAttendance}
                  disabled={saveAttendanceMutation.isPending}
                  className="w-full h-10 mt-4 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md disabled:opacity-50"
                >
                  {saveAttendanceMutation.isPending ? "Сохранение..." : "Сохранить посещаемость"}
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">Нет игроков в команде</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
