import { prisma } from "@/lib/prisma";
import { getCurrentUserWithRole } from "@/lib/session";
import { getTagCatalog } from "@/lib/actions/tags";
import { TAG_ENTITIES, type TagEntity } from "@/lib/tags";
import { TagPicker } from "@/components/tag-picker";

// Server-Huelle um den TagPicker: laedt Tag-Katalog und die Tags des
// Datensatzes selbst, damit die Detailseiten nur eine Zeile brauchen.
export async function RecordTags({ entity, recordId }: { entity: TagEntity; recordId: string }) {
  const user = await getCurrentUserWithRole();
  const [catalog, assigned] = await Promise.all([
    getTagCatalog(),
    prisma.tag.findMany({
      where: { companyId: user.companyId, [TAG_ENTITIES[entity].relation]: { some: { id: recordId } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, groupId: true },
    }),
  ]);

  return (
    <TagPicker
      entity={entity}
      recordId={recordId}
      initialTags={assigned}
      catalog={catalog}
      isAdmin={user.role?.name === "Admin"}
    />
  );
}
