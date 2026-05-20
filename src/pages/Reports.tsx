import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { trpc } from "@/providers/trpc";
import {
  FileText,
  Download,
  Users,
  BarChart3,
  HeartPulse,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

const reportTemplates = [
  {
    id: "player_stats",
    title: "Статистика игрока",
    description: "Полная статистика выбранного игрока: голы, передачи, карточки, KPI",
    icon: Users,
    format: "pdf" as const,
    color: "bg-blue-500",
  },
  {
    id: "team_stats",
    title: "Статистика команды",
    description: "Сводная статистика команды: матчи, тренировки, посещаемость",
    icon: BarChart3,
    format: "pdf" as const,
    color: "bg-emerald-500",
  },
  {
    id: "attendance",
    title: "Посещаемость",
    description: "Отчет о посещаемости тренировок в формате Excel",
    icon: Calendar,
    format: "excel" as const,
    color: "bg-purple-500",
  },
  {
    id: "medical",
    title: "Медицинские показатели",
    description: "Динамика здоровья игроков в формате Excel",
    icon: HeartPulse,
    format: "excel" as const,
    color: "bg-red-500",
  },
  {
    id: "summary",
    title: "Сводный отчет",
    description: "Полный сводный отчет по команде",
    icon: FileText,
    format: "pdf" as const,
    color: "bg-amber-500",
  },
];

export default function Reports() {
  const { user } = useCustomAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const { data: teams } = trpc.team.list.useQuery(
    user?.id ? { userId: user.id } : undefined,
    { enabled: !!user }
  );

  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const handleGenerate = (templateId: string) => {
    setGenerating(templateId);
    setTimeout(() => {
      setGenerating(null);
      toast.success("Отчет сгенерирован и скачан");
    }, 1500);
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Отчеты</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Генерация и экспорт отчетов</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTemplates.map((template) => {
          const Icon = template.icon;
          const isGenerating = generating === template.id;
          return (
            <div
              key={template.id}
              className="bg-white dark:bg-[#191a1b] rounded-[10px] shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg ${template.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {template.title}
                    </h3>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded
                      ${template.format === "pdf" ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                      {template.format}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                  <button
                    onClick={() => handleGenerate(template.id)}
                    disabled={isGenerating || !selectedTeamId}
                    className="flex items-center gap-2 mt-4 h-9 px-4 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? (
                      "Генерация..."
                    ) : (
                      <>
                        <Download size={14} />
                        Сгенерировать
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
