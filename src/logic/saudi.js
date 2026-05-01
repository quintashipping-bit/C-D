export default function calculateSaudi(form) {
  const value = Number(form.value || 0);

  const duty = value * 0.05;

  let merchandise = value * 0.003464;

  if (merchandise < 27.75) merchandise = 27.75;
  if (merchandise > 538.4) merchandise = 538.4;

  const dutyTaxPaidFee = 25;

  const total =
    duty +
    merchandise +
    dutyTaxPaidFee;

  return {
    country: "Saudi Arabia",
    currency: "GBP",
    duty,
    clearance: merchandise,
    delivery: dutyTaxPaidFee,
    total
  };
}
