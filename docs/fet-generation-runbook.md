# Runbook и журнал прогонов FET

Этот документ нужен для воспроизводимой работы над качеством генерации. Каждый заметный прогон FET должен оставлять след: что изменили, какие env использовали, какие метрики получили, что делаем дальше.

## 1. Что считать успешной генерацией

Hard-критерии:

- FET завершился успешно.
- Все activities импортированы.
- `WeeklyScheduleTemplate` заменен только после полного успешного прогона.
- Post-generation validation не нашла hard conflicts.
- Нет нарушений доступности учителей.
- Нет превышений вместимости помещений.
- Недельная нагрузка совпадает с `GroupSubjectRequirement`.
- `breakDuration` не нарушен сверх согласованного допуска.

Quality-критерии:

- Академические предметы в основном стоят до `FET_CORE_END_MINUTES`.
- Повторяющиеся академические предметы разнесены по дням.
- У класса нет больших окон внутри учебного дня.
- Дневная нагрузка не концентрируется в один день.
- Режимные моменты одного типа стоят примерно в одно и то же время в разные дни.
- Питание идет волнами и не превышает вместимость столовой.
- Optional-группы отображаются в строках открытых классов после импорта.
- Required/regime shared slots импортируются как `SHARED_CLASSES`, когда генератор объединял классы.

## 2. Что фиксировать для каждого прогона

Минимальная запись:

- дата и время;
- git branch и commit/dirty state;
- artifactId;
- команда или UI-действие запуска;
- FET env;
- размер входной модели;
- ключевые изменения относительно прошлого прогона;
- результат FET;
- post-validation summary;
- вывод.

Размер входной модели:

- количество классов;
- количество подгрупп;
- количество optional-групп;
- количество требований по типам предметов;
- суммарное количество lessons по типам предметов;
- количество учителей;
- количество записей доступности по типам;
- количество кабинетов и диапазон вместимости.

## 3. Baseline на dev-данных

Снимок из dev-базы на момент исследования:

- `CLASS`: 2.
- `SUBJECT_SUBGROUP`: 4.
- `ELECTIVE_GROUP`: 5.
- Предметы: `ACADEMIC` 11, `ELECTIVE_REQUIRED` 11, `ELECTIVE_OPTIONAL` 5, `REGIME` 3.
- Требования: `ACADEMIC` 22 строки / 67 lessons, `ELECTIVE_REQUIRED` 14 строк / 22 lessons, `ELECTIVE_OPTIONAL` 5 строк / 5 lessons, `REGIME` 6 строк / 30 lessons.
- `TeacherAvailability`: только `AVAILABLE`, 75 строк.
- `ElectiveGroupClassLink`: 7 связей.
- `WeeklyScheduleTemplate`: 124 строки, все `DIRECT_GROUP`.
- `WeeklyTemplateOpenClass`: 0.
- `WeeklyTemplateCoveredClass`: 0.
- Rooms: 9, вместимость от 20 до 50, `RoomSubject` 53 связи.

Важный вывод baseline: текущий генератор не использует богатую модель template-проекций и почти не передает FET реальные ограничения вместимости/доступности.

## 4. Команды проверки

Unit-тесты:

```bash
pnpm test:unit
```

Ожидаемый baseline на момент создания документа: 38 passing tests.

Текущий статус после среза subject-subgroups: 53 passing tests.

Проверка dev-БД для быстрых снимков:

```bash
set -a; source .env; set +a
psql "$DATABASE_URL" -X -A -F $'\t' -c 'select type, count(*) from "Group" group by type order by type;'
psql "$DATABASE_URL" -X -A -F $'\t' -c 'select type, count(*) from "Subject" group by type order by type;'
psql "$DATABASE_URL" -X -A -F $'\t' -c 'select s.type, count(*) reqs, sum(r."lessonsPerWeek") lessons from "GroupSubjectRequirement" r join "Subject" s on s.id=r."subjectId" group by s.type order by s.type;'
psql "$DATABASE_URL" -X -A -F $'\t' -c 'select "deliveryMode", count(*) from "WeeklyScheduleTemplate" group by "deliveryMode" order by "deliveryMode";'
```

Текущего CLI-скрипта для безопасного dry-run генерации нет. Желательно добавить отдельный script/action, который строит FET input, запускает FET и пишет артефакты без замены `WeeklyScheduleTemplate`.

## 5. Формат записи эксперимента

