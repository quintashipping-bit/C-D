import xlsx from "xlsx";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "..."
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const workbook = xlsx.readFile("./pricing.xlsx");

const sheet =
  workbook.Sheets["Australia"];

const rows =
  xlsx.utils.sheet_to_json(sheet);

async function run() {

  for (const row of rows) {

    const customerName =
      row["Customer"];

    if (!customerName) continue;

    const data = {

      customerName,

      country: "AUSTRALIA",

      courier: {
        ZONE_1: Number(row["Zone 1"] || 0),
        ZONE_2: Number(row["Zone 2"] || 0),
        ZONE_3: Number(row["Zone 3"] || 0)
      },

      air: {
        perKg: Number(row["Air Rate"] || 0)
      },

      sea: {
        perCbm: Number(row["Sea Rate"] || 0)
      }
    };

    await setDoc(
      doc(db, "rates", customerName),
      data
    );

    console.log("Imported:", customerName);
  }

  console.log("DONE");
}

run();
