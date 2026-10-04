/**
 * H2pro Desktop Accounting & ERP System
 * Main Application Component
 */

import React, { useState, useEffect } from 'react';
import { User, FinancialYear, CompanyInfo } from './types';
import { db } from './database/db';
import { DesktopWindow } from './components/DesktopWindow';
import { HeaderBar } from './components/HeaderBar';
import { LoginModal } from './screens/LoginModal';
import { FirstRunSetup } from './screens/FirstRunSetup';
import { MainMenuScreen, MainModuleId } from './screens/MainMenuScreen';
import { SystemSetupScreen } from './screens/SystemSetupScreen';
import { SystemAdminScreen } from './screens/SystemAdminScreen';
import { GeneralLedgerScreen } from './screens/GeneralLedgerScreen';
import { InventoryScreen } from './screens/InventoryScreen';
import { PurchasesScreen } from './screens/PurchasesScreen';
import { SalesScreen } from './screens/SalesScreen';
import { AuxiliaryScreen, TabType as AuxTabType } from './screens/AuxiliaryScreen';
import { PDFExportModal } from './components/PDFExportModal';
import { ModuleRibbon } from './components/ModuleRibbon';
import { ToastNotification } from './components/ToastNotification';
import { FloatingCalculator } from './components/FloatingCalculator';
import { alertsService, SmartAlert } from './services/alertsService';

