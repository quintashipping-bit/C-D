export function calculateSouthAfrica({
  weight,
  zone,
  ratePerKg,
  surcharge,
  fuelRate = 0,
  shipmentType,
}) {

  // Excel:
  // IF(zone > ratePerKg * weight, zone, ratePerKg * weight)

  const delivery =
    zone > ratePerKg * weight
      ? zone
      : ratePerKg * weight;

  // Excel:
  // IF(zone = 220,0,zone*fuelRate)

  const fuel =
    zone === 220
      ? 0
      : zone * fuelRate;

  const total = delivery + surcharge + fuel;

  return {
    shipmentType,
    delivery,
    surcharge,
    fuel,
    total,
  };
}
