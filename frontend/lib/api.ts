const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

type ApiError = {
  success: false;
  message: string;
  status?: string;
  errors?: Record<string, unknown>;
};

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setTokens(access: string, refresh: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, access);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

function clearTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export class ApiCallError extends Error {
  public readonly status: number;
  public readonly details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiCallError";
    this.status = status;
    this.details = details;
  }
}

// Single-flight refresh: if 401 comes back, only one refresh in flight.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  const refresh = getRefreshToken();
  if (!refresh) return null;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh })
      });
      if (!res.ok) {
        clearTokens();
        return null;
      }
      const body = await res.json();
      const next: { accessToken: string; refreshToken: string } | undefined =
        body?.data;
      if (!next?.accessToken || !next?.refreshToken) {
        clearTokens();
        return null;
      }
      setTokens(next.accessToken, next.refreshToken);
      return next.accessToken;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retried = false
): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {})
    },
    ...init
  });

  if (response.status === 401 && !retried) {
    const next = await refreshAccessToken();
    if (next) {
      return request<T>(path, init, true);
    }
  }

  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = raw as ApiError;
    throw new ApiCallError(
      response.status,
      err.message ?? "Request failed",
      err.errors
    );
  }
  return raw as T;
}

type AuthResponse = {
  data: {
    user: {
      id: string;
      fullName: string;
      email: string;
      role: "admin" | "worker";
    };
    accessToken: string;
    refreshToken: string;
  };
};

// --- Auth ---
export async function loginUser(username: string, password: string) {
  const res = await request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  setTokens(res.data.accessToken, res.data.refreshToken);
  return res;
}

export async function registerUser(data: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role?: "admin" | "worker";
}) {
  const res = await request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data)
  });
  setTokens(res.data.accessToken, res.data.refreshToken);
  return res;
}

export async function logoutCurrentSession() {
  const refresh = getRefreshToken();
  try {
    await request<{ data: null }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify(refresh ? { refreshToken: refresh } : {})
    });
  } catch {
    // ignore — local cleanup below
  }
  clearTokens();
}

export function logoutUser() {
  clearTokens();
}

// --- Dashboard ---
export async function getDashboardSummary() {
  return request<{ data: DashboardSummary }>("/reports/dashboard");
}

// --- Products/Inventory ---
export async function getProducts(
  page = 1,
  limit = 20,
  search?: string
) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  if (search) params.append("search", search);
  return request<{ data: { products: Product[]; pagination: Pagination } }>(
    `/inventory?${params}`
  );
}

export async function getProduct(id: string) {
  return request<{ data: Product }>(`/inventory/${id}`);
}

