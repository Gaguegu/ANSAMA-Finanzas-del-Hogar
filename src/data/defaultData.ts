import { AppState, BankAccount, TransactionCategory, Transaction, YieldRecord } from '../types';

export const DEFAULT_ACCOUNTS: BankAccount[] = [
  {
    id: 'acc-bbva-nomina',
    bankId: 'bbva',
    bankName: 'BBVA',
    accountName: 'Cuenta Online Nómina',
    iban: 'ES76 0182 4590 1200 8493 2109',
    accountNumberMasked: 'ES76 •••• •••• 2109',
    type: 'checking',
    balance: 4850.25,
    balanceDate: '2026-09-20',
    currency: 'EUR',
    lastSynced: new Date().toISOString(),
    color: '#004481', // BBVA Navy
    textColor: '#ffffff',
    bgLight: '#f0f5fa',
    borderColor: '#004481'
  },
  {
    id: 'acc-bbva-tarjeta',
    bankId: 'bbva',
    bankName: 'BBVA',
    accountName: 'Tarjeta Aqua Crédito',
    iban: 'ES76 0182 4590 1200 9942 8841',
    accountNumberMasked: 'Aqua Crédito •• 8841',
    type: 'credit',
    balance: -435.60,
    balanceDate: '2026-09-20',
    currency: 'EUR',
    lastSynced: new Date().toISOString(),
    color: '#1464A5',
    textColor: '#ffffff',
    bgLight: '#eef6fc',
    borderColor: '#1464A5'
  },
  {
    id: 'acc-santander-one',
    bankId: 'santander',
    bankName: 'Santander',
    accountName: 'Cuenta Santander One Familiar',
    iban: 'ES91 0049 1500 0512 3456 7890',
    accountNumberMasked: 'ES91 •••• •••• 7890',
    type: 'checking',
    balance: 6240.80,
    balanceDate: '2026-09-20',
    currency: 'EUR',
    lastSynced: new Date().toISOString(),
    color: '#EC0000', // Santander Red
    textColor: '#ffffff',
    bgLight: '#fff5f5',
    borderColor: '#EC0000'
  },
  {
    id: 'acc-santander-ahorro',
    bankId: 'santander',
    bankName: 'Santander',
    accountName: 'Cuenta Metas Ahorro Hogar',
    iban: 'ES91 0049 1500 0599 8765 4321',
    accountNumberMasked: 'Ahorro Metas •• 4321',
    type: 'savings',
    balance: 16800.00,
    balanceDate: '2026-09-20',
    currency: 'EUR',
    lastSynced: new Date().toISOString(),
    color: '#B50000',
    textColor: '#ffffff',
    bgLight: '#fdf2f2',
    borderColor: '#B50000'
  }
];

