# Интеграция с движком FET (Генерация расписания)

В данном документе описана текущая реализация конвейера автоматической генерации недельного шаблона расписания с использованием движка **FET (Free Evolutionary Timetabling)**.

Связанные рабочие документы:

*   `docs/fet-generation-quality-plan.md` - план улучшения качества генерации и список доменных вопросов.
*   `docs/fet-generation-runbook.md` - runbook и журнал экспериментов FET.

---

## 1. Общий поток (Pipeline)

Процесс генерации запускается администратором на странице `/admin/schedule` и проходит следующие этапы:

1.  **Запуск**: Server Action проверяет права доступа (`ADMIN`).
2.  **Сбор данных**: Загрузка всех необходимых сущностей из Prisma.
3.  **Preflight**: Валидация входных данных (проверка на кратность периодам, наличие учителей и т.д.).
4.  **Core pass**: Генерация основной программы (`ACADEMIC`) и блокирующего питания (`Завтрак`, `Обед`).
5.  **Full pass**: Фиксация результата core pass и добавление допов/остальных режимных активностей.
6.  **Импорт**: Парсинг результирующего XML (`*_activities.xml`) полного прохода.
7.  **Финализация**: Только после успешного полного прогона транзакционно заменяет весь `WeeklyScheduleTemplate`.
    *   *Примечание: `ScheduleEntry` при генерации не затрагиваются. Если FET падает или данные некорректны, старый шаблон остается неизменным.*

---

## 2. Источники данных и Модель

### Что читает генератор:
*   `GroupSubjectRequirement` (основа нагрузки)
*   `Group`, `Subject`
*   `TeacherSubject`, `TeacherAvailability` (только `UNAVAILABLE`)
*   `RoomSubject`, `Room`
*   `ElectiveGroupClassLink` для учета открытых классов optional-группы во втором проходе
*   *Генератор **не** читает старый WeeklyScheduleTemplate как входные данные.*

### Принцип формирования активностей (Activities)
Каждая запись `GroupSubjectRequirement` превращается в набор FET activities.
*Пример: `lessonsPerWeek = 5`, `durationInMinutes = 45` -> создается 5 отдельных занятий по 45 минут.*

---

## 3. Алгоритм генерации (Два прохода)

Для повышения качества основной программы генерация разделена на два этапа (Pass):

### Этап 1: Core Pass
Включает:
*   все `ACADEMIC`;
*   режимные предметы `Завтрак` и `Обед`.

Питание в core pass является hard blocker для класса: full pass фиксирует эти activities, поэтому direct/subgroup add-ons не могут пересечься с питанием через student-set constraints FET. Для `ELECTIVE_GROUP` дополнительно используется `ElectiveGroupClassLink`: optional-activity получает `ConstraintActivitiesNotOverlapping` с завтраком/обедом открытых классов.

*   **Окна (Хардкод)**:
    *   Завтрак: 08:30–10:30
    *   Обед: 12:00–14:30
    *   Полдник: 14:30–16:30
    *   Прогулка: 10:00–18:00
    *   Сон: 12:00–16:00

### Этап 2: Full Pass
Включает:
*   locked core activities;
*   `ELECTIVE_REQUIRED`;
*   `ELECTIVE_OPTIONAL`;
*   остальные `REGIME`, кроме явно исключенного `Полдник`.

`ACADEMIC` во втором проходе заново не создаются. Допы ограничиваются по дням так, чтобы начинаться после последнего academic core-занятия своей аудитории. Для optional-группы аудитория берется из `ElectiveGroupClassLink`, поэтому она наследует окончание основной программы открытых классов.

---

## 4. Бизнес-логика маппинга

### Выбор преподавателя
Выбирается детерминированно:
1.  Один teacher на пару `groupId + subjectId`.
2.  Если возможно, переиспользуется один teacher для `grade + subjectId`.
3.  Кандидаты берутся из `TeacherSubject` с учетом `minGrade / maxGrade`.
4.  Если кандидатов нет — ошибка Preflight.

Исключение: sibling-подгруппы одного parent-класса и одного предмета получают разных преподавателей. Если разных кандидатов меньше, чем подгрупп, preflight падает до запуска FET.

### Сетка времени (Time Grid)
*   **Дни**: Понедельник — Пятница.
*   **Часы**: 08:00 – 18:00 (настраивается через `FET_DAY_START/END_MINUTES`).
*   **Шаг**: 5 минут (`FET_PERIOD_MINUTES`).

### Разделение «Уроки / Допы»
*   `FET_CORE_END_MINUTES = 840` (14:00).
*   `FET_CORE_WINDOW_WEIGHT = 95`: Академические занятия в core pass предпочитаются до 14:00.
*   Допы во full pass получают hard lower bound после academic core-блока своей аудитории и дополнительно остаются в обычном окне допов.
*   *Core window остается мягким предпочтением (не 100), чтобы не блокировать сходимость алгоритма.*