export async function createProduct(data: CreateProductInput) {
  return request<{ data: Product }>("/inventory", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function updateProduct(
  id: string,
  data: Partial<CreateProductInput>
) {
  return request<{ data: Product }>(`/inventory/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export async function deleteProduct(id: string) {
  return request<{ data: null }>(`/inventory/${id}`, {
    method: "DELETE"
  });
}

export async function getLowStockProducts() {
  return request<{ data: Product[] }>("/inventory/low-stock");
}

// --- Orders ---
export async function getOrders(page = 1, limit = 20, status?: string) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  if (status) params.append("status", status);
  return request<{ data: { orders: Order[]; pagination: Pagination } }>(`/orders?${params}`);
}

export async function getOrder(id: string) {
  return request<{ data: Order }>(`/orders/${id}`);
}

export async function createOrder(data: {
  items: Array<{ productId: string; quantity: number }>;
  customerName?: string;
  paymentMethod: "CASH" | "MPESA" | "BANK_TRANSFER" | "CREDIT";
  discount?: number;
  customerEmail?: string;
}) {
  return request<{ data: Order }>("/orders", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function refundOrder(id: string) {
  return request<{ data: null }>(`/orders/${id}/refund`, {
    method: "PATCH"
  });
}

export async function cancelOrder(id: string) {
  return request<{ data: null }>(`/orders/${id}/cancel`, {
    method: "PATCH"
  });
}

export async function downloadReceipt(id: string) {
  const token = getAccessToken();
  const response = await fetch(
    `${API_BASE_URL}/orders/${id}/receipt`,
    {
      credentials: "include",
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : undefined
    }
  );
  if (!response.ok) throw new Error("Failed to download receipt");
  return response.blob();
}

// --- Restocks ---
export async function getRestocks(page = 1, limit = 20) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  return request<{ data: { restocks: Restock[]; pagination: Pagination } }>(`/restocks?${params}`);
}

export async function getRestock(id: string) {
  return request<{ data: Restock }>(`/restocks/${id}`);
}

export async function createRestock(data: {
  productId: string;
  supplierId: string;
  quantityAdded: number;
  cost: number;
  notes?: string;
  updateBuyingPrice?: boolean;
}) {
  return request<{ data: Restock }>("/restocks", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

// --- Categories ---
export async function getCategories(
  page = 1,
  limit = 20,
  search?: string
) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  if (search) params.append("search", search);
  return request<{ data: { categories: Category[]; pagination: Pagination } }>(
    `/categories?${params}`
  );
}

export async function getCategory(id: string) {
  return request<{ data: Category }>(`/categories/${id}`);
}

export async function createCategory(data: {
  name: string;
  description?: string;
  color?: string;
}) {
  return request<{ data: Category }>("/categories", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function updateCategory(
  id: string,
  data: { name?: string; description?: string; color?: string }
) {
  return request<{ data: Category }>(`/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export async function deleteCategory(id: string) {
  return request<{ data: null }>(`/categories/${id}`, {
    method: "DELETE"
  });
}

// --- Suppliers ---
export async function getSuppliers(
  page = 1,
  limit = 20,
  search?: string
) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  if (search) params.append("search", search);
  return request<{ data: { suppliers: Supplier[]; pagination: Pagination } }>(
    `/suppliers?${params}`
  );
}

export async function getSupplier(id: string) {
  return request<{ data: Supplier }>(`/suppliers/${id}`);
}

export async function createSupplier(data: {
  supplierName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}) {
  return request<{ data: Supplier }>("/suppliers", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function updateSupplier(
  id: string,
  data: {
    supplierName?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
  }
) {
  return request<{ data: Supplier }>(`/suppliers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export async function deleteSupplier(id: string) {
  return request<{ data: null }>(`/suppliers/${id}`, {
    method: "DELETE"
  });
}

// --- Users ---
export async function getUsers(
  page = 1,
  limit = 20,
  search?: string
) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  if (search) params.append("search", search);
  return request<{ data: { users: User[]; pagination: Pagination } }>(`/users?${params}`);
}

export async function getUser(id: string) {
  return request<{ data: User }>(`/users/${id}`);
}

export async function createUser(data: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: "admin" | "worker";
}) {
  return request<{ data: User }>("/users", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function updateUser(
  id: string,
  data: {
    fullName?: string;
    phone?: string;
    role?: "admin" | "worker";
  }
) {
  return request<{ data: User }>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export async function changePassword(
  id: string,
  data: { currentPassword?: string; newPassword: string }
) {
  return request<{ data: null }>(`/users/${id}/password`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export async function deactivateUser(id: string) {
  return request<{ data: null }>(`/users/${id}/deactivate`, {
    method: "PATCH"
  });
}

export async function activateUser(id: string) {
  return request<{ data: null }>(`/users/${id}/activate`, {
    method: "PATCH"
  });
}

// --- Reports ---
export async function getSalesReport(start: string, end: string) {
  return request<{ data: Order[] }>(
    `/reports/sales?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
  );
}

export async function getInventoryReport() {
  return request<{ data: Product[] }>("/reports/inventory");
}

export async function getProfitReport(start: string, end: string) {
  return request<{ data: ProfitReport }>(
    `/reports/profit?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
  );
}

export async function getTopSellingProducts(
  start: string,
  end: string,
  limit = 10
) {
  return request<{ data: TopProduct[] }>(
    `/reports/top-products?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=${limit}`
  );
}

export async function getPaymentMethodBreakdown(
  start: string,
  end: string
) {
  return request<{ data: PaymentBreakdown[] }>(
    `/reports/payment-breakdown?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
  );
}

export async function getRestockCostReport(start: string, end: string) {
  return request<{ data: RestockCostReport }>(
    `/reports/restock-costs?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
  );
}

export async function getMonthlySalesChart() {
  return request<{ data: Array<{ month: string; sales: number }> }>("/reports/monthly-sales-chart");
}

export async function exportSalesCsv(start: string, end: string) {
  const token = getAccessToken();
  const response = await fetch(
    `${API_BASE_URL}/reports/sales/export?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    {
      credentials: "include",
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : undefined
    }
  );
  if (!response.ok) throw new Error("Failed to export CSV");
  return response.text();
}

// --- Settings ---
export async function getSettings() {
  return request<{ data: Settings | null }>("/settings");
}

export async function updateSettings(data: Partial<Settings>) {
  return request<{ data: Settings }>("/settings", {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

// --- Audit Logs ---
export async function getAuditLogs(
  page = 1,
  limit = 20,
  action?: string
) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  if (action) params.append("action", action);
  return request<{ data: { logs: AuditLog[]; pagination: Pagination } }>(
    `/audit?${params}`
  );
}

// --- Notifications ---
export async function getNotifications(page = 1, limit = 20) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  return request<{ data: { notifications: Notification[]; pagination: Pagination } }>(
    `/notifications?${params}`
  );
}

export async function markNotificationAsRead(id: string) {
  return request<{ data: Notification }>(
    `/notifications/${id}/read`,
    { method: "PATCH" }
  );
}

export async function deleteNotification(id: string) {
  return request<{ data: null }>(`/notifications/${id}`, {
    method: "DELETE"
  });
}

// --- Printers ---
export async function getPrinters(page = 1, limit = 20) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  return request<{ data: { printers: Printer[]; pagination: Pagination } }>(
    `/printers?${params}`
  );
}

export async function getPrinter(id: string) {
  return request<{ data: Printer }>(`/printers/${id}`);
}

export async function createPrinter(data: {
  name: string;
  printerType: "THERMAL" | "INKJET" | "LASER";
  connectionType: "USB" | "NETWORK" | "WIFI" | "BLUETOOTH" | "WINDOWS";
  ipAddress?: string;
  port?: string;
  isDefault?: boolean;
  paperSize: "58MM" | "80MM" | "A4";
  autoPrint?: boolean;
}) {
  return request<{ data: Printer }>("/printers", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function updatePrinter(
  id: string,
  data: Partial<{
    name: string;
    printerType: "THERMAL" | "INKJET" | "LASER";
    connectionType: "USB" | "NETWORK" | "WIFI" | "BLUETOOTH" | "WINDOWS";
    ipAddress?: string;
    port?: string;
    isDefault?: boolean;
    paperSize: "58MM" | "80MM" | "A4";
    autoPrint?: boolean;
  }>
) {
  return request<{ data: Printer }>(`/printers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export async function deletePrinter(id: string) {
  return request<{ data: null }>(`/printers/${id}`, {
    method: "DELETE"
  });
}

export async function setDefaultPrinter(id: string) {
  return request<{ data: null }>(`/printers/${id}/default`, {
    method: "PATCH"
  });
}

export async function getDefaultPrinter() {
  return request<{ data: Printer | null }>("/printers/default/current");
}

export async function testPrinter(id: string) {
  return request<{ data: { success: boolean; message: string } }>(
    `/printers/${id}/test`,
    { method: "POST" }
  );
}

// --- Types (mirrored from backend) ---
export type Paginated<T> = {
  items: T[];
  pagination: Pagination;
};
type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type DashboardSummary = {
  todayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  totalOrders: number;
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  inventoryValue: number;
  todayTrend: number;
  weeklyTrend: number;
  monthlyTrend: number;
  ordersTrend: number;
  productsTrend: number;
  inventoryTrend: number;
  lowStockTrend: number;
  outOfStockTrend: number;
};

type ProfitReport = {
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  orderCount: number;
};

type TopProduct = {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
};

type PaymentBreakdown = {
  paymentMethod: string;
  totalAmount: number;
  orderCount: number;
};

type RestockCostReport = {
  restocks: Restock[];
  totalCost: number;
  count: number;
};

type CreateProductInput = {
  productCode: string;
  name: string;
  description?: string;
  buyingPrice: number;
  sellingPrice: number;
  quantity: number;
  reorderLevel: number;
  imageUrl?: string;
  categoryId?: string;
  supplierId?: string;
};

type Product = CreateProductInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string } | null;
  supplier?: { id: string; supplierName: string } | null;
};

type Category = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
};

type Supplier = {
  id: string;
  supplierName: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

type Order = {
  id: string;
  orderNumber: string;
  receiptNumber: string;
  customerName: string | null;
  customerEmail?: string | null;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    total: number;
    product: { id: string; name: string; productCode: string };
  }>;
  subtotal: number;
  discount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: "CASH" | "MPESA" | "BANK_TRANSFER" | "CREDIT";
  status: "COMPLETED" | "REFUNDED" | "CANCELLED";
  createdById: string;
  createdAt: string;
};

type Restock = {
  id: string;
  productId: string;
  supplierId: string;
  quantityAdded: number;
  cost: number;
  notes?: string | null;
  receivedById: string;
  createdAt: string;
  product?: Product;
  supplier?: Supplier;
  receivedBy?: User;
};

type User = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: "admin" | "worker";
  isActive: boolean;
  createdAt: string;
};

type AuditLog = {
  id: string;
  userId: string | null;
  action: string;
  details: string | null;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: "admin" | "worker";
  } | null;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type Settings = {
  id: string;
  businessName: string;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  taxRate?: number | null;
  currency?: string | null;
  receiptFooter?: string | null;
};

export type Printer = {
  id: string;
  name: string;
  printerType: "THERMAL" | "INKJET" | "LASER";
  connectionType: "USB" | "NETWORK" | "WIFI" | "BLUETOOTH" | "WINDOWS";
  ipAddress?: string | null;
  port?: string | null;
  isDefault: boolean;
  paperSize: "58MM" | "80MM" | "A4";
  autoPrint: boolean;
  createdAt: string;
  updatedAt: string;
};