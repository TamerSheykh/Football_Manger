import { useState } from "react";
import { useParams } from "react-router";
import { trpc } from "@/providers/trpc";

interface ScaleItem {
  value: number;
  label: string;
}

interface Question {
  id: string;
  title: string;
  items: ScaleItem[];
}

const questions: Question[] = [
  {
    id: "rpe",
    title: "1. НАСКОЛЬКО ТЯЖЕЛОЙ БЫЛА ТРЕНИРОВКА?",
    items: [
      { value: 0, label: "Отдых" },
      { value: 1, label: "Очень легко" },
      { value: 2, label: "Легко" },
      { value: 3, label: "Умеренно" },
      { value: 4, label: "Немного тяжело" },
      { value: 5, label: "Тяжело" },
      { value: 6, label: "Тяжелее" },
      { value: 7, label: "Очень тяжело" },
      { value: 8, label: "Еще тяжелее" },
      { value: 9, label: "Почти максимум" },
      { value: 10, label: "Максимум" },
    ],
  },
  {
    id: "muscleFatigue",
    title: "2. УСТАЛОСТЬ МЫШЦ",
    items: [
      { value: 1, label: "Нет" },
      { value: 2, label: "Легкая" },
      { value: 3, label: "Средняя" },
      { value: 4, label: "Высокая" },
      { value: 5, label: "Сильная" },
      { value: 6, label: "Очень" },
      { value: 7, label: "Экстр." },
    ],
  },
  {
    id: "sleep",
    title: "3. КАЧЕСТВО СНА (прошлая ночь)",
    items: [
      { value: 1, label: "Ужасный" },
      { value: 2, label: "Плохой" },
      { value: 3, label: "Средний" },
      { value: 4, label: "Нормальный" },
      { value: 5, label: "Хороший" },
      { value: 6, label: "Очень хороший" },
      { value: 7, label: "Отличный" },
    ],
  },
  {
    id: "stress",
    title: "4. УРОВЕНЬ СТРЕССА (вне футбола)",
    items: [
      { value: 1, label: "Спокоен" },
      { value: 2, label: "Слегка" },
      { value: 3, label: "Нормально" },
      { value: 4, label: "Повышен" },
      { value: 5, label: "Напряжен" },
      { value: 6, label: "Сильный" },
      { value: 7, label: "Очень высокий" },
    ],
  },
  {
    id: "doms",
    title: "5. БОЛЬ / КРЕПАТУРА",
    items: [
      { value: 1, label: "Нет боли" },
      { value: 2, label: "Легкая" },
      { value: 3, label: "Средняя" },
      { value: 4, label: "Сильная" },
      { value: 5, label: "Очень\nсильная" },
      { value: 6, label: "Сильнейшая" },
      { value: 7, label: "Экстр.\n(невыносимо)" },
    ],
  },
];

function ScaleRow({ items, selected, onSelect }: {
  items: ScaleItem[];
  selected: number | undefined;
  onSelect: (v: number) => void;
}) {
  const n = items.length;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${n}, 1fr)` }} className="gap-0">
      {/* Numbers */}
      {items.map((item) => (
        <div key={item.value} className="flex justify-center">
          <button
            onClick={() => onSelect(item.value)}
            className={`w-8 h-8 rounded-full text-xs font-bold transition-all flex items-center justify-center ${
              selected === item.value
                ? "bg-[#96f7b9] text-black scale-110"
                : "bg-white/10 text-gray-400 hover:bg-white/20"
            }`}
          >
            {item.value}
          </button>
        </div>
      ))}
      {/* Ticks */}
      {items.map((item) => (
        <div key={item.value} className="flex justify-center">
          <div className={`w-px h-2.5 ${selected === item.value ? "bg-[#96f7b9]" : "bg-white/20"}`} />
        </div>
      ))}
      {/* Labels */}
      {items.map((item) => (
        <div key={item.value} className="flex justify-center">
          {item.label && (
            <span
              className={`text-[10px] leading-tight text-center whitespace-pre-line ${
                selected === item.value ? "text-[#96f7b9]" : "text-gray-500"
              }`}
            >
              {item.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function RpeForm() {
  const { token } = useParams();
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: tokenInfo, isLoading } = trpc.rpe.checkToken.useQuery(
    { token: token ?? "" },
    { enabled: !!token }
  );

  const submitMutation = trpc.rpe.submit.useMutation({
    onSuccess: (data) => {
      if (data.success) setSubmitted(true);
    },
  });

  const handleSubmit = () => {
    if (!token || ratings.rpe === undefined) return;
    submitMutation.mutate({
      token,
      rating: ratings.rpe,
      muscleFatigue: ratings.muscleFatigue ?? null,
      sleep: ratings.sleep ?? null,
      stress: ratings.stress ?? null,
      doms: ratings.doms ?? null,
    });
  };

  const allDone = ratings.rpe !== undefined;

  return (
    <div className="min-h-screen bg-[#0c0d0e] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl">
        <div className="bg-[#191a1b] rounded-[10px] p-6 shadow-sm">
          {isLoading ? (
            <div className="w-8 h-8 border-2 border-[#96f7b9] border-t-transparent rounded-full animate-spin mx-auto" />
          ) : tokenInfo?.valid === false ? (
            <div className="text-center">
              <h1 className="text-lg font-semibold text-red-500 mb-2">Неверная ссылка</h1>
              <p className="text-sm text-gray-400">Эта ссылка для опросника недействительна.</p>
            </div>
          ) : tokenInfo?.alreadySubmitted ? (
            <div className="text-center">
              <h1 className="text-lg font-semibold text-[#96f7b9] mb-2">Уже оценено</h1>
              <p className="text-sm text-gray-400">Вы уже отправили свою оценку за эту тренировку.</p>
            </div>
          ) : submitted ? (
            <div className="text-center">
              <h1 className="text-lg font-semibold text-[#96f7b9] mb-2">Спасибо!</h1>
              <p className="text-sm text-gray-400">Ваша оценка сохранена.</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-lg font-semibold text-white">Самочувствие после тренировки</h1>
                <p className="text-sm text-gray-400 mt-1">{tokenInfo?.playerName}</p>
              </div>

              <div className="space-y-10">
                {questions.map((q) => (
                  <div key={q.id}>
                    <p className="text-sm font-semibold text-gray-200 mb-4">{q.title}</p>
                    <ScaleRow
                      items={q.items}
                      selected={ratings[q.id]}
                      onSelect={(v) => setRatings((prev) => ({ ...prev, [q.id]: v }))}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!allDone || submitMutation.isPending}
                className="w-full h-10 mt-8 rounded-md bg-[#96f7b9] text-black font-medium text-sm disabled:opacity-40 hover:bg-[#7de0a0] transition-colors"
              >
                {submitMutation.isPending ? "Отправка..." : "Отправить"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
