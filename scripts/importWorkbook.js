import xlsx from "xlsx";

import { initializeApp } from "firebase/app";

import {
  getFirestore,
  doc,
  setDoc
} from "firebase/firestore";

/* =========================================
   FIREBASE CONFIG
========================================= */

const firebaseConfig = {
  apiKey: "YOUR_REAL_API_KEY",
  authDomain: "YOUR_REAL_AUTH_DOMAIN",
  projectId: "YOUR_REAL_PROJECT_ID",
  storageBucket: "YOUR_REAL_BUCKET",
  messagingSenderId: "YOUR_REAL_SENDER_ID",
  appId: "YOUR_REAL_APP_ID"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

/* =========================================
   LOAD WORKBOOK
========================================= */

const workbook =
  xlsx.readFile("./pricing.xlsx");

/* =========================================
   HELPERS
========================================= */

function clean(value) {

  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
}

function num(value) {

  const n = Number(value);

  return isNaN(n)
    ? 0
    : n;
}

/* =========================================
   DEBUG WORKBOOK
========================================= */

function debugWorkbook() {

  console.log(
    "================================="
  );

  console.log(
    "WORKBOOK SHEETS:"
  );

  console.log(
    workbook.SheetNames
  );

  console.log(
    "================================="
  );

  for (const sheetName of workbook.SheetNames) {

    console.log(
      "SHEET:",
      sheetName
    );

    const sheet =
      workbook.Sheets[sheetName];

    const rows =
      xlsx.utils.sheet_to_json(sheet);

    console.log(
      "ROWS:",
      rows.length
    );

    console.log(
      "FIRST 5 ROWS:"
    );

    console.log(
      rows.slice(0, 5)
    );

    console.log(
      "================================="
    );
  }
}

/* =========================================
   IMPORT CUSTOMERS
========================================= */

async function importCustomers() {

  console.log(
    "================================="
  );

  console.log(
    "IMPORTING CUSTOMERS"
  );

  for (const sheetName of workbook.SheetNames) {

    console.log(
      "CHECKING SHEET:",
      sheetName
    );

    const sheet =
      workbook.Sheets[sheetName];

    if (!sheet) {

      console.log(
        "NO SHEET FOUND"
      );

      continue;
    }

    const rows =
      xlsx.utils.sheet_to_json(sheet);

    console.log(
      "TOTAL ROWS:",
      rows.length
    );

    for (const row of rows) {

      console.log(
        "ROW:",
        row
      );

      const customerName =
        clean(
          row.Customer ||
          row.customer ||
          row.CLIENT ||
          row.Client ||
          row.Name ||
          row.NAME
        );

      if (!customerName) {

        console.log(
          "SKIPPED ROW — NO CUSTOMER NAME"
        );

        continue;
      }

      const country =
        clean(
          row.Country ||
          row.country ||
          row.COUNTRY ||
          sheetName
        );

      const deliveryZone =
        clean(
          row.Zone ||
          row.zone ||
          row.ZONE ||
          "ZONE_1"
        );

      const data = {

        name: customerName,

        country,

        deliveryZone,

        active: true
      };

      console.log(
        "IMPORTING CUSTOMER:"
      );

      console.log(data);

      await setDoc(
        doc(
          db,
          "customers",
          customerName
        ),
        data
      );

      console.log(
        "SUCCESS:"
      );

      console.log(
        customerName
      );
    }
  }

  console.log(
    "CUSTOMER IMPORT COMPLETE"
  );
}

/* =========================================
   IMPORT SOUTH AFRICA
========================================= */

async function importSouthAfrica() {

  console.log(
    "IMPORTING SOUTH AFRICA"
  );

  const sheet =
    workbook.Sheets["South Africa"];

  if (!sheet) {

    console.log(
      "NO SOUTH AFRICA SHEET"
    );

    return;
  }

  const rows =
    xlsx.utils.sheet_to_json(sheet);

  const zones = {};

  for (const row of rows) {

    const zone =
      clean(
        row.Zone ||
        row.zone ||
        row.ZONE
      );

    if (!zone) continue;

    zones[zone] = {

      charge: num(
        row.Charge ||
        row.charge
      )
    };
  }

  await setDoc(
    doc(
      db,
      "settings",
      "southAfrica"
    ),
    {
      currency: "ZAR",
      zones
    }
  );

  console.log(
    "SOUTH AFRICA COMPLETE"
  );
}

/* =========================================
   IMPORT AUSTRALIA
========================================= */

async function importAustralia() {

  console.log(
    "IMPORTING AUSTRALIA"
  );

  const sheet =
    workbook.Sheets["Australia"];

  if (!sheet) {

    console.log(
      "NO AUSTRALIA SHEET"
    );

    return;
  }

  const rows =
    xlsx.utils.sheet_to_json(sheet);

  for (const row of rows) {

    const customerName =
      clean(
        row.Customer ||
        row.customer ||
        row.CLIENT
      );

    if (!customerName) continue;

    const data = {

      customerName,

      country: "Australia",

      courier: {

        ZONE_1: num(row["Zone 1"]),
        ZONE_2: num(row["Zone 2"]),
        ZONE_3: num(row["Zone 3"]),
        ZONE_4: num(row["Zone 4"])
      },

      air: {

        perKg: num(
          row["Air Rate"]
        )
      },

      sea: {

        perCbm: num(
          row["Sea Rate"]
        )
      }
    };

    await setDoc(
      doc(
        db,
        "rates",
        customerName
      ),
      data
    );

    console.log(
      "AUSTRALIA IMPORTED:"
    );

    console.log(
      customerName
    );
  }
}

/* =========================================
   IMPORT SETTINGS
========================================= */

async function importSettings() {

  console.log(
    "IMPORTING SETTINGS"
  );

  await setDoc(
    doc(
      db,
      "settings",
      "saudi"
    ),
    {
      currency: "SAR",
      dutyRate: 0.05,
      clearanceRate: 0.003464,
      clearanceMin: 27.75,
      clearanceMax: 538.4,
      deliveryCharge: 25
    }
  );

  await setDoc(
    doc(
      db,
      "settings",
      "qatar"
    ),
    {
      currency: "QAR",
      dutyRate: 0.05,
      fxRate: 4.65
    }
  );

  await setDoc(
    doc(
      db,
      "settings",
      "singapore"
    ),
    {
      currency: "SGD"
    }
  );

  await setDoc(
    doc(
      db,
      "settings",
      "exchangeRates"
    ),
    {
      AUD: 1,
      SAR: 4.7,
      QAR: 4.65,
      SGD: 1.7,
      ZAR: 23
    }
  );

  console.log(
    "SETTINGS COMPLETE"
  );
}

/* =========================================
   RUN
========================================= */

async function run() {

  console.log(
    "================================="
  );

  console.log(
    "STARTING IMPORT"
  );

  debugWorkbook();

  await importCustomers();

  await importAustralia();

  await importSouthAfrica();

  await importSettings();

  console.log(
    "================================="
  );

  console.log(
    "IMPORT COMPLETE"
  );
}

run();
