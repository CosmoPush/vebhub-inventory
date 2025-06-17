"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Package,
  Upload,
  Loader2,
  BarChart3,
  Building,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import type { LocationWithInventory, StockStatus } from "@/lib/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

interface DashboardStats {
  totalLocations: number;
  lowStockItems: number;
  totalProducts: number;
  recentSales: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [locations, setLocations] = useState<LocationWithInventory[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<
    LocationWithInventory[]
  >([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalLocations: 0,
    lowStockItems: 0,
    totalProducts: 0,
    recentSales: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "low" | "out">(
    "all"
  );
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    initializeDashboard();
  }, []);

  useEffect(() => {
    filterLocations();
  }, [locations, searchTerm, filterStatus]);

  const filterLocations = () => {
    if (!locations || locations.length === 0) {
      setFilteredLocations([]);
      return;
    }

    let filtered = [...locations];

    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((loc) => {
        if (!loc) return false;

        const name = (loc.name || "").toLowerCase();
        const locationCode = (loc.locationCode || "").toLowerCase();
        const address = (loc.address || "").toLowerCase();

        return (
          name.includes(term) ||
          locationCode.includes(term) ||
          address.includes(term)
        );
      });
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((loc) => {
        if (!loc || !loc.stockStatus) return false;
        return loc.stockStatus === filterStatus;
      });
    }

    setFilteredLocations(filtered);
  };

