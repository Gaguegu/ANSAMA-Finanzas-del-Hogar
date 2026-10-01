// Datos oficiales auditados del año 2025 extraídos directamente del Excel y PDF de saldos del usuario

export interface MonthBenchmark {
  monthIndex: number; // 0 to 11
  monthName: string;
  fullMonthName: string;
  income: number;
  expense: number;
  net: number;
  byBank: Record<string, { income: number; expense: number; net: number; balance?: number }>;
}

export interface YearBenchmark {
  year: number;
  yearIncome: number;
  yearExpense: number;
  yearNet: number;
  averageMonthNet: number;
  months: MonthBenchmark[];
  bankTotals: Record<string, { income: number; expense: number; net: number; endBalance?: number }>;
}

export const EXCEL_2025_BENCHMARK: YearBenchmark = {
  year: 2025,
  yearIncome: 356155.56,
  yearExpense: 339578.97,
  yearNet: 16576.59,
  averageMonthNet: 1381.38,
  bankTotals: {
    bbva: { income: 33649.31, expense: 31148.47, net: 2500.84, endBalance: 7099.97 },
    openbank_cte: { income: 51582.47, expense: 102235.49, net: -50653.02, endBalance: 3791.89 },
    openbank_fija: { income: 29777.49, expense: 13909.22, net: 15868.27, endBalance: 9017.80 },
    ing_nomina: { income: 2100.00, expense: 867.98, net: 1232.02, endBalance: 1721.47 },
    ing_naranja: { income: 4570.62, expense: 132959.48, net: -128388.86, endBalance: 11359.08 },
    trade_republic: { income: 50406.87, expense: 5005.93, net: 45400.94, endBalance: 19217.33 },
    bankinter: { income: 105639.38, expense: 8.00, net: 105631.38, endBalance: 145631.38 },
    imagin: { income: 75349.31, expense: 50364.29, net: 24985.02, endBalance: 24022.50 }
  },
  months: [
    {
      monthIndex: 0,
      monthName: 'Ene',
      fullMonthName: 'Enero',
      income: 70952.26,
      expense: 68431.19,
      net: 2521.07,
      byBank: {
        bbva: { income: 3151.80, expense: 2227.39, net: 924.41, balance: 5523.54 },
        openbank_cte: { income: 4481.71, expense: 3770.03, net: 711.68, balance: 5195.42 },
        openbank_fija: { income: 830.43, expense: 830.00, net: 0.43, balance: 830.43 },
        ing_nomina: { income: 175.00, expense: 57.00, net: 118.00, balance: 418.95 },
        ing_naranja: { income: 1953.94, expense: 16000.00, net: -14046.06, balance: 138947.11 },
        trade_republic: { income: 45309.38, expense: 435.53, net: 44873.85, balance: 44873.85 },
        bankinter: { income: 0, expense: 0, net: 0, balance: 0 },
        imagin: { income: 15050.00, expense: 45111.24, net: -30061.24, balance: 20000.00 }
      }
    },
    {
      monthIndex: 1,
      monthName: 'Feb',
      fullMonthName: 'Febrero',
      income: 9661.42,
      expense: 9643.57,
      net: 17.85,
      byBank: {
        bbva: { income: 2599.11, expense: 1887.12, net: 711.99, balance: 6235.53 },
        openbank_cte: { income: 5320.78, expense: 4473.03, net: 847.75, balance: 6043.17 },
        openbank_fija: { income: 832.28, expense: 2480.00, net: -1647.72, balance: 832.28 },
        ing_nomina: { income: 175.00, expense: 82.07, net: 92.93, balance: 511.88 },
        ing_naranja: { income: 254.88, expense: 0, net: 254.88, balance: 139201.99 },
        trade_republic: { income: 479.37, expense: 721.35, net: -241.98, balance: 44631.87 },
        bankinter: { income: 0, expense: 0, net: 0, balance: 0 },
        imagin: { income: 0, expense: 0, net: 0, balance: 20000.00 }
      }
    },
    {
      monthIndex: 2,
      monthName: 'Mar',
      fullMonthName: 'Marzo',
      income: 9331.51,
      expense: 7105.86,
      net: 2225.65,
      byBank: {
        bbva: { income: 2676.90, expense: 2007.06, net: 669.84, balance: 6905.37 },
        openbank_cte: { income: 3583.51, expense: 2856.98, net: 726.53, balance: 4887.60 },
        openbank_fija: { income: 832.67, expense: 780.00, net: 52.67, balance: 3738.01 },
        ing_nomina: { income: 175.00, expense: 86.50, net: 88.50, balance: 489.45 },
        ing_naranja: { income: 291.44, expense: 0, net: 291.44, balance: 139508.44 },
        trade_republic: { income: 1771.99, expense: 811.64, net: 960.35, balance: 45592.22 },
        bankinter: { income: 0, expense: 0, net: 0, balance: 0 },
        imagin: { income: 0, expense: 563.68, net: -563.68, balance: 19436.32 }
      }
    },
    {
      monthIndex: 3,
      monthName: 'Abr',
      fullMonthName: 'Abril',
      income: 69201.92,
      expense: 72586.04,
      net: -3384.12,
      byBank: {
        bbva: { income: 2707.66, expense: 1977.47, net: 730.19, balance: 7635.56 },
        openbank_cte: { income: 3892.82, expense: 3175.74, net: 717.08, balance: 5604.68 },
        openbank_fija: { income: 832.96, expense: 780.00, net: 52.96, balance: 3790.97 },
        ing_nomina: { income: 175.00, expense: 64.64, net: 110.36, balance: 599.81 },
        ing_naranja: { income: 260.13, expense: 60000.00, net: -59739.87, balance: 79768.57 },
        trade_republic: { income: 1061.04, expense: 3047.93, net: -1986.89, balance: 43605.33 },
        bankinter: { income: 0, expense: 0, net: 0, balance: 0 },
        imagin: { income: 60272.31, expense: 3540.26, net: 56732.05, balance: 76168.37 }
      }
    },
    {
      monthIndex: 4,
      monthName: 'May',
      fullMonthName: 'Mayo',
      income: 9263.51,
      expense: 6710.07,
      net: 2553.44,
      byBank: {
        bbva: { income: 2640.00, expense: 2178.11, net: 461.89, balance: 8097.45 },
        openbank_cte: { income: 3925.14, expense: 2927.10, net: 998.04, balance: 6602.72 },
        openbank_fija: { income: 832.87, expense: 780.00, net: 52.87, balance: 3843.84 },
        ing_nomina: { income: 175.00, expense: 35.29, net: 139.71, balance: 739.52 },
        ing_naranja: { income: 245.32, expense: 0, net: 245.32, balance: 80013.89 },
        trade_republic: { income: 1445.18, expense: 0, net: 1445.18, balance: 45050.51 },
        bankinter: { income: 0, expense: 0, net: 0, balance: 0 },
        imagin: { income: 0, expense: 789.57, net: -789.57, balance: 75378.80 }
      }
    },
    {
      monthIndex: 5,
      monthName: 'Jun',
      fullMonthName: 'Junio',
      income: 22238.97,
      expense: 18686.12,
      net: 3552.85,
      byBank: {
        bbva: { income: 2588.51, expense: 6334.48, net: -3745.97, balance: 4351.48 },
        openbank_cte: { income: 6343.65, expense: 11059.89, net: -4716.24, balance: 1886.48 },
        openbank_fija: { income: 12833.02, expense: 780.00, net: 12053.02, balance: 15896.86 },
        ing_nomina: { income: 175.00, expense: 54.23, net: 120.77, balance: 860.29 },
        ing_naranja: { income: 240.07, expense: 0, net: 240.07, balance: 80253.96 },
        trade_republic: { income: 58.72, expense: 287.75, net: -229.03, balance: 44821.48 },
        bankinter: { income: 0, expense: 0, net: 0, balance: 0 },
        imagin: { income: 0, expense: 169.77, net: -169.77, balance: 75209.03 }
      }
    },
    {
      monthIndex: 6,
      monthName: 'Jul',
      fullMonthName: 'Julio',
      income: 9689.84,
      expense: 9798.14,
      net: -108.30,
      byBank: {
        bbva: { income: 2657.57, expense: 1767.49, net: 890.08, balance: 5241.56 },
        openbank_cte: { income: 3481.71, expense: 3124.15, net: 357.56, balance: 2244.04 },
        openbank_fija: { income: 2831.03, expense: 2780.00, net: 51.03, balance: 15947.89 },
        ing_nomina: { income: 175.00, expense: 126.50, net: 48.50, balance: 908.79 },
        ing_naranja: { income: 239.50, expense: 2000.00, net: -1760.50, balance: 78493.46 },
        trade_republic: { income: 305.03, expense: 0, net: 305.03, balance: 45126.51 },
        bankinter: { income: 0, expense: 0, net: 0, balance: 0 },
        imagin: { income: 0, expense: 0, net: 0, balance: 75209.03 }
      }
    },
    {
      monthIndex: 7,
      monthName: 'Ago',
      fullMonthName: 'Agosto',
      income: 66323.18,
      expense: 63303.14,
      net: 3020.04,
      byBank: {
        bbva: { income: 4148.15, expense: 2172.89, net: 1975.26, balance: 7216.82 },
        openbank_cte: { income: 5922.27, expense: 5292.71, net: 629.56, balance: 2873.60 },
        openbank_fija: { income: 830.51, expense: 780.00, net: 50.51, balance: 15998.40 },
        ing_nomina: { income: 175.00, expense: 57.54, net: 117.46, balance: 1026.25 },
        ing_naranja: { income: 239.99, expense: 55000.00, net: -54760.01, balance: 23733.45 },
        trade_republic: { income: 7.26, expense: 0, net: 7.26, balance: 45133.77 },
        bankinter: { income: 55000.00, expense: 0, net: 55000.00, balance: 55000.00 },
        imagin: { income: 0, expense: 0, net: 0, balance: 75209.03 }
      }
    },
    {
      monthIndex: 8,
      monthName: 'Sep',
      fullMonthName: 'Septiembre',
      income: 28299.91,
      expense: 26694.86,
      net: 1605.05,
      byBank: {
        bbva: { income: 2646.39, expense: 2220.43, net: 425.96, balance: 7642.78 },
        openbank_cte: { income: 4345.50, expense: 23627.35, net: -19281.85, balance: 4591.75 },
        openbank_fija: { income: 830.53, expense: 780.00, net: 50.53, balance: 16048.93 },
        ing_nomina: { income: 175.00, expense: 67.08, net: 107.92, balance: 1134.17 },
        ing_naranja: { income: 224.28, expense: 0, net: 224.28, balance: 23957.73 },
        trade_republic: { income: 0.51, expense: 0, net: 0.51, balance: 45134.28 },
        bankinter: { income: 20077.70, expense: 0, net: 20077.70, balance: 75077.70 },
        imagin: { income: 0, expense: 0, net: 0, balance: 75209.03 }
      }
    },
    {
      monthIndex: 9,
      monthName: 'Oct',
      fullMonthName: 'Octubre',
      income: 37957.13,
      expense: 37515.52,
      net: 441.61,
      byBank: {
        bbva: { income: 2587.82, expense: 2967.67, net: -379.85, balance: 7262.93 },
        openbank_cte: { income: 4007.31, expense: 33699.95, net: -29692.64, balance: 4901.76 },
        openbank_fija: { income: 830.51, expense: 780.00, net: 50.51, balance: 3916.67 },
        ing_nomina: { income: 175.00, expense: 59.90, net: 115.10, balance: 1249.27 },
        ing_naranja: { income: 220.48, expense: 0, net: 220.48, balance: 24178.21 },
        trade_republic: { income: 0.49, expense: 0, net: 0.49, balance: 45134.77 },
        bankinter: { income: 30135.52, expense: 8.00, net: 30127.52, balance: 105205.22 },
        imagin: { income: 0, expense: 0, net: 0, balance: 75209.03 }
      }
    },
    {
      monthIndex: 10,
      monthName: 'Nov',
      fullMonthName: 'Noviembre',
      income: 10667.11,
      expense: 7383.21,
      net: 3283.90,
      byBank: {
        bbva: { income: 2652.57, expense: 2908.45, net: -255.88, balance: 7007.05 },
        openbank_cte: { income: 6336.98, expense: 3404.23, net: 2932.75, balance: 7834.51 },
        openbank_fija: { income: 830.54, expense: 780.00, net: 50.54, balance: 3967.21 },
        ing_nomina: { income: 175.00, expense: 120.76, net: 54.24, balance: 1303.51 },
        ing_naranja: { income: 220.54, expense: 0, net: 220.54, balance: 24398.75 },
        trade_republic: { income: 265.38, expense: 0, net: 265.38, balance: 45400.15 },
        bankinter: { income: 186.10, expense: 0, net: 186.10, balance: 145391.32 },
        imagin: { income: 0, expense: 169.77, net: -169.77, balance: 75039.26 }
      }
    },
    {
      monthIndex: 11,
      monthName: 'Dic',
      fullMonthName: 'Diciembre',
      income: 12568.80,
      expense: 11721.25,
      net: 847.55,
      byBank: {
        bbva: { income: 2592.83, expense: 2499.91, net: 92.92, balance: 7099.97 },
        openbank_cte: { income: 3481.63, expense: 8364.87, net: -4883.24, balance: 3791.89 },
        openbank_fija: { income: 5830.92, expense: 780.00, net: 5050.92, balance: 9017.80 },
        ing_nomina: { income: 175.00, expense: 56.47, net: 118.53, balance: 1721.47 },
        ing_naranja: { income: 220.57, expense: 0, net: 220.57, balance: 11359.08 },
        trade_republic: { income: 0.79, expense: 0, net: 0.79, balance: 19217.33 },
        bankinter: { income: 240.06, expense: 0, net: 240.06, balance: 145631.38 },
        imagin: { income: 27.00, expense: 20.00, net: 7.00, balance: 24022.50 }
      }
    }
  ]
};

