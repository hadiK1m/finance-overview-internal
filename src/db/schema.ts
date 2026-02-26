import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    timestamp,
    pgEnum,
    numeric,
    type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

/* ══════════════════════════════════════════════════════
   Enums
   ══════════════════════════════════════════════════════ */

/**
 * User roles — ordered from least to most privileged.
 *
 * • user       → no access (profile only)
 * • komisaris  → read-only global (view all data, no mutations)
 * • admin      → full CRUD, scoped to own data (owner_id = user.id)
 * • super_admin → full CRUD + read on ALL data system-wide
 */
export const USER_ROLES = [
    "user",
    "komisaris",
    "admin",
    "super_admin",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const userRoleEnum = pgEnum("user_role", USER_ROLES);

/** Default role assigned on sign-up */
export const DEFAULT_ROLE: UserRole = "user";

/**
 * Invite status — tracks lifecycle of team invitations.
 *
 * • pending  → invite sent, not yet accepted
 * • accepted → user signed up via invite
 * • expired  → invite link/time expired
 * • revoked  → admin manually cancelled the invite
 */
export const INVITE_STATUSES = [
    "pending",
    "accepted",
    "expired",
    "revoked",
] as const;

export type InviteStatus = (typeof INVITE_STATUSES)[number];

export const inviteStatusEnum = pgEnum("invite_status", INVITE_STATUSES);

/* ══════════════════════════════════════════════════════
   Users Table
   ══════════════════════════════════════════════════════ */

export const users = pgTable("users", {
    /** UUID v4 primary key — auto-generated */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Name fields */
    firstName: varchar("first_name", { length: 150 }).notNull(),
    lastName: varchar("last_name", { length: 150 }).notNull(),

    /** Email — unique, used as login identifier */
    email: varchar("email", { length: 255 }).unique().notNull(),

    /** Argon2id hashed password — NEVER store plain text */
    passwordHash: text("password_hash").notNull(),

    /** Email verification status */
    emailVerified: boolean("email_verified").default(false).notNull(),

    /** User role — defaults to 'user', NOT NULL */
    role: userRoleEnum("role").default(DEFAULT_ROLE).notNull(),

    /** Whether the account is active (soft-disable without deleting) */
    isActive: boolean("is_active").default(true).notNull(),

    /** Last successful login timestamp */
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),

    /** Profile avatar URL (nullable, for future OAuth/avatar feature) */
    image: text("image"),

    /** Phone number (nullable, optional profile field) */
    phone: varchar("phone", { length: 30 }),

    /** Short bio (nullable, optional profile field) */
    bio: text("bio"),

    /** Timestamps */
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

/* ══════════════════════════════════════════════════════
   Sessions Table (for future token-based auth / refresh tokens)
   ══════════════════════════════════════════════════════ */

export const sessions = pgTable("sessions", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
        .references(() => users.id, { onDelete: "cascade" })
        .notNull(),
    token: text("token").unique().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

/* ══════════════════════════════════════════════════════
   Balance Sheets Table (Nama Akun — sumber dana)
   ══════════════════════════════════════════════════════ */

export const balanceSheets = pgTable("balance_sheets", {
    /** UUID v4 primary key — auto-generated */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Nama Nama Akun / sumber dana */
    name: varchar("name", { length: 255 }).notNull(),

    /** Saldo dalam IDR (Rupiah) — numeric(19,2) untuk presisi desimal */
    balance: numeric("balance", { precision: 19, scale: 2 }).notNull().default("0"),

    /** Tanggal pencatatan */
    date: timestamp("date", { withTimezone: true }).notNull(),

    /** User yang membuat record ini */
    createdBy: uuid("created_by")
        .references(() => users.id, { onDelete: "set null" }),

    /** Timestamps */
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

/* ══════════════════════════════════════════════════════
   RKAP Names Table
   ══════════════════════════════════════════════════════ */

export const rkapNames = pgTable("rkap_names", {
    /** UUID v4 primary key — auto-generated */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Nama RKAP — unik */
    name: varchar("name", { length: 255 }).unique().notNull(),

    /** User yang membuat record ini */
    createdBy: uuid("created_by")
        .references(() => users.id, { onDelete: "set null" }),

    /** Timestamps */
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

/* ══════════════════════════════════════════════════════
   Items Table (linked to RKAP)
   ══════════════════════════════════════════════════════ */

export const items = pgTable("items", {
    /** UUID v4 primary key — auto-generated */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Nama item */
    name: varchar("name", { length: 255 }).notNull(),

    /** Relasi ke RKAP name */
    rkapId: uuid("rkap_id")
        .references(() => rkapNames.id, { onDelete: "cascade" })
        .notNull(),

    /** User yang membuat record ini */
    createdBy: uuid("created_by")
        .references(() => users.id, { onDelete: "set null" }),

    /** Timestamps */
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

/* ══════════════════════════════════════════════════════
   Balance RKAP Table (Saldo per RKAP)
   ══════════════════════════════════════════════════════ */

export const balanceRkap = pgTable("balance_rkap", {
    /** UUID v4 primary key — auto-generated */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Relasi ke RKAP name */
    rkapId: uuid("rkap_id")
        .references(() => rkapNames.id, { onDelete: "cascade" })
        .notNull(),

    /** Saldo dalam IDR (Rupiah) — numeric(19,2) untuk presisi desimal */
    balance: numeric("balance", { precision: 19, scale: 2 }).notNull().default("0"),

    /** Tanggal pencatatan */
    date: timestamp("date", { withTimezone: true }).notNull(),

    /** User yang membuat record ini */
    createdBy: uuid("created_by")
        .references(() => users.id, { onDelete: "set null" }),

    /** Timestamps */
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

/* ══════════════════════════════════════════════════════
   Transactions Table
   ══════════════════════════════════════════════════════ */

export const transactions = pgTable("transactions", {
    /** UUID v4 primary key — auto-generated */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Tanggal transaksi */
    date: timestamp("date", { withTimezone: true }).notNull(),

    /** Relasi ke RKAP name */
    rkapId: uuid("rkap_id")
        .references(() => rkapNames.id, { onDelete: "cascade" })
        .notNull(),

    /** Nama penerima uang */
    recipientName: varchar("recipient_name", { length: 255 }).notNull(),

    /** Jumlah dalam IDR (Rupiah) — numeric(19,2) untuk presisi desimal */
    amount: numeric("amount", { precision: 19, scale: 2 }).notNull().default("0"),

    /** Tipe transaksi: income atau expense */
    type: varchar("type", { length: 20 }).notNull().default("expense"),

    /** Nama akun */
    accountName: varchar("account_name", { length: 255 }).notNull(),

    /** Path file lampiran (nullable) */
    attachmentPath: varchar("attachment_path", { length: 500 }),

    /** Nama asli file lampiran (nullable) */
    attachmentName: varchar("attachment_name", { length: 255 }),

    /** User yang membuat record ini */
    createdBy: uuid("created_by")
        .references(() => users.id, { onDelete: "set null" }),

    /** Timestamps */
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

/* ══════════════════════════════════════════════════════
   Transaction Items (join table)
   ══════════════════════════════════════════════════════ */

export const transactionItems = pgTable("transaction_items", {
    /** UUID v4 primary key — auto-generated */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Relasi ke transaksi */
    transactionId: uuid("transaction_id")
        .references(() => transactions.id, { onDelete: "cascade" })
        .notNull(),

    /** Relasi ke item */
    itemId: uuid("item_id")
        .references(() => items.id, { onDelete: "cascade" })
        .notNull(),
});

/* ══════════════════════════════════════════════════════
   Drive Folders Table (hierarchical file system)
   ══════════════════════════════════════════════════════ */

export const driveFolders = pgTable("drive_folders", {
    /** UUID v4 primary key — auto-generated */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Folder name */
    name: varchar("name", { length: 255 }).notNull(),

    /** Parent folder (null = root). Self-referencing FK. */
    parentId: uuid("parent_id").references((): AnyPgColumn => driveFolders.id, {
        onDelete: "cascade",
    }),

    /** Owner */
    userId: uuid("user_id")
        .references(() => users.id, { onDelete: "cascade" })
        .notNull(),

    /** Soft-delete flag */
    isTrashed: boolean("is_trashed").default(false).notNull(),

    /** When the item was trashed (null if not trashed) */
    trashedAt: timestamp("trashed_at", { withTimezone: true }),

    /** Timestamps */
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

/* ══════════════════════════════════════════════════════
   Drive Files Table
   ══════════════════════════════════════════════════════ */

export const driveFiles = pgTable("drive_files", {
    /** UUID v4 primary key — auto-generated */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Original file name */
    name: varchar("name", { length: 255 }).notNull(),

    /** Parent folder (null = root) */
    folderId: uuid("folder_id").references(() => driveFolders.id, {
        onDelete: "cascade",
    }),

    /** Owner */
    userId: uuid("user_id")
        .references(() => users.id, { onDelete: "cascade" })
        .notNull(),

    /** File size in bytes */
    size: numeric("size", { precision: 19, scale: 0 }).notNull().default("0"),

    /** MIME type */
    mimeType: varchar("mime_type", { length: 255 }).notNull(),

    /** Path on disk relative to project root */
    storagePath: varchar("storage_path", { length: 500 }).notNull(),

    /** Soft-delete flag */
    isTrashed: boolean("is_trashed").default(false).notNull(),

    /** When the item was trashed */
    trashedAt: timestamp("trashed_at", { withTimezone: true }),

    /** Timestamps */
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

/* ══════════════════════════════════════════════════════
   Team Invites Table
   ══════════════════════════════════════════════════════ */

export const teamInvites = pgTable("team_invites", {
    /** UUID v4 primary key — auto-generated */
    id: uuid("id").defaultRandom().primaryKey(),

    /** Email of the person being invited */
    email: varchar("email", { length: 255 }).notNull(),

    /** Role to assign on acceptance */
    role: userRoleEnum("role").notNull(),

    /** Optional personal message from the inviter */
    message: text("message"),

    /** Who sent this invite */
    invitedBy: uuid("invited_by")
        .references(() => users.id, { onDelete: "set null" }),

    /** Invite status lifecycle */
    status: inviteStatusEnum("status").default("pending").notNull(),

    /** When the invite expires (7 days from creation) */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    /** Timestamps */
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

/* ══════════════════════════════════════════════════════
   Relations
   ══════════════════════════════════════════════════════ */

export const usersRelations = relations(users, ({ many }) => ({
    sessions: many(sessions),
    balanceSheets: many(balanceSheets),
    rkapNames: many(rkapNames),
    items: many(items),
    balanceRkap: many(balanceRkap),
    transactions: many(transactions),
    driveFolders: many(driveFolders),
    driveFiles: many(driveFiles),
    sentInvites: many(teamInvites),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
}));

export const balanceSheetsRelations = relations(balanceSheets, ({ one }) => ({
    creator: one(users, {
        fields: [balanceSheets.createdBy],
        references: [users.id],
    }),
}));

export const rkapNamesRelations = relations(rkapNames, ({ one, many }) => ({
    creator: one(users, {
        fields: [rkapNames.createdBy],
        references: [users.id],
    }),
    items: many(items),
    balanceRkap: many(balanceRkap),
    transactions: many(transactions),
}));

export const balanceRkapRelations = relations(balanceRkap, ({ one }) => ({
    rkap: one(rkapNames, {
        fields: [balanceRkap.rkapId],
        references: [rkapNames.id],
    }),
    creator: one(users, {
        fields: [balanceRkap.createdBy],
        references: [users.id],
    }),
}));

export const itemsRelations = relations(items, ({ one }) => ({
    rkap: one(rkapNames, {
        fields: [items.rkapId],
        references: [rkapNames.id],
    }),
    creator: one(users, {
        fields: [items.createdBy],
        references: [users.id],
    }),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
    rkap: one(rkapNames, {
        fields: [transactions.rkapId],
        references: [rkapNames.id],
    }),
    creator: one(users, {
        fields: [transactions.createdBy],
        references: [users.id],
    }),
    transactionItems: many(transactionItems),
}));

export const transactionItemsRelations = relations(transactionItems, ({ one }) => ({
    transaction: one(transactions, {
        fields: [transactionItems.transactionId],
        references: [transactions.id],
    }),
    item: one(items, {
        fields: [transactionItems.itemId],
        references: [items.id],
    }),
}));

export const driveFoldersRelations = relations(driveFolders, ({ one, many }) => ({
    user: one(users, {
        fields: [driveFolders.userId],
        references: [users.id],
    }),
    parent: one(driveFolders, {
        fields: [driveFolders.parentId],
        references: [driveFolders.id],
        relationName: "folderHierarchy",
    }),
    children: many(driveFolders, { relationName: "folderHierarchy" }),
    files: many(driveFiles),
}));

export const driveFilesRelations = relations(driveFiles, ({ one }) => ({
    user: one(users, {
        fields: [driveFiles.userId],
        references: [users.id],
    }),
    folder: one(driveFolders, {
        fields: [driveFiles.folderId],
        references: [driveFolders.id],
    }),
}));

export const teamInvitesRelations = relations(teamInvites, ({ one }) => ({
    inviter: one(users, {
        fields: [teamInvites.invitedBy],
        references: [users.id],
    }),
}));

/* ══════════════════════════════════════════════════════
   Zod Schemas (drizzle-zod)
   ══════════════════════════════════════════════════════ */

/** Schema for SELECT — represents a full user row from the database */
export const selectUserSchema = createSelectSchema(users);

/** Schema for INSERT — validates data before inserting a new user */
export const insertUserSchema = createInsertSchema(users, {
    firstName: (schema) => schema.min(1, "First name is required"),
    lastName: (schema) => schema.min(1, "Last name is required"),
    email: (schema) => schema.email("Invalid email address"),
    passwordHash: (schema) => schema.min(1, "Password hash is required"),
});

/** Schema for SELECT session */
export const selectSessionSchema = createSelectSchema(sessions);

/** Schema for INSERT session */
export const insertSessionSchema = createInsertSchema(sessions);

/** Schema for SELECT balance sheet */
export const selectBalanceSheetSchema = createSelectSchema(balanceSheets);

/** Schema for INSERT balance sheet */
export const insertBalanceSheetSchema = createInsertSchema(balanceSheets, {
    name: (schema) => schema.min(1, "Balance sheet name is required"),
});

/** Schema for SELECT RKAP name */
export const selectRkapNameSchema = createSelectSchema(rkapNames);

/** Schema for INSERT RKAP name */
export const insertRkapNameSchema = createInsertSchema(rkapNames, {
    name: (schema) => schema.min(1, "RKAP name is required"),
});

/** Schema for SELECT item */
export const selectItemSchema = createSelectSchema(items);

/** Schema for INSERT item */
export const insertItemSchema = createInsertSchema(items, {
    name: (schema) => schema.min(1, "Item name is required"),
});

/** Schema for SELECT balance RKAP */
export const selectBalanceRkapSchema = createSelectSchema(balanceRkap);

/** Schema for INSERT balance RKAP */
export const insertBalanceRkapSchema = createInsertSchema(balanceRkap);

/** Schema for SELECT transaction */
export const selectTransactionSchema = createSelectSchema(transactions);

/** Schema for INSERT transaction */
export const insertTransactionSchema = createInsertSchema(transactions, {
    recipientName: (schema) => schema.min(1, "Recipient name is required"),
    accountName: (schema) => schema.min(1, "Account name is required"),
});

/** Schema for SELECT transaction item */
export const selectTransactionItemSchema = createSelectSchema(transactionItems);

/** Schema for INSERT transaction item */
export const insertTransactionItemSchema = createInsertSchema(transactionItems);

/* ══════════════════════════════════════════════════════
   TypeScript Types
   ══════════════════════════════════════════════════════ */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type BalanceSheet = typeof balanceSheets.$inferSelect;
export type NewBalanceSheet = typeof balanceSheets.$inferInsert;

export type RkapName = typeof rkapNames.$inferSelect;
export type NewRkapName = typeof rkapNames.$inferInsert;

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

export type BalanceRkap = typeof balanceRkap.$inferSelect;
export type NewBalanceRkap = typeof balanceRkap.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type TransactionItem = typeof transactionItems.$inferSelect;
export type NewTransactionItem = typeof transactionItems.$inferInsert;

export type DriveFolder = typeof driveFolders.$inferSelect;
export type NewDriveFolder = typeof driveFolders.$inferInsert;

export type DriveFile = typeof driveFiles.$inferSelect;
export type NewDriveFile = typeof driveFiles.$inferInsert;

export type TeamInvite = typeof teamInvites.$inferSelect;
export type NewTeamInvite = typeof teamInvites.$inferInsert;
