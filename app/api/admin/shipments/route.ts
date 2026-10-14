import { randomUUID } from "node:crypto";
import { z } from "zod";
import { authorise } from "@/lib/auth";
import { scheduleOutbox } from "@/lib/outbox-scheduler";
export const maxDuration = 60;
import { backendRequest } from "@/lib/backend";
import {
  shipments,
  createShipment,
  updateShipment,
  ShipmentInputError,
} from "@/lib/customer-store";
import { boundedBody, BodyTooLarge } from "@/lib/request-body";

const eventFields = {
  status: z.string().trim().min(1).max(120),
  location: z.string().trim().max(200).default(""),
  description: z.string().trim().max(2000).default(""),
};
const schema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("create"),
      reference: z.string().trim().min(1).max(100),
      customerId: z.uuid(),
      ...eventFields,
    })
    .strict(),
  z
    .object({
      action: z.literal("update"),
      id: z.uuid(),
      ...eventFields,
    })
    .strict(),
]);

export async function GET(request: Request) {
  return backendRequest(async () => {
    if (!(await authorise(request, ["admin", "sales"])))
      return Response.json({ error: "Forbidden" }, { status: 403 });
    return Response.json(
      { shipments: await shipments() },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}

export async function POST(request: Request) {
  return backendRequest(async () => {
    const staff = await authorise(request, ["admin", "sales"], true);
    if (!staff) return Response.json({ error: "Forbidden" }, { status: 403 });
    let raw;
    try {
      raw = JSON.parse(
        new TextDecoder().decode(await boundedBody(request, 12000)),
      );
    } catch (error) {
      return Response.json(
        { error: "Invalid shipment request" },
        { status: error instanceof BodyTooLarge ? 413 : 400 },
      );
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success)
      return Response.json(
        { error: "Invalid shipment details" },
        { status: 422 },
      );
    try {
      const input = parsed.data;
      if (input.action === "create")
        await createShipment(staff.user, { ...input, id: randomUUID() });
      else await updateShipment(staff.user, input);
      scheduleOutbox();
      return Response.json(
        { ok: true },
        {
          status: input.action === "create" ? 201 : 200,
          headers: { "Cache-Control": "no-store" },
        },
      );
    } catch (error) {
      if (error instanceof ShipmentInputError)
        return Response.json(
          { error: error.message },
          { status: error.status },
        );
      throw error;
    }
  });
}
