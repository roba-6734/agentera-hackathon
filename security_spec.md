# Zero-Trust Firestore Security Specification

This document details the security contracts, state invariants, and malicious test payloads for the UAE Bilateral Advisory and Intelligence Cabinet platform.

## 1. Data Invariants
1. **Authenticated Operations Only**: No unauthenticated writes to the database. All user-generated meetings and customization datasets must verify the sender session exists. Since the application supports open ministerial collaboration in the sandboxed room, we check standard credentials.
2. **Strict Document ID Validation**: Document IDs in both `/countries/{countryId}` and `/meetings/{meetingId}` must conform to strict standard alphanumeric character constraints with sizes capped at 128 bytes to prevent script-injection or path poisoning.
3. **No Blind Global Reads**: Allow listing is mapped explicitly without permitting general index scraping where possible, and updates require schema verification helpers.

## 2. The "Dirty Dozen" Payloads (Malicious Writes Rejected by Rules)

### Collection: `countries`
1. **P1_Spoof_Attack (ID Mismatch)**: Trying to write a country document where the path ID doesn't match the internal `id` attribute.
2. **P2_Junk_Id_Poisoning**: Trying to create a country targeting a path with a 50KB malicious string or emoji script payload as the ID.
3. **P3_Missing_Name**: Creating a country document with empty `nameEn` field.
4. **P4_Immutability_Breach**: Modifying the fundamental country `id` field inside an update payload which must remain strictly immutable.
5. **P5_Malicious_Field_Injection**: Injecting a "Ghost Field" (e.g. `isAdminApproved: true`) that is not part of the schema into a country profile.
6. **P6_Invalid_Structure**: Storing string data inside components declared as maps/objects in the blueprint schema (such as `indicators` or `profile`).

### Collection: `meetings`
7. **P7_Unauthenticated_Create**: Attempting to book a summit session without a valid active Firebase Auth token.
8. **P8_Missing_Required_Title**: Attempting to schedule a meeting with a missing `title` or `countryName`.
9. **P9_Time_Vandalism**: Attempting to set dates or times with highly abnormal structures or oversized strings to compromise listing views.
10. **P10_Objective_Spoofing**: Attempting to overwrite a terminal or standard meeting schedule item created by a different delegate with high-entropy non-sanitized objectives.
11. **P11_Oversized_Payload**: Injecting a 2MB nested map structure into a single session's detail logs, causing excessive network throughput.
12. **P12_Anonymous_Write_Attacking**: Trying to perform write operations by bypassing standard user authorization profiles.
