export function calculateSaudi({
  weight,
  courierRate,
  minimumCharge,
  maximumCharge,
  exportRate,
}) {

  let courierCharge = weight * courierRate;

  // Excel exact logic

  if (courierCharge <= minimumCharge) {
    courierCharge = minimumCharge;
  }

  if (courierCharge > maximumCharge) {
    courierCharge = maximumCharge;
  }

  const exportCharge = weight * exportRate;

  const total = courierCharge + exportCharge;

  return {
    courierCharge,
    exportCharge,
    total,
  };
}
