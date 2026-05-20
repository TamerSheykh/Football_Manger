import Layout from "@/components/layout/Layout";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  User,
  Shield,
  Moon,
  Sun,
} from "lucide-react";

export default function Settings() {
  const { user } = useCustomAuth();
  const { theme, toggleTheme } = useTheme();

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
              className={`w-12 h-6 rounded-full transition-colors relative ${theme === "dark" ? "bg-[#96f7b9]" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${theme === "dark" ? "translate-x-7" : "translate-x-1"}`}
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
            <p>Стек: React + TypeScript + tRPC + Drizzle ORM + MySQL</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
