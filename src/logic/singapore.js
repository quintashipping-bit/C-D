export function calculateSingapore({
  weight,
  pickupMinimum,
  pickupRate,
  deliveryMinimum,
  deliveryRate,
  exportCharge,
  importCharge,
}) {

  const pickup =
    pickupMinimum > pickupRate * weight
      ? pickupMinimum
      : pickupRate * weight;

  const delivery =
    deliveryMinimum > deliveryRate * weight
      ? deliveryMinimum
      : deliveryRate * weight;

  const total =
    pickup +
    delivery +
    exportCharge +
    importCharge;

  return {
    pickup,
    delivery,
    exportCharge,
    importCharge,
    total,
  };
}
