/**
 * Source of Truth for Dynamic Public Contribution Form Builder.
 * Strictly maps to existing Place / Map / Directory schemas.
 * Prevents arbitrary DB field paths or injection.
 */

export const VALID_MODULES = ["map", "directory"];

export const VALID_ENTITY_TYPES = {
  map: ["village", "locality", "town", "city", "landmark", "hub", "place"],
  directory: [
    "Schools & Colleges",
    "Hospitals & Clinics",
    "Petrol Pumps",
    "Pharmacies",
    "Banks & ATMs",
    "Restaurants",
    "Markets",
    "Hotels",
    "Government",
    "Other Services",
  ],
};

export const ALLOWED_FIELDS_BY_MODULE = {
  map: [
    {
      name: "name",
      label: "Village / Locality / Place Name",
      type: "text",
      description: "Official recognized name in English",
      required: true,
      defaultValidation: { min: 2, max: 120 },
    },
    {
      name: "hindiName",
      label: "Name in Hindi / नाम (हिंदी में)",
      type: "text",
      description: "Official name in Devanagari Hindi script",
      required: false,
    },
    {
      name: "alternateNames",
      label: "Alternate Names / Aliases",
      type: "text",
      description: "Locally known alternate spellings or aliases (comma-separated)",
      required: false,
    },
    {
      name: "entityType",
      label: "Entity Settlement Type",
      type: "select",
      options: ["village", "locality", "town", "city", "landmark", "hub", "place"],
      description: "Settlement administrative classification",
      required: true,
    },
    {
      name: "subcategory",
      label: "Subcategory / Revenue Details",
      type: "text",
      description: "Gram Panchayat, Ward number, or Census detail",
      required: false,
    },
    {
      name: "locality",
      label: "Block / Tehsil",
      type: "text",
      description: "E.g. Fazilnagar Block, Tamkuhi Raj, Kasia",
      required: false,
      defaultValue: "Fazilnagar",
    },
    {
      name: "district",
      label: "District",
      type: "text",
      description: "Administrative district",
      required: false,
      defaultValue: "Kushinagar",
    },
    {
      name: "state",
      label: "State",
      type: "text",
      description: "State",
      required: false,
      defaultValue: "Uttar Pradesh",
    },
    {
      name: "latitude",
      label: "Latitude (North)",
      type: "latitude",
      description: "Decimal latitude coordinate (e.g. 26.7095)",
      required: true,
    },
    {
      name: "longitude",
      label: "Longitude (East)",
      type: "longitude",
      description: "Decimal longitude coordinate (e.g. 84.0507)",
      required: true,
    },
    {
      name: "googleMapsUrl",
      label: "Google Maps Location Link",
      type: "url",
      description: "Open place in Google Maps, tap Share -> Copy Link and paste here",
      required: true,
    },
    {
      name: "addressFull",
      label: "Full Postal Address / Boundary Note",
      type: "address",
      description: "Detailed location directions or village boundary landmark",
      required: false,
    },
    {
      name: "description",
      label: "Overview / Description",
      type: "textarea",
      description: "Brief factual summary or historical/demographic notes",
      required: false,
    },
  ],

  directory: [
    {
      name: "name",
      label: "Establishment / Business Name",
      type: "text",
      description: "Official name of the shop, school, hospital, or service",
      required: true,
      defaultValidation: { min: 2, max: 120 },
    },
    {
      name: "hindiName",
      label: "Name in Hindi / नाम (हिंदी में)",
      type: "text",
      description: "Display name in Hindi script",
      required: false,
    },
    {
      name: "category",
      label: "Directory Category",
      type: "select",
      options: [
        "Schools & Colleges",
        "Hospitals & Clinics",
        "Petrol Pumps",
        "Pharmacies",
        "Banks & ATMs",
        "Restaurants",
        "Markets",
        "Hotels",
        "Government",
        "Other Services",
      ],
      description: "Primary sector or service classification",
      required: true,
    },
    {
      name: "subcategory",
      label: "Subcategory / Specialization",
      type: "text",
      description: "E.g. Primary School, General Physician, 24/7 Fuel",
      required: false,
    },
    {
      name: "phone",
      label: "Primary Contact Phone",
      type: "phone",
      description: "10-digit mobile or landline with STD code",
      required: false,
    },
    {
      name: "alternatePhone",
      label: "Alternate Contact Number",
      type: "phone",
      description: "Secondary phone number",
      required: false,
    },
    {
      name: "whatsapp",
      label: "WhatsApp Business Number",
      type: "phone",
      description: "WhatsApp contact number for public enquiries",
      required: false,
    },
    {
      name: "website",
      label: "Official Website / Social Link",
      type: "url",
      description: "Valid web link starting with https://",
      required: false,
    },
    {
      name: "openingHours",
      label: "Operating Hours / Timings",
      type: "text",
      description: "E.g. 09:00 AM - 08:00 PM (Mon-Sat), or Open 24 Hours",
      required: false,
    },
    {
      name: "addressFull",
      label: "Full Street Address",
      type: "address",
      description: "Shop/establishment address with landmark",
      required: false,
    },
    {
      name: "locality",
      label: "Locality / Market Area",
      type: "text",
      description: "E.g. Main Market Chauraha, NH-27, Tamkuhi Road",
      required: false,
      defaultValue: "Fazilnagar Town",
    },
    {
      name: "streetOrLandmark",
      label: "Street / Prominent Landmark",
      type: "text",
      description: "Nearest landmark or crossroads",
      required: false,
    },
    {
      name: "latitude",
      label: "Latitude Coordinate",
      type: "latitude",
      description: "GPS latitude (required if proposing location change)",
      required: false,
    },
    {
      name: "longitude",
      label: "Longitude Coordinate",
      type: "longitude",
      description: "GPS longitude (required if proposing location change)",
      required: false,
    },
    {
      name: "googleMapsUrl",
      label: "Google Maps Location Link",
      type: "url",
      description: "Google Maps share link for this establishment (required for address/location changes)",
      required: false,
    },
    {
      name: "services",
      label: "Services Offered / Facilities",
      type: "text",
      description: "Comma-separated list of key facilities or goods",
      required: false,
    },
    {
      name: "description",
      label: "About Establishment / Summary",
      type: "textarea",
      description: "General summary and details",
      required: false,
    },
    {
      name: "imageUrl",
      label: "Establishment Photo URL",
      type: "image",
      description: "Direct photo URL or attachment",
      required: false,
    },
  ],
};

