"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import { pages } from "@/lib/content";
import { locales, type Localized } from "@/lib/i18n";
import type { ContentData } from "@/lib/cms-types";
export type Entry = {
  id?: string;
  kind: string;
  slug: string;
  status: string;
  position: number;
  data: ContentData;
};
export type RecordEntry = {
  id: string;
  kind: string;
  created: string;
  status: string;
  queue: string;
  email_status: string;
  assigned: string;
  reply: string;
  data: Record<string, string>;
  documents: { id: string; name: string }[];
};
type ShipmentEntry = {
  id: string;
  reference: string;
  customerId: string;
  status: string;
  updated: string;
  events: {
    id: string;
    created: string;
    status: string;
    location: string;
    description: string;
  }[];
};
type AuditEntry = {
  id: string | number;
  created: string;
  actor: string;
  event: string;
  target: string;
};
type CustomerAccount = {
  id: string;
  email: string;
  name: string;
  confirmed: boolean;
};
const emptyText = (): Localized => ({ en: "", fr: "", ar: "" });
const newEntry = (): Entry => ({
  kind: "service",
  slug: "",
  status: "draft",
  position: 0,
  data: {
    title: emptyText(),
    intro: emptyText(),
    points: [],
    verified: false,
    owned: false,
    planned: false,
    tracking: false,
  },
});
export function Admin({
  csrf,
  role,
  configured,
  backendAvailable = true,
  initialContent,
  initialRecords,
  initialHistory,
}: {
  csrf: string;
  role: string;
  configured: boolean;
  backendAvailable?: boolean;
  initialContent: Entry[];
  initialRecords: RecordEntry[];
  initialHistory: unknown[];
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState(role === "sales" ? "enquiries" : "content"),
    [content, setContent] = useState<Entry[]>(initialContent),
    [records, setRecords] = useState<RecordEntry[]>(initialRecords),
    [entry, setEntry] = useState<Entry>(newEntry()),
    [history, setHistory] = useState<unknown[]>(initialHistory),
    [shipments, setShipments] = useState<ShipmentEntry[]>([]),
    [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]),
    [listBusy, setListBusy] = useState(false),
    [listError, setListError] = useState(""),
    [recordFilter, setRecordFilter] = useState(""),
    [recordStatus, setRecordStatus] = useState(""),
    [shipmentFilter, setShipmentFilter] = useState(""),
    [auditFilter, setAuditFilter] = useState(""),
    [customers, setCustomers] = useState<CustomerAccount[]>([]),
    [customersConfigured, setCustomersConfigured] = useState<boolean>(),
    [customersBusy, setCustomersBusy] = useState(false),
    [customersError, setCustomersError] = useState(""),
    [customersPage, setCustomersPage] = useState(1),
    [selectedCustomerId, setSelectedCustomerId] = useState("");
  const loadCustomers = useCallback(async (page = 1) => {
    setCustomersBusy(true);
    setCustomersError("");
    try {
      const response = await fetch(`/api/admin/customers?page=${page}`);
      const data = await response.json();
      if (!response.ok)
        throw Error(data.error || "Customer accounts could not be loaded.");
      setCustomers(data.customers);
      setCustomersConfigured(data.configured);
      setCustomersPage(page);
    } catch (error) {
      setCustomersError(
        error instanceof Error
          ? error.message
          : "Customer accounts could not be loaded.",
      );
    } finally {
      setCustomersBusy(false);
    }
  }, []);
  const loadPrivateTab = useCallback(
    async (requestedTab = tab) => {
      if (!csrf || !["shipments", "audit"].includes(requestedTab)) return;
      setListBusy(true);
      setListError("");
      try {
        const response = await fetch(`/api/admin/${requestedTab}`);
        const data = await response.json();
        if (!response.ok)
          throw Error(data.error || "Records could not be loaded.");
        if (requestedTab === "shipments") setShipments(data.shipments);
        else setAuditEntries(data.audit);
      } catch (error) {
        setListError(
          error instanceof Error
            ? error.message
            : "Records could not be loaded.",
        );
      } finally {
        setListBusy(false);
      }
    },
    [csrf, tab],
  );
  const load = useCallback(async () => {
    if (!csrf) return;
    try {
      if (role !== "sales") {
        const r = await fetch("/api/admin/content");
        if (!r.ok) throw Error();
        const data = await r.json();
        setContent(data.content);
        setHistory(data.versions);
      }
      if (role !== "editor") {
        const r = await fetch("/api/admin/records");
        if (!r.ok) throw Error();
        setRecords((await r.json()).records);
      }
    } catch {
      setMessage("Session unavailable. Sign in again.");
    }
  }, [csrf, role]);
  async function post(url: string, data: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify(data),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error || "Request failed");
      const notification = result.notificationStatus;
      setMessage(
        result.delivery
          ? result.delivery.notConfigured
            ? "Email delivery is not configured. Notifications remain pending."
            : `${result.delivery.sent} notification(s) sent; ${result.delivery.pending} pending.`
          : `Saved successfully.${
              notification === "sent"
                ? " Email notification sent."
                : notification === "pending"
                  ? " Email notification is pending."
                  : notification === "not-configured"
                    ? " Email delivery is not configured."
                    : ""
            }`,
      );
      await load();
      if (["shipments", "audit"].includes(tab)) await loadPrivateTab();
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Request failed");
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (!csrf)
    return (
      <main className="admin-login">
        <Link className="wordmark" href="/en">
          BLIES
        </Link>
        <h1>Administration</h1>
        <p>Staff access only. Password and authenticator code are required.</p>
        {!backendAvailable ? (
          <div className="warning">
            Private staff services are unavailable until a persistent backend is
            connected. Administrator access is closed.
          </div>
        ) : !configured ? (
          <div className="warning">
            Administrator access is disabled until the email, password hash,
            TOTP secret and session signing secret are configured securely.
            There are no default credentials.
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              if (await post("/api/admin/login", data))
                window.location.reload();
            }}
          >
            <label>
              Email
              <input
                type="email"
                name="email"
                required
                autoComplete="username"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
              />
            </label>
            <label>
              Authenticator code
              <input
                name="code"
                pattern="[0-9]{6}"
                inputMode="numeric"
                required
                autoComplete="one-time-code"
              />
            </label>
            <button className="button" disabled={busy}>
              Sign in securely
            </button>
          </form>
        )}
        {message && <p role="alert">{message}</p>}
      </main>
    );
  function localized(
    field: "title" | "intro",
    lang: (typeof locales)[number],
    value: string,
  ) {
    setEntry({
      ...entry,
      data: { ...entry.data, [field]: { ...entry.data[field], [lang]: value } },
    });
  }
  return (
    <main className="admin-shell">
      <div className="admin-top">
        <Link className="wordmark" href="/en">
          BLIES <span>ADMINISTRATION</span>
        </Link>
        <span>Role: {role}</span>
        <button
          onClick={async () => {
            if (await post("/api/admin/logout", {})) window.location.reload();
          }}
        >
          Sign out
        </button>
      </div>
      <h1>Content & enquiries</h1>
      <nav className="admin-tabs" style={{ flexWrap: "wrap" }}>
        {[
          ...(role !== "sales" ? ["content"] : []),
          ...(role !== "editor" ? ["enquiries", "shipments"] : []),
          ...(role !== "sales" ? ["versions"] : []),
          ...(role === "admin" ? ["audit"] : []),
        ].map((t) => (
          <button
            key={t}
            aria-pressed={tab === t}
            onClick={() => {
              setTab(t);
              setListError("");
              void loadPrivateTab(t);
              if (t === "shipments") void loadCustomers(1);
            }}
          >
            {t}
          </button>
        ))}
      </nav>
      {message && (
        <p role="status" className="warning">
          {message}
        </p>
      )}
      {tab === "content" && role !== "sales" && (
        <div className="cms-grid">
          <aside>
            <button className="button" onClick={() => setEntry(newEntry())}>
              New entry
            </button>
            <label>
              Start from a service or industry page
              <select
                defaultValue=""
                onChange={(e) => {
                  const p = pages.find((p) => p.slug === e.target.value);
                  if (p)
                    setEntry({
                      kind: p.group === "industries" ? "industry" : "service",
                      slug: p.slug,
                      status: "draft",
                      position: 0,
                      data: {
                        title: p.title,
                        intro: p.intro,
                        points: p.points,
                        verified: false,
                      },
                    });
                }}
              >
                <option value="">Choose a page</option>
                {pages.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.title.en}
                  </option>
                ))}
              </select>
            </label>
            {content.map((c) => (
              <button
                className="content-list-item"
                key={c.id}
                onClick={() => setEntry(c)}
              >
                <strong>{c.data.title.en}</strong>
                <span>
                  {c.kind} · {c.status} · {c.position}
                </span>
              </button>
            ))}
          </aside>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (await post("/api/admin/content", entry)) setEntry(newEntry());
            }}
          >
            <div className="form-fields">
              <label>
                Content type
                <select
                  value={entry.kind}
                  onChange={(e) => setEntry({ ...entry, kind: e.target.value })}
                >
                  {[
                    "service",
                    "industry",
                    "fleet",
                    "location",
                    "article",
                    "settings",
                  ].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label>
                URL slug
                <input
                  value={entry.slug}
                  onChange={(e) => setEntry({ ...entry, slug: e.target.value })}
                  required
                  placeholder="fleet/verified-category"
                />
              </label>
              <label>
                Publication status
                <select
                  value={entry.status}
                  onChange={(e) =>
                    setEntry({ ...entry, status: e.target.value })
                  }
                >
                  {["draft", "published", "archived"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Display order
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={entry.position}
                  onChange={(e) =>
                    setEntry({ ...entry, position: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            {locales.map((l) => (
              <fieldset key={l} dir={l === "ar" ? "rtl" : "ltr"}>
                <legend>
                  {l === "en" ? "English" : l === "fr" ? "Français" : "العربية"}
                </legend>
                <label>
                  Title
                  <input
                    value={entry.data.title[l]}
                    required
                    onChange={(e) => localized("title", l, e.target.value)}
                  />
                </label>
                <label>
                  Introduction
                  <textarea
                    value={entry.data.intro[l]}
                    required
                    onChange={(e) => localized("intro", l, e.target.value)}
                  />
                </label>
                <label>
                  Body paragraphs (one per line)
                  <textarea
                    value={entry.data.points.map((p) => p[l]).join("\n")}
                    onChange={(e) => {
                      const rows = e.target.value.split("\n");
                      const points = Array.from(
                        {
                          length: Math.max(
                            rows.length,
                            entry.data.points.length,
                          ),
                        },
                        (_, i) => ({
                          ...(entry.data.points[i] || emptyText()),
                          [l]: rows[i] || "",
                        }),
                      );
                      setEntry({ ...entry, data: { ...entry.data, points } });
                    }}
                  />
                </label>
              </fieldset>
            ))}
            <label className="checkbox">
              <input
                type="checkbox"
                checked={entry.data.verified}
                onChange={(e) =>
                  setEntry({
                    ...entry,
                    data: { ...entry.data, verified: e.target.checked },
                  })
                }
              />
              Management has verified all claims and approved every translation.
            </label>
            {entry.kind === "fleet" && (
              <>
                <div className="form-fields">
                  {(["owned", "planned", "tracking"] as const).map((k) => (
                    <label className="checkbox" key={k}>
                      <input
                        type="checkbox"
                        checked={!!entry.data[k]}
                        onChange={(e) =>
                          setEntry({
                            ...entry,
                            data: { ...entry.data, [k]: e.target.checked },
                          })
                        }
                      />
                      {k}
                    </label>
                  ))}
                  {(
                    [
                      "specifications",
                      "certifications",
                      "imageUrl",
                      "videoUrl",
                    ] as const
                  ).map((k) => (
                    <label key={k}>
                      {k}
                      <input
                        value={entry.data[k] || ""}
                        onChange={(e) =>
                          setEntry({
                            ...entry,
                            data: { ...entry.data, [k]: e.target.value },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                <p>
                  Only confirmed owned assets can be published. Planned assets
                  stay internal. Use authentic, approved media. Include
                  translated specifications in body paragraphs.
                </p>
              </>
            )}
            {entry.kind === "article" && (
              <div className="form-fields">
                <label>
                  Author
                  <input
                    value={entry.data.author || ""}
                    onChange={(e) =>
                      setEntry({
                        ...entry,
                        data: { ...entry.data, author: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  Publication date
                  <input
                    type="date"
                    value={entry.data.publicationDate || ""}
                    onChange={(e) =>
                      setEntry({
                        ...entry,
                        data: {
                          ...entry.data,
                          publicationDate: e.target.value,
                        },
                      })
                    }
                  />
                </label>
              </div>
            )}
            {entry.kind === "location" && (
              <>
                <div className="form-fields">
                  {(["x", "y"] as const).map((k) => (
                    <label key={k}>
                      Map {k} coordinate (0–100)
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={entry.data[k] ?? ""}
                        onChange={(e) =>
                          setEntry({
                            ...entry,
                            data: {
                              ...entry.data,
                              [k]: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                <label>
                  Classification
                  <select
                    value={entry.data.locationRole || "base"}
                    onChange={(e) =>
                      setEntry({
                        ...entry,
                        data: { ...entry.data, locationRole: e.target.value },
                      })
                    }
                  >
                    {[
                      "base",
                      "operating",
                      "sourcing",
                      "destination",
                      "coverage",
                    ].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {entry.kind === "settings" && (
              <div className="form-fields">
                {(
                  [
                    "corporateEmail",
                    "salesEmail",
                    "procurementEmail",
                    "logisticsEmail",
                    "quotationsEmail",
                    "phone",
                    "whatsapp",
                  ] as const
                ).map((k) => (
                  <label key={k}>
                    {k}
                    <input
                      type={["whatsapp", "phone"].includes(k) ? "tel" : "email"}
                      value={entry.data[k] || ""}
                      onChange={(e) =>
                        setEntry({
                          ...entry,
                          data: {
                            ...entry.data,
                            [k]: e.target.value || undefined,
                          },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            )}
            <button className="button" disabled={busy}>
              Save entry
            </button>
          </form>
        </div>
      )}
      {tab === "enquiries" && role !== "editor" && (
        <section>
          <div className="form-fields">
            <label>
              Search enquiries
              <input
                type="search"
                value={recordFilter}
                onChange={(e) => setRecordFilter(e.target.value)}
              />
            </label>
            <label>
              Filter enquiry status
              <select
                value={recordStatus}
                onChange={(e) => setRecordStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                {["received", "in-review", "responded", "closed"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          {records.length === 0 && <p>No enquiries received.</p>}
          {records.length > 0 &&
            !records.some(
              (r) =>
                (!recordStatus || r.status === recordStatus) &&
                `${r.id} ${r.kind} ${r.assigned} ${Object.values(r.data).join(" ")}`
                  .toLowerCase()
                  .includes(recordFilter.toLowerCase()),
            ) && <p>No enquiries match these filters.</p>}
          {records
            .filter(
              (r) =>
                (!recordStatus || r.status === recordStatus) &&
                `${r.id} ${r.kind} ${r.assigned} ${Object.values(r.data).join(" ")}`
                  .toLowerCase()
                  .includes(recordFilter.toLowerCase()),
            )
            .map((r) => (
              <form
                className="admin-record"
                key={r.id}
                onSubmit={async (e) => {
                  e.preventDefault();
                  await post("/api/admin/records", {
                    id: r.id,
                    ...Object.fromEntries(new FormData(e.currentTarget)),
                    sendReply:
                      (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
                        "name",
                      ) === "sendReply",
                  });
                }}
              >
                <h2>{r.id}</h2>
                <p>
                  {r.created} · {r.queue} · email: {r.email_status}
                </p>
                <dl>
                  {Object.entries(r.data)
                    .filter(([k]) => !["consent", "website"].includes(k))
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{String(v)}</dd>
                      </div>
                    ))}
                </dl>
                <div className="document-links">
                  {r.documents.map((d) => (
                    <a key={d.id} href={`/api/admin/documents/${d.id}`}>
                      {d.name}
                    </a>
                  ))}
                </div>
                <div className="form-fields">
                  <label>
                    Status
                    <select name="status" defaultValue={r.status}>
                      {["received", "in-review", "responded", "closed"].map(
                        (s) => (
                          <option key={s}>{s}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    Assigned to
                    <input name="assigned" defaultValue={r.assigned} />
                  </label>
                  <label className="full">
                    Internal response draft
                    <textarea name="reply" defaultValue={r.reply} />
                  </label>
                </div>
                <button className="button" disabled={busy}>
                  Save internal follow-up
                </button>
                <button
                  className="button secondary"
                  type="submit"
                  name="sendReply"
                  disabled={busy}
                >
                  Send response by email
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    post("/api/admin/records", {
                      id: r.id,
                      status: r.status,
                      assigned: r.assigned,
                      reply: r.reply,
                      retryEmail: true,
                    })
                  }
                >
                  Retry confirmation email
                </button>
                <p>
                  Response drafts remain private until you choose Send response
                  by email. The configured verified sender is required; missing
                  or failed delivery is reported and never marked sent.
                </p>
              </form>
            ))}
        </section>
      )}
      {tab === "shipments" && role !== "editor" && (
        <section>
          <h2>Shipment management</h2>
          <p>
            Assign a genuine shipment reference to an existing customer account.
            Customers can only retrieve shipments assigned to their account.
          </p>
          <form
            className="admin-record"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              if (
                await post("/api/admin/shipments", {
                  action: "create",
                  ...Object.fromEntries(new FormData(form)),
                })
              ) {
                form.reset();
                setSelectedCustomerId("");
              }
            }}
          >
            <h3>Create shipment</h3>
            <div className="form-fields">
              <label>
                Shipment reference
                <input name="reference" required maxLength={100} />
              </label>
              <label>
                Customer account UUID
                <input
                  name="customerId"
                  required
                  maxLength={36}
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                />
              </label>
              <label>
                Initial status
                <input name="status" required maxLength={120} />
              </label>
              <label>
                Initial location
                <input name="location" maxLength={200} />
              </label>
              <label className="full">
                Initial update description
                <textarea name="description" maxLength={2000} />
              </label>
            </div>
            {customersConfigured !== false && (
              <label>
                Existing customer account
                <select
                  disabled={customersBusy || busy || customers.length === 0}
                  value={
                    customers.some(
                      (customer) => customer.id === selectedCustomerId,
                    )
                      ? selectedCustomerId
                      : ""
                  }
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">Choose an existing customer account</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name ? `${customer.name} · ` : ""}
                      {customer.email}
                      {!customer.confirmed && " · email unconfirmed"}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {customersBusy && <p role="status">Loading customer accounts…</p>}
            {customersError && <p role="alert">{customersError}</p>}
            {!customersBusy && customersConfigured === false && (
              <p>
                The customer account directory requires Supabase Auth. Local
                development has no customer account registry.
              </p>
            )}
            {!customersBusy &&
              !customersError &&
              customersConfigured &&
              customers.length === 0 && (
                <p>No customer accounts were returned for this page.</p>
              )}
            {customersConfigured && (
              <div>
                <p>Customer account page {customersPage}</p>
                <button
                  type="button"
                  disabled={customersBusy || customersPage === 1}
                  onClick={() => void loadCustomers(customersPage - 1)}
                >
                  Previous customer accounts
                </button>
                <button
                  type="button"
                  disabled={
                    customersBusy ||
                    customers.length < 50 ||
                    customersPage === 1000
                  }
                  onClick={() => void loadCustomers(customersPage + 1)}
                >
                  Next customer accounts
                </button>
              </div>
            )}
            <button
              type="button"
              disabled={customersBusy || busy}
              onClick={() => void loadCustomers(customersPage)}
            >
              Refresh customer accounts
            </button>
            <button className="button" disabled={busy}>
              Create shipment
            </button>
          </form>
          <label>
            Search shipments
            <input
              type="search"
              value={shipmentFilter}
              onChange={(e) => setShipmentFilter(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={listBusy || busy}
            onClick={() => void loadPrivateTab()}
          >
            Refresh shipments
          </button>
          {listBusy && <p role="status">Loading shipments…</p>}
          {listError && <p role="alert">{listError}</p>}
          {!listBusy && !listError && shipments.length === 0 && (
            <p>No shipments have been created.</p>
          )}
          {!listBusy &&
            !listError &&
            shipments.length > 0 &&
            !shipments.some((s) =>
              `${s.reference} ${s.status} ${s.customerId}`
                .toLowerCase()
                .includes(shipmentFilter.toLowerCase()),
            ) && <p>No shipments match this search.</p>}
          {shipments
            .filter((s) =>
              `${s.reference} ${s.status} ${s.customerId}`
                .toLowerCase()
                .includes(shipmentFilter.toLowerCase()),
            )
            .map((shipment) => (
              <form
                className="admin-record"
                key={shipment.id}
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  if (
                    await post("/api/admin/shipments", {
                      action: "update",
                      id: shipment.id,
                      ...Object.fromEntries(new FormData(form)),
                    })
                  )
                    form.reset();
                }}
              >
                <h3>{shipment.reference}</h3>
                <p>
                  {shipment.status} · {shipment.updated}
                </p>
                <p>Customer account: {shipment.customerId}</p>
                <ol>
                  {(shipment.events || []).map((event) => (
                    <li key={event.id}>
                      {event.created} · {event.status}
                      {event.location && ` · ${event.location}`}
                      {event.description && <p>{event.description}</p>}
                    </li>
                  ))}
                </ol>
                <div className="form-fields">
                  <label>
                    Updated status
                    <input name="status" required maxLength={120} />
                  </label>
                  <label>
                    Update location
                    <input name="location" maxLength={200} />
                  </label>
                  <label className="full">
                    Update description
                    <textarea name="description" maxLength={2000} />
                  </label>
                </div>
                <button className="button" disabled={busy}>
                  Add shipment update
                </button>
              </form>
            ))}
        </section>
      )}
      {tab === "audit" && role === "admin" && (
        <section>
          <h2>Administrative audit records</h2>
          <p>Recent sensitive actions are recorded with their staff actor.</p>
          <label>
            Search audit records
            <input
              type="search"
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={listBusy || busy}
            onClick={() => void loadPrivateTab()}
          >
            Refresh audit records
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void post("/api/admin/notifications", {})}
          >
            Retry pending notifications
          </button>
          {listBusy && <p role="status">Loading audit records…</p>}
          {listError && <p role="alert">{listError}</p>}
          {!listBusy && !listError && auditEntries.length === 0 && (
            <p>No audit records available.</p>
          )}
          {!listBusy &&
            !listError &&
            auditEntries.length > 0 &&
            !auditEntries.some((a) =>
              `${a.actor} ${a.event} ${a.target}`
                .toLowerCase()
                .includes(auditFilter.toLowerCase()),
            ) && <p>No audit records match this search.</p>}
          {auditEntries
            .filter((a) =>
              `${a.actor} ${a.event} ${a.target}`
                .toLowerCase()
                .includes(auditFilter.toLowerCase()),
            )
            .map((a) => (
              <div className="admin-record" key={a.id}>
                <p>{a.created}</p>
                <p>
                  {a.actor} · {a.event} · {a.target}
                </p>
              </div>
            ))}
        </section>
      )}
      {tab === "versions" && role !== "sales" && (
        <section>
          <h2>Content history</h2>
          <p>
            Previous versions are retained on every edit. Restore by copying the
            approved prior content into the editor; publishing remains explicit.
          </p>
          <pre>{JSON.stringify(history, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}
