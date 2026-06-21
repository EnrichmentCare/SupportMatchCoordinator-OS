// Configuration + helpers for the CSV importer.

export type FieldType = "text" | "number" | "array" | "enum" | "bool";

export interface FieldDef {
  key: string;                              // keys starting with "__" are matcher fields, not DB columns
  label: string;
  required?: boolean;
  type: FieldType;
  synonyms: string[];
  enumValues?: string[];
  enumSynonyms?: Record<string, string>;
}

export interface EntityDef {
  key: "participants" | "providers" | "contacts" | "notes" | "funding" | "charge_items";
  label: string;
  table: string;
  childOf?: "participants";                 // child rows must match a participant
  fields: FieldDef[];
}

export const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const MATCH_FIELDS: FieldDef[] = [
  { key: "__ndis", label: "Participant NDIS number", type: "text", synonyms: ["ndisnumber", "ndis", "ndisno", "ndisid", "participantndis"] },
  { key: "__name", label: "Participant name", type: "text", synonyms: ["participant", "participantname", "clientname", "client", "name"] },
];

export const ENTITIES: EntityDef[] = [
  {
    key: "participants", label: "Participants", table: "participants",
    fields: [
      { key: "first_name", label: "First name", required: true, type: "text", synonyms: ["firstname", "givenname", "fname", "first"] },
      { key: "last_name", label: "Last name", required: true, type: "text", synonyms: ["lastname", "surname", "familyname", "lname", "last"] },
      { key: "preferred_name", label: "Preferred name", type: "text", synonyms: ["preferredname", "knownas", "nickname", "goesby"] },
      { key: "email", label: "Email", type: "text", synonyms: ["email", "emailaddress"] },
      { key: "phone", label: "Phone", type: "text", synonyms: ["phone", "mobile", "phonenumber", "contactnumber", "tel", "telephone"] },
      { key: "ndis_number", label: "NDIS number", type: "text", synonyms: ["ndisnumber", "ndis", "ndisno", "ndisid", "participantnumber"] },
      { key: "date_of_birth", label: "Date of birth", type: "text", synonyms: ["dob", "dateofbirth", "birthdate", "birthday"] },
      { key: "suburb", label: "Suburb", type: "text", synonyms: ["suburb", "city", "town"] },
      { key: "state", label: "State", type: "text", synonyms: ["state"] },
      { key: "postcode", label: "Postcode", type: "text", synonyms: ["postcode", "postalcode", "zip", "zipcode"] },
      { key: "plan_management", label: "Plan management", type: "enum", synonyms: ["planmanagement", "plantype", "managementtype", "management"],
        enumValues: ["agency_managed", "plan_managed", "self_managed"],
        enumSynonyms: { planmanaged: "plan_managed", plan: "plan_managed", selfmanaged: "self_managed", self: "self_managed", agencymanaged: "agency_managed", agency: "agency_managed", ndiamanaged: "agency_managed", ndia: "agency_managed" } },
      { key: "status", label: "Status", type: "enum", synonyms: ["status", "participantstatus"],
        enumValues: ["participant", "active", "on_hold", "exited"],
        enumSynonyms: { active: "active", onhold: "on_hold", hold: "on_hold", paused: "on_hold", exited: "exited", closed: "exited", prospect: "participant", participant: "participant", lead: "participant", inactive: "on_hold" } },
      { key: "rag_status", label: "RAG status", type: "enum", synonyms: ["rag", "ragstatus", "health"],
        enumValues: ["green", "amber", "red"],
        enumSynonyms: { green: "green", ontrack: "green", amber: "amber", orange: "amber", attention: "amber", red: "red", urgent: "red" } },
      { key: "gender_preference", label: "Worker gender pref.", type: "enum", synonyms: ["genderpreference", "workergender", "preferredgender", "gender"],
        enumValues: ["male", "female", "no_preference", "other"],
        enumSynonyms: { male: "male", m: "male", female: "female", f: "female", nopreference: "no_preference", any: "no_preference", either: "no_preference", other: "other" } },
      { key: "primary_disability", label: "Primary disability", type: "text", synonyms: ["disability", "primarydisability", "diagnosis", "primarydiagnosis"] },
      { key: "support_needs_summary", label: "Support needs", type: "text", synonyms: ["supportneeds", "needs", "supportneedssummary", "summary", "notes"] },
      { key: "interests", label: "Interests", type: "array", synonyms: ["interests", "hobbies"] },
      { key: "languages", label: "Languages", type: "array", synonyms: ["languages", "language", "spokenlanguages"] },
    ],
  },
  {
    key: "providers", label: "Providers", table: "providers",
    fields: [
      { key: "name", label: "Provider name", required: true, type: "text", synonyms: ["name", "providername", "business", "businessname", "company", "organisation", "organization"] },
      { key: "phone", label: "Phone", type: "text", synonyms: ["phone", "mobile", "contactnumber", "tel", "telephone"] },
      { key: "email", label: "Email", type: "text", synonyms: ["email", "emailaddress"] },
      { key: "website", label: "Website", type: "text", synonyms: ["website", "url", "web"] },
      { key: "abn", label: "ABN", type: "text", synonyms: ["abn"] },
      { key: "services", label: "Services", type: "array", synonyms: ["services", "servicetypes", "service", "supports"] },
      { key: "service_areas", label: "Service areas", type: "array", synonyms: ["serviceareas", "areas", "regions", "coverage", "location", "locations"] },
      { key: "capacity_status", label: "Capacity", type: "enum", synonyms: ["capacity", "capacitystatus", "availability"],
        enumValues: ["open", "limited", "closed", "unknown"],
        enumSynonyms: { open: "open", available: "open", yes: "open", limited: "limited", waitlist: "limited", some: "limited", closed: "closed", full: "closed", no: "closed", unknown: "unknown" } },
    ],
  },
  {
    key: "contacts", label: "Contacts / nominees", table: "participant_contacts", childOf: "participants",
    fields: [
      ...MATCH_FIELDS,
      { key: "name", label: "Contact name", required: true, type: "text", synonyms: ["contactname", "name", "fullname"] },
      { key: "relationship", label: "Relationship", type: "enum", synonyms: ["relationship", "relation", "type", "role"],
        enumValues: ["plan_nominee", "correspondence_nominee", "nominee", "guardian", "family", "emergency", "gp", "plan_manager", "allied_health", "lac", "support_coordinator", "other"],
        enumSynonyms: { plannominee: "plan_nominee", correspondencenominee: "correspondence_nominee", nominee: "nominee", guardian: "guardian", mother: "family", father: "family", parent: "family", family: "family", carer: "family", emergency: "emergency", emergencycontact: "emergency", gp: "gp", doctor: "gp", planmanager: "plan_manager", alliedhealth: "allied_health", lac: "lac", supportcoordinator: "support_coordinator", other: "other" } },
      { key: "phone", label: "Phone", type: "text", synonyms: ["phone", "mobile", "contactnumber", "tel"] },
      { key: "email", label: "Email", type: "text", synonyms: ["email", "emailaddress"] },
      { key: "notes", label: "Notes", type: "text", synonyms: ["notes", "comment"] },
    ],
  },
  {
    key: "notes", label: "Case notes", table: "notes", childOf: "participants",
    fields: [
      ...MATCH_FIELDS,
      { key: "body", label: "Note", required: true, type: "text", synonyms: ["note", "notes", "casenote", "body", "comment", "details", "description"] },
      { key: "contact_type", label: "Contact type", type: "enum", synonyms: ["contacttype", "type", "method", "channel"],
        enumValues: ["phone", "email", "face_to_face", "sms", "internal", "other"],
        enumSynonyms: { phone: "phone", call: "phone", email: "email", facetoface: "face_to_face", inperson: "face_to_face", visit: "face_to_face", sms: "sms", text: "sms", internal: "internal", other: "other" } },
      { key: "minutes", label: "Minutes", type: "number", synonyms: ["minutes", "duration", "time", "mins"] },
      { key: "billable", label: "Billable", type: "bool", synonyms: ["billable", "claimable"] },
      { key: "occurred_at", label: "Date", type: "text", synonyms: ["date", "occurredat", "datetime", "when", "contactdate"] },
    ],
  },
  {
    key: "charge_items", label: "Charge items (price list)", table: "charge_items",
    fields: [
      { key: "code", label: "Support item number", required: true, type: "text", synonyms: ["code", "supportitemnumber", "itemnumber", "supportnumber", "item", "lineitem"] },
      { key: "name", label: "Name", type: "text", synonyms: ["name", "description", "supportname", "itemname"] },
      { key: "unit_price", label: "Unit price", type: "number", synonyms: ["unitprice", "price", "rate", "pricecap", "amount"] },
      { key: "unit", label: "Unit", type: "text", synonyms: ["unit", "uom", "unitofmeasure"] },
      { key: "gst_code", label: "GST code", type: "text", synonyms: ["gstcode", "gst"] },
    ],
  },
  {
    key: "funding", label: "Funding", table: "funding_categories", childOf: "participants",
    fields: [
      ...MATCH_FIELDS,
      { key: "bucket", label: "Bucket", type: "enum", synonyms: ["bucket", "category", "supportcategory", "type", "fundingtype"],
        enumValues: ["core", "capacity_building", "capital"],
        enumSynonyms: { core: "core", capacitybuilding: "capacity_building", cb: "capacity_building", capacity: "capacity_building", capital: "capital" } },
      { key: "name", label: "Category name", required: true, type: "text", synonyms: ["name", "categoryname", "item", "linename", "supportname", "support"] },
      { key: "allocated", label: "Allocated $", type: "number", synonyms: ["allocated", "budget", "total", "amount", "funded"] },
      { key: "used", label: "Used $", type: "number", synonyms: ["used", "spent", "claimed"] },
    ],
  },
];

