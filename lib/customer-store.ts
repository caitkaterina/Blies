import "server-only";
import { randomUUID } from "node:crypto";
import { db, audit as sqliteAudit } from "./store";
import { rpc, supabaseRequest, SupabaseDatabaseError } from "./supabase-http";
import type { DocumentRow } from "./persistence";

const remote = () => process.env.BLIES_STORAGE_MODE === "supabase";
const uuid = (value: string) =>
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
export class ShipmentInputError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export type ShipmentEvent = {
  id: string;
  status: string;
  location: string;
  description: string;
  created: string;
};
export type Shipment = {
  id: string;
  reference: string;
  status: string;
  created: string;
  updated: string;
  events: ShipmentEvent[];
};
export type StaffShipment = Shipment & { customerId: string };
export type ShipmentUpdate = {
  id: string;
  status: string;
  location: string;
  description: string;
};
export type ShipmentCreate = ShipmentUpdate & {
  reference: string;
  customerId: string;
};
export type CustomerRecord = {
  id: string;
  kind: string;
  status: string;
  created: string;
  data: Record<string, unknown>;
  documents: { id: string; name: string; type: string }[];
};
// Restrict the customer projection explicitly; staff assignment, replies, queues, delivery
// metadata and storage paths must not accidentally appear after future schema additions.
const dataFields = new Set([
  "locale",
  "service",
  "originCountry",
  "originCity",
  "collection",
  "destinationCountry",
  "destinationCity",
  "crossBorder",
  "cargo",
  "category",
  "quantity",
  "unit",
  "weight",
  "dimensions",
  "packaging",
  "temperature",
  "requirements",
  "dangerous",
  "date",
  "urgency",
  "company",
  "name",
  "email",
  "phone",
  "notes",
  "consent",
  "shipment",
  "message",
]);
export function customerRecordProjection(
  row: Record<string, unknown>,
): CustomerRecord {
  const raw = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
  const data =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? Object.fromEntries(
          Object.entries(raw).filter(([key]) => dataFields.has(key)),
        )
      : {};
  return {
    id: String(row.id),
    kind: String(row.kind),
    status: String(row.status),
    created: String(row.created),
    data,
    documents: Array.isArray(row.documents)
      ? row.documents.map((doc) => ({
          id: String(doc.id),
          name: String(doc.name),
          type: String(doc.type),
        }))
      : [],
  };
}
export async function customerRecords(
  owner: string,
): Promise<CustomerRecord[]> {
  if (!uuid(owner)) return [];
  if (remote()) {
    const rows = await (
      await supabaseRequest(
        `/rest/v1/enquiries?select=id,kind,status,created,data,documents(id,name,type)&customer_id=eq.${owner}&order=created.desc&limit=200`,
      )
    ).json();
    return rows.map(customerRecordProjection);
  }
  return db()
    .prepare(
      "SELECT id,kind,status,created,data FROM enquiries WHERE customer_id=? ORDER BY created DESC LIMIT 200",
    )
    .all(owner)
    .map((row) =>
      customerRecordProjection({
        ...row,
        documents: db()
          .prepare("SELECT id,name,type FROM documents WHERE enquiry=?")
          .all(String(row.id)),
      }),
    );
}
export async function canAccessDocument(
  owner: string,
  id: string,
): Promise<DocumentRow | undefined> {
  if (!uuid(owner) || !uuid(id)) return undefined;
  if (remote()) {
    const rows = await (
      await supabaseRequest(
        `/rest/v1/documents?select=id,name,type,file,enquiries!inner(customer_id)&id=eq.${id}&enquiries.customer_id=eq.${owner}&limit=1`,
      )
    ).json();
    return rows[0];
  }
  return db()
    .prepare(
      "SELECT d.id,d.name,d.type,d.file FROM documents d JOIN enquiries e ON e.id=d.enquiry WHERE d.id=? AND e.customer_id=?",
    )
    .get(id, owner) as DocumentRow | undefined;
}
function shipmentProjection(row: Record<string, unknown>): StaffShipment {
  return {
    id: String(row.id),
    reference: String(row.reference),
    customerId: String(row.customer_id),
    status: String(row.status),
    created: String(row.created),
    updated: String(row.updated),
    events: Array.isArray(row.shipment_events)
      ? row.shipment_events
          .map((event) => ({
            id: String(event.id),
            status: String(event.status),
            location: String(event.location),
            description: String(event.description),
            created: String(event.created),
          }))
          .sort(
            (a, b) =>
              a.created.localeCompare(b.created) || a.id.localeCompare(b.id),
          )
      : [],
  };
}
async function readShipments(
  owner?: string,
  reference?: string,
): Promise<StaffShipment[]> {
  if (remote()) {
    const query = new URLSearchParams({
      select:
        "id,reference,customer_id,status,created,updated,shipment_events(id,status,location,description,created)",
      order: "created.desc",
      limit: "200",
    });
    if (owner) query.set("customer_id", `eq.${owner}`);
    if (reference) query.set("reference", `eq.${reference}`);
    return (
      await (await supabaseRequest(`/rest/v1/shipments?${query}`)).json()
    ).map(shipmentProjection);
  }
  const predicates: string[] = [],
    params: string[] = [];
  if (owner) {
    predicates.push("customer_id=?");
    params.push(owner);
  }
  if (reference) {
    predicates.push("reference=?");
    params.push(reference);
  }
  return db()
    .prepare(
      `SELECT * FROM shipments ${predicates.length ? `WHERE ${predicates.join(" AND ")}` : ""} ORDER BY created DESC LIMIT 200`,
    )
    .all(...params)
    .map((row) =>
      shipmentProjection({
        ...row,
        shipment_events: db()
          .prepare(
            "SELECT id,status,location,description,created FROM shipment_events WHERE shipment=? ORDER BY created,id",
          )
          .all(String(row.id)),
      }),
    );
}
export const shipments = () => readShipments();
export async function customerShipments(
  owner: string,
  reference?: string,
): Promise<Shipment[]> {
  if (!uuid(owner)) return [];
  return (await readShipments(owner, reference)).map((shipment) => ({
    id: shipment.id,
    reference: shipment.reference,
    status: shipment.status,
    created: shipment.created,
    updated: shipment.updated,
    events: shipment.events,
  }));
}
function validateShipment(value: ShipmentUpdate, actor: string) {
  if (
    !uuid(value.id) ||
    !actor ||
    actor.length > 254 ||
    typeof value.status !== "string" ||
    !value.status.trim() ||
    value.status.length > 120 ||
    typeof value.location !== "string" ||
    value.location.length > 200 ||
    typeof value.description !== "string" ||
    value.description.length > 2000
  )
    throw new ShipmentInputError(400, "Invalid shipment details");
}
function shipmentDatabaseError(error: unknown): never {
  if (error instanceof SupabaseDatabaseError) {
    if (error.code === "23505")
      throw new ShipmentInputError(409, "Reference already exists");
    if (error.code === "23503")
      throw new ShipmentInputError(400, "Customer account not found");
    if (error.code === "P0002")
      throw new ShipmentInputError(404, "Shipment not found");
  }
  throw error;
}
export async function createShipment(actor: string, value: ShipmentCreate) {
  validateShipment(value, actor);
  if (
    !uuid(value.customerId) ||
    typeof value.reference !== "string" ||
    !value.reference.trim() ||
    value.reference.length > 100
  )
    throw new ShipmentInputError(400, "Invalid customer or reference");
  if (remote()) {
    try {
      await rpc("blies_create_shipment", {
        p_actor: actor,
        p_id: value.id,
        p_reference: value.reference.trim(),
        p_customer_id: value.customerId,
        p_status: value.status.trim(),
        p_location: value.location.trim(),
        p_description: value.description.trim(),
      });
    } catch (error) {
      shipmentDatabaseError(error);
    }
    return;
  }
  const connection = db();
  if (
    connection
      .prepare("SELECT id FROM shipments WHERE reference=?")
      .get(value.reference.trim())
  )
    throw new ShipmentInputError(409, "Reference already exists");
  const now = new Date().toISOString();
  connection.exec("BEGIN");
  try {
    connection
      .prepare(
        "INSERT INTO shipments(id,reference,customer_id,status,created,updated) VALUES(?,?,?,?,?,?)",
      )
      .run(
        value.id,
        value.reference.trim(),
        value.customerId,
        value.status.trim(),
        now,
        now,
      );
    connection
      .prepare(
        "INSERT INTO shipment_events(id,shipment,status,location,description,created) VALUES(?,?,?,?,?,?)",
      )
      .run(
        randomUUID(),
        value.id,
        value.status.trim(),
        value.location.trim(),
        value.description.trim(),
        now,
      );
    sqliteAudit(actor, "shipment.created", value.id);
    connection.exec("COMMIT");
  } catch (error) {
    connection.exec("ROLLBACK");
    throw error;
  }
}
export async function updateShipment(actor: string, value: ShipmentUpdate) {
  validateShipment(value, actor);
  if (remote()) {
    try {
      await rpc("blies_update_shipment", {
        p_actor: actor,
        p_id: value.id,
        p_status: value.status.trim(),
        p_location: value.location.trim(),
        p_description: value.description.trim(),
      });
    } catch (error) {
      shipmentDatabaseError(error);
    }
    return;
  }
  const connection = db(),
    now = new Date().toISOString();
  connection.exec("BEGIN");
  try {
    const result = connection
      .prepare("UPDATE shipments SET status=?,updated=? WHERE id=?")
      .run(value.status.trim(), now, value.id);
    if (!result.changes)
      throw new ShipmentInputError(404, "Shipment not found");
    connection
      .prepare(
        "INSERT INTO shipment_events(id,shipment,status,location,description,created) VALUES(?,?,?,?,?,?)",
      )
      .run(
        randomUUID(),
        value.id,
        value.status.trim(),
        value.location.trim(),
        value.description.trim(),
        now,
      );
    sqliteAudit(actor, "shipment.updated", value.id);
    connection.exec("COMMIT");
  } catch (error) {
    connection.exec("ROLLBACK");
    throw error;
  }
}
