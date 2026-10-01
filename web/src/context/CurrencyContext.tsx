import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

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

  const convertPrice = useCallback((amount: number, fromCurrency: 'USD' | 'LKR' = 'USD', toCurrency?: 'USD' | 'LKR'): number => {
    const target = toCurrency || currency;
    if (fromCurrency === target) return amount;
    if (fromCurrency === 'USD' && target === 'LKR') return Math.round(amount * EXCHANGE_RATE);
    if (fromCurrency === 'LKR' && target === 'USD') return Math.round(amount / EXCHANGE_RATE);
    return amount;
  }, [currency]);

  const formatPrice = useCallback((amount: number, fromCurrency: 'USD' | 'LKR' = 'USD'): string => {
    const converted = convertPrice(amount, fromCurrency, currency);
    const formatted = Math.round(converted).toLocaleString();
    return currency === 'USD' ? `$${formatted}` : `LKR ${formatted}`;
  }, [convertPrice, currency]);

  const value = useMemo(
    () => ({ currency, setCurrency, formatPrice, convertPrice }),
    [currency, formatPrice, convertPrice]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
};

