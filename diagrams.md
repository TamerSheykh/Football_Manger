# 3.1.2 Диаграммы последовательности

## Сценарий: Ввод медицинских показателей игрока

```plantuml
@startuml
actor "Тренер/Врач" as User
participant "React Frontend\n(Medical.tsx)" as UI
participant "tRPC Client" as RPC
participant "tRPC Server\n(medical-router.ts)" as Server
database "MySQL\n(health_metrics)" as DB

User -> UI: Выбор команды и игрока
UI -> RPC: trpc.medical.listPlayersWithStatus({ teamId })
RPC -> Server: GET /api/trpc/medical.listPlayersWithStatus
Server -> DB: SELECT * FROM players WHERE team_id = ?
Server -> DB: SELECT * FROM medical_records WHERE player_id = ?
Server -> DB: SELECT * FROM injuries WHERE player_id = ?
Server -> DB: SELECT * FROM health_metrics WHERE player_id = ?
DB --> Server: Данные игрока + медкарта + травмы + метрики
Server --> RPC: { player, latestRecord, activeInjuries, latestHealth }
RPC --> UI: Обновление списка медкарт

User -> UI: Нажатие "Добавить показатели"
UI -> User: Открытие диалогового окна
User -> UI: Заполнение формы (вес, пульс, дистанция Купера и т.д.)
User -> UI: Нажатие "Сохранить"

UI -> RPC: trpc.medical.createHealthMetric.mutate({
  playerId, weight, restingHr,
  cooperDistance, bloodPressureSys,
  bloodPressureDia, recordedAt
})
RPC -> Server: POST /api/trpc/medical.createHealthMetric
Server -> Server: Валидация Zod
Server -> DB: INSERT INTO health_metrics (...)
DB --> Server: { insertId }
Server --> RPC: { id: number }
RPC --> UI: Успех

UI -> UI: invalidateQueries('medical.listHealthMetrics')
UI -> RPC: trpc.medical.listHealthMetrics({ playerId })
RPC -> Server: GET /api/trpc/medical.listHealthMetrics
Server -> DB: SELECT * FROM health_metrics WHERE player_id = ? ORDER BY recorded_at
DB --> Server: Обновлённый список
Server --> RPC: HealthMetric[]
RPC --> UI: Обновление графика и таблицы
UI -> User: Тостер "Показатели добавлены"
@enduml
```

## Сценарий: Формирование отчёта (сводная статистика команды)

```plantuml
@startuml
actor "Тренер" as User
participant "React Frontend\n(Reports.tsx)" as UI
participant "tRPC Client" as RPC
participant "tRPC Server\n(analytics-router.ts)" as Server
database "MySQL" as DB

User -> UI: Выбор команды
UI -> RPC: trpc.team.list({ userId })
RPC -> Server: GET /api/trpc/team.list
Server -> DB: SELECT * FROM teams WHERE user_id = ?
DB --> Server: team[]
Server --> RPC: Список команд
RPC --> UI: Обновление селекта

User -> UI: Выбор шаблона "Сводный отчёт"
User -> UI: Нажатие "Сгенерировать"

UI -> RPC: trpc.analytics.getTeamStats({ teamId })
RPC -> Server: GET /api/trpc/analytics.getTeamStats
Server -> DB: SELECT * FROM players WHERE team_id = ?
Server -> DB: SELECT * FROM matches WHERE team_id = ?
Server -> DB: SELECT * FROM training_sessions WHERE team_id = ?
Server -> DB: SELECT * FROM injuries WHERE player_id IN (...)

DB --> Server: Данные команды
Server -> Server: Расчёт: кол-во игроков, матчей,\nпобед/поражений/ничьих, тренировок, травм
Server --> RPC: { playerCount, totalMatches, wins, draws, losses, ... }

UI -> RPC: trpc.analytics.getAttendanceDynamics({ teamId })
RPC --> Server: GET ...
Server -> DB: SELECT * FROM training_sessions WHERE team_id = ?
Server -> DB: SELECT * FROM attendance WHERE training_id IN (...)
DB --> Server: Данные посещаемости
Server --> RPC: [{ date, name, total, present, rate }]

UI -> RPC: trpc.analytics.getMatchActivity({ teamId })
RPC --> Server: GET ...
Server -> DB: SELECT * FROM matches WHERE team_id = ?
Server -> DB: SELECT * FROM player_match_stats WHERE match_id IN (...)
DB --> Server: Данные матчей
Server --> RPC: [{ opponent, score, goals, assists }]

UI -> UI: Генерация Excel/PDF на стороне клиента
UI -> User: Скачивание файла отчёта
@enduml
```

# 3.1.3 Диаграмма состояний (жизненный цикл игрока в системе)

```plantuml
@startuml
state "Добавлен в команду\n[player created]" as CREATED
state "Активен\n[Active]" as ACTIVE
state "Травмирован\n[Active injury]" as INJURED
state "Восстановление\n[Recovering]" as RECOVERING
state "Вылечен\n[Healed]" as HEALED
state "Допущен к матчам\n[Cleared]" as CLEARED
state "Ограниченно допущен\n[Limited]" as LIMITED
state "Не допущен\n[Not cleared]" as NOT_CLEARED
state "Архивирован / Удалён\n[Deleted]" as ARCHIVED

[*] --> CREATED : Регистрация игрока\n(тренир добавляет ФИО, позицию, №)
CREATED --> ACTIVE : Начало участия\nв тренировках и матчах

state ACTIVE {
  [*] --> CLEARED : Медосмотр пройден
  CLEARED --> LIMITED : Ухудшение показателей
  LIMITED --> CLEARED : Нормализация
  CLEARED --> NOT_CLEARED : Серьёзное отклонение
  NOT_CLEARED --> LIMITED : Частичное улучшение
  NOT_CLEARED --> CLEARED : Полное восстановление
}

ACTIVE --> INJURED : Получение травмы\n(травма = active)
INJURED --> RECOVERING : Начало реабилитации\n(травма = recovering)
RECOVERING --> HEALED : Завершение реабилитации\n(травма = healed)

HEALED --> ACTIVE : Медосмотр → допущен
HEALED --> NOT_CLEARED : Осложнения / повторный осмотр

ACTIVE --> ARCHIVED : Удаление из системы\n(тренер удаляет игрока)
INJURED --> ARCHIVED : Удаление
ARCHIVED --> [*]
@enduml
```