  const initializeDashboard = async () => {
    try {
      await checkAuthentication();
      await fetchDashboardData();
    } catch (err) {
      console.error("Dashboard initialization error:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const checkAuthentication = async () => {
    try {
      console.log("Dashboard - Checking authentication...");

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      console.log("Dashboard - User check:", {
        hasUser: !!user,
        error: error?.message,
        userId: user?.id,
        userEmail: user?.email,
      });

      if (error) {
        console.error("Dashboard - User error:", error);
        router.replace("/login");
        throw new Error("Authentication required - user error");
      }

      if (!user) {
        console.log("Dashboard - No user, redirecting to login");
        router.replace("/login");
        throw new Error("Authentication required");
      }

      console.log("Dashboard - User authenticated:", user.email);
      setUser(user);
    } catch (error) {
      console.error("Dashboard - Authentication check failed:", error);
      throw error;
    }
  };

  const fetchDashboardData = async () => {
    try {
      console.log("Dashboard - Fetching data...");

      const response = await fetch("/api/locations");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch locations");
      }

      const locationsData = Array.isArray(result.data) ? result.data : [];

      const validLocations = locationsData
        .filter((loc) => {
          const isValid =
            loc &&
            typeof loc.id === "string" &&
            typeof loc.name === "string" &&
            typeof loc.locationCode === "string";
          return isValid;
        })
        .map((loc) => ({
          ...loc,
          name: loc.name || "Unknown Location",
          locationCode: loc.locationCode || "Unknown Code",
          address: loc.address || null,
          lowStockCount:
            typeof loc.lowStockCount === "number" ? loc.lowStockCount : 0,
          totalProducts:
            typeof loc.totalProducts === "number" ? loc.totalProducts : 0,
          stockStatus: loc.stockStatus || "good",
        }));

      setLocations(validLocations);
      setFilteredLocations(validLocations);

      const totalLowStock = validLocations.reduce(
        (sum, loc) => sum + (loc.lowStockCount || 0),
        0
      );
      const totalProducts = validLocations.reduce(
        (sum, loc) => sum + (loc.totalProducts || 0),
        0
      );

      let recentSalesCount = 0;
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count } = await supabase
          .from("sales_transactions")
          .select("*", { count: "exact", head: true })
          .gte("sale_date", sevenDaysAgo.toISOString().split("T")[0]);

        recentSalesCount = count || 0;
      } catch (salesError) {
        console.warn("Dashboard - Could not fetch sales data:", salesError);
      }

      const finalStats = {
        totalLocations: validLocations.length,
        lowStockItems: totalLowStock,
        totalProducts: totalProducts,
        recentSales: recentSalesCount,
      };

      setStats(finalStats);
      console.log("Dashboard - Data loaded successfully:", finalStats);
    } catch (err) {
      console.error("Dashboard - Data fetch error:", err);
      throw new Error(
        `Failed to fetch dashboard data: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  const handleSignOut = async () => {
    try {
      console.log("Dashboard - Signing out...");
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Dashboard - Sign out error:", error);
        setError("Failed to sign out");
      } else {
        console.log("Dashboard - Sign out successful");
        router.replace("/login");
      }
    } catch (err) {
      console.error("Dashboard - Sign out error:", err);
      setError("Failed to sign out");
    }
  };

  const getStockStatusVariant = (
    status: StockStatus
  ): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "out":
        return "destructive";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  const getStockStatusLabel = (status: StockStatus): string => {
    switch (status) {
      case "out":
        return "Out of Stock";
      case "low":
        return "Low Stock";
      default:
        return "Good Stock";
    }
  };

  const getStockStatusIcon = (status: StockStatus) => {
    switch (status) {
      case "out":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "low":
        return <ArrowDownRight className="h-4 w-4 text-amber-500" />;
      default:
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>{error}</p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => router.push("/login")}>
                  Go to Login
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="bg-blue-50 p-2 rounded-lg mr-3">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  VendHub Dashboard
                </h1>
                <p className="text-sm text-gray-500">
                  Welcome back, {user?.email || "User"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="hidden md:flex">
                <Clock className="h-3 w-3 mr-1" />
                Last updated: {new Date().toLocaleTimeString()}
              </Badge>
              <Link href="/upload">
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Data
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Locations
              </CardTitle>
              <Building className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLocations}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active vending locations
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Low Stock Items
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {stats.lowStockItems}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Require restocking
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Products
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all locations
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recent Sales (7d)
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.recentSales}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Transactions processed
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Locations Overview</CardTitle>
                <CardDescription>
                  Manage inventory across all vending machine locations
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchDashboardData()}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center">
                <Filter className="h-4 w-4 text-gray-500 mr-2" />
                <Tabs
                  value={filterStatus}
                  onValueChange={(value) =>
                    setFilterStatus(value as "all" | "low" | "out")
                  }
                  className="w-full md:w-auto"
                >
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="low">Low Stock</TabsTrigger>
                    <TabsTrigger value="out">Out of Stock</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {filteredLocations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLocations.map((location) => (
                  <Card
                    key={location.id}
                    className="hover:shadow-md transition-shadow cursor-pointer border-l-4"
                    style={{
                      borderLeftColor:
                        location.stockStatus === "out"
                          ? "rgb(239, 68, 68)"
                          : location.stockStatus === "low"
                          ? "rgb(245, 158, 11)"
                          : "rgb(34, 197, 94)",
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg truncate">
                            {location.name || "Unknown Location"}
                          </CardTitle>
                          <CardDescription className="text-sm text-gray-600">
                            {location.locationCode || "Unknown Code"}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={getStockStatusVariant(location.stockStatus)}
                          className="flex items-center"
                        >
                          {getStockStatusIcon(location.stockStatus)}
                          <span className="ml-1">
                            {getStockStatusLabel(location.stockStatus)}
                          </span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Total Products</p>
                          <p className="font-medium">
                            {location.totalProducts || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Low Stock Items</p>
                          <p
                            className={`font-medium ${
                              (location.lowStockCount || 0) > 0
                                ? "text-amber-600"
                                : "text-green-600"
                            }`}
                          >
                            {location.lowStockCount || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                      <Link
                        href={`/location/${location.id}`}
                        className="w-full"
                      >
                        <Button variant="outline" size="sm" className="w-full">
                          View Details
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-gray-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Building className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || filterStatus !== "all"
                    ? "No locations match your filters"
                    : "No locations found"}
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {searchTerm || filterStatus !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Upload some sales data to get started with inventory management."}
                </p>
                {searchTerm || filterStatus !== "all" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterStatus("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Link href="/upload">
                    <Button>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Sales Data
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
