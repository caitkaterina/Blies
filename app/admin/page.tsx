import {
  persistentStorageEnabled,
  StorageUnavailable,
} from "@/lib/storage-policy";
import { session, authReady } from "@/lib/auth";
import { contentState, records as listRecords } from "@/lib/persistence";
import { Admin, type Entry, type RecordEntry } from "@/components/admin";
export const dynamic = "force-dynamic";
async function renderAdmin() {
  const s = await session();
  const state =
    s && s.role !== "sales"
      ? await contentState()
      : { content: [], versions: [], audit: [] };
  const content = state.content as Entry[];
  const records =
    s && s.role !== "editor" ? ((await listRecords()) as RecordEntry[]) : [];
  const history = state.versions;
  return (
    <Admin
      csrf={s?.csrf || ""}
      role={s?.role || ""}
      configured={authReady()}
      backendAvailable={persistentStorageEnabled()}
      initialContent={content}
      initialRecords={records}
      initialHistory={history}
    />
  );
}

export default async function Page() {
  try {
    return await renderAdmin();
  } catch (error) {
    if (error instanceof StorageUnavailable)
      return (
        <main className="admin-login">
          <h1>Administration unavailable</h1>
          <p>
            Private staff services require a configured persistent backend. No
            records are available.
          </p>
        </main>
      );
    throw error;
  }
}
