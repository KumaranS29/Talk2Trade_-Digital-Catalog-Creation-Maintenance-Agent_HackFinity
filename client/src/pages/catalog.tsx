import { useState, useCallback } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useToast } from "../hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Grid, 
  List,
  Tag,
  DollarSign,
  Calendar,
  TrendingUp,
  ShoppingBag,
  Barcode
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/schema";
import type { Product } from "@shared/schema";
import { z } from "zod";
import AdvancedDashboard from "@/components/AdvancedDashboard";

// Form schema for product creation/editing - Talk2Trade format
const productFormSchema = insertProductSchema.extend({
  price: z.coerce.number().positive().optional().or(z.literal("")),
  quantity: z.coerce.number().positive().optional().or(z.literal("")),
});

type ProductForm = z.infer<typeof productFormSchema>;

export default function CatalogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  // Get unique categories for filtering
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  // Filter products based on search and category - Talk2Trade format
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = !searchQuery || 
      product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (productData: ProductForm) => {
      const response = await apiRequest("POST", "/api/products", productData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Product Created",
        description: "New product has been added to the catalog",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  // Update product mutation - Talk2Trade format
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductForm }) => {
      const response = await apiRequest("PUT", `/api/products/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setEditingProduct(null);
      toast({
        title: "Product Updated",
        description: "Product details have been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    },
  });

  // Delete product mutation - Talk2Trade format
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/products/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product Deleted",
        description: "Product has been removed from the catalog",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  // Form for creating/editing products - Talk2Trade format
  const form = useForm<ProductForm>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      price: "",
      quantity: "",
    },
  });

  // Handle form submission
  const onSubmit = useCallback((data: ProductForm) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  }, [editingProduct, createProductMutation, updateProductMutation]);

  // Handle product editing - Talk2Trade format
  const handleEdit = useCallback((product: Product) => {
    setEditingProduct(product);
    form.reset({
      title: product.title || "",
      description: product.description || "",
      category: product.category || "",
      price: product.price?.toString() || "",
      quantity: product.quantity?.toString() || "",
    });
  }, [form]);

  // Handle product deletion - Talk2Trade format  
  const handleDelete = useCallback((id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteProductMutation.mutate(id);
    }
  }, [deleteProductMutation]);

  // Calculate statistics - Talk2Trade format
  const stats = {
    total: products.length,
    categories: categories.length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Package className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Talk2Trade Catalog</h1>
                <p className="text-blue-100">Advanced AI-powered product management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Stats */}
              <div className="flex items-center space-x-4 text-sm text-white/90">
                <div className="flex items-center space-x-1">
                  <ShoppingBag className="w-4 h-4" />
                  <span>{stats.total} Products</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Tag className="w-4 h-4" />
                  <span>{stats.categories} Categories</span>
                </div>
              </div>
              
              {/* Create Product Button */}
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-blue-600 hover:bg-blue-50">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <ProductFormDialog 
                  form={form}
                  onSubmit={onSubmit}
                  isLoading={createProductMutation.isPending}
                  title="Create New Product"
                />
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters and Search */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 gap-4 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Advanced Dashboard */}
        <AdvancedDashboard products={products} />

        {/* Products Grid/List */}
        {productsLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-slate-600">Loading products...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No products found</h3>
            <p className="text-slate-600 mb-4">
              {searchQuery || categoryFilter ? "Try adjusting your filters" : "Start by adding your first product"}
            </p>
            {!searchQuery && !categoryFilter && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            )}
          </Card>
        ) : (
          <div className={viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
            : "space-y-4"
          }>
            {filteredProducts.map((product: Product) => (
              <ProductCard
                key={product.id}
                product={product}
                viewMode={viewMode}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Edit Product Dialog */}
        <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
          <ProductFormDialog 
            form={form}
            onSubmit={onSubmit}
            isLoading={updateProductMutation.isPending}
            title="Edit Product"
          />
        </Dialog>
      </main>
    </div>
  );
}

// Product Card Component - Talk2Trade format
interface ProductCardProps {
  product: Product;
  viewMode: "grid" | "list";
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

function ProductCard({ product, viewMode, onEdit, onDelete }: ProductCardProps) {
  const formatPrice = (price: number | null) => {
    if (!price) return "Price not set";
    return `₹${price.toLocaleString()}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = () => {
    // Innovative status based on product freshness and availability
    if (product.category?.includes("Fruits") || product.category?.includes("Vegetables")) {
      return <Badge className="bg-green-100 text-green-800">🌱 Fresh</Badge>;
    } else if (product.category?.includes("Handicrafts")) {
      return <Badge className="bg-purple-100 text-purple-800">🎨 Handcrafted</Badge>;
    } else if (product.category?.includes("Health")) {
      return <Badge className="bg-blue-100 text-blue-800">💊 Wellness</Badge>;
    } else {
      return <Badge className="bg-orange-100 text-orange-800">⚡ Available</Badge>;
    }
  };

  if (viewMode === "list") {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 grid grid-cols-4 gap-4 items-center">
            <div>
              <h3 className="font-medium text-slate-900">{product.title}</h3>
              <p className="text-sm text-slate-500">{product.category}</p>
            </div>
            <div className="text-sm">
              <div className="font-medium">{formatPrice(product.price)}</div>
              <div className="text-slate-500">
                {product.quantity ? `Qty: ${product.quantity}` : 'Qty not set'}
              </div>
            </div>
            <div>
              {getStatusBadge()}
            </div>
            <div className="text-sm text-slate-500">
              {formatDate(product.last_updated)}
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Button variant="outline" size="sm" onClick={() => onEdit(product)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(product.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{product.title}</CardTitle>
            <p className="text-sm text-slate-500 mt-1">{product.category}</p>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {product.description && (
            <p className="text-sm text-slate-600 line-clamp-3">{product.description}</p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <span className="font-medium text-green-600">{formatPrice(product.price)}</span>
            </div>
            {product.quantity && (
              <span className="text-sm text-slate-500">
                Qty: {product.quantity}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-slate-500">
              {formatDate(product.last_updated)}
            </span>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(product)}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDelete(product.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Product Form Dialog Component
interface ProductFormDialogProps {
  form: any;
  onSubmit: (data: ProductForm) => void;
  isLoading: boolean;
  title: string;
}

function ProductFormDialog({ form, onSubmit, isLoading, title }: ProductFormDialogProps) {
  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Title *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter product title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Health & Beauty > Soap" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Product description" rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (₹)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          

          
          <div className="flex justify-end space-x-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Product"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}