import { seedDemoClinic } from "@/server/seed";

seedDemoClinic()
  .then((clinic) => console.log(`Seeded ${clinic.name} (${clinic.id})`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
