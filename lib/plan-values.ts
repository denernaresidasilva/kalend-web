// Plan prices are entered in pt-BR and sent as integer cents; never silently coerce invalid amounts.
export function moneyToCents(value: string): number {
  const text = value.trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(text)) throw new Error("Informe um preço válido em reais, usando vírgula para os centavos.");
  const [whole, decimal = ""] = text.replaceAll(".", "").split(",");
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 2147483647) throw new Error("O preço informado está fora do limite permitido.");
  return cents;
}
