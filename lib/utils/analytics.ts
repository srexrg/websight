
export const abbreviateNumber = (number: number): string => {
  if (number >= 1000000000) {
    return (number / 1000000000).toFixed(1) + "B";
  } else if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + "M";
  } else if (number >= 1000) {
    return (number / 1000).toFixed(1) + "K";
  } else {
    return number.toString();
  }
};

export const calculatePercentage = (value: number, total: number): string => {
  return total > 0 ? ((value / total) * 100).toFixed(1) + "%" : "0%";
};

export const calculateGrowth = (current: number, previous: number): number => {
  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
};


export const calculateNormalizedPercentage = (value: number, total: number, allValues: number[]): number => {
  const rawPercentage = (value / total) * 100;
  const sumOfAllPercentages = allValues.reduce((sum, val) => sum + (val / total) * 100, 0);
  return (rawPercentage / sumOfAllPercentages) * 100;
}; 