export const EXCEL_2026_BENCHMARK: YearBenchmark = {
  year: 2026,
  yearIncome: 245414.06,
  yearExpense: 154487.30,
  yearNet: 90926.76,
  averageMonthNet: 11365.85,
  bankTotals: {
    bbva: { income: 21082.94, expense: 22086.19, net: -1003.24 },
    openbank_cte: { income: 31993.74, expense: 31073.02, net: 920.72 },
    openbank_fija: { income: 12651.40, expense: 6940.00, net: 5711.40 },
    ing_nomina: { income: 1400.00, expense: 588.42, net: 811.58 },
    ing_naranja: { income: 5767.18, expense: 0.00, net: 5767.18 },
    trade_republic: { income: 86315.80, expense: 8113.96, net: 78201.84 },
    bankinter: { income: 1612.98, expense: 104.49, net: 1508.49 },
    imagin: { income: 85000.00, expense: 86000.00, net: -1000.00 }
  },
  months: [
    {
      monthIndex: 0,
      monthName: 'Ene',
      fullMonthName: 'Enero',
      income: 7697.92,
      expense: 5964.34,
      net: 1733.58,
      byBank: {
        bbva: { income: 2667.14, expense: 2259.67, net: 407.47 },
        openbank_cte: { income: 3554.58, expense: 2817.67, net: 736.91 },
        openbank_fija: { income: 831.24, expense: 780.00, net: 51.24 },
        ing_nomina: { income: 175.00, expense: 107.00, net: 68.00 },
        ing_naranja: { income: 220.63, expense: 0.00, net: 220.63 },
        trade_republic: { income: 0.87, expense: 0.00, net: 0.87 },
        bankinter: { income: 248.46, expense: 0.00, net: 248.46 },
        imagin: { income: 0.00, expense: 0.00, net: 0.00 }
      }
    },
    {
      monthIndex: 1,
      monthName: 'Feb',
      fullMonthName: 'Febrero',
      income: 7632.95,
      expense: 5863.52,
      net: 1769.43,
      byBank: {
        bbva: { income: 2642.11, expense: 2124.78, net: 517.33 },
        openbank_cte: { income: 3554.61, expense: 2873.74, net: 680.87 },
        openbank_fija: { income: 831.25, expense: 780.00, net: 51.25 },
        ing_nomina: { income: 175.00, expense: 70.00, net: 105.00 },
        ing_naranja: { income: 220.68, expense: 0.00, net: 220.68 },
        trade_republic: { income: 0.87, expense: 0.00, net: 0.87 },
        bankinter: { income: 208.43, expense: 15.00, net: 193.43 },
        imagin: { income: 0.00, expense: 0.00, net: 0.00 }
      }
    },
    {
      monthIndex: 2,
      monthName: 'Mar',
      fullMonthName: 'Marzo',
      income: 7639.81,
      expense: 14056.22,
      net: -6416.41,
      byBank: {
        bbva: { income: 2677.91, expense: 2255.66, net: 422.25 },
        openbank_cte: { income: 3554.59, expense: 2858.60, net: 695.99 },
        openbank_fija: { income: 831.13, expense: 780.00, net: 51.13 },
        ing_nomina: { income: 175.00, expense: 48.00, net: 127.00 },
        ing_naranja: { income: 220.66, expense: 0.00, net: 220.66 },
        trade_republic: { income: 0.79, expense: 8113.96, net: -8113.17 },
        bankinter: { income: 179.73, expense: 0.00, net: 179.73 },
        imagin: { income: 0.00, expense: 0.00, net: 0.00 }
      }
    },
    {
      monthIndex: 3,
      monthName: 'Abr',
      fullMonthName: 'Abril',
      income: 7579.12,
      expense: 6032.69,
      net: 1546.43,
      byBank: {
        bbva: { income: 2561.34, expense: 2288.32, net: 273.02 },
        openbank_cte: { income: 3569.50, expense: 2902.37, net: 667.13 },
        openbank_fija: { income: 831.25, expense: 780.00, net: 51.25 },
        ing_nomina: { income: 175.00, expense: 62.00, net: 113.00 },
        ing_naranja: { income: 220.77, expense: 0.00, net: 220.77 },
        trade_republic: { income: 22.03, expense: 0.00, net: 22.03 },
        bankinter: { income: 199.23, expense: 0.00, net: 199.23 },
        imagin: { income: 0.00, expense: 0.00, net: 0.00 }
      }
    },
    {
      monthIndex: 4,
      monthName: 'May',
      fullMonthName: 'Mayo',
      income: 7671.55,
      expense: 6340.29,
      net: 1331.26,
      byBank: {
        bbva: { income: 2666.13, expense: 2189.55, net: 476.58 },
        openbank_cte: { income: 3554.52, expense: 3287.43, net: 267.09 },
        openbank_fija: { income: 831.23, expense: 780.00, net: 51.23 },
        ing_nomina: { income: 175.00, expense: 64.82, net: 110.18 },
        ing_naranja: { income: 220.79, expense: 0.00, net: 220.79 },
        trade_republic: { income: 30.82, expense: 0.00, net: 30.82 },
        bankinter: { income: 193.06, expense: 18.49, net: 174.57 },
        imagin: { income: 0.00, expense: 0.00, net: 0.00 }
      }
    },
    {
      monthIndex: 5,
      monthName: 'Jun',
      fullMonthName: 'Junio',
      income: 191560.70,
      expense: 102679.62,
      net: 88881.08,
      byBank: {
        bbva: { income: 2601.24, expense: 6454.18, net: -3852.94 },
        openbank_cte: { income: 6496.90, expense: 9199.40, net: -2702.50 },
        openbank_fija: { income: 6831.30, expense: 880.00, net: 5951.30 },
        ing_nomina: { income: 175.00, expense: 146.04, net: 28.96 },
        ing_naranja: { income: 4220.87, expense: 0.00, net: 4220.87 },
        trade_republic: { income: 86035.65, expense: 0.00, net: 86035.65 },
        bankinter: { income: 199.74, expense: 0.00, net: 199.74 },
        imagin: { income: 85000.00, expense: 86000.00, net: -1000.00 }
      }
    },
    {
      monthIndex: 6,
      monthName: 'Jul',
      fullMonthName: 'Julio',
      income: 8330.04,
      expense: 7643.75,
      net: 686.29,
      byBank: {
        bbva: { income: 2663.75, expense: 2251.11, net: 412.64 },
        openbank_cte: { income: 4154.52, expense: 3965.58, net: 188.94 },
        openbank_fija: { income: 831.98, expense: 1380.00, net: -548.02 },
        ing_nomina: { income: 175.00, expense: 40.56, net: 134.44 },
        ing_naranja: { income: 221.00, expense: 0.00, net: 221.00 },
        trade_republic: { income: 90.23, expense: 0.00, net: 90.23 },
        bankinter: { income: 193.56, expense: 6.50, net: 187.06 },
        imagin: { income: 0.00, expense: 0.00, net: 0.00 }
      }
    },
    {
      monthIndex: 7,
      monthName: 'Ago',
      fullMonthName: 'Agosto',
      income: 7721.97,
      expense: 6326.87,
      net: 1395.10,
      byBank: {
        bbva: { income: 2603.35, expense: 2262.94, net: 340.41 },
        openbank_cte: { income: 3554.52, expense: 3168.23, net: 386.29 },
        openbank_fija: { income: 832.02, expense: 780.00, net: 52.02 },
        ing_nomina: { income: 175.00, expense: 50.00, net: 125.00 },
        ing_naranja: { income: 221.78, expense: 0.00, net: 221.78 },
        trade_republic: { income: 135.04, expense: 0.00, net: 135.04 },
        bankinter: { income: 200.26, expense: 65.70, net: 134.56 },
        imagin: { income: 0.00, expense: 0.00, net: 0.00 }
      }
    }
  ]
};

