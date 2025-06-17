"use client";

import { use, useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Package,
  Save,
  AlertTriangle,
  Loader2,
  Building,
  MapPin,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
} from "lucide-react";
import Link from "next/link";
import type { Location, Inventory, Product } from "@/lib/types/domain";

interface InventoryWithProduct extends Inventory {
  product: Product;
}

interface LocationWithInventory extends Location {
  inventory: InventoryWithProduct[];
  lowStockCount: number;
  totalProducts: number;
}

export default function LocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Unwrap the params Promise
  const resolvedParams = use(params);
  const locationId = resolvedParams.id;

  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [location, setLocation] = useState<LocationWithInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedInventory, setEditedInventory] = useState<
    Record<string, Partial<Inventory>>
  >({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "low" | "out" | "good"
  >("all");
  const [filteredInventory, setFilteredInventory] = useState<
    InventoryWithProduct[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const initializePage = async () => {
      const isAuthenticated = await checkUser();
      if (isAuthenticated) {
        await fetchLocationData();
      }
    };

    initializePage();
  }, [locationId]);

  useEffect(() => {
    if (location) {
      filterInventory();
    }
  }, [location, searchTerm, filterStatus, editedInventory]);

  const checkUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      console.log("Location page - User check:", {
        hasUser: !!user,
        error: error?.message,
        userId: user?.id,
        locationId: locationId,
      });

      if (error || !user) {
        console.log("Location page - No user found, redirecting to login");
        router.replace("/login");
        return false;
      }

      setUser(user);
      setAuthChecked(true);
      return true;
    } catch (error) {
      console.error("Location page - Auth check error:", error);
      router.replace("/login");
      return false;
    }
  };

  const fetchLocationData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Location page - Fetching data for location:", locationId);

      const response = await fetch(`/api/locations/${locationId}`);
      const result = await response.json();

      console.log("Location page - API response:", {
        success: result.success,
        hasData: !!result.data,
        error: result.error,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to fetch location data");
      }

      const locationData = result.data;
      setLocation({
        ...locationData,
        locationCode: locationData.location_code || locationData.locationCode,
      });
    } catch (error) {
      console.error("Location page - Fetch error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch location data"
      );
    } finally {
      setLoading(false);
    }
  };

  const filterInventory = () => {
    if (!location) return;

    let filtered = [...location.inventory];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.product.name.toLowerCase().includes(term) ||
          inv.product.category?.toLowerCase().includes(term) ||
          inv.product.upc?.toLowerCase().includes(term)
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((inv) => {
        const currentStock =
          editedInventory[inv.id]?.currentStock ?? inv.currentStock ?? 0;
        const minStock = editedInventory[inv.id]?.minStock ?? inv.minStock ?? 0;

        const stockStatus = getStockStatusFromValues(currentStock, minStock);

        return stockStatus === filterStatus;
      });
    }

    setFilteredInventory(filtered);
  };

  const getStockStatusFromValues = (currentStock: number, minStock: number) => {
    if (currentStock === 0) return "out";
    if (currentStock <= minStock) return "low";
    return "good";
  };

  const getCurrentStockValues = (inventory: InventoryWithProduct) => {
    return {
      currentStock:
        editedInventory[inventory.id]?.currentStock ??
        inventory.currentStock ??
        0,
      minStock:
        editedInventory[inventory.id]?.minStock ?? inventory.minStock ?? 0,
      maxStock:
        editedInventory[inventory.id]?.maxStock ?? inventory.maxStock ?? 0,
    };
  };

  const getStockCounts = () => {
    if (!location) return { all: 0, low: 0, out: 0, good: 0 };

    const counts = { all: 0, low: 0, out: 0, good: 0 };

    location.inventory.forEach((inv) => {
      const { currentStock, minStock } = getCurrentStockValues(inv);
      const status = getStockStatusFromValues(currentStock, minStock);

      counts.all++;
      counts[status]++;
    });

    return counts;
  };

  const handleInventoryChange = (
    inventoryId: string,
    field: keyof Inventory,
    value: string | number
  ) => {
    let parsedValue: number | string = value;

    if (field.includes("Stock")) {
      const numValue = Number.parseInt(String(value), 10);
      parsedValue = isNaN(numValue) ? 0 : Math.max(0, numValue);
    }

    setEditedInventory((prev) => ({
      ...prev,
      [inventoryId]: {
        ...prev[inventoryId],
        [field]: parsedValue,
      },
    }));
  };

  const saveInventoryChanges = async () => {
    setSaving(true);
    setError(null);

    try {
      const updates = Object.entries(editedInventory)
        .filter(([_, changes]) => Object.keys(changes).length > 0)
        .map(([inventoryId, changes]) => ({
          id: inventoryId,
          ...changes,
        }));

      for (const update of updates) {
        try {
          const updateData: any = {};

          if (update.currentStock !== undefined) {
            updateData.currentStock = Number(update.currentStock);
          }
          if (update.minStock !== undefined) {
            updateData.minStock = Number(update.minStock);
          }
          if (update.maxStock !== undefined) {
            updateData.maxStock = Number(update.maxStock);
          }

          const response = await fetch(`/api/inventory/${update.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(
              result.error || `Failed to update inventory ${update.id}`
            );
          }
        } catch (error) {
          throw error;
        }
      }

      if (location) {
        const updatedInventory = location.inventory.map((inv) => {
          const changes = editedInventory[inv.id];
          if (changes) {
            return {
              ...inv,
              currentStock:
                changes.currentStock !== undefined
                  ? Number(changes.currentStock)
                  : inv.currentStock,
              minStock:
                changes.minStock !== undefined
                  ? Number(changes.minStock)
                  : inv.minStock,
              maxStock:
                changes.maxStock !== undefined
                  ? Number(changes.maxStock)
                  : inv.maxStock,
            };
          }
          return inv;
        });

        const lowStockCount = updatedInventory.filter((inv) => {
          const status = getStockStatusFromValues(
            inv.currentStock ?? 0,
            inv.minStock ?? 0
          );
          return status === "low" || status === "out";
        }).length;

        setLocation({
          ...location,
          inventory: updatedInventory,
          lowStockCount,
        });
      }

      setEditedInventory({});
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save inventory changes"
      );
    } finally {
      setSaving(false);
    }
  };

  const getStockStatus = (inventory: InventoryWithProduct) => {
    const { currentStock, minStock } = getCurrentStockValues(inventory);
    const status = getStockStatusFromValues(currentStock, minStock);

    if (status === "out")
      return {
        status: "out",
        label: "Out of Stock",
        variant: "destructive" as const,
      };
    if (status === "low")
      return {
        status: "low",
        label: "Low Stock",
        variant: "secondary" as const,
      };
    return { status: "good", label: "In Stock", variant: "default" as const };
  };

  const hasChanges = Object.keys(editedInventory).length > 0;
  const stockCounts = getStockCounts();

  // Check authentication first
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading location details...</p>
        </div>
      </div>
    );
  }

  if (error && !location) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>{error}</p>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => fetchLocationData()}>
                  Try Again
                </Button>
                <Link href="/dashboard">
                  <Button variant="outline">Back to Dashboard</Button>
                </Link>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Location not found</h2>
          <p className="text-gray-600 mb-4">
            The location you're looking for doesn't exist or you don't have
            access to it.
          </p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="bg-blue-50 p-2 rounded-lg mr-3">
                <Building className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {location.name}
                </h1>
                <p className="text-sm text-gray-600 flex items-center">
                  <Badge variant="outline" className="mr-2">
                    {location.locationCode}
                  </Badge>
                  {location.address && (
                    <span className="flex items-center text-gray-500">
                      <MapPin className="h-3 w-3 mr-1" />
                      {location.address}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="hidden md:flex">
                <Clock className="h-3 w-3 mr-1" />
                Last updated: {new Date().toLocaleTimeString()}
              </Badge>
              {hasChanges && (
                <Button onClick={saveInventoryChanges} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="mb-8 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Location Information</CardTitle>
              <Badge
                variant={
                  stockCounts.out > 0
                    ? "destructive"
                    : stockCounts.low > 0
                    ? "secondary"
                    : "default"
                }
              >
                {stockCounts.out > 0
                  ? "Out of Stock Items"
                  : stockCounts.low > 0
                  ? "Low Stock Items"
                  : "Good Stock"}
              </Badge>
            </div>
            <CardDescription>
              Manage inventory for this location. Changes are highlighted and
              must be saved.
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-600">
                  Location Code
                </Label>
                <p className="text-lg font-medium">{location.locationCode}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-600">
                  Address
                </Label>
                <p className="text-lg">
                  {location.address || "No address provided"}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-600">
                  Last Updated
                </Label>
                <p className="text-lg">
                  {new Date(location.updatedAt).toLocaleDateString()} at{" "}
                  {new Date(location.updatedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Inventory Management</CardTitle>
                <CardDescription>
                  {stockCounts.all} products at this location.{" "}
                  {stockCounts.low + stockCounts.out} need attention.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchLocationData}>
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-6">
            {location.inventory.length > 0 ? (
              <>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search products..."
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
                        setFilterStatus(value as "all" | "low" | "out" | "good")
                      }
                      className="w-full md:w-auto"
                    >
                      <TabsList>
                        <TabsTrigger value="all">
                          All ({stockCounts.all})
                        </TabsTrigger>
                        <TabsTrigger value="low">
                          Low Stock ({stockCounts.low})
                        </TabsTrigger>
                        <TabsTrigger value="out">
                          Out of Stock ({stockCounts.out})
                        </TabsTrigger>
                        <TabsTrigger value="good">
                          Good Stock ({stockCounts.good})
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>

                {filteredInventory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Current Stock</TableHead>
                          <TableHead>Min Stock</TableHead>
                          <TableHead>Max Stock</TableHead>
                          <TableHead>Last Restocked</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInventory.map((inventory) => {
                          const stockStatus = getStockStatus(inventory);
                          const isEdited = editedInventory[inventory.id];
                          const { currentStock, minStock, maxStock } =
                            getCurrentStockValues(inventory);

                          return (
                            <TableRow
                              key={inventory.id}
                              className={isEdited ? "bg-blue-50" : ""}
                            >
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {inventory.product.name}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    UPC: {inventory.product.upc}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {inventory.product.category}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={stockStatus.variant}
                                  className="flex items-center w-fit"
                                >
                                  {stockStatus.status === "out" ? (
                                    <XCircle className="h-3 w-3 mr-1" />
                                  ) : stockStatus.status === "low" ? (
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                  ) : (
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                  )}
                                  {stockStatus.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={currentStock}
                                  onChange={(e) =>
                                    handleInventoryChange(
                                      inventory.id,
                                      "currentStock",
                                      e.target.value
                                    )
                                  }
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={minStock}
                                  onChange={(e) =>
                                    handleInventoryChange(
                                      inventory.id,
                                      "minStock",
                                      e.target.value
                                    )
                                  }
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={maxStock}
                                  onChange={(e) =>
                                    handleInventoryChange(
                                      inventory.id,
                                      "maxStock",
                                      e.target.value
                                    )
                                  }
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                {inventory.lastRestocked
                                  ? new Date(
                                      inventory.lastRestocked
                                    ).toLocaleDateString()
                                  : "Never"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No matching products
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Try adjusting your search or filter criteria
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setFilterStatus("all");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="bg-gray-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No inventory data
                </h3>
                <p className="text-gray-600 mb-4">
                  Upload sales data to populate inventory for this location.
                </p>
                <Link href="/upload">
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Sales Data
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>

          {hasChanges && (
            <CardFooter className="bg-blue-50 border-t border-blue-100">
              <div className="w-full flex items-center justify-between">
                <p className="text-sm text-blue-700">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  You have unsaved changes
                </p>
                <Button onClick={saveInventoryChanges} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </main>
    </div>
  );
}
