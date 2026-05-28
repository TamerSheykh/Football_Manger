import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { useTheme } from "@/hooks/useTheme";
import { trpc } from "@/providers/trpc";
import {
  User,
  Shield,
  Moon,
  Sun,
  Copy,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useCustomAuth();
  const { theme, toggleTheme } = useTheme();
  const utils = trpc.useUtils();
  const [joinCode, setJoinCode] = useState("");

  const { data: teams } = trpc.team.list.useQuery(
    user?.id ? { userId: user.id } : undefined,
    { enabled: !!user }
  );

  const joinMutation = trpc.team.joinByInvite.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        utils.team.list.invalidate();
        setJoinCode("");
        toast.success(`Вы присоединились к команде "${(data as any).team?.name}"`);
      } else {
        toast.error(data.error || "Ошибка");
      }
    },
  });

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Настройки</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Персонализация и конфигурация
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <User size={18} className="text-[#96f7b9]" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Профиль</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Имя</label>
                <input
                  type="text"
                  value={user?.name || ""}
                  readOnly
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">Email</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  readOnly
                  className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase mb-1.5">Роль</label>
              <input
                type="text"
                value={user?.role === "coach" ? "Тренер" : "Медицинский персонал"}
                readOnly
                className="w-full h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Teams */}
        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield size={18} className="text-[#96f7b9]" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Команды</h3>
          </div>
          <div className="space-y-3">
            {teams?.map((team) => (
              <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.03] rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{team.name}</p>
                  <p className="text-xs text-gray-500">{team.category}</p>
                </div>
                {(team as any).inviteCode && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText((team as any).inviteCode);
                      toast.success("Код скопирован");
                    }}
                    className="flex items-center gap-1.5 h-8 px-3 bg-white dark:bg-[#191a1b] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-xs text-gray-600 dark:text-gray-300 hover:border-[#96f7b9]"
                  >
                    <Copy size={12} />
                    {(team as any).inviteCode}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-gray-200 dark:border-[#2a2b2c] pt-4">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Присоединиться по коду</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Введите код"
                className="flex-1 h-10 px-3 bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#96f7b9] uppercase"
              />
              <button
                onClick={() => {
                  if (!joinCode.trim() || !user) return;
                  joinMutation.mutate({ code: joinCode.trim(), userId: user.id });
                }}
                disabled={joinMutation.isPending || !joinCode.trim()}
                className="flex items-center gap-2 h-10 px-4 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md disabled:opacity-50"
              >
                <LogIn size={14} /> {joinMutation.isPending ? "..." : "Войти"}
              </button>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            {theme === "dark" ? <Moon size={18} className="text-[#96f7b9]" /> : <Sun size={18} className="text-[#96f7b9]" />}
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Внешний вид</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900 dark:text-white">Темная тема</p>
              <p className="text-xs text-gray-500">Переключить между светлой и темной темой</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`w-12 h-6 rounded-full transition-colors relative overflow-hidden shrink-0 ${theme === "dark" ? "bg-[#96f7b9]" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${theme === "dark" ? "translate-x-6" : "translate-x-0"}`}
              />
            </button>
          </div>
        </div>

        {/* About */}
        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield size={18} className="text-[#96f7b9]" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">О системе</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-500">
            <p>FootballManager v1.0</p>
            <p>Система управления футбольным клубом</p>
            <p>Автор: Тамер Шейх Мустафа</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