export function autoMap(entity: EntityDef, headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const field of entity.fields) {
    const match = headers.find((h) => {
      const n = norm(h);
      return n === norm(field.key.replace(/^__/, "")) || n === norm(field.label) || field.synonyms.includes(n);
    });
    if (match) map[field.key] = match;
  }
  return map;
}

export function coerce(field: FieldDef, raw: string | undefined): unknown {
  const v = (raw ?? "").trim();
  if (!v) return null;
  if (field.type === "array") return v.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  if (field.type === "number") { const n = Number(v.replace(/[$,]/g, "")); return isNaN(n) ? null : n; }
  if (field.type === "bool") {
    const n = norm(v);
    if (["yes", "true", "1", "y", "billable", "claimable"].includes(n)) return true;
    if (["no", "false", "0", "n", "nonbillable"].includes(n)) return false;
    return null;
  }
  if (field.type === "enum") {
    const direct = v.toLowerCase().replace(/[\s-]/g, "_");
    if (field.enumValues?.includes(direct)) return direct;
    const n = norm(v);
    if (field.enumSynonyms?.[n]) return field.enumSynonyms[n];
    if (field.enumValues?.map(norm).includes(n)) return field.enumValues.find((e) => norm(e) === n);
    return null;
  }
  return v;
}

export type ParticipantLite = { id: string; ndis_number: string | null; first_name: string; last_name: string; preferred_name: string | null };

export function buildParticipantMaps(list: ParticipantLite[]) {
  const byNdis = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const p of list) {
    if (p.ndis_number) byNdis.set(norm(p.ndis_number), p.id);
    byName.set(norm(`${p.first_name}${p.last_name}`), p.id);
    if (p.preferred_name) byName.set(norm(`${p.preferred_name}${p.last_name}`), p.id);
  }
  return { byNdis, byName };
}

export function resolveParticipant(
  maps: { byNdis: Map<string, string>; byName: Map<string, string> },
  ndisRaw?: string, nameRaw?: string
): string | null {
  if (ndisRaw) { const id = maps.byNdis.get(norm(ndisRaw)); if (id) return id; }
  if (nameRaw) { const id = maps.byName.get(norm(nameRaw)); if (id) return id; }
  return null;
}