/**
 * Validates configured fields against the allowed schema whitelist.
 * Strips any unknown or disallowed fields.
 */
export function sanitizeAndValidateFormFields(module, fields = []) {
  if (!VALID_MODULES.includes(module)) {
    throw new Error(`Invalid target module: ${module}. Supported: ${VALID_MODULES.join(", ")}`);
  }

  const allowedCatalog = ALLOWED_FIELDS_BY_MODULE[module];
  const allowedMap = new Map(allowedCatalog.map((f) => [f.name, f]));

  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error("Form must contain at least one configured field.");
  }

  const sanitized = [];
  const seenNames = new Set();

  for (let i = 0; i < fields.length; i++) {
    const raw = fields[i];
    if (!raw || typeof raw !== "object") continue;

    const fieldName = String(raw.name || "").trim();
    if (!allowedMap.has(fieldName)) {
      throw new Error(`Field '${fieldName}' is not a permitted schema field for module '${module}'.`);
    }

    if (seenNames.has(fieldName)) {
      throw new Error(`Duplicate field '${fieldName}' configured in form.`);
    }
    seenNames.add(fieldName);

    const catalogDef = allowedMap.get(fieldName);

    sanitized.push({
      name: fieldName,
      label: String(raw.label || catalogDef.label).trim(),
      type: raw.type && [
        "text",
        "textarea",
        "number",
        "select",
        "checkbox",
        "phone",
        "url",
        "latitude",
        "longitude",
        "address",
        "image",
      ].includes(raw.type)
        ? raw.type
        : catalogDef.type,
      description: String(raw.description ?? catalogDef.description ?? "").trim(),
      required: Boolean(raw.required),
      defaultValue: raw.defaultValue !== undefined ? raw.defaultValue : catalogDef.defaultValue || "",
      options: Array.isArray(raw.options) && raw.options.length > 0 ? raw.options : catalogDef.options || [],
      validation: {
        min: typeof raw.validation?.min === "number" ? raw.validation.min : null,
        max: typeof raw.validation?.max === "number" ? raw.validation.max : null,
        pattern: String(raw.validation?.pattern || "").trim(),
        customError: String(raw.validation?.customError || "").trim(),
      },
      order: typeof raw.order === "number" ? raw.order : i,
      isEditableInCorrection: raw.isEditableInCorrection !== false,
    });
  }

  return sanitized;
}