### Группы и подгруппы
*   `CLASS` -> экспортируется как `Year`.
*   `SUBJECT_SUBGROUP` -> экспортируется как `Group` внутри родительского `Year`.
*   Если предмет разбит на `SUBJECT_SUBGROUP`, whole-class requirement parent-класса по этому же предмету не экспортируется в FET.
*   Activities sibling-подгрупп одного parent-класса и subject связываются soft `ConstraintActivitiesSameStartingTime` с весом 95, чтобы FET старался ставить их одновременно.
*   **Ограничение**: FET понимает связь класса и подгрупп, но `ELECTIVE_GROUP` пока экспортируется как отдельный корневой набор студентов. Связь с открытыми классами используется частично: для запрета пересечения с питанием и расчета lower bound после основной программы, но импорт пока все еще пишет `DIRECT_GROUP`.

---

## 5. Техническая реализация

### Конфликты и ограничения
FET гарантирует предотвращение:
*   Один учитель в двух местах одновременно.
*   Одна группа (student set) в двух занятиях одновременно.
*   Один кабинет в двух занятиях одновременно.
*   Минимальная перемена после занятия для пересекающейся группы детей через `ConstraintMinGapsBetweenActivities`.
*   Одинаковый час начала `Завтрак` и `Обед` по дням недели для одного класса через `ConstraintActivitiesSameStartingHour`.
*   Мягкое одновременное начало sibling-подгрупп одного предмета через `ConstraintActivitiesSameStartingTime`.

`breakDuration` применяется как hard minimum ровно `breakDuration`, переведенный в количество FET periods. Ограничение строится по student audience, а не по кабинету: один класс, класс и его подгруппа, optional-группа и открытые для нее классы. Sibling-подгруппы не связываются. По умолчанию перед/после `Завтрак`, `Обед` и `Прогулка` перемена может быть 0 минут; это управляется `FET_ALLOW_ZERO_BREAK_AROUND_REST`.

Передачу `breakDuration` в FET можно полностью отключить через `FET_ENABLE_BREAK_DURATION_CONSTRAINTS=false`. В этом режиме builders передают в FET activities `breakAfterMinutes = 0`, и XML не получает `ConstraintMinGapsBetweenActivities` из `breakDuration`.

UI/apply-валидация коротких перемен управляется отдельно через `SCHEDULE_ENABLE_BREAK_VALIDATION`. Если установить `SCHEDULE_ENABLE_BREAK_VALIDATION=false`, конфликт `INSUFFICIENT_BREAK_AFTER_LESSON` полностью отключается в визуальной подсветке шаблона и в проверке перед применением шаблона.

Для питания одинаковость времени строится отдельно по паре `delivery group + subject`: завтраки одного класса связываются между собой, обеды того же класса связываются отдельно.

### Артефакты (fet-runs/)
Все файлы сохраняются в `fet-runs/<artifactId>/` для отладки:
*   `core/` и `full/`: Входные `.fet` и выходные логи.
*   `out/timetables/*_activities.xml`: Результирующий файл для импорта.
*   `out/logs/`: `result.txt`, `errors.txt`, `max_placed_activities.txt`.

---

## 6. Текущие ограничения (Backlog)

1.  `TeacherAvailabilityOverride` не учитывается.
2.  `AVAILABLE` / `PREFERRED` статусы доступности учителей не используются.
3.  `ELECTIVE_GROUP` связан с открытыми классами только для части FET-ограничений; импорт `ELECTIVE_GROUP` + `openClasses` еще не реализован.
4.  Нет полноценного ограничения «без окон» (compact timetable) по умолчанию.
5.  `FET_CORE_WINDOW_WEIGHT=95` и subgroup same-starting-time weight 95 — это не жесткие гарантии.
6.  Обычные предметы без `RoomSubject` могут генерироваться без кабинета.
7.  Выбор учителя не оптимизирует нагрузку (простой детерминизм).
8.  Нет проверки максимальной дневной нагрузки класса.
9.  Нет ограничения «не больше N уроков предмета в день».
10. Нет `min days between activities` для обычных уроков.
11. Границы обеда/допов захардкожены (нет модели в БД).
12. Генерация выполняется в блокирующем процессе (нет Background Jobs).
13. Нет таблицы `GenerationRun` для истории статусов.
14. Вес 100 для окон может привести к таймауту генерации.

---

## 7. Практические рекомендации по запуску

Для стандартного рабочего режима:
```env
FET_CLI_PATH=/path/to/fet-cl
FET_WORK_DIR=fet-runs
FET_TIMEOUT_MS=120000

FET_DAY_START_MINUTES=480
FET_DAY_END_MINUTES=1080
FET_PERIOD_MINUTES=5

FET_CORE_END_MINUTES=840
FET_CORE_WINDOW_WEIGHT=95
FET_ENABLE_BREAK_DURATION_CONSTRAINTS=true
FET_ALLOW_ZERO_BREAK_AROUND_REST=true
FET_ENABLE_STUDENT_GAP_CONSTRAINTS=false

SCHEDULE_ENABLE_BREAK_VALIDATION=true
```
Для жесткого разделения «уроки только утром» поднимите `FET_CORE_WINDOW_WEIGHT` до **100** и увеличьте `FET_TIMEOUT_MS` до **300000**.
