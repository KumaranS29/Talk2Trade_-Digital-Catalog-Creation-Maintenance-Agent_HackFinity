import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Clock, 
  BarChart3, 
  PieChart, 
  Activity,
  Star,
  Award,
  Target,
  Zap
} from "lucide-react";
import { Product } from "@/../../shared/schema";

interface AdvancedDashboardProps {
  products: Product[];
}

export default function AdvancedDashboard({ products }: AdvancedDashboardProps) {
  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    avgPrice: 0,
    topCategory: "",
    recentlyAdded: 0,
    performanceScore: 0
  });

  useEffect(() => {
    calculateAnalytics();
  }, [products]);

  const calculateAnalytics = () => {
    if (products.length === 0) return;

    const totalRevenue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.quantity || 1)), 0);
    const avgPrice = products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length;
    
    // Category analysis
    const categoryCount = products.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topCategory = Object.entries(categoryCount).sort(([,a], [,b]) => b - a)[0]?.[0] || "";
    
    // Recent additions (last 24 hours)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentlyAdded = products.filter(p => new Date(p.last_updated) > yesterday).length;
    
    // Performance score (based on completeness)
    const completenessScores = products.map(p => {
      let score = 0;
      if (p.title) score += 25;
      if (p.description) score += 25;
      if (p.price) score += 25;
      if (p.category !== "General") score += 25;
      return score;
    });
    const performanceScore = completenessScores.reduce((sum, score) => sum + score, 0) / completenessScores.length;

    setAnalyticsData({
      totalRevenue,
      avgPrice,
      topCategory,
      recentlyAdded,
      performanceScore
    });
  };

  const getStatusBadge = (product: Product) => {
    const category = product.category.toLowerCase();
    if (category.includes("food") || category.includes("fruit") || category.includes("vegetable")) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">🌱 Fresh</Badge>;
    } else if (category.includes("handicraft") || category.includes("art")) {
      return <Badge variant="secondary" className="bg-purple-100 text-purple-800">🎨 Handcrafted</Badge>;
    } else if (category.includes("health") || category.includes("wellness")) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">💊 Wellness</Badge>;
    }
    return <Badge variant="secondary" className="bg-gray-100 text-gray-800">⚡ Available</Badge>;
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs opacity-80">
              +{analyticsData.recentlyAdded} in last 24h
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Value</CardTitle>
            <TrendingUp className="h-4 w-4 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{analyticsData.totalRevenue.toLocaleString()}</div>
            <p className="text-xs opacity-80">
              Avg: ₹{analyticsData.avgPrice.toFixed(0)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            <Award className="h-4 w-4 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{analyticsData.topCategory || "N/A"}</div>
            <p className="text-xs opacity-80">
              Most popular
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
            <Target className="h-4 w-4 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(analyticsData.performanceScore)}`}>
              {analyticsData.performanceScore.toFixed(0)}%
            </div>
            <p className="text-xs opacity-80">
              Data completeness
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Advanced Analytics</span>
            <Badge variant="outline" className="ml-2">
              <Zap className="w-3 h-3 mr-1" />
              AI Insights
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Category Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(
                        products.reduce((acc, p) => {
                          acc[p.category] = (acc[p.category] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).slice(0, 5).map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-sm truncate">{category}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${(count / products.length) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {products.slice(0, 5).map((product) => (
                        <div key={product.id} className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <div className="flex-1">
                            <p className="text-sm font-medium truncate">{product.title}</p>
                            <p className="text-xs text-gray-600">
                              {new Date(product.last_updated).toLocaleDateString()}
                            </p>
                          </div>
                          {getStatusBadge(product)}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Data Quality Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Product Information Completeness</span>
                        <span>{analyticsData.performanceScore.toFixed(0)}%</span>
                      </div>
                      <Progress value={analyticsData.performanceScore} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Products with Prices</span>
                        <span>{((products.filter(p => p.price).length / products.length) * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={(products.filter(p => p.price).length / products.length) * 100} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Categorized Products</span>
                        <span>{((products.filter(p => p.category !== "General").length / products.length) * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={(products.filter(p => p.category !== "General").length / products.length) * 100} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="insights" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Activity className="w-4 h-4" />
                    <span>AI-Generated Insights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">🎯 Recommendations</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• {products.filter(p => !p.price).length} products need price information</li>
                        <li>• {products.filter(p => p.category === "General").length} products need better categorization</li>
                        <li>• Consider adding more detailed descriptions for better searchability</li>
                      </ul>
                    </div>
                    
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">⭐ Strengths</h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• Strong {analyticsData.topCategory} category presence</li>
                        <li>• {analyticsData.recentlyAdded} new products added recently</li>
                        <li>• Good variety across different categories</li>
                      </ul>
                    </div>
                    
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <h4 className="font-medium text-orange-900 mb-2">🚀 Growth Opportunities</h4>
                      <ul className="text-sm text-orange-800 space-y-1">
                        <li>• Add seasonal products for better market reach</li>
                        <li>• Implement inventory tracking for popular items</li>
                        <li>• Consider bundling complementary products</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}