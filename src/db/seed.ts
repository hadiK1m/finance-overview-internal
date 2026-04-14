/**
 * Seed script — insert RKAP names & items from items_rkap_export.csv
 *
 * Run: npx tsx src/db/seed.ts
 */

import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { rkapNames, items } from "./schema";

// Load .env.local the same way Next.js does
loadEnvConfig(process.cwd());

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set in .env.local");
    process.exit(1);
}

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client);

/* ─── Data CSV ─────────────────────────────────────────────────── */

const CSV_DATA: { rkap: string; item: string }[] = [
    { rkap: "Cash Advanced",               item: "Penerimaan Kas / Pengisian Kas" },
    { rkap: "BANTUAN KESEHATAN",           item: "Perawatan Kesehatan" },
    { rkap: "RAPAT DAN KONSUMSI RAPAT",   item: "Bahan Makanan & Konsumsi" },
    { rkap: "PERJALANAN DINAS",            item: "Perjalanan Dinas Lainnya / SPPD" },
    { rkap: "ALAT & KEPERLUAN KANTOR",    item: "Alat & Keperluan Kantor" },
    { rkap: "HONORARIUM",                  item: "Honorarium melalui Sekretariat Dekom" },
    { rkap: "HONORARIUM",                  item: "Honorarium melalui Sekretariat Perusahaan" },
    { rkap: "HONORARIUM",                  item: "Tunjangan Kinerja / IKS" },
    { rkap: "HONORARIUM",                  item: "THR" },
    { rkap: "HONORARIUM",                  item: "Bantuan Transport" },
    { rkap: "HONORARIUM",                  item: "Bonus" },
    { rkap: "BIAYA LAIN-LAIN",            item: "Pemeliharaan Gedung" },
    { rkap: "BIAYA LAIN-LAIN",            item: "SBO" },
    { rkap: "BIAYA LAIN-LAIN",            item: "Biaya Bank" },
    { rkap: "BIAYA LAIN-LAIN",            item: "Biaya Humas, Spanduk, Papan Nama" },
    { rkap: "BIAYA LAIN-LAIN",            item: "Pajak / Retribusi" },
    { rkap: "BIAYA LAIN-LAIN",            item: "Barang Cetakan" },
    { rkap: "BIAYA LAIN-LAIN",            item: "Teknologi Informasi" },
    { rkap: "BIAYA LAIN-LAIN",            item: "Pemakaian Perkakas & Peralatan" },
    { rkap: "BIAYA LAIN-LAIN",            item: "Perlengkapan Umum" },
    { rkap: "BIAYA PESERTA LATIHAN",      item: "Biaya Peserta Latihan" },
    { rkap: "JASA KONSULTAN INDEPENDEN",  item: "Jasa Konsultasi Independen" },
    { rkap: "Cash Advanced",               item: "Dropping" },
    { rkap: "BIAYA LAIN-LAIN",            item: "Kendaraan Bermotor dan BBM" },
];

/* ─── Main ─────────────────────────────────────────────────────── */

async function seed() {
    console.log("🌱 Starting seed...\n");

    // 1. Deduplicate RKAP names from CSV
    const uniqueRkapNames = [...new Set(CSV_DATA.map((r) => r.rkap))];
    console.log(`📋 RKAP names to insert: ${uniqueRkapNames.length}`);

    // 2. Insert RKAP names — skip on conflict (idempotent)
    const insertedRkap = await db
        .insert(rkapNames)
        .values(uniqueRkapNames.map((name) => ({ name })))
        .onConflictDoNothing()
        .returning({ id: rkapNames.id, name: rkapNames.name });

    console.log(`   ✓ Inserted: ${insertedRkap.length} new RKAP names`);
    if (insertedRkap.length < uniqueRkapNames.length) {
        console.log(`   ⚡ Skipped: ${uniqueRkapNames.length - insertedRkap.length} already exist`);
    }

    // 3. Fetch ALL rkap_names to build a name→id map (covers pre-existing rows too)
    const allRkap = await db
        .select({ id: rkapNames.id, name: rkapNames.name })
        .from(rkapNames);

    const rkapMap = new Map(allRkap.map((r) => [r.name, r.id]));

    // 4. Build items rows
    const itemRows = CSV_DATA.map(({ rkap, item }) => {
        const rkapId = rkapMap.get(rkap);
        if (!rkapId) throw new Error(`RKAP not found in DB: "${rkap}"`);
        return { name: item, rkapId };
    });

    console.log(`\n📦 Items to insert: ${itemRows.length}`);

    // 5. Insert items — skip on conflict (idempotent)
    const insertedItems = await db
        .insert(items)
        .values(itemRows)
        .onConflictDoNothing()
        .returning({ id: items.id, name: items.name });

    console.log(`   ✓ Inserted: ${insertedItems.length} new items`);
    if (insertedItems.length < itemRows.length) {
        console.log(`   ⚡ Skipped: ${itemRows.length - insertedItems.length} already exist`);
    }

    console.log("\n✅ Seed complete!");
    await client.end();
}

seed().catch((err) => {
    console.error("❌ Seed failed:", err);
    client.end();
    process.exit(1);
});
