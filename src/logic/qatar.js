export default function calculateQatar(form, fx = 4.65) {
  const value = Number(form.value || 0);

  const duty = value * 0.05;

  const qatarValue = value * fx;

  let legalisation = 0;

  if (qatarValue <= 15000) legalisation = 650;
  else if (qatarValue <= 100000) legalisation = 1150;
  else if (qatarValue <= 250000) legalisation = 2650;
  else if (qatarValue <= 1000000) legalisation = 5150;
  else legalisation = qatarValue * 0.006;

  const total =
    duty +
    legalisation;

  return {
    country: "Qatar",
    currency: "QAR",
    duty,
    clearance: legalisation,
    delivery: 0,
    total
  };
}