export const DEFAULT_CATEGORIES: TransactionCategory[] = [
  {
    id: 'cat-vivienda',
    name: 'Vivienda e Hipoteca',
    iconName: 'Home',
    type: 'expense',
    color: '#2563eb', // blue
    bgLight: '#eff6ff',
    monthlyBudget: 850
  },
  {
    id: 'cat-alimentacion',
    name: 'Supermercado & Hogar',
    iconName: 'ShoppingCart',
    type: 'expense',
    color: '#16a34a', // green
    bgLight: '#f0fdf4',
    monthlyBudget: 550
  },
  {
    id: 'cat-suministros',
    name: 'Luz, Agua, Gas e Internet',
    iconName: 'Zap',
    type: 'expense',
    color: '#ea580c', // orange
    bgLight: '#fff7ed',
    monthlyBudget: 220
  },
  {
    id: 'cat-transporte',
    name: 'Gasolina & Transporte',
    iconName: 'Car',
    type: 'expense',
    color: '#0891b2', // cyan
    bgLight: '#ecfeff',
    monthlyBudget: 180
  },
  {
    id: 'cat-ocio',
    name: 'Restaurantes & Ocio',
    iconName: 'Utensils',
    type: 'expense',
    color: '#9333ea', // purple
    bgLight: '#faf5ff',
    monthlyBudget: 250
  },
  {
    id: 'cat-salud',
    name: 'Salud & Farmacia',
    iconName: 'HeartPulse',
    type: 'expense',
    color: '#e11d48', // rose
    bgLight: '#fff1f2',
    monthlyBudget: 100
  },
  {
    id: 'cat-suscripciones',
    name: 'Streaming & Suscripciones',
    iconName: 'Smartphone',
    type: 'expense',
    color: '#4f46e5', // indigo
    bgLight: '#eef2ff',
    monthlyBudget: 60
  },
  {
    id: 'cat-otros-gastos',
    name: 'Otros Gastos',
    iconName: 'Tag',
    type: 'expense',
    color: '#64748b', // slate
    bgLight: '#f8fafc',
    monthlyBudget: 150
  },
  {
    id: 'cat-seguros',
    name: 'Seguros & Pólizas',
    iconName: 'ShieldCheck',
    type: 'expense',
    color: '#0284c7', // light blue
    bgLight: '#f0f9ff',
    monthlyBudget: 150
  },
  {
    id: 'cat-comunidad',
    name: 'Comunidad de Propietarios',
    iconName: 'Building',
    type: 'expense',
    color: '#6366f1', // indigo
    bgLight: '#eef2ff',
    monthlyBudget: 120
  },
  {
    id: 'cat-efectivo',
    name: 'Cajero & Retirada Efectivo',
    iconName: 'Banknote',
    type: 'expense',
    color: '#d97706', // amber
    bgLight: '#fffbeb',
    monthlyBudget: 250
  },
  {
    id: 'cat-hogar',
    name: 'Hogar, Bricolaje & Ferretería',
    iconName: 'Wrench',
    type: 'expense',
    color: '#059669', // emerald
    bgLight: '#ecfdf5',
    monthlyBudget: 100
  },
  {
    id: 'cat-transferencias-gasto',
    name: 'Traspaso entre Cuentas',
    iconName: 'ArrowUpRight',
    type: 'expense',
    color: '#0d9488', // teal
    bgLight: '#f0fdfa'
  },
  // Incomes
  {
    id: 'cat-nomina',
    name: 'Nómina & Sueldo',
    iconName: 'Briefcase',
    type: 'income',
    color: '#059669', // emerald
    bgLight: '#ecfdf5',
  },
  {
    id: 'cat-traspaso-ingreso',
    name: 'Traspaso entre Cuentas',
    iconName: 'ArrowDownLeft',
    type: 'income',
    color: '#0d9488', // teal
    bgLight: '#f0fdfa'
  },
  {
    id: 'cat-bizum-ingreso',
    name: 'Bizum & Transferencias',
    iconName: 'ArrowDownLeft',
    type: 'income',
    color: '#0d9488', // teal
    bgLight: '#f0fdfa',
  },
  {
    id: 'cat-rendimientos',
    name: 'Intereses & Dividendos',
    iconName: 'TrendingUp',
    type: 'income',
    color: '#0284c7', // light blue
    bgLight: '#f0f9ff',
  },
  {
    id: 'cat-otros-ingresos',
    name: 'Otros Ingresos',
    iconName: 'PlusCircle',
    type: 'income',
    color: '#475569',
    bgLight: '#f8fafc',
  }
];

