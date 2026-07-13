export type Category =
  | "Cement"
  | "Steel"
  | "Paint"
  | "Electrical"
  | "Plumbing"
  | "Tools"
  | "Others";

export type ProductStatus = "In Stock" | "Low Stock" | "Out of Stock";

export type PaymentMethod = "Cash" | "M-Pesa" | "Bank Transfer" | "Credit";

export type UserRole = "Admin" | "Worker";

export type UserStatus = "Active" | "Inactive";

export type NotificationType =
  | "Low Stock"
  | "Out Of Stock"
  | "Successful Restock"
  | "Failed Login"
  | "New Order";

export interface Product {
  id: string;
  name: string;
  code: string;
  category: Category;
  description: string;
  supplierId: string;
  supplierName: string;
  buyingPrice: number;
  sellingPrice: number;
  stock: number;
  reorderLevel: number;
  status: ProductStatus;
  image: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  productCount: number;
  totalPurchases: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: "Completed" | "Pending" | "Cancelled";
  createdAt: string;
  cashier: string;
}

export interface Restock {
  id: string;
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  quantityAdded: number;
  cost: number;
  notes: string;
  createdAt: string;
  createdBy: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  lastLogin?: string;
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  module: string;
  timestamp: string;
  details: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface KpiCard {
  title: string;
  value: string;
  trend: number;
  description: string;
  icon: string;
}

export interface BusinessSettings {
  businessName: string;
  phone: string;
  email: string;
  address: string;
  taxRate: number;
  currency: string;
  receiptFooter: string;
}