```markdown
### YYYY-MM-DD HH:mm - короткое название

- Branch/commit:
- Dirty state:
- ArtifactId:
- Env:
  - FET_TIMEOUT_MS:
  - FET_DAY_START_MINUTES:
  - FET_DAY_END_MINUTES:
  - FET_PERIOD_MINUTES:
  - FET_CORE_END_MINUTES:
  - FET_CORE_WINDOW_WEIGHT:
  - FET_ENABLE_BREAK_DURATION_CONSTRAINTS:
  - FET_ALLOW_ZERO_BREAK_AROUND_REST:
  - FET_ENABLE_STUDENT_GAP_CONSTRAINTS:
  - SCHEDULE_ENABLE_BREAK_VALIDATION:
- Изменение:
- Ожидание:
- Результат FET:
- Post-validation:
- Метрики качества:
  - hard conflicts:
  - teacher availability violations:
  - room capacity violations:
  - weekly load mismatches:
  - break violations:
  - average/max student gaps:
  - academic lessons after core window:
  - regime same-time deviation:
- Вывод:
- Следующий шаг:
```

## 6. Журнал экспериментов

### Baseline - текущее состояние до улучшений

- Branch/commit: текущая рабочая ветка.
- Dirty state: `git status --short` пустой на момент исследования.
- ArtifactId: не запускался в этом шаге.
- Изменение: нет.
- Проверки: `pnpm test:unit`.
- Результат: 38 tests passed.
- Вывод: перед кодовыми изменениями нужно добавить summary/dry-run слой, потому что текущий результат генерации трудно сравнивать автоматически.

## 7. План ближайших экспериментов

### Experiment 0 - Core-first generation strategy

Статус на 2026-06-01: реализован первый срез.

Проверки:

- `pnpm test:unit` - 41 passing tests.
- `pnpm lint` - без ошибок.

Изменение:

- заменить текущую схему `regime pass -> full pass` на `core pass -> add-ons pass`;
- в core pass включить `ACADEMIC`, `Завтрак`, `Обед`;
- во втором проходе зафиксировать core и добавить required/optional electives;
- compactness и `breakDuration` в первую очередь применять к core pass.

Ожидание:

- основная программа становится плотнее;
- допы меньше попадают в середину академического блока;
- качество academic-блока можно измерять отдельно от afternoon-блока.

Что проверить:

- не ломает ли фиксированный завтрак/обед допустимую параллельность optional с режимом;
- не появляется ли нехватка помещений/учителей во втором проходе;
- уменьшается ли количество academic lessons after core window;
- уменьшаются ли gaps внутри core-блока.

Решение до реализации:

- `REGIME` в core pass: только `Завтрак` и `Обед`.
- `Завтрак` и `Обед` являются hard blocker для всего класса.
- `Полдник` не входит в core pass.
- Обязательные допы должны начинаться строго после основной программы.
- Для core-блока приоритет качества: отсутствие окон.
- `breakDuration` hard minimum = ровно `breakDuration`.
- Перед/после `Завтрак`, `Обед` и `Прогулка` минимальная перемена может быть 0 минут, если `FET_ALLOW_ZERO_BREAK_AROUND_REST` не равен `false`.

Фактический результат первого среза:

- pipeline переведен на `core pass -> full pass`;
- core pass включает `ACADEMIC`, `Завтрак`, `Обед`;
- `Полдник` не входит в core pass и попадает во full pass;
- full pass больше не создает `ACADEMIC` заново;
- direct/subgroup add-ons получают нижнюю границу после academic core-блока;
- optional add-ons используют `ElectiveGroupClassLink`, чтобы наследовать нижнюю границу открытых классов;
- optional add-ons получают FET `ConstraintActivitiesNotOverlapping` с breakfast/lunch открытых классов.

Что еще не сделано в этом эксперименте:

- compactness core-блока без окон;
- `breakDuration` как hard/near-hard FET constraint;
- одинаковое время завтрака/обеда по дням;
- проверка качества на реальном FET-прогоне dev-данных;
- импорт optional как `ELECTIVE_GROUP` + `WeeklyTemplateOpenClass`.

### 2026-06-01 - Soft core window validation fix

