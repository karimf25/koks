import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Usage: npx tsx scripts/hash-password.ts <your-password>");
  process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
  console.log("\nPassword hash (paste into APP_PASSWORD_HASH):\n");
  console.log(hash);
  console.log();
});
