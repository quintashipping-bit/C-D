import { customerRates } from "../data/customerRates";

export function findCustomer(customerName) {
  return customerRates.find(
    (c) => c.customer === customerName
  );
}
