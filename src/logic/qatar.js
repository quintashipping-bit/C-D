export function calculateQatar({
  weight,
  courierRate,
  minimumCharge,
  maximumCharge,
  exportRate,
  customsValue,
}) {

  let courierCharge = weight * courierRate;

  if (courierCharge > maximumCharge) {
    courierCharge = maximumCharge;
  }

  if (courierCharge < minimumCharge) {
    courierCharge = minimumCharge;
  }

  const exportCharge = weight * exportRate;

  let customsCharge = 0;

  if (customsValue < 15000) {
    customsCharge = 250;
  } else if (customsValue < 100000) {
    customsCharge = 500;
  } else if (customsValue < 250000) {
    customsCharge = 750;
  } else {
    customsCharge = customsValue * 0.006;
  }

  const total =
    courierCharge +
    exportCharge +
    customsCharge;

  return {
    courierCharge,
    exportCharge,
    customsCharge,
    total,
  };
}