export default function App() {
  // Database state
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>(() => db.getFinancialYears());
  const [company, setCompany] = useState<CompanyInfo>(() => db.getCompanyInfo());

  // Active Session state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeYear, setActiveYear] = useState<FinancialYear>(() => {
    const openYear = db.getFinancialYears().find((y) => y.status === 'open');
    return openYear || db.getFinancialYears()[0];
  });
  const [hasUsers, setHasUsers] = useState<boolean>(() => db.getUsers().length > 0);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(() => db.getUsers().length > 0);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [currentToastAlert, setCurrentToastAlert] = useState<SmartAlert | null>(null);

  // Active screen / module navigation
  const [currentModule, setCurrentModule] = useState<MainModuleId | null>(null);
  const [systemSetupInitialTab, setSystemSetupInitialTab] = useState<'years' | 'company' | 'regions' | 'currencies'>('years');
  const [adminInitialTab, setAdminInitialTab] = useState<'users' | 'permissions' | 'change_password'>('users');
  const [glInitialTab, setGLInitialTab] = useState<'accounts' | 'banks' | 'journal' | 'vouchers' | 'reports'>('accounts');
  const [inventoryInitialTab, setInventoryInitialTab] = useState<'items' | 'warehouses' | 'movements' | 'reports'>('items');
  const [purchasesInitialTab, setPurchasesInitialTab] = useState<'suppliers' | 'invoices' | 'returns' | 'orders'>('invoices');
  const [salesInitialTab, setSalesInitialTab] = useState<'invoices' | 'customers' | 'quotations' | 'returns' | 'reports'>('invoices');
  const [auxiliaryInitialTab, setAuxiliaryInitialTab] = useState<AuxTabType>('backup');

  const handleSelectModule = (mod: MainModuleId, tabId?: string) => {
    if (tabId) {
      if (mod === 'system_setup') setSystemSetupInitialTab(tabId as any);
      else if (mod === 'system_admin') setAdminInitialTab(tabId as any);
      else if (mod === 'general_ledger') setGLInitialTab(tabId as any);
      else if (mod === 'inventory') setInventoryInitialTab(tabId as any);
      else if (mod === 'purchases') setPurchasesInitialTab(tabId as any);
      else if (mod === 'sales') setSalesInitialTab(tabId as any);
      else if (mod === 'auxiliary_reports') setAuxiliaryInitialTab(tabId as AuxTabType);
    }
    setCurrentModule(mod);
  };

  // Listen for real-time alert notifications
  useEffect(() => {
    const unsubscribeAlerts = alertsService.subscribe((_, latestNewAlert) => {
      if (latestNewAlert) {
        setCurrentToastAlert(latestNewAlert);
      }
    });
    return unsubscribeAlerts;
  }, []);

  // Sync state when DB updates
  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setFinancialYears(db.getFinancialYears());
      setCompany(db.getCompanyInfo());
      setHasUsers(db.getUsers().length > 0);
    });
    return unsubscribe;
  }, []);

  const handleFirstRunComplete = () => {
    setHasUsers(true);
    setIsLoginOpen(true);
  };

  const handleLoginSuccess = (user: User, year: FinancialYear) => {
    setCurrentUser(user);
    setActiveYear(year);
    setIsLoginOpen(false);
    setCurrentModule(null); // Open Main 7-button Menu
  };

  const handleLogout = () => {
    if (currentUser) {
      db.logAction(currentUser.username, 'logout', 'تسجيل الدخول', currentUser.username, 'تسجيل خروج من النظام');
    }
    setCurrentUser(null);
    setCurrentModule(null);
    setIsLoginOpen(true);
  };

  const handleOpenAuditLog = () => {
    setAuxiliaryInitialTab('audit_log');
    setCurrentModule('auxiliary_reports');
  };

  // Direct keyboard navigation (Alt+1..7 or direct keys) - Arrow-free instant screen switching
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input, textarea, or select
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (!currentUser) return;

      // Alt+P: PDF Export Center
      if (e.altKey && (e.key === 'p' || e.key === 'P' || e.key === 'ح')) {
        e.preventDefault();
        setIsPDFModalOpen((prev) => !prev);
        return;
      }

      // Escape: Return to Main Menu (7 buttons)
      if (e.key === 'Escape') {
        if (isPDFModalOpen) {
          setIsPDFModalOpen(false);
          return;
        }
        if (currentModule !== null) {
          setCurrentModule(null);
          return;
        }
      }

      // Direct Module Jump via Alt+1..7 or Function keys F1..F7
      const key = e.key;
      const isAltNumber = e.altKey && ['1', '2', '3', '4', '5', '6', '7'].includes(key);
      const isFKey = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'].includes(key);

      if (isAltNumber || isFKey) {
        e.preventDefault();
        const num = isAltNumber ? parseInt(key, 10) : parseInt(key.replace('F', ''), 10);
        
        switch (num) {
          case 1:
            if (['admin', 'accountant'].includes(currentUser.role)) {
              setCurrentModule('system_setup');
            }
            break;
          case 2:
            if (currentUser.role === 'admin') {
              setCurrentModule('system_admin');
            }
            break;
          case 3:
            if (['admin', 'accountant'].includes(currentUser.role)) {
              setCurrentModule('general_ledger');
            }
            break;
          case 4:
            setCurrentModule('inventory');
            break;
          case 5:
            setCurrentModule('purchases');
            break;
          case 6:
            setCurrentModule('sales');
            break;
          case 7:
            setCurrentModule('auxiliary_reports');
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentUser, currentModule, isPDFModalOpen]);

  return (
    <DesktopWindow>
      {/* First-run setup: create the first administrator when the database has no users */}
      {!hasUsers && !currentUser && (
        <FirstRunSetup onComplete={handleFirstRunComplete} />
      )}

      {/* Central Login Window (displayed after first-run setup or upon logout) */}
      {hasUsers && (
        <LoginModal
          isOpen={isLoginOpen || !currentUser}
          financialYears={financialYears}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Main ERP Workstation */}
      {currentUser && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Application Bar with Intelligent Alerts */}
          <HeaderBar
            company={company}
            activeYear={activeYear}
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenAuditLog={handleOpenAuditLog}
            onExportPDF={() => setIsPDFModalOpen(true)}
            onToggleCalculator={() => setIsCalculatorOpen((prev) => !prev)}
            onNavigateModule={(mod) => setCurrentModule(mod)}
          />

          {/* Floating Mini Calculator Widget */}
          <FloatingCalculator
            isOpen={isCalculatorOpen}
            onClose={() => setIsCalculatorOpen(false)}
          />

          {/* Instant Real-Time Toast Notification Popup */}
          <ToastNotification
            alert={currentToastAlert}
            onDismiss={() => setCurrentToastAlert(null)}
            onNavigate={(mod) => setCurrentModule(mod)}
          />

          {/* Global PDF Generation & Export Center Modal */}
          <PDFExportModal
            isOpen={isPDFModalOpen}
            onClose={() => setIsPDFModalOpen(false)}
            company={company}
            activeYear={activeYear}
            currentUser={currentUser}
            currentModule={currentModule}
          />

          {/* Persistent Module Ribbon Navigation: Quick 1-click navigation without arrows */}
          <ModuleRibbon
            currentModule={currentModule}
            onSelectModule={(mod) => setCurrentModule(mod)}
            currentUser={currentUser}
          />

          {/* Viewport Router */}
          <main className="flex-1 flex flex-col overflow-hidden bg-[#f4f6f9]">
            {/* 1. Main Menu Screen with Concise Tree View & H2Pro Logo */}
            {currentModule === null && (
              <MainMenuScreen
                currentUser={currentUser}
                onSelectModule={handleSelectModule}
              />
            )}

            {/* 2. Module 1: تهيئة النظام */}
            {currentModule === 'system_setup' && (
              <SystemSetupScreen
                currentUser={currentUser}
                onBack={() => setCurrentModule(null)}
                defaultTab={systemSetupInitialTab}
              />
            )}

            {/* 3. Module 2: إدارة النظام */}
            {currentModule === 'system_admin' && (
              <SystemAdminScreen
                currentUser={currentUser}
                onBack={() => setCurrentModule(null)}
                defaultTab={adminInitialTab}
                onUserUpdated={(updated) => {
                  if (updated.id === currentUser.id) {
                    setCurrentUser(updated);
                  }
                }}
              />
            )}

            {/* 4. Module 3: إدارة الأستاذ العام */}
            {currentModule === 'general_ledger' && (
              <GeneralLedgerScreen
                currentUser={currentUser}
                activeYear={activeYear}
                onBack={() => setCurrentModule(null)}
                defaultTab={glInitialTab}
              />
            )}

            {/* 5. Module 4: إدارة المخزون */}
            {currentModule === 'inventory' && (
              <InventoryScreen
                currentUser={currentUser}
                onBack={() => setCurrentModule(null)}
                defaultTab={inventoryInitialTab}
              />
            )}

            {/* 6. Module 5: إدارة المشتريات */}
            {currentModule === 'purchases' && (
              <PurchasesScreen
                currentUser={currentUser}
                activeYear={activeYear}
                onBack={() => setCurrentModule(null)}
                defaultTab={purchasesInitialTab}
              />
            )}

            {/* 7. Module 6: إدارة المبيعات */}
            {currentModule === 'sales' && (
              <SalesScreen
                currentUser={currentUser}
                activeYear={activeYear}
                onBack={() => setCurrentModule(null)}
                defaultTab={salesInitialTab}
              />
            )}

            {/* 8. Module 7: أنظمة وتقارير مساعدة */}
            {currentModule === 'auxiliary_reports' && (
              <AuxiliaryScreen
                currentUser={currentUser}
                activeYear={activeYear}
                onBack={() => setCurrentModule(null)}
                defaultTab={auxiliaryInitialTab}
                onNavigateModule={(mod, tabId) => handleSelectModule(mod, tabId)}
              />
            )}
          </main>
        </div>
      )}
    </DesktopWindow>
  );
}
