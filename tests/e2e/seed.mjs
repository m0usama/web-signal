// Creates the two test accounts in a LOCAL Supabase (used by CI).
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url?.includes("127.0.0.1") && !url?.includes("localhost")) {
  console.error("Refusing to seed: this script only runs against a local Supabase.");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });
for (const name of ["nova", "night", "stranger"]) {
  const email = `${name}@web-signal.local`;
  const { error } = await admin.auth.admin.createUser({ email, password: "test-password-123", email_confirm: true });
  if (error && !/already/i.test(error.message)) throw error;
}
console.log("seeded users");
