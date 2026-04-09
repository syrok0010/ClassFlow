import { getTeachingPageDataAction } from "./_actions/teacher-subject-actions";
import {
  TeacherSubjectsPageClient,
  TeacherSubjectsPageError,
} from "./_components/teacher-subjects-page-client";

export const dynamic = "force-dynamic";

export default async function TeacherSubjectsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const response = await getTeachingPageDataAction(id);

  if (response.error || !response.result) {
    return <TeacherSubjectsPageError message={response.error ?? "Неизвестная ошибка"} />;
  }

  return <TeacherSubjectsPageClient initialData={response.result} />;
}
