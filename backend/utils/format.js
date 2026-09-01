/** Decimales por tipo de dato (réplica Excel CÁLCULO - CONSUMO ELÉCTRICO.xlsx) */
const DECIMALS = 3;
const DECIMALS_KWH_DAY = 4;
const DECIMALS_KWH_MONTH = 2;
const DECIMALS_KWH_YEAR = 2;
const DECIMALS_KWH_TOTAL = 2;
const DECIMALS_MONEY = 2;

const roundNum = (value, decimals = DECIMALS) => {
  const factor = 10 ** decimals;
  return Math.round(Number(value) * factor) / factor;
};

const formatNum = (n, decimals = DECIMALS) => {
  const v = parseFloat(n);
  if (Number.isNaN(v)) return (0).toFixed(decimals);
  return v.toFixed(decimals);
};

module.exports = {
  DECIMALS,
  DECIMALS_KWH_DAY,
  DECIMALS_KWH_MONTH,
  DECIMALS_KWH_YEAR,
  DECIMALS_KWH_TOTAL,
  DECIMALS_MONEY,
  roundNum,
  formatNum,
};
