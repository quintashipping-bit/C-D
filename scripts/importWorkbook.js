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
  apiKey: "AIzaSyBzfsXs4KFACtODvWfCIOEtuWnZQjTqpC0",
  authDomain: "c-and-d-calculator.firebaseapp.com",
  projectId: "c-and-d-calculator",
  storageBucket: "c-and-d-calculator.firebasestorage.app",
  messagingSenderId: "424737960704",
  appId: "1:424737960704:web:42bb854480cb0be5bff9e5",
  measurementId: "G-RP7T2H6Z94"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

/* =========================================
   LOAD WORKBOOK
========================================= */

const workbook = xlsx.readFile("./pricing.xlsx");

/* =========================================
   HELPERS
========================================= */

function clean(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function num(value) {
  const n = Number(value);

  return isNaN(n) ? 0 : n;
}

/* =========================================
   IMPORT CUSTOMERS
========================================= */

async function importCustomers(sheetName) {

  const sheet = workbook.Sheets[sheetName];

  if (!sheet) return;

  const rows =
    xlsx.utils.sheet_to_json(sheet);

  for (const row of rows) {

    const customerName =
      clean(
        row.Customer ||
        row.customer ||
        row.Name
      );

    if (!customerName) continue;

    const country =
      clean(
        row.Country ||
        row.country ||
        sheetName
      );

    const deliveryZone =
      clean(
        row.Zone ||
        row.zone ||
        "ZONE_1"
      );

    const data = {
      name: customerName,
      country,
      deliveryZone,
      active: true
    };

    await setDoc(
      doc(db, "customers", customerName),
      data
    );

    console.log(
      "Customer Imported:",
      customerName
    );
  }
}

/* =========================================
   IMPORT AUSTRALIA
========================================= */

async function importAustralia() {

  const sheet =
    workbook.Sheets["Australia"];

  if (!sheet) return;

  const rows =
    xlsx.utils.sheet_to_json(sheet);

  for (const row of rows) {

    const customerName =
      clean(
        row.Customer ||
        row.customer
      );

    if (!customerName) continue;

    const data = {

      customerName,

      country: "AUSTRALIA",

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
      doc(db, "rates", customerName),
      data
    );

    console.log(
      "Australia Rate Imported:",
      customerName
    );
  }
}

/* =========================================
   IMPORT SAUDI
========================================= */

async function importSaudi() {

  const data = {

    currency: "SAR",

    dutyRate: 0.05,

    clearanceRate: 0.003464,

    clearanceMin: 27.75,

    clearanceMax: 538.4,

    deliveryCharge: 25
  };

  await setDoc(
    doc(db, "settings", "saudi"),
    data
  );

  console.log(
    "Saudi Settings Imported"
  );
}

/* =========================================
   IMPORT QATAR
========================================= */

async function importQatar() {

  const data = {

    currency: "QAR",

    dutyRate: 0.05,

    fxRate: 4.65
  };

  await setDoc(
    doc(db, "settings", "qatar"),
    data
  );

  console.log(
    "Qatar Settings Imported"
  );
}

/* =========================================
   IMPORT SINGAPORE
========================================= */

async function importSingapore() {

  const data = {

    currency: "SGD",

    airCharges: {
      handling: 35,
      permits: 15,
      customs: 210,
      delivery: 65
    },

    seaCharges: {
      docs: 40,
      handling: 100,
      customs: 140,
      delivery: 65,
      terminal: 40,
      port: 60,
      wharf: 65,
      fees: 45,
      inspection: 210,
      container: 650,
      perCbm: 79
    }
  };

  await setDoc(
    doc(db, "settings", "singapore"),
    data
  );

  console.log(
    "Singapore Settings Imported"
  );
}

/* =========================================
   IMPORT SOUTH AFRICA
========================================= */

async function importSouthAfrica() {

  const sheet =
    workbook.Sheets["South Africa"];

  if (!sheet) return;

  const rows =
    xlsx.utils.sheet_to_json(sheet);

  const zones = {};

  for (const row of rows) {

    const zone =
      clean(
        row.Zone ||
        row.zone
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
    doc(db, "settings", "southAfrica"),
    {
      currency: "ZAR",
      zones
    }
  );

  console.log(
    "South Africa Imported"
  );
}

/* =========================================
   IMPORT EXCHANGE RATES
========================================= */

async function importExchangeRates() {

  const data = {

    AUD: 1,
    SAR: 4.7,
    QAR: 4.65,
    SGD: 1.7,
    ZAR: 23
  };

  await setDoc(
    doc(db, "settings", "exchangeRates"),
    data
  );

  console.log(
    "Exchange Rates Imported"
  );
}

/* =========================================
   RUN IMPORT
========================================= */

async function run() {

  console.log(
    "STARTING IMPORT..."
  );

  await importCustomers("Australia");

  await importAustralia();

  await importSaudi();

  await importQatar();

  await importSingapore();

  await importSouthAfrica();

  await importExchangeRates();

  console.log(
    "IMPORT COMPLETE"
  );
}

run();