- Симптом: генерация падала после core pass с ошибкой `FET вернул activity X вне разрешенного окна`.
- Причина: `ACADEMIC` activities получают `ConstraintActivityPreferredStartingTimes` с весом `FET_CORE_WINDOW_WEIGHT`, в debug env это `95`. FET имеет право нарушать такое мягкое предпочтение, но post-check валидировал его как hard constraint.
- Исправление: `assertActivityInsideSlots` проверяет только hard windows (`timeConstraintWeight` отсутствует или `100`). Soft preferences могут быть нарушены FET и фиксируются фактическим временем для full pass.
- Регрессия: добавлены unit-тесты для soft и hard time preferences.
- Проверки: `pnpm test:unit`, `pnpm lint`, `pnpm build`.

### 2026-06-01 - Full pass empty slot precompute fix

- Симптом: core pass завершался, full pass падал в FET с `Cannot precompute - data is wrong - aborting`.
- Диагностика FET logs: `Activity with id=116/122/123 has no allowed slot`.
- Причина: full pass создавал `Полдник` и одновременно сдвигал режим после academic core-блока. Для части классов academic core заканчивался позже доступного окна `Полдник`, из-за чего `Number_of_Preferred_Starting_Times=0`.
- Доменное решение: `Полдник` исключен из FET generation согласно текущему решению "без полдника".
- Техническая защита: full builder теперь падает до запуска FET с понятной ошибкой, если для любой activity осталось 0 allowed slots.
- Регрессия: добавлены unit-тесты на пропуск `Полдник` и раннюю ошибку по empty slots.
- Проверки: `pnpm test:unit`, `pnpm lint`, `pnpm build`.

### 2026-06-01 - breakDuration FET constraints

- Симптом: после генерации многие предметы стояли вплотную, без минимальной перемены.
- Причина: `GroupSubjectRequirement.breakDuration` собирался в FET input, но не экспортировался в FET constraints.
- Доменное уточнение: минимальная перемена считается до следующего занятия той же группы детей / пересекающейся student audience, не до следующего занятия в кабинете.
- Исправление:
  - `FetActivity` получил `breakAfterMinutes`;
  - builders передают `requirement.breakDuration` в activities;
  - `fet-xml.ts` экспортирует `ConstraintMinGapsBetweenActivities` для activities с пересекающейся группой детей;
  - hard minimum = ровно `breakDuration`, переведенный в FET periods;
  - пары рядом с `Завтрак`, `Обед` или `Прогулка` не ограничиваются, если `FET_ALLOW_ZERO_BREAK_AROUND_REST` не равен `false`, потому что эти события считаются отдыхом.
- Аудитория:
  - один и тот же `CLASS`/`SUBJECT_SUBGROUP` связывается;
  - `CLASS` связывается со своей подгруппой;
  - sibling-подгруппы не связываются;
  - `ELECTIVE_GROUP` связывается с открытыми классами через `ElectiveGroupClassLink`.
- Регрессия: добавлены unit-тесты на min gaps для одной группы, отсутствие min gaps для sibling-подгрупп и исключение питания.
- Проверки: `pnpm test:unit`, `pnpm lint`, `pnpm build`.

### 2026-06-01 - Separate visual break validation flag

- Требование: временно выключать визуальную/apply проверку коротких перемен отдельным флагом, не смешивая это с FET-правилом про 0 минут рядом с отдыхом.
- Исправление:
  - добавлен `SCHEDULE_ENABLE_BREAK_VALIDATION`;
  - если `SCHEDULE_ENABLE_BREAK_VALIDATION=false`, `schedule-conflicts.ts` полностью пропускает `INSUFFICIENT_BREAK_AFTER_LESSON`;
  - админская визуальная подсветка и apply-validation получают этот флаг с сервера;
  - `FET_ALLOW_ZERO_BREAK_AROUND_REST` остается только для FET XML constraints.
- Регрессия: добавлен unit-тест на полное отключение break validation.

### 2026-06-01 - FET breakDuration export flag

- Требование: иметь отдельный временный флаг, который полностью отключает передачу `breakDuration` в FET.
- Исправление:
  - добавлен `FET_ENABLE_BREAK_DURATION_CONSTRAINTS`;
  - если `FET_ENABLE_BREAK_DURATION_CONSTRAINTS=false`, builders передают `breakAfterMinutes = 0`;
  - доменные требования и UI/apply-валидация не меняются этим флагом;
  - `SCHEDULE_ENABLE_BREAK_VALIDATION` остается отдельным флагом для визуальной/apply проверки.
