export default function UsersPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        <h1 className="text-3xl font-bold tracking-tight">Пользователи</h1>
      </div>
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground">Управление учениками, учителями и родителями.</p>
        <div className="rounded-xl border bg-card text-card-foreground shadow min-h-64 flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Таблица пользователей будет здесь</p>
        </div>
      </div>
    </div>
  );
}
