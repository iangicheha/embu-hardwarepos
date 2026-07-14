"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Search, Settings, User } from "lucide-react";
import { currentUser, notifications, products, orders, suppliers } from "@/lib/data";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/sidebar";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/pos": "POS / Orders",
  "/products": "Products",
  "/categories": "Categories",
  "/suppliers": "Suppliers",
  "/restocks": "Restocks",
  "/reports": "Reports",
  "/users": "Users",
  "/audit-logs": "Audit Logs",
  "/notifications": "Notifications",
  "/settings": "Settings",
};

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/suppliers/")) return "Supplier Details";
  return pageTitles[pathname] ?? "Hardware Store ERP";
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.toLowerCase();

    // Check for page names first
    if (query.includes("user")) {
      router.push(`/users`);
      return;
    }
    if (query.includes("product")) {
      router.push(`/products`);
      return;
    }
    if (query.includes("order") || query.includes("pos")) {
      router.push(`/pos`);
      return;
    }
    if (query.includes("supplier")) {
      router.push(`/suppliers`);
      return;
    }
    if (query.includes("category")) {
      router.push(`/categories`);
      return;
    }
    if (query.includes("restock")) {
      router.push(`/restocks`);
      return;
    }
    if (query.includes("report")) {
      router.push(`/reports`);
      return;
    }
    if (query.includes("audit")) {
      router.push(`/audit-logs`);
      return;
    }
    if (query.includes("notification")) {
      router.push(`/notifications`);
      return;
    }
    if (query.includes("setting")) {
      router.push(`/settings`);
      return;
    }

    // Search within data
    const matchedProduct = products.find(p => 
      p.name.toLowerCase().includes(query) || 
      p.code.toLowerCase().includes(query)
    );
    const matchedOrder = orders.find(o => 
      o.orderNumber.toLowerCase().includes(query) ||
      o.customerName.toLowerCase().includes(query)
    );
    const matchedSupplier = suppliers.find(s => 
      s.name.toLowerCase().includes(query)
    );

    if (matchedProduct) {
      router.push(`/products`);
    } else if (matchedOrder) {
      router.push(`/pos`);
    } else if (matchedSupplier) {
      router.push(`/suppliers`);
    } else {
      // If no match, go to products page with search query
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem("accessToken");
    window.localStorage.removeItem("refreshToken");
    window.localStorage.removeItem("user");
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar onNavigate={() => {}} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 items-center gap-4">
        <h1 className="hidden text-lg font-semibold md:block">{getPageTitle(pathname)}</h1>
        <form onSubmit={handleSearch} className="relative ml-auto w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search products, orders, suppliers..."
            className="pl-9 bg-muted/50 border-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      <div className="flex items-center gap-1">
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </Button>
        </Link>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">{currentUser.avatar}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline">{currentUser.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-danger" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}