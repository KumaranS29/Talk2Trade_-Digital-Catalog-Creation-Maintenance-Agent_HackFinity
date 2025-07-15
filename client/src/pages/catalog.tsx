import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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

// Form schema for product creation/editing
const productFormSchema = insertProductSchema.extend({
  price: z.coerce.number().positive().optional().or(z.literal("")),
  quantity: z.coerce.number().positive().optional().or(z.literal("")),
  confidence: z.coerce.number().min(0).max(1).optional().or(z.literal("")),
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

  // Filter products based on search and category
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = !searchQuery || 
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
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

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProductForm }) => {
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

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
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

  // Form for creating/editing products
  const form = useForm<ProductForm>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      price: "",
      currency: "INR",
      quantity: "",
      unit: "",
      brand: "",
      color: "",
      size: "",
      material: "",
      origin: "",
      tags: [],
      status: "draft",
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

  // Handle product editing
  const handleEdit = useCallback((product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name || "",
      description: product.description || "",
      category: product.category || "",
      price: product.price?.toString() || "",
      currency: product.currency || "INR",
      quantity: product.quantity?.toString() || "",
      unit: product.unit || "",
      brand: product.brand || "",
      color: product.color || "",
      size: product.size || "",
      material: product.material || "",
      origin: product.origin || "",
      tags: product.tags || [],
      status: product.status || "draft",
    });
  }, [form]);

  // Handle product deletion
  const handleDelete = useCallback((id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteProductMutation.mutate(id);
    }
  }, [deleteProductMutation]);

  // Calculate statistics
  const stats = {
    total: products.length,
    published: products.filter((p: Product) => p.status === "published").length,
    draft: products.filter((p: Product) => p.status === "draft").length,
    categories: categories.length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Package className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Product Catalog</h1>
                <p className="text-sm text-slate-500">Manage your digital inventory</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Stats */}
              <div className="flex items-center space-x-4 text-sm text-slate-600">
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
                  <Button>
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.published}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.draft}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.categories}</div>
            </CardContent>
          </Card>
        </div>

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

// Product Card Component
interface ProductCardProps {
  product: Product;
  viewMode: "grid" | "list";
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

function ProductCard({ product, viewMode, onEdit, onDelete }: ProductCardProps) {
  const formatPrice = (price: number | null, currency: string | null) => {
    if (!price) return "Price not set";
    return `${currency || "INR"} ${price.toLocaleString()}`;
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "published": return "bg-green-100 text-green-800";
      case "reviewed": return "bg-blue-100 text-blue-800";
      default: return "bg-orange-100 text-orange-800";
    }
  };

  if (viewMode === "list") {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 grid grid-cols-4 gap-4 items-center">
            <div>
              <h3 className="font-medium text-slate-900">{product.name}</h3>
              <p className="text-sm text-slate-500">{product.category}</p>
            </div>
            <div className="text-sm">
              <div className="font-medium">{formatPrice(product.price, product.currency)}</div>
              <div className="text-slate-500">
                {product.quantity ? `${product.quantity} ${product.unit || 'units'}` : 'Qty not set'}
              </div>
            </div>
            <div>
              <Badge className={getStatusColor(product.status)}>
                {product.status || 'draft'}
              </Badge>
            </div>
            <div className="text-sm text-slate-500">
              {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}
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
            <CardTitle className="text-lg">{product.name}</CardTitle>
            <p className="text-sm text-slate-500 mt-1">{product.category}</p>
          </div>
          <Badge className={getStatusColor(product.status)}>
            {product.status || 'draft'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {product.description && (
            <p className="text-sm text-slate-600 line-clamp-3">{product.description}</p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <span className="font-medium">{formatPrice(product.price, product.currency)}</span>
            </div>
            {product.quantity && (
              <span className="text-sm text-slate-500">
                {product.quantity} {product.unit || 'units'}
              </span>
            )}
          </div>
          
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {product.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{product.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-slate-500">
              {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter product name" />
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
                    <Input {...field} placeholder="e.g., Electronics, Clothing" />
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
          
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
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
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Brand name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., pieces, kg, meters" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Product color" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Product size" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="material"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Material type" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="origin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origin</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Place of origin" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
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