export const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    accountId: 'acc-bbva-nomina',
    date: '2026-09-15',
    title: 'Mercadona Supermercado',
    amount: 86.45,
    type: 'expense',
    categoryId: 'cat-alimentacion',
    note: 'Compra semanal familiar'
  },
  {
    id: 'tx-2',
    accountId: 'acc-santander-one',
    date: '2026-09-14',
    title: 'Recibo Iberdrola Clientes',
    amount: 74.20,
    type: 'expense',
    categoryId: 'cat-suministros',
    note: 'Factura electricidad agosto'
  },
  {
    id: 'tx-3',
    accountId: 'acc-bbva-nomina',
    date: '2026-09-12',
    title: 'Gasolinera Repsol E.S.',
    amount: 62.00,
    type: 'expense',
    categoryId: 'cat-transporte',
    note: 'Depósito diésel coche'
  },
  {
    id: 'tx-4',
    accountId: 'acc-bbva-tarjeta',
    date: '2026-09-10',
    title: 'Restaurante Asador La Dehesa',
    amount: 58.50,
    type: 'expense',
    categoryId: 'cat-ocio',
    note: 'Comida de domingo'
  },
  {
    id: 'tx-5',
    accountId: 'acc-bbva-nomina',
    date: '2026-09-08',
    title: 'Farmacia San Juan',
    amount: 24.30,
    type: 'expense',
    categoryId: 'cat-salud',
    note: 'Medicamentos y botiquín'
  },
  {
    id: 'tx-6',
    accountId: 'acc-santander-one',
    date: '2026-09-05',
    title: 'Cuota Mensual Hipoteca BBVA',
    amount: 620.00,
    type: 'expense',
    categoryId: 'cat-vivienda',
    note: 'Recibo mensual préstamo hipotecario'
  },
  {
    id: 'tx-7',
    accountId: 'acc-santander-one',
    date: '2026-09-03',
    title: 'Netflix & Spotify Premium',
    amount: 28.98,
    type: 'expense',
    categoryId: 'cat-suscripciones',
    note: 'Plataformas de streaming'
  },
  {
    id: 'tx-8',
    accountId: 'acc-bbva-nomina',
    date: '2026-09-01',
    title: 'Nómina Mensual Empresa S.L.',
    amount: 2350.00,
    type: 'income',
    categoryId: 'cat-nomina',
    note: 'Sueldo mes septiembre'
  },
  {
    id: 'tx-9',
    accountId: 'acc-santander-one',
    date: '2026-09-01',
    title: 'Nómina Consultoría Tech S.A.',
    amount: 1980.00,
    type: 'income',
    categoryId: 'cat-nomina',
    note: 'Sueldo profesional 2'
  },
  {
    id: 'tx-10',
    accountId: 'acc-bbva-nomina',
    date: '2026-09-02',
    title: 'Bizum de Marta (Cena amigos)',
    amount: 35.00,
    type: 'income',
    categoryId: 'cat-bizum-ingreso',
    note: 'Reembolso cena'
  },
  {
    id: 'tx-11',
    accountId: 'acc-santander-ahorro',
    date: '2026-09-01',
    title: 'Intereses Liquidación Cuenta Ahorro',
    amount: 28.50,
    type: 'income',
    categoryId: 'cat-rendimientos',
    note: 'Rendimiento mensual remunerada'
  },
  {
    id: 'tx-12',
    accountId: 'acc-bbva-nomina',
    date: '2026-08-28',
    title: 'Carrefour Hipermercado',
    amount: 142.10,
    type: 'expense',
    categoryId: 'cat-alimentacion',
    note: 'Compra mensual no perecederos'
  }
];

