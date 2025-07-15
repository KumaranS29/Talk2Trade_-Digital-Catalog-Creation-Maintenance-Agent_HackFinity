import { useState, useEffect } from "react";
import { Product } from "@/../../shared/schema";

const OFFLINE_STORAGE_KEY = "talk2trade_offline_data";

interface OfflineData {
  products: Product[];
  pendingActions: Array<{
    id: string;
    type: "create" | "update" | "delete";
    data: any;
    timestamp: number;
  }>;
}

export function useOfflineStorage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingActions();
    };
    
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getOfflineData = (): OfflineData => {
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : { products: [], pendingActions: [] };
  };

  const saveOfflineData = (data: OfflineData) => {
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(data));
  };

  const addPendingAction = (type: "create" | "update" | "delete", data: any) => {
    const offlineData = getOfflineData();
    const action = {
      id: `action_${Date.now()}_${Math.random()}`,
      type,
      data,
      timestamp: Date.now()
    };
    
    offlineData.pendingActions.push(action);
    saveOfflineData(offlineData);
    setPendingSync(true);
  };

  const syncPendingActions = async () => {
    if (!isOnline) return;
    
    const offlineData = getOfflineData();
    if (offlineData.pendingActions.length === 0) return;

    setPendingSync(true);
    
    try {
      for (const action of offlineData.pendingActions) {
        switch (action.type) {
          case "create":
            await fetch("/api/products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(action.data)
            });
            break;
          case "update":
            await fetch(`/api/products/${action.data.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(action.data)
            });
            break;
          case "delete":
            await fetch(`/api/products/${action.data.id}`, {
              method: "DELETE"
            });
            break;
        }
      }
      
      // Clear pending actions after successful sync
      saveOfflineData({ ...offlineData, pendingActions: [] });
      setPendingSync(false);
    } catch (error) {
      console.error("Sync failed:", error);
      setPendingSync(false);
    }
  };

  const saveProductOffline = (product: Product) => {
    const offlineData = getOfflineData();
    const existingIndex = offlineData.products.findIndex(p => p.id === product.id);
    
    if (existingIndex >= 0) {
      offlineData.products[existingIndex] = product;
    } else {
      offlineData.products.push(product);
    }
    
    saveOfflineData(offlineData);
  };

  const getOfflineProducts = (): Product[] => {
    return getOfflineData().products;
  };

  return {
    isOnline,
    pendingSync,
    addPendingAction,
    syncPendingActions,
    saveProductOffline,
    getOfflineProducts
  };
}