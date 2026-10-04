/**
 * H2pro ERP - Inventory Costing Service (FIFO Engine)
 * محرك تقييم المخزون بنظام ما يرد أولاً يصرف أولاً (FIFO)
 */

import { InventoryLayer, InventoryItem, SalesItem } from '../types';

export class InventoryCostingService {
  /**
   * Calculate FIFO COGS for sales items against inventory layers.
   * Returns total COGS and updated inventory layers with remaining quantities.
   */
  public static calculateFifoCogs(
    items: SalesItem[],
    inventoryLayers: InventoryLayer[],
    inventoryItems: InventoryItem[]
  ): { totalCogs: number; updatedLayers: InventoryLayer[]; cogsByItem: Record<string, number> } {
    const layers = JSON.parse(JSON.stringify(inventoryLayers)) as InventoryLayer[];
    let totalCogs = 0;
    const cogsByItem: Record<string, number> = {};

    if (!items || items.length === 0) {
      return { totalCogs: 0, updatedLayers: layers, cogsByItem };
    }

    items.forEach((saleItem) => {
      let neededQty = Number(saleItem.quantity) || 0;
      if (neededQty <= 0) throw new Error(`كمية الصنف ${saleItem.itemCode} يجب أن تكون أكبر من صفر.`);

      const target = inventoryItems.find((i) => i.code === saleItem.itemCode);

      // Filter and sort available layers for this item chronologically (FIFO)
      const availableLayers = layers
        .filter((l) => l.itemCode === saleItem.itemCode && l.remainingQty > 0)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      for (const layer of availableLayers) {
        if (neededQty <= 0) break;
        const consume = Math.min(neededQty, layer.remainingQty);
        layer.remainingQty -= consume;
        neededQty -= consume;
        const lineCost = consume * layer.unitCost;
        totalCogs += lineCost;
        cogsByItem[saleItem.itemCode] = (cogsByItem[saleItem.itemCode] || 0) + lineCost;
      }

      if (neededQty > 0) {
        const available = Number(saleItem.quantity) - neededQty;
        throw new Error(`المخزون غير كافٍ للصنف ${saleItem.itemCode}. المتاح بالتكلفة ${available} والمطلوب ${saleItem.quantity}.`);
      }
    });

    return { totalCogs, updatedLayers: layers, cogsByItem };
  }
}
