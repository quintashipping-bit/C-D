export default function calculateSingapore(form) {
  const value = Number(form.value || 0);
  const cbm = Number(form.cbm || 0);

  if (form.transport === "Air") {
    const documentation = 35;
    const customs = 15;
    const transport = 210;
    const labour = 65;
    const terminal = value * 0.15;
    const agency = value * 0.10;

    const total =
      documentation +
      customs +
      transport +
      labour +
      terminal +
      agency;

    return {
      country: "Singapore",
      currency: "SGD",
      duty: 0,
      clearance: total,
      delivery: 0,
      total
    };
  }

  if (form.transport === "Sea") {
    const total =
      40 + 100 + 140 + 65 + 40 +
      60 + 65 + 45 + 210 + 650 +
      (20 * cbm) +
      (59 * cbm);

    return {
      country: "Singapore",
      currency: "SGD",
      duty: 0,
      clearance: total,
      delivery: 0,
      total
    };
  }

  return {
    country: "Singapore",
    currency: "SGD",
    duty: 0,
    clearance: 0,
    delivery: 0,
    total: 0
  };
}
