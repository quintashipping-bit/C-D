export function calculateAustralia({
  weight,
  exportRate,
  dangerousGoodsRate,
  fuelMultiplier,
  minimumCharge,
  zoneRateUnder5,
  zoneRateOver5,
}) {

  const exportCharge =
    weight * exportRate;
