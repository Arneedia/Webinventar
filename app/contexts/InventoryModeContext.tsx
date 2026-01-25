'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface InventoryModeContextType {
  isActive: boolean;
  activateMode: () => void;
  deactivateMode: () => void;
  toggleMode: () => void;
  scannedCount: number;
  totalCount: number;
  scanDevice: (inventarCode: string) => void;
  unscanDevice: (inventarCode: string) => void;
  getScannedDevices: () => string[];
  isDeviceScanned: (inventarCode: string) => boolean;
  clearAllScans: () => void;
}

const InventoryModeContext = createContext<InventoryModeContextType | undefined>(undefined);

const STORAGE_KEY_ACTIVE = 'inventoryModeActive';
const STORAGE_KEY_SCANS = 'inventoryScans';

export function InventoryModeProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedActive = localStorage.getItem(STORAGE_KEY_ACTIVE) === 'true';
    const savedScans = localStorage.getItem(STORAGE_KEY_SCANS);
    
    setIsActive(savedActive);
    
    if (savedScans) {
      try {
        const parsed = JSON.parse(savedScans);
        setScannedDevices(new Set(parsed.map((item: any) => item.inventarCode)));
      } catch {
        setScannedDevices(new Set());
      }
    }
    
    setMounted(true);
  }, []);

  // Fetch total device count
  useEffect(() => {
    if (mounted && isActive) {
      fetch('/api/devices')
        .then(res => res.json())
        .then(data => {
          const activeDevices = data.filter((d: any) => !d.abgang);
          setTotalCount(activeDevices.length);
          
          // Auto-deactivate if all devices are scanned
          if (scannedDevices.size > 0 && scannedDevices.size >= activeDevices.length) {
            deactivateMode();
          }
        })
        .catch(console.error);
    }
  }, [mounted, isActive, scannedDevices.size]);

  const activateMode = () => {
    setIsActive(true);
    localStorage.setItem(STORAGE_KEY_ACTIVE, 'true');
    // Clear all scanned devices when starting new inventory
    clearAllScans();
  };

  const deactivateMode = () => {
    setIsActive(false);
    localStorage.setItem(STORAGE_KEY_ACTIVE, 'false');
  };

  const toggleMode = () => {
    if (isActive) {
      deactivateMode();
    } else {
      activateMode();
    }
  };

  const scanDevice = (inventarCode: string) => {
    const newScanned = new Set(scannedDevices);
    newScanned.add(inventarCode);
    setScannedDevices(newScanned);
    
    // Save to localStorage
    const savedScans = localStorage.getItem(STORAGE_KEY_SCANS);
    let scans = [];
    if (savedScans) {
      try {
        scans = JSON.parse(savedScans);
      } catch {
        scans = [];
      }
    }
    
    if (!scans.find((s: any) => s.inventarCode === inventarCode)) {
      scans.push({
        inventarCode,
        scannedAt: new Date().toISOString(),
        status: 'found',
      });
      localStorage.setItem(STORAGE_KEY_SCANS, JSON.stringify(scans));
    }
  };

  const unscanDevice = (inventarCode: string) => {
    const newScanned = new Set(scannedDevices);
    newScanned.delete(inventarCode);
    setScannedDevices(newScanned);
    
    // Update localStorage
    const savedScans = localStorage.getItem(STORAGE_KEY_SCANS);
    if (savedScans) {
      try {
        const scans = JSON.parse(savedScans);
        const filtered = scans.filter((s: any) => s.inventarCode !== inventarCode);
        localStorage.setItem(STORAGE_KEY_SCANS, JSON.stringify(filtered));
      } catch {
        // Ignore
      }
    }
  };

  const getScannedDevices = () => {
    return Array.from(scannedDevices);
  };

  const isDeviceScanned = (inventarCode: string) => {
    return scannedDevices.has(inventarCode);
  };

  const clearAllScans = () => {
    setScannedDevices(new Set());
    localStorage.setItem(STORAGE_KEY_SCANS, JSON.stringify([]));
  };

  return (
    <InventoryModeContext.Provider
      value={{
        isActive,
        activateMode,
        deactivateMode,
        toggleMode,
        scannedCount: scannedDevices.size,
        totalCount,
        scanDevice,
        unscanDevice,
        getScannedDevices,
        isDeviceScanned,
        clearAllScans,
      }}
    >
      {children}
    </InventoryModeContext.Provider>
  );
}

export function useInventoryMode() {
  const context = useContext(InventoryModeContext);
  if (context === undefined) {
    throw new Error('useInventoryMode must be used within an InventoryModeProvider');
  }
  return context;
}
