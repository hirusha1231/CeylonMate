import React, { createContext, useContext, useState } from 'react';

export type Currency = 'USD' | 'LKR';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (amount: number, fromCurrency?: 'USD' | 'LKR') => string;
  convertPrice: (amount: number, fromCurrency?: 'USD' | 'LKR', toCurrency?: 'USD' | 'LKR') => number;
}

const EXCHANGE_RATE = 300; // 1 USD = 300 LKR

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>('USD');

  const convertPrice = (amount: number, fromCurrency: 'USD' | 'LKR' = 'USD', toCurrency?: 'USD' | 'LKR'): number => {
    const target = toCurrency || currency;
    if (fromCurrency === target) return amount;
    if (fromCurrency === 'USD' && target === 'LKR') return Math.round(amount * EXCHANGE_RATE);
    if (fromCurrency === 'LKR' && target === 'USD') return Math.round(amount / EXCHANGE_RATE);
    return amount;
  };

  const formatPrice = (amount: number, fromCurrency: 'USD' | 'LKR' = 'USD'): string => {
    const converted = convertPrice(amount, fromCurrency, currency);
    const formatted = Math.round(converted).toLocaleString();
    return currency === 'USD' ? `$${formatted}` : `LKR ${formatted}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, convertPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
};
