import { Prisma } from "@/generated/prisma/client";
import type { UserStatus } from "@/generated/prisma/enums";
import type { RowData } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string;
    cellClassName?: string;
  }
}

export const userInclude = {
  teachers: { select: { id: true } },
  students: {
    select: {
      id: true,
      studentParents: {
        include: {
          parent: {
            include: { user: { select: { name: true, surname: true } } },
          },
        },
      },
    },
  },
  parents: {
    select: {
      id: true,
      studentParents: {
        include: {
          student: {
            include: { user: { select: { name: true, surname: true } } },
          },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

export type UserWithRoles = Prisma.UserGetPayload<{ include: typeof userInclude }>;

export type DomainRole = "teacher" | "student" | "parent";

export type UsersFilterState = {
  search?: string;
  domainRole?: DomainRole;
  status?: UserStatus;
};

export type UserTableMeta = {
  setModal: (
    modal: {
      type: "profile" | "delete";
      user: UserWithRoles;
    } | null
  ) => void;
  setInviteId: (id: string | null) => void;
};
