/**
 * Arabic Number to Words (Tafqeet / تفقيط)
 * لتحويل المبالغ المالية إلى كلمات باللغة العربية المعتمدة في أنظمة المحاسبة والـ ERP
 */

export function tafqeet(amount: number, currency: string = 'ريال سعودي', fractionCurrency: string = 'هللة'): string {
  if (amount === 0) return `صفر ${currency} فقط لا غير`;
  if (!amount || isNaN(amount)) return '';

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertGroup(n: number): string {
    let result = '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    const t = Math.floor(remainder / 10);
    const o = remainder % 10;

    if (h > 0) {
      result += hundreds[h];
    }

    if (remainder > 0) {
      if (result) result += ' و';
      if (remainder < 10) {
        result += ones[remainder];
      } else if (remainder < 20) {
        result += teens[remainder - 10];
      } else {
        if (o > 0) {
          result += ones[o] + ' و' + tens[t];
        } else {
          result += tens[t];
        }
      }
    }

    return result;
  }

  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

  let parts: string[] = [];

  const billions = Math.floor(integerPart / 1000000000);
  const millions = Math.floor((integerPart % 1000000000) / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const units = integerPart % 1000;

  if (billions > 0) {
    if (billions === 1) parts.push('مليار');
    else if (billions === 2) parts.push('ملياران');
    else if (billions >= 3 && billions <= 10) parts.push(`${convertGroup(billions)} مليارات`);
    else parts.push(`${convertGroup(billions)} مليار`);
  }

  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions >= 3 && millions <= 10) parts.push(`${convertGroup(millions)} ملايين`);
    else parts.push(`${convertGroup(millions)} مليون`);
  }

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(`${convertGroup(thousands)} آلاف`);
    else parts.push(`${convertGroup(thousands)} ألف`);
  }

  if (units > 0 || parts.length === 0) {
    parts.push(convertGroup(units));
  }

  let text = 'فقط ' + parts.join(' و') + ' ' + currency;

  if (decimalPart > 0) {
    text += ' و' + convertGroup(decimalPart) + ' ' + fractionCurrency;
  }

  text += ' لا غير';

  return amount < 0 ? `سالب ${text}` : text;
}
