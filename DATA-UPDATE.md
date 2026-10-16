# Fazilnagar Civic & Directory Portal — Data Maintenance Guide (DATA-UPDATE.md)

This document establishes the authoritative protocol for verifying, updating, and auditing civic data listings on the **Fazilnagar Town Civic & Local Directory Portal** (https://fazilnagar.vercel.app).

---

## 1. Directory Counts & Freshness Standard

- **Current Real Places Count:** 19 authoritative places (dynamically calculated from dataset, never hardcoded).
- **Zero Duplicate Policy:** Every entry must possess a unique ID (`fz-<category>-<index>`) and distinct geographic coordinates.
- **Mandatory Fields on Every Record:**
  - `name`: Authoritative title in English (with Hindi/alternate names where available).
  - `category`: Civic category (e.g., `Healthcare & Hospitals`, `Schools & Colleges`, `Civic Services`).
  - `addressFull`: Street address / landmark in Fazilnagar.
  - `latitude` & `longitude`: Validated GPS coordinates within Nagar Panchayat Fazilnagar bounds.
  - `source`: Specific field survey, official notice, or verification source.
  - `last_verified`: Date in `YYYY-MM-DD` when the listing details were personally confirmed.
  - `verificationStatus`: `"verified"` or `"pending"`.

---

## 2. Update Cadence & Verification Schedule

| Directory Section | Review Frequency | Primary Verification Method |
| :--- | :--- | :--- |
| **Emergency Contacts & Helplines** | **Monthly** | Live telephone test call and district administration notice check |
| **Hospitals & Urgent Care (CHC)** | **Quarterly** | Direct visit or phone confirmation of emergency doctor availability |
| **Schools & Colleges** | **Bi-annually** | Pre-academic session verification (April & September) |
| **Civic Services & Govt Offices** | **Quarterly** | Block / Nagar Panchayat office notice board & directory audit |
| **Local Businesses & Marketplace** | **Every 6 Months** | Shopkeeper confirmation & phone verification |

---

## 3. How to Update Data

### Method A: Via Admin Review Desk (Production)
1. Log in as an Administrator at `/login`.
2. Navigate to `/admin-review`.
3. Review community-submitted places and news updates under "Pending Submissions".
4. Confirm phone number, GPS coordinates, and address before clicking **Approve**.
5. Once approved, the record is immediately published to MongoDB and visible to all citizens.

### Method B: Via Authoritative Seed Files (Codebase)
When deploying baseline updates, modify both mirror files simultaneously to keep server and client synchronized:
1. `client/src/data/places.json`
2. `server/data/places.json`

Ensure all JSON entries validate with schema fields including `source` and `last_verified`.

---

## 4. Emergency Contacts Updating
Emergency numbers are maintained in `client/src/data/emergencyContacts.js`.
- Always provide `numberTel` in format `tel:<clean_digits>`.
- Any unverified number must have `isVerified: false` and a `verificationNote: "TODO: ..."` tag until physically confirmed.
