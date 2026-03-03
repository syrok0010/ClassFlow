// Use DBML to define your database structure
// Docs: https://dbml.dbdiagram.io/docs

Table Parent {
  id String [pk, default: `cuid()`]

  userId String [not null]
}

Table Teacher {
  id String [pk, default: `cuid()`]

  userId String [not null]
}

Table Student {
  id String [pk, default: `cuid()`]

  userId String [not null]
}

Enum Role {
  ADMIN
  USER
}

Table User {
  id String [pk, default: `cuid()`]
  name String
  surname String
  patronymicName String
  email String [unique]
  emailVerified DateTime
  image String
  role Role [default: 'USER']
  createdAt DateTime [default: `now()`]
  updatedAt DateTime
}

Table StudentParents {
  parentId String [pk]
  studentId String [pk]
}

Table Account {
  userId String
  type String
  provider String
  providerAccountId String
  refresh_token String
  access_token String
  expires_at Integer
  token_type String
  scope String
  id_token String
  session_state String
  createdAt DateTime [default: `now()`]
  updatedAt DateTime

  Indexes {
    (provider, providerAccountId) [pk]
  }
}

Table Session {
  sessionToken String [pk, unique]
  userId String
  expires DateTime
  createdAt DateTime [default: `now()`]
  updatedAt DateTime
}

Table VerificationToken {
  identifier String
  token String
  expires DateTime

  Indexes {
    (identifier, token) [pk]
  }
}

Table Authenticator {
  credentialID String [unique]
  userId String
  providerAccountId String
  credentialPublicKey String
  counter Integer
  credentialDeviceType String
  credentialBackedUp Boolean
  transports String

  Indexes {
    (userId, credentialID) [pk]
  }
}



Table StudentGroups {
  studentId String [pk]
  groupId String [pk]
}

Enum GroupType {
  CLASS // Основной класс (например, 2А, 7 круг)
  KINDERGARTEN_GROUP // Группа в детском саду
  SUBJECT_SUBGROUP // Подгруппа, на которую делится основной класс для предмета
  ELECTIVE_GROUP // "Сборная солянка" для приоритетных допов
}

Table Group {
  id String [pk, default: `cuid()`]
  name String [not null]
  type GroupType [not null]
  grade Int [note: 'Номер класса (1-11). NULL для детского сада или сборных групп.']
  
  // Для подгрупп (SUBJECT_SUBGROUP) здесь будет ID родительского класса
  parentId String [ref: > Group.id, note: 'Ссылка на родительскую группу (для подгрупп)']
  
  // Для подгрупп и допов здесь будет ID предмета
  subjectId String [ref: > Subject.id, note: 'Ссылка на предмет (для подгрупп и допов)']
}

Table Building {
  id String [pk, default: `cuid()`]
  name String [not null]
}

Table Room {
  id String [pk, default: `cuid()`]
  name String [not null]
  seatsCount Int [not null]

  buildingId String
}

Table RoomSubject {
  roomId String [pk]
  subjectId String [pk]
}

Enum SubjectType {
  ACADEMIC // Основной предмет
  ELECTIVE // Дополнительное занятие
  REGIME   // Режимный момент (еда, прогулка)
}

Table Subject {
  id String [pk, default: `cuid()`]
  name String [not null]

  type SubjectType [not null, default: 'ACADEMIC']  
}

Enum AvailabilityType {
  PREFERRED // Предпочтительное время, самый высокий приоритет
  AVAILABLE // Доступен, но менее предпочтительно
  UNAVAILABLE // Недоступен (используется для переопределений)
}

Table TeacherSubject {
  teacherId String [pk, ref: > Teacher.id]
  subjectId String [pk, ref: > Subject.id]
  minGrade Int [note: 'Минимальный класс, для которого учитель ведет этот предмет. 0 для детского сада.']
  maxGrade Int [note: 'Максимальный класс.']
}

// Таблица для хранения повторяющегося еженедельного расписания учителя
Table TeacherAvailability {
  id String [pk, default: `cuid()`]
  teacherId String [not null, ref: > Teacher.id]
  dayOfWeek Int [not null, note: '0: Sunday, 1: Monday, ..., 6: Saturday']
  startTime Time [not null]
  endTime Time [not null]
  type AvailabilityType [not null, default: 'AVAILABLE']

  Indexes {
    (teacherId, dayOfWeek)
  }
}

// Таблица для разовых исключений или добавлений в расписание
Table TeacherAvailabilityOverride {
  id String [pk, default: `cuid()`]
  teacherId String [not null, ref: > Teacher.id]
  startTime DateTime [not null]
  endTime DateTime [not null]
  type AvailabilityType [not null, note: 'Используется для блокировки времени (UNAVAILABLE) или указания доп. доступности (AVAILABLE/PREFERRED)']

  Indexes {
    (teacherId, startTime)
  }
}

// Шаблон расписания на неделю (цикличный)
Table WeeklyScheduleTemplate {
  id String [pk, default: `cuid()`]
  dayOfWeek Int [not null, note: 'День недели (0-6)']
  startTime String [not null, note: 'Время начала урока (например "09:00")']
  endTime String [not null, note: 'Время окончания урока']
  
  groupId String [not null, ref: > Group.id]
  roomId String [ref: > Room.id]
  teacherId String [ref: > Teacher.id]
  subjectId String [not null, ref: > Subject.id]
  
  Indexes {
    (groupId, dayOfWeek, startTime)
  }
}

// Главная таблица для конкретных инстансов (на конкретную дату)
Table ScheduleEntry {
  id String [pk, default: `cuid()`]
  templateId String [ref: > WeeklyScheduleTemplate.id, note: 'Может быть NULL для разовых / внеплановых событий']
  date DateTime [not null, note: 'Конкретная дата проведения']
  startTime DateTime [not null, note: 'Точное дата/время начала']
  endTime DateTime [not null, note: 'Точное дата/время окончания']
  
  groupId String [not null, ref: > Group.id]
  roomId String [ref: > Room.id] // Может быть NULL, если событие не в кабинете (например, онлайн)
  teacherId String [ref: > Teacher.id] // Может быть NULL для самостоятельной работы или некоторых режимных моментов
  subjectId String [not null, ref: > Subject.id]
  
  Indexes {
    (groupId, startTime)
    (teacherId, startTime)
    (roomId, startTime)
  }
}

Table GroupSubjectRequirement {
  groupId String [pk, ref: > Group.id]
  subjectId String [pk, ref: > Subject.id]
  
  lessonsPerWeek Int [not null, note: 'Сколько раз в неделю должен быть этот предмет для данной группы']
  durationInMinutes Int [not null, note: 'Длительность одного занятия в минутах для этой группы']
  breakDuration Int [not null, default: 0, note: 'Требуется ли длинная перемена после этого урока (в минутах)']
}

Ref: Room.buildingId < Building.id
Ref: StudentParents.studentId < Student.id
Ref: StudentParents.parentId < Parent.id
Ref: StudentGroups.studentId > Student.id
Ref: StudentGroups.groupId > Group.id
Ref: RoomSubject.subjectId > Subject.id
Ref: RoomSubject.roomId > Room.id
Ref: Account.userId > User.id [delete: cascade]
Ref: Session.userId > User.id [delete: cascade]
Ref: Authenticator.userId > User.id [delete: cascade]
Ref: User.id - Parent.userId
Ref: User.id - Student.userId
Ref: User.id - Teacher.userId