export function getBenchmarkForYear(year: number): YearBenchmark | null {
  if (year === 2025) return EXCEL_2025_BENCHMARK;
  if (year === 2026) return EXCEL_2026_BENCHMARK;
  return null;
}

/**
 * Identifica la clave benchmark del Excel 2025 para una cuenta bancaria dada
 */
export function matchAccountToBenchmarkKey(acc: { id?: string; bankId?: string; bankName?: string; accountName?: string }): string | null {
  const bankId = (acc.bankId || '').toLowerCase();
  const bankName = (acc.bankName || '').toLowerCase();
  const accName = (acc.accountName || '').toLowerCase();
  const id = (acc.id || '').toLowerCase();
  const text = `${bankId} ${bankName} ${accName} ${id}`;

  if (text.includes('bbva')) return 'bbva';
  if (text.includes('bankinter')) return 'bankinter';
  if (text.includes('trade') || text.includes('republic')) return 'trade_republic';
  if (text.includes('imagin') || text.includes('caixa')) return 'imagin';
  if (text.includes('openbank') || text.includes('ob')) {
    if (text.includes('fija')) return 'openbank_fija';
    return 'openbank_cte';
  }
  if (text.includes('ing')) {
    if (text.includes('naranja')) return 'ing_naranja';
    return 'ing_nomina';
  }
  return null;
}
