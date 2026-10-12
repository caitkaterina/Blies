import "server-only";
import { locations } from "./content";
import { published } from "./public-store";
import { t } from "./i18n";
export async function publicLocations() {
  const data = locations.map((l) => ({ ...l }));
  const roles = {
    base: t("Base / presence", "Base / présence", "قاعدة / حضور"),
    operating: t("Operating market", "Marché opérationnel", "سوق تشغيل"),
    sourcing: t("Sourcing market", "Marché de sourcing", "سوق توريد"),
    destination: t(
      "Destination partner",
      "Partenaire de destination",
      "شريك وجهة",
    ),
    coverage: t("Service coverage", "Couverture de service", "تغطية الخدمة"),
  };
  for (const row of await published("location")) {
    const value = row.data;
    if (value.x === undefined || value.y === undefined) continue;
    const item = {
      id: row.slug,
      x: value.x,
      y: value.y,
      title: value.title,
      role: roles[value.locationRole as keyof typeof roles] || roles.operating,
      description: value.intro,
    };
    const index = data.findIndex((l) => l.id === row.slug);
    if (index >= 0) data[index] = item;
    else data.push(item);
  }
  return data;
}
