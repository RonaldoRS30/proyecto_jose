const DECIMALS = 3;

const roundNum = (value, decimals = DECIMALS) => {
  const factor = 10 ** decimals;
  return Math.round(Number(value) * factor) / factor;
};

const formatNum = (n) => {
  const v = parseFloat(n);
  if (Number.isNaN(v)) return (0).toFixed(DECIMALS);
  return v.toFixed(DECIMALS);
};

module.exports = { DECIMALS, roundNum, formatNum };
