import { session, authReady } from "@/lib/auth";
import { db } from "@/lib/store";
import { Admin, type Entry, type RecordEntry } from "@/components/admin";
export const dynamic = "force-dynamic";
export default async function Page() {
  const s = await session();
  const content =
    s && s.role !== "sales"
      ? (db()
          .prepare("SELECT * FROM content ORDER BY position,updated DESC")
          .all()
          .map((r) => ({
            ...r,
            data: JSON.parse(r.data as string),
          })) as Entry[])
      : [];
  const records =
    s && s.role !== "editor"
      ? (db()
          .prepare("SELECT * FROM enquiries ORDER BY created DESC LIMIT 200")
          .all()
          .map((r) => ({
            ...r,
            data: JSON.parse(r.data as string),
            documents: db()
              .prepare("SELECT id,name FROM documents WHERE enquiry=?")
              .all(r.id as string)
              .map((d) => ({ ...d })),
          })) as RecordEntry[])
      : [];
  const history =
    s && s.role !== "sales"
      ? db()
          .prepare("SELECT * FROM versions ORDER BY created DESC LIMIT 100")
          .all()
          .map((v) => ({ ...v }))
      : [];
  return (
    <Admin
      csrf={s?.csrf || ""}
      role={s?.role || ""}
      configured={authReady()}
      initialContent={content}
      initialRecords={records}
      initialHistory={history}
    />
  );
}
