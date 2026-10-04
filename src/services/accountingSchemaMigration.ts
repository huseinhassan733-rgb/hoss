import { Account } from '../types';

export function ensureAccountingAccounts(accounts: Account[]): Account[] {
  const result = [...accounts];
  const add = (code:string,name:string,category:Account['category'],parentCode:string,currency='YER',nature:Account['nature']='debit',level=3) => {
    if (result.some(a=>a.code===code)) return;
    result.push({id:`acc-${code}`,code,name,category,parentCode,currency,nature,status:'active',level,balance:0,isSub:true});
  };
  add('213','ضريبة المخرجات المستحقة','liability','21','YER','credit',3);
  add('414','خصم المبيعات المسموح به','revenue','41','YER','debit',3);
  add('512','خصم المشتريات المكتسب','expense','5','YER','credit',2);
  add('123','المركبات ووسائل النقل','asset','12','YER','debit',3);
  add('129','مجمع إهلاك الأصول الثابتة','asset','12','YER','credit',3);
  add('33','ربح/خسارة السنة الحالية','equity','3','YER','credit',2);
  add('524','مصروف إهلاك الأصول','expense','52','YER','debit',3);
  add('525','خسائر تسويات المخزون','expense','52','YER','debit',3);
  add('415','أرباح تسويات المخزون','revenue','41','YER','credit',3);
  add('214','إيرادات مقدمة','liability','21','YER','credit',3);
  add('215','القروض والتسهيلات الائتمانية','liability','21','YER','credit',3);
  return result;
}
