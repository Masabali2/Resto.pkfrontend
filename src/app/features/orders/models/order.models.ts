export type OrderStatus = 'New' | 'Confirmed' | 'Preparing' | 'Ready' | 'Completed' | 'Cancelled';
export type OrderType = 'Pickup' | 'DineIn' | 'Delivery';

export interface StaffOrderItem { menuItemId: string | null; itemName: string; unitPrice: number; quantity: number; lineTotal: number; currency: string; }
export interface StaffOrderDetails {
  id: string; orderNumber: string; status: OrderStatus; orderType: OrderType; customerName: string;
  customerPhone: string | null; customerEmail: string | null; subtotal: number; discountAmount: number;
  taxAmount: number; totalAmount: number; currency: string; specialInstructions: string | null;
  createdAt: string; completedAt: string | null; cancelledAt: string | null; items: StaffOrderItem[];
}
export interface PublicCartItem { id: string; menuItemId: string; itemName: string; unitPrice: number; quantity: number; currency: string; lineTotal: number; }
export interface PublicCart { id: string; restaurantId: string; itemCount: number; totalAmount: number; currency: string; expiresAt: string; items: PublicCartItem[]; }
export interface CreatePublicOrderRequest { orderType: OrderType; customerName: string; customerPhone: string | null; customerEmail: string | null; specialInstructions: string | null; }
export interface CreateDirectPublicOrderRequest extends CreatePublicOrderRequest { items: Array<{ menuItemId: string; quantity: number }>; }
export interface PublicOrderCreated {
  id: string; orderNumber: string; status: OrderStatus; orderType: OrderType; totalAmount: number; currency: string;
  rawTrackingToken: string; items: Array<{ menuItemId: string | null; itemName: string; unitPrice: number; quantity: number; lineTotal: number; currency: string }>;
  createdAt: string;
}
export interface PublicOrderTracking {
  orderNumber: string; status: OrderStatus; totalAmount: number; currency: string;
  items: Array<{ itemName: string; quantity: number }>; createdAt: string; completedAt: string | null;
}

/**
 * Anonymous public menu (GET api/v1/public/sites/{slug}/menu).
 * Mirrors the backend PublicMenuDto/PublicMenuCategoryDto/PublicMenuItemDto
 * and deliberately excludes tenant, restaurant and staff data.
 */
export interface PublicMenuDto {
  id: string;
  name: string;
  description: string | null;
  categories: PublicMenuCategoryDto[];
}
export interface PublicMenuCategoryDto {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  items: PublicMenuItemDto[];
}
export interface PublicMenuItemDto {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  displayOrder: number;
  isAvailable: boolean;
  imageFileId: string | null;
}

export interface UpdateOrderStatusRequest { status: OrderStatus; notes: string | null; }
export interface StaffOrderSummary {
  totalOrders: number;
  pendingKitchen: number;
  completedToday: number;
  totalRevenue: number;
  currency: string;
}
export interface StaffCreateOrderContext {
  restaurantId: string;
  restaurantName: string;
  taxRate: number;
  currency: string;

  menuId: string;
  menuName: string;

  categories: StaffCreateOrderCategory[];
  items: StaffCreateOrderItem[];

  orderTypes: string[];
  paymentMethod: string;
}

export interface StaffCreateOrderCategory {
  id: string;
  menuId: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  itemCount: number;
}

export interface StaffCreateOrderItem {
  id: string;
  menuCategoryId: string;
  menuId: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  imageFileId: string | null;
  displayOrder: number;
  isAvailable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  categoryName: string | null;
  imageUrl: string | null;
}

export interface StaffCartItem {
  menuItemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  currency: string;
}

export interface CreateStaffOrderRequest {
  orderType: OrderType;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  specialInstructions: string | null;
  items: Array<{ menuItemId: string; quantity: number }>;
}