- Регрессия: добавлен unit-тест, что при выключенном флаге core activities получают `breakAfterMinutes=0` и XML не содержит `ConstraintMinGapsBetweenActivities`.

### 2026-06-01 - Same meal starting hour per class

- Требование: у одного класса `Завтрак` и `Обед` должны проходить в одно и то же время каждый день недели.
- Исправление: `fet-xml.ts` экспортирует hard `ConstraintActivitiesSameStartingHour` для activities, сгруппированных по `groupId + subjectId`, если subject name равен `Завтрак` или `Обед`.
- Поведение:
  - завтраки одного класса связываются между собой;
  - обеды того же класса связываются отдельно;
  - разные классы не связываются этим constraint, чтобы столовая могла работать волнами.
- Регрессия: добавлен unit-тест на five-day breakfast same-starting-hour constraint.
- Проверки: `pnpm test:unit`, `pnpm lint`, `pnpm build`.

### 2026-06-01 - Subject subgroup scheduling rules

- Требование: если предмет ведется через подгруппы, FET не должен одновременно получать занятие всего класса по тому же предмету.
- Требование качества: sibling-подгруппы одного класса и предмета желательно ставить одновременно, используя разных преподавателей.
- Исправление:
  - `collect-input.ts` читает `Group.subjectId` для распознавания предметных подгрупп;
  - `build-core-activities.ts` и `build-full-activities.ts` пропускают whole-class requirement, если для parent-класса есть подгруппа по тому же subject;
  - `teacher-assignment.ts` назначает разных преподавателей sibling-подгруппам одного parent-класса и subject;
  - `preflight.ts` заранее падает с понятной ошибкой, если разных преподавателей меньше, чем подгрупп;
  - `fet-xml.ts` добавляет soft `ConstraintActivitiesSameStartingTime` с весом `95` для соответствующих activities подгрупп.
- Регрессия: добавлены unit-тесты на skip whole-class requirement, distinct teachers, preflight error и XML same-starting-time.
- Проверки: `pnpm test:unit` - 53 passing tests; `pnpm lint`; `pnpm build`.

### Experiment 1 - Teacher availability hardening

Изменение:

- отсутствующая доступность учителя считается недоступностью;
- `AVAILABLE/PREFERRED` формируют разрешенные окна;
- `UNAVAILABLE` вычитает окна.

Ожидаемый результат:

- FET перестает ставить учителя вне заданной доступности;
- preflight начинает ловить requirements, для которых нет ни одного возможного teacher/time.

Риск:

- количество feasible slots резко упадет, может проявить реальные пробелы в данных доступности.

### Experiment 2 - Capacity-aware rooms

Изменение:

- экспортировать `Room.Capacity`;
- экспортировать `Number_of_Students`;
- фильтровать rooms по `seatsCount`.

Ожидаемый результат:

- FET не выбирает слишком маленькие кабинеты;
- preflight явно сообщает, где нет подходящего помещения.

Риск:

- для shared slots нужно сначала корректно считать аудиторию, иначе FET увидит неверную загрузку.

### Experiment 3 - Optional import semantics

Изменение:

- `ELECTIVE_OPTIONAL` импортируется как `deliveryMode = ELECTIVE_GROUP`;
- создаются `WeeklyTemplateOpenClass` из `ElectiveGroupClassLink`.

Ожидаемый результат:

- после генерации optional-карточки видны в строках открытых классов;
- FET не создает и не меняет optional-группы.

Риск:

- нужно аккуратно перейти с `createMany` на создание template rows со связями.

### Experiment 4 - Regime same-time preference

Изменение:

- для activities одного regime subject и одной аудитории добавить soft `ConstraintActivitiesSameStartingHour`;
- оставить окна питания достаточно широкими для волн.

Ожидаемый результат:

- завтрак/обед/полдник одного класса или shared-набора тяготеют к одному времени по дням;
- вместимость столовой продолжает управлять волнами.

Риск:

- слишком большой вес может ухудшить сходимость или мешать вместимости.

### Experiment 5 - Academic lesson distribution

Изменение:

- добавить `ConstraintMinDaysBetweenActivities` для повторяющихся academic lessons;
- включить compactness/gaps с контролируемым весом.

Ожидаемый результат:

- меньше сдвоенных одинаковых предметов без причины;
- более ровная неделя;
- меньше окон.

Риск:

- hard-версия может сделать расписание невозможным, начинать с soft весов.
