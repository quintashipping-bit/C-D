export default function calculateSaudi(form, settings) {
  const value = Number(form.value || 0);
  const weight = Number(form.weight || 0);

  const duty = value * Number(settings.dutyRate || 0.05);

  let clearance = 0;

  if (form.transport === "Courier") {
    clearance = Number(settings.courierClearance || 35);
  }

  if (form.transport === "Air") {
    clearance = Number(settings.airClearance || 55);
  }

  if (form.transport === "Sea") {
    clearance = Number(settings.seaClearance || 75);
  }

  const delivery =
    Number(settings.deliveryBase || 20) +
    weight * 2;

  let total = duty + clearance + delivery;

  if (total < Number(settings.minimumCharge || 45)) {
    total = Number(settings.minimumCharge || 45);
  }

  return {
    country: "Saudi Arabia",
    currency: settings.currency || "GBP",
    duty,
    clearance,
    delivery,
    total
  };
}
