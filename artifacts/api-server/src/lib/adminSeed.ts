import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { pool } from "@workspace/db";
import { logger } from "./logger";

// Run DB migration: add role column if it doesn't exist
export async function runMigrations(): Promise<void> {
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    `);
    logger.info("Migrations applied successfully.");
  } catch (err) {
    logger.error({ err }, "Migration failed");
  }
}

// Seed the admin user with hardcoded credentials
export async function seedAdmin(): Promise<void> {
  try {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, "admin"));

    if (existing) {
      // Ensure existing admin user has correct role
      if (existing.role !== "admin") {
        await db
          .update(usersTable)
          .set({ role: "admin" })
          .where(eq(usersTable.id, existing.id));
        logger.info("Admin role updated for existing admin user.");
      }
      return;
    }

    const passwordHash = await bcrypt.hash("Pass@1234", 12);
    await db.insert(usersTable).values({
      username: "admin",
      passwordHash,
      hackerType: "defender",
      role: "admin",
      lastLoginAt: new Date(),
    });
    logger.info("Admin user created: username=admin, password=Pass@1234");
  } catch (err) {
    logger.error({ err }, "Failed to seed admin user");
  }
}
