export type OrderStatus = 'New' | 'Confirmed' | 'Preparing' | 'Ready' | 'Completed' | 'Cancelled';
export type OrderType = 'Pickup' | 'DineIn' | 'Delivery';

export interface StaffOrderItem {
  menuItemId: string | null;
  itemName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  currency: string;
}

export interface StaffOrderDetails {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  orderType: OrderType;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  specialInstructions: string | null;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  items: StaffOrderItem[];
}
