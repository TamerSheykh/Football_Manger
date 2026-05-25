import { useState, useMemo, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { Shield, Download } from "lucide-react";
import { toPng } from "html-to-image";

interface Position {
  id: string;
  label: string;
  x: number; // percent from left
  y: number; // percent from top
}

interface Formation {
  name: string;
  positions: Position[];
}

const formationsByFormat: Record<number, Formation[]> = {
  11: [
    { name: "4-4-2", positions: generatePositions(4, 4, 2) },
    { name: "4-3-3", positions: generatePositions(4, 3, 3) },
    { name: "4-2-3-1", positions: generatePositions(4, 2, 3, 1) },
    { name: "3-5-2", positions: generatePositions(3, 5, 2) },
    { name: "5-3-2", positions: generatePositions(5, 3, 2) },
    { name: "4-1-4-1", positions: generatePositions(4, 1, 4, 1) },
  ],
  8: [
    { name: "3-2-2", positions: generatePositions(3, 2, 2) },
    { name: "3-3-1", positions: generatePositions(3, 3, 1) },
    { name: "2-3-2", positions: generatePositions(2, 3, 2) },
  ],
  6: [
    { name: "2-2-1", positions: generatePositions(2, 2, 1) },
    { name: "3-1-1", positions: generatePositions(3, 1, 1) },
    { name: "2-1-2", positions: generatePositions(2, 1, 2) },
  ],
  5: [
    { name: "2-1-1", positions: generatePositions(2, 1, 1) },
    { name: "1-2-1", positions: generatePositions(1, 2, 1) },
  ],
  4: [
    { name: "2-1", positions: generatePositions(2, 1) },
    { name: "1-2", positions: generatePositions(1, 2) },
    { name: "1-1-1", positions: generatePositions(1, 1, 1) },
  ],
};

function generatePositions(...lines: (number | number[])[]): Position[] {
  const positions: Position[] = [];
  const numLines = lines.length;
  let idx = 0;

  // GK
  positions.push({ id: `gk`, label: "ВР", x: 50, y: 92 });

  lines.forEach((line, li) => {
    const rowY = 65 - (li / Math.max(numLines - 1, 1)) * 40; // from ~65% to ~25%
    const count = Array.isArray(line) ? line.length : line;
    const parts = Array.isArray(line) ? line : [line];

    if (Array.isArray(line)) {
      // multiple sub-lines (e.g. [2,3] for 4-2-3-1)
      let subIdx = 0;
      parts.forEach((count, pi) => {
        const subRowY = rowY + (pi - (parts.length - 1) / 2) * 8;
        for (let i = 0; i < count; i++) {
          idx++;
          const x = (i + 0.5) / count * 80 + 10;
          positions.push({ id: `p${idx}`, label: `${idx}`, x, y: subRowY });
        }
        subIdx += count;
      });
    } else {
      for (let i = 0; i < count; i++) {
        idx++;
        const x = (i + 0.5) / count * 80 + 10;
        positions.push({ id: `p${idx}`, label: `${idx}`, x, y: rowY });
      }
    }
  });

  return positions;
}

interface Props {
  teamId: number;
}

export default function TacticsBoard({ teamId }: Props) {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [format, setFormat] = useState<number>(11);
  const [formationIdx, setFormationIdx] = useState(0);
  const [assignments, setAssignments] = useState<Record<string, number | null>>({});

  const { data: players } = trpc.player.list.useQuery(
    { teamId },
    { enabled: !!teamId }
  );

  const formations = formationsByFormat[format] || formationsByFormat[11];
  const currentFormation = formations[formationIdx] || formations[0];

  const { starters, subs } = useMemo(() => {
    const assigned = new Set(Object.values(assignments).filter((v): v is number => v !== null));
    const allPlayers = players || [];
    const starterList = allPlayers.filter((p) => assigned.has(p.id));
    const subList = allPlayers.filter((p) => !assigned.has(p.id));
    return { starters: starterList, subs: subList };
  }, [players, assignments]);

  const [draggedPlayer, setDraggedPlayer] = useState<number | null>(null);

  const handleSlotClick = (posId: string) => {
    // remove player from slot on click
    setAssignments((prev) => ({ ...prev, [posId]: null }));
  };

  const handleSlotDrop = (posId: string) => {
    if (draggedPlayer !== null) {
      setAssignments((prev) => ({ ...prev, [posId]: draggedPlayer }));
      setDraggedPlayer(null);
    }
  };

  const handlePlayerDragStart = (playerId: number) => {
    setDraggedPlayer(playerId);
  };

  const getPlayer = (playerId: number | null) => {
    if (playerId === null || playerId === undefined) return null;
    return players?.find((p) => p.id === playerId) || null;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Controls */}
      <div className="lg:w-72 shrink-0 space-y-4">
        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Формат</h3>
          <div className="flex gap-2 flex-wrap">
            {[11, 8, 6, 5, 4].map((f) => (
              <button
                key={f}
                onClick={() => { setFormat(f); setFormationIdx(0); setAssignments({}); }}
                className={`h-9 px-3 rounded-md text-sm font-medium transition-colors ${
                  format === f
                    ? "bg-[#96f7b9] text-[#1e2c20]"
                    : "bg-gray-100 dark:bg-[#11131a] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2a2b2c] hover:border-[#96f7b9]"
                }`}
              >
                {f}×{f}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Расстановка</h3>
          <div className="flex gap-2 flex-wrap">
            {formations.map((f, i) => (
              <button
                key={f.name}
                onClick={() => { setFormationIdx(i); setAssignments({}); }}
                className={`h-9 px-3 rounded-md text-sm font-medium transition-colors ${
                  formationIdx === i
                    ? "bg-[#96f7b9] text-[#1e2c20]"
                    : "bg-gray-100 dark:bg-[#11131a] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2a2b2c] hover:border-[#96f7b9]"
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* Subs */}
        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Запасные ({subs.length})
          </h3>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {subs.length === 0 ? (
              <p className="text-xs text-gray-500">Нет игроков</p>
            ) : (
              subs.map((p) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => handlePlayerDragStart(p.id)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 cursor-grab active:cursor-grabbing"
                >
                  <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-[#2a2b2c] flex items-center justify-center text-[10px] font-bold shrink-0">
                    {p.jerseyNumber || "—"}
                  </span>
                  <span className="truncate">{p.name}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Starters summary */}
        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Старт ({starters.length})
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {starters.length === 0 ? (
              <p className="text-xs text-gray-500">Перетащите игрока на поле</p>
            ) : (
              starters.map((p) => {
                const slot = Object.entries(assignments).find(([, v]) => v === p.id)?.[0];
                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => handlePlayerDragStart(p.id)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 cursor-grab active:cursor-grabbing"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#96f7b9]/20 flex items-center justify-center text-[10px] font-bold text-[#96f7b9] shrink-0">
                      {p.jerseyNumber || "—"}
                    </span>
                    <span className="truncate">{p.name}</span>
                    {slot && <span className="text-[10px] text-gray-400 ml-auto">{slot.toUpperCase()}</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Pitch */}
      <div className="flex-1 bg-white dark:bg-[#191a1b] rounded-[10px] shadow-sm p-4">
        <div className="flex justify-end mb-2">
          <button
            onClick={async () => {
              if (!pitchRef.current) return;
              try {
                const dataUrl = await toPng(pitchRef.current, { backgroundColor: "#2d8a4e" });
                const link = document.createElement("a");
                link.download = "tactics.png";
                link.href = dataUrl;
                link.click();
              } catch { /* ignore */ }
            }}
            className="flex items-center gap-2 h-9 px-3 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md"
          >
            <Download size={14} /> Сохранить
          </button>
        </div>
        <div ref={pitchRef} className="relative w-full aspect-[2/3] max-w-[500px] mx-auto bg-[#2d8a4e] rounded-md overflow-hidden">
          {/* Field markings */}
          <div className="absolute inset-0 border-2 border-white/30" />
          <div className="absolute top-1/2 left-0 right-0 h-0 border-t border-white/30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[22%] aspect-square border-2 border-white/30 rounded-full" />

          {/* Penalty areas */}
          <div className="absolute left-[15%] right-[15%] top-0 h-[18%] border-b-2 border-l-2 border-r-2 border-white/30 rounded-b-sm" />
          <div className="absolute left-[15%] right-[15%] bottom-0 h-[18%] border-t-2 border-l-2 border-r-2 border-white/30 rounded-t-sm" />

          {/* Six-yard boxes */}
          <div className="absolute left-[35%] right-[35%] top-0 h-[7%] border-b-2 border-l-2 border-r-2 border-white/30" />
          <div className="absolute left-[35%] right-[35%] bottom-0 h-[7%] border-t-2 border-l-2 border-r-2 border-white/30" />

          {/* Player positions */}
          {currentFormation.positions.map((pos) => {
            const playerId = assignments[pos.id] ?? null;
            const player = getPlayer(playerId);
            return (
              <div
                key={pos.id}
                onClick={() => handleSlotClick(pos.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleSlotDrop(pos.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                <div
                  className={`w-16 h-16 rounded-full flex flex-col items-center justify-center text-[10px] font-bold shadow-md transition-all hover:scale-110 ${
                    player
                      ? "bg-[#1f2937] text-white border-2 border-[#96f7b9]"
                      : "bg-white/20 text-white/70 border-2 border-dashed border-white/40"
                  }`}
                >
                  {player ? (
                    <>
                      <span className="text-xs leading-none font-bold">{player.jerseyNumber || "—"}</span>
                      <span className="text-[8px] leading-none truncate max-w-[52px]">
                        {player.name.split(" ").pop()}
                      </span>
                    </>
                  ) : (
                    <span className="text-3xl leading-none">+</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
