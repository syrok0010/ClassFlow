import type {GroupType} from "@/generated/prisma/enums";

export const MISSING_TEACHER_LABEL = "Преподаватель не назначен";
export const MISSING_ROOM_LABEL = "Кабинет не указан";
export const GROUP_TYPE_LABELS: Record<GroupType, string> = {
    CLASS: "Класс",
    KINDERGARTEN_GROUP: "Детсадовская группа",
    SUBJECT_SUBGROUP: "Подгруппа",
    ELECTIVE_GROUP: "Элективная группа",
};