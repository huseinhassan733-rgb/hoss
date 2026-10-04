/**
 * H2pro ERP - Currencies Service
 * خدمة إدارة العملات المتعددة، أسعار الصرف اليومية والتاريخية، وتحديث العملة الأساسية
 */

import { db } from '../database/db';
import { Currency, ExchangeRateRecord } from '../types';

export class CurrenciesService {
  /**
   * Get all currencies
   */
  public static getCurrencies(): Currency[] {
    return db.getCurrencies();
  }

  /**
   * Get exchange rate for a currency on a specific date (or fallback to latest/default exchangeRate)
   */
  public static getExchangeRate(currencySymbol: string, dateStr?: string): number {
    const currencies = db.getCurrencies();
    const curr = currencies.find((c) => c.symbol === currencySymbol || c.id === currencySymbol);
    if (!curr) return 1.0;
    if (curr.isLocal) return 1.0;

    const state = (db as any).state || {};
    const history: ExchangeRateRecord[] = state.exchangeRateHistory || [];

    if (dateStr) {
      // Find exact date rate or closest prior date
      const targetDate = dateStr.slice(0, 10);
      const exactMatch = history.find(
        (h) => h.currencySymbol === curr.symbol && h.date === targetDate
      );
      if (exactMatch) return exactMatch.rate;

      // Find most recent prior rate
      const priorRates = history
        .filter((h) => h.currencySymbol === curr.symbol && h.date <= targetDate)
        .sort((a, b) => b.date.localeCompare(a.date));

      if (priorRates.length > 0) {
        return priorRates[0].rate;
      }
    }

    return curr.exchangeRate || curr.rate || 1.0;
  }

  /**
   * Set daily or historical exchange rate for a currency
   */
  public static setDailyRate(
    currencySymbol: string,
    dateStr: string,
    rate: number,
    actor: string
  ): void {
    const state = (db as any).state || {};
    if (!state.exchangeRateHistory) {
      state.exchangeRateHistory = [];
    }

    const cleanDate = dateStr.slice(0, 10);
    const existingIndex = state.exchangeRateHistory.findIndex(
      (h: ExchangeRateRecord) => h.currencySymbol === currencySymbol && h.date === cleanDate
    );

    if (existingIndex >= 0) {
      state.exchangeRateHistory[existingIndex].rate = rate;
      state.exchangeRateHistory[existingIndex].updatedBy = actor;
    } else {
      state.exchangeRateHistory.push({
        id: `er-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        currencySymbol,
        date: cleanDate,
        rate,
        updatedBy: actor,
      });
    }

    // Also update current exchangeRate on the currency if date is today or latest
    const currencies = db.getCurrencies();
    const curr = currencies.find((c) => c.symbol === currencySymbol || c.id === currencySymbol);
    if (curr && !curr.isLocal) {
      curr.exchangeRate = rate;
      curr.rate = rate;
      db.saveCurrency(curr, actor);
    }

    (db as any).saveToStorage();
  }

  /**
   * Get all historical exchange rate records
   */
  public static getHistoricalRates(currencySymbol?: string): ExchangeRateRecord[] {
    const state = (db as any).state || {};
    const history: ExchangeRateRecord[] = state.exchangeRateHistory || [];
    if (currencySymbol) {
      return history.filter((h) => h.currencySymbol === currencySymbol);
    }
    return history;
  }

  /**
   * Set base (local) currency for the company
   */
  public static setBaseCurrency(currencySymbol: string, actor: string): { success: boolean; message: string } {
    const currencies = db.getCurrencies();
    const target = currencies.find((c) => c.symbol === currencySymbol || c.name.includes(currencySymbol));
    if (!target) {
      return { success: false, message: 'العملة المحددة غير موجودة في النظام.' };
    }

    // Update isLocal status across currencies
    currencies.forEach((c) => {
      c.isLocal = c.id === target.id || c.symbol === target.symbol;
      if (c.isLocal) {
        c.exchangeRate = 1.0;
        c.rate = 1.0;
      }
      db.saveCurrency(c, actor);
    });

    // Update company default currency
    const company = db.getCompanyInfo();
    company.defaultCurrency = `${target.symbol} (${target.name})`;
    db.updateCompanyInfo(company, actor);

    return {
      success: true,
      message: `تم تعيين العملة ${target.name} (${target.symbol}) كعملة أساسية محلية للشركة بنجاح.`,
    };
  }
}