export const DEFAULT_YIELDS: YieldRecord[] = [
  {
    id: 'yd-2026-1',
    type: 'interest',
    accountId: 'acc-santander-ahorro',
    date: '2026-09-01',
    title: 'Intereses Liquidación Mensual Cuenta Metas',
    grossAmount: 35.19,
    taxRatePercent: 19,
    withholdingTax: 6.69,
    netAmount: 28.50,
    notes: 'Liquidación mensual ahorro remunerado Santander'
  },
  {
    id: 'yd-2026-2',
    type: 'dividend',
    accountId: 'acc-santander-one',
    date: '2026-07-29',
    title: 'Dividendo Iberdrola S.A. (Complementario 2025)',
    grossAmount: 240.00,
    taxRatePercent: 19,
    withholdingTax: 45.60,
    netAmount: 194.40,
    sharesCount: 600,
    grossPerShare: 0.40,
    isinOrTicker: 'IBE.MC',
    notes: 'Abono dividendo bruto 0,40 € por acción'
  },
  {
    id: 'yd-2026-3',
    type: 'interest',
    accountId: 'acc-bbva-nomina',
    date: '2026-06-30',
    title: 'Intereses Depósito a Plazo Fijo BBVA 12M',
    grossAmount: 110.00,
    taxRatePercent: 19,
    withholdingTax: 20.90,
    netAmount: 89.10,
    notes: 'Liquidación semestral de intereses IPF'
  },
  {
    id: 'yd-2026-4',
    type: 'dividend',
    accountId: 'acc-santander-one',
    date: '2026-05-02',
    title: 'Dividendo Banco Santander S.A. (Final)',
    grossAmount: 195.00,
    taxRatePercent: 19,
    withholdingTax: 37.05,
    netAmount: 157.95,
    sharesCount: 2000,
    grossPerShare: 0.0975,
    isinOrTicker: 'SAN.MC',
    notes: 'Pago de dividendo complementario en efectivo'
  },
  {
    id: 'yd-2026-5',
    type: 'interest',
    accountId: 'acc-bbva-nomina',
    date: '2026-03-31',
    title: 'Intereses Trimestrales Cuenta Online BBVA',
    grossAmount: 24.69,
    taxRatePercent: 19,
    withholdingTax: 4.69,
    netAmount: 20.00,
    notes: 'Rendimiento remuneración saldos primer trimestre'
  },
  {
    id: 'yd-2026-6',
    type: 'dividend',
    accountId: 'acc-bbva-nomina',
    date: '2026-01-15',
    title: 'Dividendo Telefónica S.A. (A cuenta)',
    grossAmount: 150.00,
    taxRatePercent: 19,
    withholdingTax: 28.50,
    netAmount: 121.50,
    sharesCount: 1000,
    grossPerShare: 0.15,
    isinOrTicker: 'TEF.MC',
    notes: 'Dividendo a cuenta del ejercicio'
  },
  // Rendimientos del Capital Mobiliario y Dividendos del Ejercicio 2025 (Auditados de tu documento oficial)
  // 1. Intereses cuenta efectivo Trade Republic (Enero a Mayo - IBAN alemán sin retención en origen)
  {
    id: 'yd-2025-tr-cash-1',
    type: 'interest',
    accountId: 'acc-trade-republic',
    date: '2025-01-31',
    title: 'Intereses Cuenta Efectivo Trade Republic (Enero)',
    grossAmount: 44.37,
    taxRatePercent: 0,
    withholdingTax: 0,
    netAmount: 44.37,
    notes: 'Cuenta remunerada efectivo Trade Republic (IBAN alemán sin retención en origen)',
    status: 'verified'
  },
  {
    id: 'yd-2025-tr-cash-2',
    type: 'interest',
    accountId: 'acc-trade-republic',
    date: '2025-02-28',
    title: 'Intereses Cuenta Efectivo Trade Republic (Febrero)',
    grossAmount: 41.70,
    taxRatePercent: 0,
    withholdingTax: 0,
    netAmount: 41.70,
    notes: 'Cuenta remunerada efectivo Trade Republic (IBAN alemán sin retención en origen)',
    status: 'verified'
  },
  {
    id: 'yd-2025-tr-cash-3',
    type: 'interest',
    accountId: 'acc-trade-republic',
    date: '2025-03-31',
    title: 'Intereses Cuenta Efectivo Trade Republic (Marzo)',
    grossAmount: 46.14,
    taxRatePercent: 0,
    withholdingTax: 0,
    netAmount: 46.14,
    notes: 'Cuenta remunerada efectivo Trade Republic (IBAN alemán sin retención en origen)',
    status: 'verified'
  },
  {
    id: 'yd-2025-tr-cash-4',
    type: 'interest',
    accountId: 'acc-trade-republic',
    date: '2025-04-30',
    title: 'Intereses Cuenta Efectivo Trade Republic (Abril)',
    grossAmount: 68.16,
    taxRatePercent: 0,
    withholdingTax: 0,
    netAmount: 68.16,
    notes: 'Cuenta remunerada efectivo Trade Republic (IBAN alemán sin retención en origen)',
    status: 'verified'
  },
  {
    id: 'yd-2025-tr-cash-5',
    type: 'interest',
    accountId: 'acc-trade-republic',
    date: '2025-05-31',
    title: 'Intereses Cuenta Efectivo Trade Republic (Mayo)',
    grossAmount: 58.72,
    taxRatePercent: 0,
    withholdingTax: 0,
    netAmount: 58.72,
    notes: 'Cuenta remunerada efectivo Trade Republic (IBAN alemán sin retención en origen)',
    status: 'verified'
  },
  // 2. Imposiciones a Plazo Fijo (IPF) y Dividendos (Tabla Oficial 2025)
  {
    id: 'yd-2025-openbank-1',
    type: 'interest',
    accountId: 'acc-openbank',
    date: '2025-02-06',
    title: 'Liquidación Intereses IPF Openbank',
    grossAmount: 128.55,
    taxRatePercent: 19,
    withholdingTax: 24.43,
    netAmount: 104.12,
    notes: 'Imposición a plazo fijo Openbank',
    status: 'verified'
  },
  {
    id: 'yd-2025-openbank-2',
    type: 'interest',
    accountId: 'acc-openbank',
    date: '2025-03-04',
    title: 'Liquidación Intereses IPF Openbank',
    grossAmount: 125.76,
    taxRatePercent: 19,
    withholdingTax: 23.90,
    netAmount: 101.86,
    notes: 'Imposición a plazo fijo Openbank',
    status: 'verified'
  },
  {
    id: 'yd-2025-mapfre-1',
    type: 'dividend',
    accountId: 'acc-trade-republic',
    date: '2025-03-19',
    title: 'Dividendo MAPFRE S.A.',
    grossAmount: 5.57,
    taxRatePercent: 19,
    withholdingTax: 1.06,
    netAmount: 4.51,
    sharesCount: 3700,
    grossPerShare: 0.001506,
    isinOrTicker: 'MAP.MC',
    notes: '3.700 títulos × 0,001506 € en Trade Republic',
    status: 'verified'
  },
  {
    id: 'yd-2025-inditex-1',
    type: 'dividend',
    accountId: 'acc-trade-republic',
    date: '2025-05-02',
    title: 'Dividendo INDITEX S.A.',
    grossAmount: 252.00,
    taxRatePercent: 19,
    withholdingTax: 47.88,
    netAmount: 204.12,
    sharesCount: 300,
    grossPerShare: 0.84,
    isinOrTicker: 'ITX.MC',
    notes: '300 títulos × 0,8400 € en Trade Republic',
    status: 'verified'
  },
  {
    id: 'yd-2025-openbank-3',
    type: 'interest',
    accountId: 'acc-openbank',
    date: '2025-05-06',
    title: 'Liquidación Intereses IPF Openbank',
    grossAmount: 547.48,
    taxRatePercent: 19,
    withholdingTax: 104.04,
    netAmount: 443.44,
    notes: 'Imposición a plazo fijo Openbank',
    status: 'verified'
  },
  {
    id: 'yd-2025-openbank-4',
    type: 'interest',
    accountId: 'acc-openbank',
    date: '2025-06-04',
    title: 'Liquidación Intereses IPF Openbank',
    grossAmount: 123.50,
    taxRatePercent: 19,
    withholdingTax: 23.46,
    netAmount: 100.04,
    notes: 'Imposición a plazo fijo Openbank',
    status: 'verified'
  },
  {
    id: 'yd-2025-tr-ipf-1',
    type: 'interest',
    accountId: 'acc-trade-republic',
    date: '2025-07-01',
    title: 'Liquidación Intereses IPF Trade Republic',
    grossAmount: 49.58,
    taxRatePercent: 19,
    withholdingTax: 9.42,
    netAmount: 40.16,
    notes: 'Liquidación remuneración Trade Republic',
    status: 'verified'
  },
  {
    id: 'yd-2025-naturgy-1',
    type: 'dividend',
    accountId: 'acc-trade-republic',
    date: '2025-07-31',
    title: 'Dividendo NATURGY ENERGY GROUP S.A.',
    grossAmount: 327.00,
    taxRatePercent: 19,
    withholdingTax: 62.13,
    netAmount: 264.87,
    sharesCount: 545,
    grossPerShare: 0.60,
    isinOrTicker: 'NTGY.MC',
    notes: '545 títulos × 0,6000 € en Trade Republic',
    status: 'verified'
  },
  {
    id: 'yd-2025-tr-ipf-2',
    type: 'interest',
    accountId: 'acc-trade-republic',
    date: '2025-08-01',
    title: 'Liquidación Intereses IPF Trade Republic',
    grossAmount: 8.96,
    taxRatePercent: 19,
    withholdingTax: 1.70,
    netAmount: 7.26,
    notes: 'Liquidación remuneración Trade Republic',
    status: 'verified'
  },
  {
    id: 'yd-2025-openbank-5',
    type: 'interest',
    accountId: 'acc-openbank',
    date: '2025-08-06',
    title: 'Liquidación Intereses IPF Openbank',
    grossAmount: 216.76,
    taxRatePercent: 19,
    withholdingTax: 41.20,
    netAmount: 175.56,
    notes: 'Imposición a plazo fijo Openbank',
    status: 'verified'
  },
  {
    id: 'yd-2025-tr-ipf-3',
    type: 'interest',
    accountId: 'acc-trade-republic',
    date: '2025-09-01',
    title: 'Liquidación Intereses IPF Trade Republic',
    grossAmount: 0.63,
    taxRatePercent: 19,
    withholdingTax: 0.12,
    netAmount: 0.51,
    notes: 'Liquidación remuneración Trade Republic',
    status: 'verified'
  },
  {
    id: 'yd-2025-openbank-6',
    type: 'interest',
    accountId: 'acc-openbank',
    date: '2025-09-04',
    title: 'Liquidación Intereses IPF Openbank',
    grossAmount: 103.34,
    taxRatePercent: 19,
    withholdingTax: 19.64,
    netAmount: 83.70,
    notes: 'Imposición a plazo fijo Openbank',
    status: 'verified'
  },
  {
    id: 'yd-2025-bankinter-1',
    type: 'interest',
    accountId: 'acc-bankinter',
    date: '2025-09-08',
    title: 'Liquidación Intereses IPF Bankinter',
    grossAmount: 95.92,
    taxRatePercent: 19,
    withholdingTax: 18.22,
    netAmount: 77.70,
    notes: 'Imposición a plazo fijo Bankinter',
    status: 'verified'
  },
  {
    id: 'yd-2025-openbank-7',
    type: 'interest',
    accountId: 'acc-openbank',
    date: '2025-10-01',
    title: 'Liquidación Intereses IPF Openbank',
    grossAmount: 155.01,
    taxRatePercent: 19,
    withholdingTax: 29.46,
    netAmount: 125.55,
    notes: 'Imposición a plazo fijo Openbank',
    status: 'verified'
  },
  {
    id: 'yd-2025-tr-ipf-4',
    type: 'interest',
    accountId: 'acc-trade-republic',
    date: '2025-10-01',
    title: 'Liquidación Intereses IPF Trade Republic',
    grossAmount: 0.60,
    taxRatePercent: 19,
    withholdingTax: 0.11,
    netAmount: 0.49,
    notes: 'Liquidación remuneración Trade Republic',
    status: 'verified'
  },
  {
    id: 'yd-2025-bankinter-2',
    type: 'interest',
    accountId: 'acc-bankinter',
    date: '2025-10-08',
    title: 'Liquidación Intereses IPF Bankinter',
    grossAmount: 167.30,
    taxRatePercent: 19,
    withholdingTax: 31.78,
    netAmount: 135.52,
    notes: 'Imposición a plazo fijo Bankinter',
    status: 'verified'
  },
  {
    id: 'yd-2025-tr-ipf-5',
    type: 'interest',
    accountId: 'acc-trade-republic',
    date: '2025-11-01',
    title: 'Liquidación Intereses IPF Trade Republic',
    grossAmount: 0.63,
    taxRatePercent: 19,
    withholdingTax: 0.12,
    netAmount: 0.51,
    notes: 'Liquidación remuneración Trade Republic',
    status: 'verified'
  },
  {
    id: 'yd-2025-openbank-8',
    type: 'interest',
    accountId: 'acc-openbank',
    date: '2025-11-06',
    title: 'Liquidación Intereses IPF Openbank',
    grossAmount: 171.40,
    taxRatePercent: 19,
    withholdingTax: 32.56,
    netAmount: 138.84,
    notes: 'Imposición a plazo fijo Openbank',
    status: 'verified'
  },
  {
    id: 'yd-2025-naturgy-2',
    type: 'dividend',
    accountId: 'acc-trade-republic',
    date: '2025-11-06',
    title: 'Dividendo NATURGY ENERGY GROUP S.A.',
    grossAmount: 327.00,
    taxRatePercent: 19,
    withholdingTax: 62.13,
    netAmount: 264.87,
    sharesCount: 545,
    grossPerShare: 0.60,
    isinOrTicker: 'NTGY.MC',
    notes: '545 títulos × 0,6000 € en Trade Republic',
    status: 'verified'
  },
  {
    id: 'yd-2025-bankinter-3',
    type: 'interest',
    accountId: 'acc-bankinter',
    date: '2025-11-08',
    title: 'Liquidación Intereses IPF Bankinter',
    grossAmount: 229.75,
    taxRatePercent: 19,
    withholdingTax: 43.65,
    netAmount: 186.10,
    notes: 'Imposición a plazo fijo Bankinter',
    status: 'verified'
  },
  {
    id: 'yd-2025-tr-ipf-6',
    type: 'interest',
    accountId: 'acc-trade-republic',
    date: '2025-12-01',
    title: 'Liquidación Intereses IPF Trade Republic',
    grossAmount: 0.98,
    taxRatePercent: 19,
    withholdingTax: 0.19,
    netAmount: 0.79,
    notes: 'Liquidación remuneración Trade Republic',
    status: 'verified'
  },
  {
    id: 'yd-2025-bankinter-4',
    type: 'interest',
    accountId: 'acc-bankinter',
    date: '2025-12-08',
    title: 'Liquidación Intereses IPF Bankinter',
    grossAmount: 296.36,
    taxRatePercent: 19,
    withholdingTax: 56.30,
    netAmount: 240.06,
    notes: 'Imposición a plazo fijo Bankinter',
    status: 'verified'
  },
  {
    id: 'yd-2026-tr-ipf-0',
    type: 'interest',
    accountId: 'acc-trade-republic',
    date: '2026-01-01',
    title: 'Liquidación Intereses IPF Trade Republic (Diciembre 2025)',
    grossAmount: 1.08,
    taxRatePercent: 19,
    withholdingTax: 0.21,
    netAmount: 0.87,
    notes: 'Liquidación remuneración devengada a dic 2025 abonada el 01/01/2026',
    status: 'verified'
  }
];

export const INITIAL_STATE: AppState = {
  accounts: DEFAULT_ACCOUNTS,
  categories: DEFAULT_CATEGORIES,
  transactions: DEFAULT_TRANSACTIONS,
  lastGlobalSync: new Date().toISOString(),
  currency: 'EUR',
  yieldRecords: DEFAULT_YIELDS
};
