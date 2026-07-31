
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { dispatchAppBackButton } from './appBackButton';
import Header from './components/Header.tsx';
import SummaryCard from './components/SummaryCard.tsx';
import ActionGrid from './components/ActionGrid.tsx';
import BottomNav from './components/BottomNav.tsx';
import SecondaryWidgets from './components/SecondaryWidgets.tsx';
import LastTransaction from './components/LastTransaction.tsx';
import SettingsView from './components/SettingsView.tsx';
import TahsilatView from './components/TahsilatView.tsx';
import GiderView from './components/GiderView.tsx';
import BorclandirView from './components/BorclandirView.tsx';
import IadeView from './components/IadeView.tsx';
import GelirView from './components/GelirView.tsx';
import TransferView from './components/TransferView.tsx';
import UnitsView from './components/UnitsView.tsx';
import TransactionsView from './components/TransactionsView.tsx';
import ReceivablesView from './components/ReceivablesView.tsx';
import AidatCizelgeView from './components/AidatCizelgeView.tsx';
import MonthlyReportView from './components/MonthlyReportView.tsx';
import YearlyReportView from './components/YearlyReportView.tsx';
import BoardView from './components/BoardView.tsx';
import SessionsView from './components/SessionsView.tsx';
import LoginView from './components/LoginView.tsx';
import RegisterView from './components/RegisterView.tsx';
import FilesView from './components/FilesView.tsx';
import MenuView from './components/MenuView.tsx';
import MessagesView from './components/MessagesView.tsx';
import { appConfirm } from './components/AppDialog.tsx';
import { BuildingInfo, ActiveTab, Transaction, Unit, BoardMember, FileEntry, BalanceSummary, AppMessage } from './types.ts';
import { db } from './databaseService';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { consumeRecentExternalIntent, markExternalIntent } from './externalIntentGuard';
import { fixCommonTurkishText } from './textUtils';
import { toLocalIsoDate } from './dateUtils';
import { getNetDebtAfterFullCredit, isDebtSettlementDescription, toCurrencyCents } from './balanceUtils';

const STORAGE_KEYS = {
  AUTH: 'galata_v16_auth',
  LOGOUT_PENDING: 'galata_logout_pending'
};

const RECEIVABLES_INFO_NOTIFICATION_ID = 190010;
const RECEIVABLES_REMINDER_NOTIFICATION_ID = 190011;
const RECEIVABLES_REMINDER_CHANNEL_ID = 'receivables-reminders';
const ADMIN_EMAIL = 'selahattin50@gmail.com';
const AUTO_DUES_MONTHS = [
  'OCAK',
  'ŞUBAT',
  'MART',
  'NİSAN',
  'MAYIS',
  'HAZİRAN',
  'TEMMUZ',
  'AĞUSTOS',
  'EYLÜL',
  'EKİM',
  'KASIM',
  'ARALIK'
];

const hasEnoughCreditForDues = (credit: number, duesAmount: number) =>
  toCurrencyCents(credit) >= toCurrencyCents(duesAmount);

const hasSessionData = (data: any) => Boolean(
  data && (
    data.building_info ||
    data.units ||
    data.transactions ||
    data.board_members ||
    data.files
  )
);

interface PdfOpenerPlugin {
  open(options: { filePath: string; contentType?: string; title?: string }): Promise<void>;
}

const PdfOpener = registerPlugin<PdfOpenerPlugin>('PdfOpener');

interface NativeAppControlPlugin {
  closeAndRemoveTask(): Promise<void>;
}

const NativeAppControl = registerPlugin<NativeAppControlPlugin>('NativeAppControl');

const DEFAULT_BUILDING_INFO: BuildingInfo = {
  name: "",
  address: "",
  role: "Yönetici",
  managerName: "",
  taxNo: "",
  duesAmount: 0,
  isManagerExempt: false,
  managerUnitId: '',
  isAutoDuesEnabled: true,
  isBulkMessageEnabled: true,
  bulkMessageInfoDay: 18,
  bulkMessageReminderDay: 19,
  bulkMessageStartDay: 19,
  lastAutoDuesMonth: "",
  expenseCategories: ['Elektrik', 'Su', 'Asansör', 'Temizlik', 'Tamirat', 'Yönetim Gideri', 'Huzur Hakkı', 'Bahçe Bakımı', 'Diğer']
};

const INITIAL_UNITS: Unit[] = [];

type VaultType = 'genel' | 'demirbas';

const getTransactionVault = (tx: Transaction): VaultType => {
  const description = (tx.description || '').toLocaleLowerCase('tr-TR');
  return description.includes('demirbas') || description.includes('demirbaş') ? 'demirbas' : 'genel';
};

const isCreditBalanceTransaction = (tx: Transaction) => /KRED[İI]/i.test(tx.description || '');

const normalizeTransactionText = (value: string) =>
  value
    .toLocaleUpperCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/İ/g, 'I')
    .replace(/İ/g, 'I')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ş/g, 'S')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C');

const isCarryOverCreditTransaction = (tx: Transaction) => {
  if (tx.type !== 'GELİR' || !tx.unitId) return false;
  const description = normalizeTransactionText(tx.description || '');
  return description.includes('DEVIR') && description.includes('ALACAK');
};

const isCashlessIncomeTransaction = (tx: Transaction) =>
  isCreditBalanceTransaction(tx) || isCarryOverCreditTransaction(tx);

const parseTransactionYear = (date: string) => {
  const parts = date.split('.');
  if (parts.length === 3) return Number(parts[2]);
  const isoParts = date.split('-');
  if (isoParts.length === 3) return Number(isoParts[0]);
  return NaN;
};

const getCarryOverSourceYear = (tx: Transaction) => {
  const description = normalizeTransactionText(tx.description || '');
  const marker = description.match(/DEVIR-YIL:(\d{4})/);
  if (marker) return Number(marker[1]);

  const legacyMarker = description.match(/(\d{4})\s+YIL\s+DEVIR/);
  if (legacyMarker) return Number(legacyMarker[1]);

  return NaN;
};

const getLatestClosedCarryOverYear = (items: Transaction[]) => {
  return items.reduce((latest, tx) => {
    const year = getCarryOverSourceYear(tx);
    return Number.isNaN(year) ? latest : Math.max(latest, year);
  }, 0);
};

const KNOWN_2025_OPENING_CASH = 56228.37;

const repair2025CarryOverCash = (items: Transaction[], units: Unit[]) => {
  const unitFour = units.find(unit => unit.no?.toString().trim() === '4');
  const source2025CashFromLegacyItems = items
    .filter(tx => {
      const description = normalizeTransactionText(tx.description || '');
      const parts = (tx.date || '').split('.');
      const txYear = parts.length === 3 ? Number(parts[2]) : NaN;
      return tx.type === 'GELİR' &&
        txYear === 2025 &&
        !description.includes('AIDAT') &&
        !description.includes('BORCLANDIRMA') &&
        !description.includes('DEVIR-YIL');
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
  const source2025Cash = source2025CashFromLegacyItems > 0 ? source2025CashFromLegacyItems : KNOWN_2025_OPENING_CASH;

  const unitFourCredit = items
    .filter(tx => {
      const description = normalizeTransactionText(tx.description || '');
      return tx.type === 'GELİR' &&
        !!unitFour &&
        tx.unitId === unitFour.id &&
        description.includes('2025') &&
        description.includes('DEVIR') &&
        description.includes('ALACAK');
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  if (unitFourCredit <= 0) return items;

  let changed = false;
  const repaired = items.map(tx => {
    const description = normalizeTransactionText(tx.description || '');
    const alreadyRepaired = description.includes('KREDI-KASA-DUZELTILDI');
    const is2025GeneralCashCarry = !tx.unitId &&
      tx.type === 'GELİR' &&
      description.includes('2025') &&
      description.includes('DEVIR') &&
      description.includes('GENEL') &&
      description.includes('KASA');

    if (!is2025GeneralCashCarry || alreadyRepaired) return tx;

    changed = true;
    const missingAmount = source2025Cash - tx.amount;
    return {
      ...tx,
      amount: missingAmount > 0 ? tx.amount + missingAmount : tx.amount,
      description: `${tx.description} [kredi-kasa-duzeltildi]`
    };
  });

  if (changed) return repaired;

  const has2025CarryOver = items.some(tx => {
    const description = normalizeTransactionText(tx.description || '');
    return description.includes('2025') && description.includes('DEVIR');
  });
  const has2025GeneralCashCarry = items.some(tx => {
    const description = normalizeTransactionText(tx.description || '');
    return !tx.unitId &&
      tx.type === 'GELİR' &&
      description.includes('2025') &&
      description.includes('DEVIR') &&
      description.includes('GENEL') &&
      description.includes('KASA');
  });

  if (!has2025CarryOver || has2025GeneralCashCarry) return items;

  const repairedCashCarry: Transaction = {
    id: Math.random().toString(36).slice(2),
    type: 'GELİR',
    amount: source2025Cash,
    description: '2025 YIL DEVİR GENEL KASA AÇILIŞ [genel] [devir-yil:2025] [kredi-kasa-duzeltildi]',
    date: '01.01.2026',
    periodMonth: 0,
    periodYear: 2026
  };

  return [repairedCashCarry, ...items];
};

const repairSpecificActiveTenantHistories = (items: Unit[]) => {
  const specs = [
    { unitNo: '5', name: 'Hasan Toprak', startDate: '2025-06-01' },
    { unitNo: '22', name: 'Nevzat Gokmen', displayName: 'Nevzat G\u00f6kmen', startDate: '2026-01-03' }
  ];
  let changed = false;

  const repaired = items.map(unit => {
    const spec = specs.find(item => unit.no?.toString().trim() === item.unitNo);
    if (!spec) return unit;

    const displayName = spec.displayName || spec.name;
    const tenantHistory = unit.tenantHistory?.length ? [...unit.tenantHistory] : [];
    const existingIndex = tenantHistory.findIndex(item => {
      const itemName = normalizeTransactionText(item.name || '');
      const targetName = normalizeTransactionText(displayName);
      return itemName === targetName || (itemName.includes(targetName.split(' ')[0]) && itemName.includes(targetName.split(' ').slice(-1)[0]));
    });

    const existing = existingIndex >= 0 ? tenantHistory[existingIndex] : null;
    const currentTenantPhone = unit.tenantPhone && unit.tenantPhone !== unit.phone ? unit.tenantPhone : '';
    const existingTenantPhone = existing?.phone && existing.phone !== unit.phone ? existing.phone : '';
    const updatedEntry = {
      ...(existing || {}),
      id: existing?.id || `tenant-${spec.unitNo}-${Date.now()}`,
      name: displayName,
      phone: existingTenantPhone || currentTenantPhone,
      startDate: spec.startDate,
      isCurrent: true
    };
    delete (updatedEntry as any).endDate;

    const nextHistory = tenantHistory.map(item => item.isCurrent ? { ...item, isCurrent: false, endDate: item.endDate || spec.startDate } : item);
    if (existingIndex >= 0) nextHistory[existingIndex] = updatedEntry as any;
    else nextHistory.push(updatedEntry as any);

    const nextUnit = {
      ...unit,
      tenantName: displayName,
      tenantPhone: updatedEntry.phone || currentTenantPhone,
      tenantHistory: nextHistory,
      status: 'Kirac\u0131'
    };

    const before = JSON.stringify(unit);
    const after = JSON.stringify(nextUnit);
    if (before !== after) changed = true;
    return nextUnit;
  });

  return { units: repaired, changed };
};

const repairUnitContactPhones = (items: Unit[]) => {
  let changed = false;
  const normalizePersonName = (value: string) => normalizeTransactionText(value || '');
  const normalizePhone = (value: string) => (value || '').replace(/\D/g, '');
  const samePerson = (aName: string, aPhone: string, bName: string, bPhone: string) =>
    normalizePersonName(aName) === normalizePersonName(bName) && normalizePhone(aPhone) === normalizePhone(bPhone);

  const repaired = items.map(unit => {
    const rawOwnerHistory = unit.ownerHistory || [];
    const activeOwner = rawOwnerHistory.find(item => item.isCurrent);
    const activeTenant = unit.tenantHistory?.find(item => item.isCurrent);
    const nextUnit: Unit = { ...unit };

    if (activeOwner?.phone && nextUnit.phone !== activeOwner.phone) {
      nextUnit.phone = activeOwner.phone;
    }

    const tenantPhoneLooksLikeOwnerPhone =
      !!nextUnit.tenantName &&
      !!nextUnit.phone &&
      (!!nextUnit.tenantPhone && nextUnit.tenantPhone === nextUnit.phone || !!activeTenant?.phone && activeTenant.phone === nextUnit.phone);

    if (tenantPhoneLooksLikeOwnerPhone) {
      nextUnit.tenantPhone = '';
    } else if (activeTenant?.phone && nextUnit.tenantPhone !== activeTenant.phone) {
      nextUnit.tenantPhone = activeTenant.phone;
    }

    const nextOwnerHistory = rawOwnerHistory
      .filter(item =>
        item.isCurrent ||
        !activeOwner ||
        !samePerson(item.name, item.phone || '', activeOwner.name, activeOwner.phone || '')
      )
      .map(item =>
        item.isCurrent && !item.phone && nextUnit.phone ? { ...item, phone: nextUnit.phone } : item
      );
    const nextTenantHistory = nextUnit.tenantHistory?.map(item => {
      if (!item.isCurrent) return item;
      if (tenantPhoneLooksLikeOwnerPhone && item.phone === nextUnit.phone) return { ...item, phone: '' };
      if (!item.phone && nextUnit.tenantPhone) return { ...item, phone: nextUnit.tenantPhone };
      return item;
    });

    if (rawOwnerHistory.length) nextUnit.ownerHistory = nextOwnerHistory;
    if (nextTenantHistory) nextUnit.tenantHistory = nextTenantHistory;

    if (JSON.stringify(unit) !== JSON.stringify(nextUnit)) changed = true;
    return nextUnit;
  });

  return { units: repaired, changed };
};

const removePassiveOwnerHistoryForUnits = (items: Unit[], unitNos: string[]) => {
  let changed = false;
  const targetNos = new Set(unitNos);

  const repaired = items.map(unit => {
    if (!targetNos.has(unit.no?.toString().trim() || '') || !unit.ownerHistory?.length) return unit;

    const activeOwners = unit.ownerHistory.filter(item => item.isCurrent);
    if (activeOwners.length === unit.ownerHistory.length) return unit;

    changed = true;
    return {
      ...unit,
      ownerHistory: activeOwners
    };
  });

  return { units: repaired, changed };
};

const removePassiveTenantHistoryForUnits = (items: Unit[], unitNos: string[]) => {
  let changed = false;
  const targetNos = new Set(unitNos);

  const repaired = items.map(unit => {
    if (!targetNos.has(unit.no?.toString().trim() || '') || !unit.tenantHistory?.length) return unit;

    const activeTenants = unit.tenantHistory.filter(item => item.isCurrent);
    if (activeTenants.length === unit.tenantHistory.length) return unit;

    changed = true;
    return {
      ...unit,
      tenantHistory: activeTenants
    };
  });

  return { units: repaired, changed };
};

const repairUnit21RecepTiftikTenantHistory = (items: Unit[]) => {
  let changed = false;

  const repaired = items.map(unit => {
    if (unit.no?.toString().trim() !== '21') return unit;

    const tenantHistory = unit.tenantHistory?.length ? [...unit.tenantHistory] : [];
    const existingIndex = tenantHistory.findIndex(item => {
      const name = normalizeTransactionText(item.name || '');
      return name.includes('RECEP') && name.includes('TIFTIK');
    });

    if (existingIndex >= 0) {
      const existing = tenantHistory[existingIndex];
      const updated = {
        ...existing,
        startDate: '2024-05-01',
        endDate: '2026-05-24',
        isCurrent: false
      };

      if (existing.startDate !== updated.startDate || existing.endDate !== updated.endDate || existing.isCurrent !== updated.isCurrent) {
        tenantHistory[existingIndex] = updated;
        changed = true;
      }
    } else {
      tenantHistory.push({
        id: 'recep-tiftik-21-passive',
        name: 'Recep Tiftik',
        phone: '+90 539 772 94 45',
        startDate: '2024-05-01',
        endDate: '2026-05-24',
        isCurrent: false
      });
      changed = true;
    }

    return {
      ...unit,
      tenantHistory,
      tenantName: normalizeTransactionText(unit.tenantName || '').includes('RECEP') ? '' : unit.tenantName,
      tenantPhone: normalizeTransactionText(unit.tenantName || '').includes('RECEP') ? '' : unit.tenantPhone,
      status: normalizeTransactionText(unit.tenantName || '').includes('RECEP') ? 'Malik' : unit.status
    };
  });

  return { units: repaired, changed };
};

const ensure2025OpeningCashCarry = (items: Transaction[]) => {
  const has2025CarryOver = items.some(tx => {
    const description = normalizeTransactionText(tx.description || '');
    return description.includes('2025') && description.includes('DEVIR');
  });
  if (!has2025CarryOver) return items;

  const hasOpeningCash = items.some(tx => {
    const description = normalizeTransactionText(tx.description || '');
    return !tx.unitId &&
      tx.type === 'GELİR' &&
      description.includes('2025') &&
      description.includes('KASA-DUZELTME');
  });
  if (hasOpeningCash) return items;

  const existingCashCarryTotal = items
    .filter(tx => {
      const description = normalizeTransactionText(tx.description || '');
      return !tx.unitId &&
        tx.type === 'GELİR' &&
        description.includes('2025') &&
        description.includes('DEVIR') &&
        description.includes('GENEL') &&
        description.includes('KASA');
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  const missingAmount = KNOWN_2025_OPENING_CASH - existingCashCarryTotal;
  if (missingAmount <= 0.01) return items;

  const repairTx: Transaction = {
    id: Math.random().toString(36).slice(2),
    type: 'GELİR',
    amount: Number(missingAmount.toFixed(2)),
    description: '2025 KASA-DUZELTME AÇILIŞ DEVİR [genel] [devir-yil:2025]',
    date: '01.01.2026',
    periodMonth: 0,
    periodYear: 2026
  };

  return [repairTx, ...items];
};

const isAutoDuesTransaction = (tx: Transaction) => {
  if (!tx || tx.type !== 'BORÇLANDIRMA' || !tx.unitId) return false;
  if (tx.periodMonth === undefined || tx.periodYear === undefined) return false;

  const parts = (tx.date || '').split('.').map(Number);
  const isFirstDayOfPeriod = parts.length === 3 &&
    parts[0] === 1 &&
    parts[1] === tx.periodMonth + 1 &&
    parts[2] === tx.periodYear;
  if (!isFirstDayOfPeriod) return false;

  const description = normalizeTransactionText(tx.description || '');
  if (!description.includes('AIDAT') || !description.includes('BORCU')) return false;
  if (description.includes('DAIRE') || description.includes('NOLU') || description.includes('MALIK') || description.includes('KIRACI')) return false;

  return /^\s*\d{1,2}\.?\s*AY\s+AIDAT(\s+TAHSILATI)?\s+BORCU(\s+\[GENEL\])?\s*$/.test(description);
};

const repairAutoCreditDuesDescriptions = (items: Transaction[]) => {
  let changed = false;
  const repaired = items.map(tx => {
    if (!tx.unitId || tx.type !== 'GELİR') return tx;
    const description = fixCommonTurkishText(tx.description || '');
    const nextDescription = description.replace(/^DAİRE\s+\S+\s+(.+\bAYI\s+AİDATI\s+KREDİ\b.*)$/i, '$1');
    if (nextDescription === description) return tx;
    changed = true;
    return { ...tx, description: nextDescription };
  });

  return { transactions: repaired, changed };
};

const getTransferDirection = (tx: Transaction): { from: VaultType; to: VaultType } | null => {
  if (tx.type !== 'TRANSFER') return null;
  const description = (tx.description || '').toLocaleUpperCase('tr-TR');
  const generalIndex = description.indexOf('GENEL');
  const demirbasIndex = Math.max(description.indexOf('DEMİRBAŞ'), description.indexOf('DEMIRBAS'));
  if (generalIndex === -1 || demirbasIndex === -1) return null;
  return generalIndex < demirbasIndex
    ? { from: 'genel', to: 'demirbas' }
    : { from: 'demirbas', to: 'genel' };
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      if (localStorage.getItem(STORAGE_KEYS.LOGOUT_PENDING) === 'true') {
        localStorage.removeItem(STORAGE_KEYS.AUTH);
        sessionStorage.removeItem(STORAGE_KEYS.AUTH);
        return false;
      }
      return localStorage.getItem(STORAGE_KEYS.AUTH) === 'true' ||
        sessionStorage.getItem(STORAGE_KEYS.AUTH) === 'true';
    } catch { return false; }
  });

  const [showRegister, setShowRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEYS.LOGOUT_PENDING) !== 'true') return;

    localStorage.removeItem(STORAGE_KEYS.AUTH);
    sessionStorage.removeItem(STORAGE_KEYS.AUTH);
    signOut(auth)
      .catch(() => {})
      .finally(() => {
        localStorage.removeItem(STORAGE_KEYS.LOGOUT_PENDING);
      });
  }, []);

  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleMidnightRefresh = () => {
      if (midnightTimer) clearTimeout(midnightTimer);

      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setDate(now.getDate() + 1);
      nextMidnight.setHours(0, 0, 1, 0);

      midnightTimer = setTimeout(() => {
        const refreshedDate = new Date();
        setCurrentDate(refreshedDate);
        console.log('Saat 00:00 oldu, takvimler güncellendi:', refreshedDate.toLocaleDateString('tr-TR'));
        scheduleMidnightRefresh();
      }, nextMidnight.getTime() - now.getTime());
    };

    scheduleMidnightRefresh();

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentDate(prevDate => {
        if (prevDate.getDate() !== now.getDate() ||
          prevDate.getMonth() !== now.getMonth() ||
          prevDate.getFullYear() !== now.getFullYear()) {
          console.log('📅 Gün değişti, takvimler güncelleniyor:', now.toLocaleDateString('tr-TR'));
          return now;
        }
        if (prevDate.getHours() !== now.getHours() || prevDate.getMinutes() !== now.getMinutes()) {
          return now;
        }
        return prevDate;
      });
    }, 60000);

    // Uygulama arka plandan ön plana gelince tarihi güncelle ve oturum kontrolü yap
    let backgroundTime: number | null = null;
    let appStateListener: any = null;
    const AUTO_LOGOUT_MS = 30 * 60 * 1000; // 30 dakika

    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          // Tarih güncelle
          const now = new Date();
          setCurrentDate(prevDate => {
            if (prevDate.getDate() !== now.getDate() ||
              prevDate.getMonth() !== now.getMonth() ||
              prevDate.getFullYear() !== now.getFullYear()) {
              console.log('📅 Uygulama açıldı, tarih güncellendi:', now.toLocaleDateString('tr-TR'));
              return now;
            }
            return prevDate;
          });
          // Arka planda çok uzun kaldıysa otomatik logout
          const returnedFromExternalViewer = consumeRecentExternalIntent();
          const shouldRememberSession = localStorage.getItem(STORAGE_KEYS.AUTH) === 'true';
          if (!shouldRememberSession && !returnedFromExternalViewer && backgroundTime !== null && (Date.now() - backgroundTime) >= AUTO_LOGOUT_MS) {
            console.log('🔒 Uzun süre arka planda kaldı, oturum kapatılıyor');
            handleLogout();
          }
          backgroundTime = null;
        } else {
          // Arka plana geçiş zamanını kaydet
          backgroundTime = Date.now();
        }
      }).then(l => { appStateListener = l; });
    }

    return () => {
      if (midnightTimer) clearTimeout(midnightTimer);
      clearInterval(timer);
      if (appStateListener) appStateListener.remove();
    };
  }, []);

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [activeSubView, setActiveSubView] = useState<string | null>(null);

  const activeTabRef = useRef<ActiveTab>('home');
  const activeSubViewRef = useRef<string | null>(null);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    activeSubViewRef.current = activeSubView;
  }, [activeSubView]);

  const [buildingInfo, setBuildingInfo] = useState<BuildingInfo>(DEFAULT_BUILDING_INFO);
  const [units, setUnits] = useState<Unit[]>(INITIAL_UNITS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [createSiteCredits, setCreateSiteCredits] = useState(0);
  const [userSites, setUserSites] = useState<{ id: string, name: string }[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<string>(() => localStorage.getItem('galata_active_site_id') || 'main');

  const [lastSeenMsgTime, setLastSeenMsgTime] = useState(() => {
    return parseInt(localStorage.getItem('galata_last_msg_time') || '0', 10);
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setIsSessionReady(false);
      setIsLoading(false);
      return;
    }

    const loadDataFromFirebase = async () => {
      try {
        setIsSessionReady(false);
        setIsLoading(true);
        let currentUser = auth.currentUser;

        if (!currentUser) {
          currentUser = await new Promise<any>((resolve) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
              unsubscribe();
              resolve(user);
            });
          });
        }

        if (!currentUser || (!currentUser.emailVerified && currentUser.email !== ADMIN_EMAIL)) {
          alert('E-posta adresinizi doğrulamadan uygulamayı kullanamazsınız.');
          handleLogout();
          return;
        }

        const emailKey = currentUser.email?.replace(/[.@]/g, '_');
        const [userRoot, userProfile, bannedData] = await Promise.all([
          db.getDataDirect(`users/${currentUser.uid}`),
          db.getDataDirect(`_userProfiles/${currentUser.uid}`),
          db.getDataDirect(`_bannedUsers/${emailKey}`)
        ]);

        if (bannedData && currentUser.email !== ADMIN_EMAIL) { alert('Hesabınız yasaklanmıştır.'); handleLogout(); return; }
        if (!userProfile && currentUser.email !== ADMIN_EMAIL) { alert('Hesabınız silinmiştir.'); handleLogout(); return; }
        setCreateSiteCredits(currentUser.email === ADMIN_EMAIL ? Number.MAX_SAFE_INTEGER : Math.max(0, Number(userProfile?.createSiteCredits || 0)));

        const listedSiteNames = (userRoot?.available_sites || {}) as Record<string, string>;
        const nestedSessions = (userRoot?.sites || {}) as Record<string, any>;
        const sessionCatalog = new Map<string, { id: string; name: string; hasData: boolean }>();

        Object.entries(listedSiteNames).forEach(([id, name]) => {
          sessionCatalog.set(id, {
            id,
            name: String(name || nestedSessions[id]?.building_info?.name || 'Varsayılan'),
            hasData: hasSessionData(nestedSessions[id])
          });
        });

        Object.entries(nestedSessions).forEach(([id, data]) => {
          if (!hasSessionData(data)) return;
          const existing = sessionCatalog.get(id);
          sessionCatalog.set(id, {
            id,
            name: existing?.name || data?.building_info?.name || 'Varsayılan',
            hasData: true
          });
        });

        if (hasSessionData(userRoot)) {
          sessionCatalog.set('main', {
            id: 'main',
            name: listedSiteNames.main || userRoot?.building_info?.name || 'Varsayılan',
            hasData: true
          });
        }

        if (sessionCatalog.size === 0) {
          sessionCatalog.set('main', { id: 'main', name: 'Varsayılan', hasData: false });
        }

        const catalog = Array.from(sessionCatalog.values());
        const currentSiteId = catalog.find(site => site.id === activeSiteId && site.hasData)?.id
          || catalog.find(site => site.hasData)?.id
          || catalog.find(site => site.id === activeSiteId)?.id
          || catalog[0].id;
        const sites = catalog.map(({ id, name }) => ({ id, name }));
        setUserSites(sites);

        if (currentSiteId !== activeSiteId) {
          setActiveSiteId(currentSiteId);
          localStorage.setItem('galata_active_site_id', currentSiteId);
        }

        const sessionPath = currentSiteId === 'main' ? `users/${currentUser.uid}` : `users/${currentUser.uid}/sites/${currentSiteId}`;
        db.setCurrentSession(sessionPath);

        const sessionData = await db.getCurrentSessionData();

        const info = sessionData?.buildingInfo || null;
        const unitsData = sessionData?.units || [];
        const transactionsData = sessionData?.transactions || [];
        const boardData = sessionData?.boardMembers || [];
        const filesData = sessionData?.files || [];

        setBuildingInfo(info || DEFAULT_BUILDING_INFO);
        if (info) {
          if (!Object.prototype.hasOwnProperty.call(listedSiteNames, currentSiteId)) {
            await db.addSiteToUser(currentUser.uid, currentSiteId, info.name || "Varsayılan");
            setUserSites(previousSites => previousSites.map(site =>
              site.id === currentSiteId ? { ...site, name: info.name || 'Varsayılan' } : site
            ));
          }
        }
        if (unitsData?.length > 0) {
          const activeTenantRepair = repairSpecificActiveTenantHistories(unitsData);
          const unitRepair = repairUnit21RecepTiftikTenantHistory(activeTenantRepair.units);
          const phoneRepair = repairUnitContactPhones(unitRepair.units);
          const passiveOwnerRepair = removePassiveOwnerHistoryForUnits(phoneRepair.units, ['5', '22']);
          const passiveTenantRepair = removePassiveTenantHistoryForUnits(passiveOwnerRepair.units, ['5', '22']);
          setUnits(passiveTenantRepair.units);
          if (activeTenantRepair.changed || unitRepair.changed || phoneRepair.changed || passiveOwnerRepair.changed || passiveTenantRepair.changed) await db.saveUnits(passiveTenantRepair.units);
        }
        else setUnits(INITIAL_UNITS);

        const loadedTransactions = ensure2025OpeningCashCarry(repair2025CarryOverCash(transactionsData || [], unitsData || []));
        const autoDuesTransactions = loadedTransactions.filter(isAutoDuesTransaction);
        const hasTransactionsWithoutTime = loadedTransactions.some(tx => !isAutoDuesTransaction(tx) && !tx.time);
        const normalizedTransactions = loadedTransactions
          .filter(tx => !isAutoDuesTransaction(tx))
          .map(tx => tx.time ? tx : { ...tx, time: '00:00' });
        const autoCreditDescriptionRepair = repairAutoCreditDuesDescriptions(normalizedTransactions);
        const cleanedTransactions = autoCreditDescriptionRepair.transactions;

        if (autoDuesTransactions.length > 0) {
          await Promise.all(autoDuesTransactions.map(tx => db.deleteTransaction(tx.id).catch(error => {
            console.error('Otomatik aidat hareketi silinemedi:', tx.id, error);
          })));
        }

        setTransactions(cleanedTransactions);
        if (hasTransactionsWithoutTime || autoCreditDescriptionRepair.changed) {
          await db.saveTransactions(cleanedTransactions);
        }
        setBoardMembers(boardData || []);
        setFiles(filesData || []);
        setIsSessionReady(true);
      } catch (error) {
        console.error('Firebase error:', error);
        setIsSessionReady(false);
        alert('Veriler Firebase\'den yüklenemedi. İnternet bağlantınızı kontrol edip tekrar giriş yapın. Mevcut verilerinizin üzerine boş kayıt yazılmadı.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDataFromFirebase();
  }, [isAuthenticated, activeSiteId]);

  useEffect(() => {
    if (isAuthenticated && isSessionReady && !isLoading && buildingInfo) {
      const timer = setTimeout(() => db.saveBuildingInfo(buildingInfo), 500);
      return () => clearTimeout(timer);
    }
  }, [buildingInfo, isAuthenticated, isSessionReady, isLoading]);

  useEffect(() => {
    if (isAuthenticated && isSessionReady && !isLoading && units) {
      const timer = setTimeout(() => db.saveUnits(units), 500);
      return () => clearTimeout(timer);
    }
  }, [units, isAuthenticated, isSessionReady, isLoading]);

  useEffect(() => {
    if (isAuthenticated && isSessionReady && !isLoading && transactions) {
      const timer = setTimeout(() => db.saveTransactions(transactions), 500);
      return () => clearTimeout(timer);
    }
  }, [transactions, isAuthenticated, isSessionReady, isLoading]);

  useEffect(() => {
    if (isAuthenticated && isSessionReady && !isLoading && boardMembers) {
      const timer = setTimeout(() => db.saveBoardMembers(boardMembers), 500);
      return () => clearTimeout(timer);
    }
  }, [boardMembers, isAuthenticated, isSessionReady, isLoading]);

  useEffect(() => {
    if (isAuthenticated && isSessionReady && !isLoading && files) {
      const timer = setTimeout(() => db.saveFiles(files), 500);
      return () => clearTimeout(timer);
    }
  }, [files, isAuthenticated, isSessionReady, isLoading]);

  useEffect(() => {
    if (isAuthenticated && isSessionReady && !isLoading && messages) {
      const timer = setTimeout(() => db.saveMessages(messages), 500);
      return () => clearTimeout(timer);
    }
  }, [messages, isAuthenticated, isSessionReady, isLoading]);

  useEffect(() => {
    if (Capacitor.getPlatform() === 'android') {
      CapacitorApp.toggleBackButtonHandler({ enabled: true }).catch(() => {});
    }

    const handleBackButton = (event: any) => {
      if (dispatchAppBackButton()) { event?.preventDefault(); return; }
      if (activeSubViewRef.current) { setActiveSubView(null); event?.preventDefault(); return; }
      if (activeTabRef.current !== 'home') { setActiveTab('home'); event?.preventDefault(); return; }
      event?.preventDefault();
      if (Capacitor.isNativePlatform()) {
        void handleLogout({ exitApp: true });
        return;
      }
      void handleLogout();
    };

    const listener = CapacitorApp.addListener('backButton', handleBackButton);
    window.addEventListener('galata:native-back-button', handleBackButton);

    return () => {
      window.removeEventListener('galata:native-back-button', handleBackButton);
      listener.then(h => h.remove());
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const unsubscribe = db.subscribeMessages(setMessages);
      return () => unsubscribe();
    }
    setMessages([]);
  }, [isAuthenticated]);

  const activeBalanceTransactions = useMemo(() => {
    const latestClosedYear = getLatestClosedCarryOverYear(transactions);
    if (latestClosedYear <= 0) return transactions;

    return transactions.filter(tx => {
      const txYear = parseTransactionYear(tx.date || '');
      return !Number.isNaN(txYear) && txYear > latestClosedYear;
    });
  }, [transactions]);

  const unitsWithBalances = useMemo(() => {
    if (!Array.isArray(units)) return INITIAL_UNITS;
    const now = currentDate;
    const currentMonthIdx = now.getMonth();
    const currentYear = now.getFullYear();

    return units.map(unit => {
      const isExempt = buildingInfo?.isManagerExempt && unit.id === buildingInfo?.managerUnitId;
      if (isExempt) return { ...unit, credit: 0, debt: 0 };

      const unitTransactions = activeBalanceTransactions.filter(tx => tx.unitId === unit.id);
      const generalTransactions = unitTransactions.filter(tx => getTransactionVault(tx) === 'genel');
      const demirbasTransactions = unitTransactions.filter(tx => getTransactionVault(tx) === 'demirbas');
      const totalIncome = generalTransactions.filter(tx => tx.type === 'GELİR' && !isCreditBalanceTransaction(tx)).reduce((s, t) => s + t.amount, 0);
      const totalExpense = generalTransactions.filter(tx => tx.type === 'GİDER').reduce((s, t) => s + t.amount, 0);
      const totalManualDebt = generalTransactions.filter(tx => tx.type === 'BORÇLANDIRMA').reduce((s, t) => s + t.amount, 0);
      const totalManualDebtSettled = generalTransactions
        .filter(tx => tx.type === 'GELİR' && isDebtSettlementDescription(tx.description))
        .reduce((s, t) => s + t.amount, 0);
      const totalDemirbasIncome = demirbasTransactions.filter(tx => tx.type === 'GELİR' && !isCreditBalanceTransaction(tx)).reduce((s, t) => s + t.amount, 0);
      const totalDemirbasExpense = demirbasTransactions.filter(tx => tx.type === 'GİDER').reduce((s, t) => s + t.amount, 0);
      const totalDemirbasDebt = demirbasTransactions.filter(tx => tx.type === 'BORÇLANDIRMA').reduce((s, t) => s + t.amount, 0);
      const totalDemirbasDebtSettled = demirbasTransactions
        .filter(tx => tx.type === 'GELİR' && isDebtSettlementDescription(tx.description))
        .reduce((s, t) => s + t.amount, 0);
      const duesValue = buildingInfo.duesAmount || 0;

      let paidDues = 0; let unpaidDues = 0;
      if (duesValue > 0) {
        for (let m = 0; m <= currentMonthIdx; m++) {
          const hasManualDues = generalTransactions.some(tx =>
            tx.type === 'BORÇLANDIRMA' &&
            tx.periodMonth === m &&
            tx.periodYear === currentYear &&
            tx.description.toUpperCase().includes('AİDAT')
          );
          if (!hasManualDues) {
            const paid = generalTransactions.some(tx => tx.type === 'GELİR' && tx.periodMonth === m && tx.periodYear === currentYear);
            if (paid) paidDues += duesValue; else unpaidDues += duesValue;
          }
        }
      }
      return {
        ...unit,
        credit: Math.max(0, totalIncome - totalExpense - paidDues - totalManualDebtSettled),
        debt: Math.max(0, totalManualDebt - totalManualDebtSettled) + unpaidDues,
        demirbasCredit: Math.max(0, totalDemirbasIncome - totalDemirbasExpense - totalDemirbasDebtSettled),
        demirbasDebt: Math.max(0, totalDemirbasDebt - totalDemirbasDebtSettled)
      };
    });
  }, [units, activeBalanceTransactions, buildingInfo, currentDate]);

  useEffect(() => {
    if (!isAuthenticated || !isSessionReady || isLoading || !buildingInfo.isAutoDuesEnabled || !unitsWithBalances.length) return;

    const now = currentDate;
    if (now.getDate() !== 1) return;
    if (now.getHours() === 0 && now.getMinutes() < 1) return;

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const isAutoDuesMarkedForMonth = buildingInfo.lastAutoDuesMonth === currentMonthKey;

    const duesAmount = buildingInfo.duesAmount || 0;
    if (duesAmount <= 0) return;

    const transactionDate = toLocalIsoDate(now).split('-').reverse().join('.');
    const monthName = AUTO_DUES_MONTHS[currentMonth];
    const existingPaymentKeys = new Set(
      transactions
        .filter(tx =>
          tx.type === 'GELİR' &&
          tx.unitId &&
          tx.periodMonth === currentMonth &&
          tx.periodYear === currentYear
        )
        .map(tx => tx.unitId as string)
    );

    const autoCreditTransactions: Transaction[] = unitsWithBalances
      .filter(unit => !(buildingInfo.isManagerExempt && unit.id === buildingInfo.managerUnitId))
      .filter(unit => !existingPaymentKeys.has(unit.id))
      .filter(unit => (unit.debt || 0) >= duesAmount)
      .filter(unit => hasEnoughCreditForDues(unit.credit || 0, duesAmount))
      .map(unit => ({
        id: Math.random().toString(36).slice(2),
        type: 'GELİR',
        amount: duesAmount,
        description: `${monthName} AYI AİDATI KREDİ [genel]`,
        unitId: unit.id,
        date: transactionDate,
        time: '00:01',
        periodMonth: currentMonth,
        periodYear: currentYear
      }));

    const updatedTransactions = autoCreditTransactions.length > 0
      ? [...autoCreditTransactions, ...transactions]
      : transactions;

    if (isAutoDuesMarkedForMonth && autoCreditTransactions.length === 0) return;

    if (!isAutoDuesMarkedForMonth) {
      setBuildingInfo(prev => ({ ...prev, lastAutoDuesMonth: currentMonthKey }));
    }

    if (autoCreditTransactions.length > 0) {
      setTransactions(updatedTransactions);
    }

    if (isAuthenticated && isSessionReady && !isLoading) {
      Promise.all([
        !isAutoDuesMarkedForMonth ? db.saveBuildingInfo({ ...buildingInfo, lastAutoDuesMonth: currentMonthKey }) : Promise.resolve(),
        autoCreditTransactions.length > 0 ? db.saveTransactions(updatedTransactions) : Promise.resolve()
      ]).catch(error => {
        console.error('Otomatik kredi aidat tahsilatı kaydedilemedi:', error);
      });
    }
  }, [currentDate, isAuthenticated, isSessionReady, isLoading, buildingInfo, unitsWithBalances, transactions]);

  const balance: BalanceSummary = useMemo(() => {
    const cashByVault = activeBalanceTransactions.reduce((acc, tx) => {
      const transfer = getTransferDirection(tx);
      if (transfer) {
        acc[transfer.from] -= tx.amount;
        acc[transfer.to] += tx.amount;
        return acc;
      }

      if (isCashlessIncomeTransaction(tx)) return acc;
      const vault = getTransactionVault(tx);
      if (tx.type === 'GELİR') acc[vault] += tx.amount;
      if (tx.type === 'GİDER') acc[vault] -= tx.amount;
      return acc;
    }, { genel: 0, demirbas: 0 });

    const mevcut = cashByVault.genel;
    const demirbasMevcut = cashByVault.demirbas;
    const alacakBakiyesi = unitsWithBalances.reduce((s, u) => s + getNetDebtAfterFullCredit(u.debt, u.credit, buildingInfo.duesAmount || 0), 0);
    const demirbasAlacakBakiyesi = unitsWithBalances.reduce((s, u) => s + Math.max(0, (u.demirbasDebt || 0) - (u.demirbasCredit || 0)), 0);
    
    const now = currentDate;
    const monthlyCollected = activeBalanceTransactions.filter(tx => tx.type === 'GELİR' && tx.periodMonth === now.getMonth() && tx.periodYear === now.getFullYear()).reduce((s, t) => s + t.amount, 0);
    const activeUnits = units.filter(u => !(buildingInfo?.isManagerExempt && u.id === buildingInfo?.managerUnitId)).length;
    const monthlyTarget = activeUnits * (buildingInfo.duesAmount || 0);

    return { mevcutBakiye: mevcut, alacakBakiyesi: alacakBakiyesi, toplam: mevcut + alacakBakiyesi, demirbasKasasi: demirbasMevcut, demirbasAlacakBakiyesi, monthlyCollected, monthlyRemainingDebt: Math.max(0, monthlyTarget - monthlyCollected) };
  }, [unitsWithBalances, activeBalanceTransactions, buildingInfo, units, currentDate]);

  const handleLogin = (rem: boolean) => {
    localStorage.removeItem(STORAGE_KEYS.LOGOUT_PENDING);
    if (rem) localStorage.setItem(STORAGE_KEYS.AUTH, 'true'); else sessionStorage.setItem(STORAGE_KEYS.AUTH, 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = async (options: { exitApp?: boolean } = {}) => {
    localStorage.setItem(STORAGE_KEYS.LOGOUT_PENDING, 'true');
    setIsAuthenticated(false);
    setBuildingInfo(DEFAULT_BUILDING_INFO); setUnits(INITIAL_UNITS); setTransactions([]); setBoardMembers([]); setFiles([]); setMessages([]);
    localStorage.removeItem(STORAGE_KEYS.AUTH); sessionStorage.removeItem(STORAGE_KEYS.AUTH);
    setActiveTab('home'); setActiveSubView(null);

    if (options.exitApp && Capacitor.isNativePlatform()) {
      await Promise.race([
        signOut(auth).catch(() => {}),
        new Promise(resolve => window.setTimeout(resolve, 1500))
      ]);
      localStorage.removeItem(STORAGE_KEYS.LOGOUT_PENDING);
      await NativeAppControl.closeAndRemoveTask().catch(() => CapacitorApp.exitApp());
      return;
    }

    await signOut(auth).catch(() => {});
    localStorage.removeItem(STORAGE_KEYS.LOGOUT_PENDING);
    if (options.exitApp && Capacitor.isNativePlatform()) {
      CapacitorApp.exitApp();
    }
  };

  const handleAddUnit = (u: any) => {
    const newUnit = { ...u, id: Math.random().toString(36).slice(2), credit: 0, debt: 0 };
    setUnits(p => [...p, newUnit]);
  };

  const handleEditUnit = (u: Unit) => {
    setUnits(previousUnits => {
      const updatedUnits = previousUnits.map(item => item.id === u.id ? u : item);

      if (isAuthenticated && isSessionReady) {
        void db.saveUnits(updatedUnits).catch(error => {
          console.error('Daire güncellemesi anında kaydedilemedi:', error);
        });
      }

      return updatedUnits;
    });
  };

  const handleDeleteUnit = async (id: string) => {
    const unitToDelete = units.find(u => u.id === id);
    const label = unitToDelete ? `Daire ${unitToDelete.no} - ${unitToDelete.ownerName || 'İsimsiz'}` : 'Bu daire';
    if (await appConfirm(`${label} silinecek.\n\nBu işlem geri alınamaz. Silmek istediğinizden emin misiniz?`, 'Silme Onayı', 'SİL')) {
      const updatedUnits = units.filter(u => u.id !== id);
      setUnits(updatedUnits);
      if (isAuthenticated && isSessionReady) await db.saveUnits(updatedUnits);
      return true;
    }
    return false;
  };

  const handleAddTransaction = async (amount: number, description: string, type: any, vault: any = 'genel', date?: string, unitId?: string, periodMonth?: number, periodYear?: number) => {
    const formattedDate = date ? (date.includes('-') ? date.split('-').reverse().join('.') : date) : currentDate.toLocaleDateString('tr-TR');
    const normalizedDescription = fixCommonTurkishText(description);
    const finalDesc = normalizedDescription.includes('[') ? normalizedDescription : `${normalizedDescription} [${vault}]`;
    const currentTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const newTx: Transaction = { id: Math.random().toString(36).slice(2), type, amount, description: finalDesc, unitId, date: formattedDate, time: currentTime, periodMonth, periodYear };
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    if (isAuthenticated && isSessionReady && !isLoading) {
      try { await db.saveTransactions(updated); setActiveSubView('history'); } catch (err) { alert('Hata: ' + err); }
    } else setActiveSubView('history');
  };

  const getMimeTypeForFile = (file: FileEntry) => {
    if (file.mimeType) return file.mimeType;
    const ext = (file.extension || '').toLowerCase();
    if (ext === 'pdf') return 'application/pdf';
    if (['jpg', 'jpeg'].includes(ext)) return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'doc') return 'application/msword';
    if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (ext === 'xls') return 'application/vnd.ms-excel';
    if (ext === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (ext === 'txt') return 'text/plain';
    return 'application/octet-stream';
  };

  const handleAddFile = (name: string, category: any, uri?: string, size?: number, fileName?: string, extension = 'pdf', mimeType = 'application/pdf') => {
    const newFile: FileEntry = { id: Math.random().toString(36).slice(2), name, category, date: currentDate.toLocaleDateString('tr-TR'), size: size ? (size / 1024).toFixed(1) + ' KB' : '0 KB', extension, uri, fileName, mimeType };
    setFiles(p => [newFile, ...p]);
  };

  const handleShareFile = async (file: FileEntry) => {
    try {
      const { Share } = await import('@capacitor/share');
      if (file.uri) { markExternalIntent(); await Share.share({ title: file.name, text: file.name, url: file.uri, dialogTitle: 'Aç veya Paylaş' }); }
    } catch (e) {
      console.error('Dosya paylaşma hatası:', e);
      alert('Dosya paylaşılamadı. Lütfen dosyanın cihazda durduğundan emin olun.');
    }
  };

  const handleOpenFile = async (file: FileEntry) => {
    try {
      if (!file.uri) return;
      if (Capacitor.isNativePlatform()) {
        markExternalIntent();
        const contentType = getMimeTypeForFile(file);
        const { FileOpener } = await import('@capacitor-community/file-opener');
        await FileOpener.open({
          filePath: file.uri,
          contentType,
          openWithDefault: contentType !== 'application/pdf'
        });
      } else window.open(file.uri, '_blank');
    } catch (e) {
      console.error('Dosya açma hatası:', e);
      const errorText = String((e as any)?.message || e).toLowerCase();
      if (errorText.includes('cancel')) return;
      if (getMimeTypeForFile(file) === 'application/pdf') {
        alert('PDF açılamadı. Telefonda PDF okuyucu uygulaması olduğundan emin olun.');
        return;
      }
      try {
        const { Share } = await import('@capacitor/share');
        markExternalIntent();
        await Share.share({
          title: file.name,
          text: file.name,
          url: file.uri,
          dialogTitle: 'Dosya ile aç'
        });
      } catch (shareError) {
        console.error('Dosya açma paylaşım yedeği hatası:', shareError);
        alert('Dosya açılamadı. Telefonda PDF/dosya görüntüleyici uygulaması olduğundan emin olun.');
      }
    }
  };

  if (!isAuthenticated) {
    if (showRegister) return <RegisterView onBackToLogin={() => setShowRegister(false)} />;
    return <LoginView onLogin={handleLogin} onShowRegister={() => setShowRegister(true)} />;
  }

  const unreadCount = messages.filter(m => new Date(m.createdAt).getTime() > lastSeenMsgTime).length;

  const handleMessagesClick = () => {
    setActiveSubView('messages');
    const now = Date.now(); setLastSeenMsgTime(now); localStorage.setItem('galata_last_msg_time', now.toString());
  };

  const handleSendMessage = async (content: string) => {
    const newMsg: AppMessage = { id: Math.random().toString(36).slice(2), senderEmail: auth.currentUser?.email || 'Bilinmiyor', senderName: auth.currentUser?.displayName || 'Kullanıcı', content, createdAt: new Date().toISOString() };
    if (isAuthenticated && isSessionReady) await db.pushMessage(newMsg);
  };

  const handleDeleteMessage = async (id: string) => {
    setMessages(p => p.filter(m => m.id !== id));
    if (isAuthenticated && isSessionReady && !isLoading) await db.deleteMessage(id);
  };

  const themeClass = "bg-gradient-to-br from-[#334155] via-[#1e293b] to-[#0f172a]";
  const fixedSubViews = ['gider', 'borclandir', 'iade'];
  const isFixedSubView = activeSubView ? fixedSubViews.includes(activeSubView) : false;

  return (
    <div className={`fixed inset-0 ${themeClass} text-white font-['Outfit'] select-none overflow-hidden flex flex-col ${!activeSubView && activeTab === 'home' ? 'home-static' : ''}`}>
      <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto relative overflow-hidden">
      {!activeSubView && activeTab === 'home' && <Header info={buildingInfo} onLogout={handleLogout} onMessagesClick={handleMessagesClick} unreadCount={unreadCount} showMessages={true} />}

      <main className="flex-1 relative overflow-hidden">
        {activeSubView ? (
          <div className={`absolute inset-0 ${themeClass} z-[50] custom-scrollbar ${isFixedSubView ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            {activeSubView === 'tahsilat' && <TahsilatView currentDate={currentDate} units={unitsWithBalances} info={buildingInfo} transactions={transactions} onClose={() => setActiveSubView(null)} onSave={(a, desc, v, dt, uId, m, y) => handleAddTransaction(a, desc, 'GELİR', v, dt, uId, m, y)} />}
            {activeSubView === 'gider' && <GiderView currentDate={currentDate} info={buildingInfo} onClose={() => setActiveSubView(null)} onSave={(a, d, v, dt) => handleAddTransaction(a, d, 'GİDER', v, dt)} />}
            {activeSubView === 'borclandir' && <BorclandirView currentDate={currentDate} units={unitsWithBalances} info={buildingInfo} onClose={() => setActiveSubView(null)} onSave={(a, d, v, dt, uId, m, y) => handleAddTransaction(a, d, 'BORÇLANDIRMA', v, dt, uId, m, y)} />}
            {activeSubView === 'gelir' && <GelirView currentDate={currentDate} onClose={() => setActiveSubView(null)} onSave={(a, d, v, dt) => handleAddTransaction(a, d, 'GELİR', v, dt)} />}
            {activeSubView === 'iade' && <IadeView currentDate={currentDate} units={unitsWithBalances} info={buildingInfo} onClose={() => setActiveSubView(null)} onSave={(a, d, v, dt, uId) => handleAddTransaction(a, d, 'GİDER', v, dt, uId)} />}
            {activeSubView === 'transfer' && <TransferView currentDate={currentDate} onClose={() => setActiveSubView(null)} onSave={(a, d, v, dt) => handleAddTransaction(a, d, 'TRANSFER', v, dt)} />}
            {activeSubView === 'units' && <UnitsView currentDate={currentDate} units={unitsWithBalances} transactions={transactions} info={buildingInfo} onClose={() => setActiveSubView(null)} onAddUnit={handleAddUnit} onEditUnit={handleEditUnit} onDeleteUnit={handleDeleteUnit} onAddFile={(name, category, uri, size, fileName) => handleAddFile(name, category, uri, size, fileName)} />}
            {activeSubView === 'history' && <TransactionsView currentDate={currentDate} transactions={transactions} units={unitsWithBalances} info={buildingInfo} onClose={() => setActiveSubView(null)} onAddFile={(name, category, uri, size, fileName) => handleAddFile(name, category, uri, size, fileName)} onDeleteTransaction={async (id) => { setTransactions(p => p.filter(x => x.id !== id)); if (isAuthenticated && isSessionReady) await db.deleteTransaction(id); }} onUpdateTransaction={tx => setTransactions(p => p.map(x => x.id === tx.id ? { ...tx, description: fixCommonTurkishText(tx.description) } : x))} />}
            {activeSubView === 'receivables' && <ReceivablesView currentDate={currentDate} units={unitsWithBalances} info={buildingInfo} onClose={() => setActiveSubView(null)} />}
            {activeSubView === 'aidat-cizelge' && <AidatCizelgeView currentDate={currentDate} units={unitsWithBalances} transactions={transactions} info={buildingInfo} onClose={() => setActiveSubView(null)} onAddDues={() => { }} />}
            {activeSubView === 'monthly-report' && <MonthlyReportView currentDate={currentDate} transactions={transactions} units={unitsWithBalances} info={buildingInfo} onClose={() => setActiveSubView(null)} buildingName={buildingInfo.name} onAddFile={(name, category, uri, size, fileName) => handleAddFile(name, category, uri, size, fileName)} />}
            {activeSubView === 'yearly-report' && <YearlyReportView currentDate={currentDate} transactions={transactions} units={unitsWithBalances} info={buildingInfo} onClose={() => setActiveSubView(null)} buildingName={buildingInfo.name} onAddFile={(name, category, uri, size, fileName) => handleAddFile(name, category, uri, size, fileName)} />}
            {activeSubView === 'board' && <BoardView members={boardMembers} onClose={() => setActiveSubView(null)} buildingName={buildingInfo.name} onAddMember={m => setBoardMembers(p => [...p, { ...m, id: Math.random().toString(36).slice(2) }])} onDeleteMember={id => setBoardMembers(p => p.filter(x => x.id !== id))} />}
            {activeSubView === 'messages' && <MessagesView messages={messages} onClose={() => setActiveSubView(null)} onSendMessage={handleSendMessage} onDeleteMessage={handleDeleteMessage} />}
          </div>
        ) : (
          <div className={`h-full overflow-y-auto px-4 custom-scrollbar ${themeClass}`}>
            {activeTab === 'menu' && <MenuView onActionClick={(sv, tab) => { if (tab) setActiveTab(tab); else setActiveSubView(sv); }} onLogout={handleLogout} onClose={() => setActiveTab('home')} />}
            {activeTab === 'settings' && <SettingsView buildingInfo={buildingInfo} onUpdateBuildingInfo={setBuildingInfo} units={unitsWithBalances} transactions={transactions} balance={balance} onResetMoney={() => setTransactions([])} onClose={() => setActiveTab('home')} onReplaceTransactions={(newTxs) => setTransactions(newTxs)} />}
            {activeTab === 'sessions' && <SessionsView activeSiteId={activeSiteId} userSites={userSites} createSiteCredits={createSiteCredits} onSelectSite={(id) => { setActiveSiteId(id); localStorage.setItem('galata_active_site_id', id); setActiveTab('home'); }} onCreateSite={async (name) => { const currentUser = auth.currentUser; if (currentUser) { const newId = 'site_' + Math.random().toString(36).slice(2); await db.addSiteToUser(currentUser.uid, newId, name); const initialInfo = { ...DEFAULT_BUILDING_INFO, name: name }; db.setCurrentSession(`users/${currentUser.uid}/sites/${newId}`); await db.saveBuildingInfo(initialInfo); if (currentUser.email !== ADMIN_EMAIL) { const currentProfile = await db.getDataDirect(`_userProfiles/${currentUser.uid}`).catch(() => null); const nextCredits = Math.max(0, Number(currentProfile?.createSiteCredits || createSiteCredits) - 1); await db.saveDataDirect(`_userProfiles/${currentUser.uid}`, { ...(currentProfile || {}), email: currentUser.email, createSiteCredits: nextCredits, canCreateSites: nextCredits > 0 }); setCreateSiteCredits(nextCredits); } setUserSites(p => [...p, { id: newId, name }]); setActiveSiteId(newId); localStorage.setItem('galata_active_site_id', newId); setActiveTab('home'); } }} onDeleteSite={async (id) => { const currentUser = auth.currentUser; if (currentUser && userSites.length > 1) { await db.removeSiteFromUser(currentUser.uid, id); setUserSites(p => p.filter(s => s.id !== id)); if (activeSiteId === id) { const nextSite = userSites.find(s => s.id !== id); if (nextSite) { setActiveSiteId(nextSite.id); localStorage.setItem('galata_active_site_id', nextSite.id); } } } else alert("Son kalan siteyi silemezsiniz."); }} onUpdateUnits={async (newCount: number) => { setUnits(prev => { const currentCount = prev.length; if (newCount > currentCount) { const added = Array.from({ length: newCount - currentCount }, (_, i) => ({ id: (currentCount + i + 1).toString(), no: (currentCount + i + 1).toString(), ownerName: "", phone: "", credit: 0, debt: 0, status: "Malik", type: "3+1", m2: 100, huzurHakki: "YOK" })); return [...prev, ...added]; } else if (newCount < currentCount) return prev.slice(0, newCount); return prev; }); }} info={buildingInfo} units={unitsWithBalances} onClose={() => setActiveTab('home')} onUpdateInfo={setBuildingInfo} />}
            {activeTab === 'home' && (
              <div className="home-shell flex min-h-full flex-col gap-1 pt-1">
                <SummaryCard balance={balance} />
                <div className="flex min-h-[270px] flex-1 flex-col justify-center py-1">
                  <ActionGrid variant="grid" onActionClick={a => { const m: any = { 'Tahsilat': 'tahsilat', 'Gider': 'gider', 'Borçlandır': 'borclandir', 'Gelir': 'gelir', 'İade': 'iade', 'Transfer': 'transfer', 'Daireler': 'units', 'İşlem Hareketleri': 'history', 'Alacak Listesi': 'receivables', 'AİDAT ÇİZELGE': 'aidat-cizelge', 'AYLIK BİLANÇO': 'monthly-report', 'YILLIK BİLANÇO': 'yearly-report' }; if (m[a]) setActiveSubView(m[a]); }} />
                </div>
                <div className="flex-shrink-0">
                  <LastTransaction transaction={(Array.isArray(transactions) && transactions.length > 0) ? transactions[0] : null} />
                </div>
              </div>
            )}
            {activeTab === 'files' && <FilesView currentDate={currentDate} files={files} onAddFile={f => setFiles(p => [...p, { ...f, id: Math.random().toString(36).slice(2) }])} onDeleteFile={id => setFiles(p => p.filter(x => x.id !== id))} onOpenFile={handleOpenFile} onShareFile={handleShareFile} onClose={() => setActiveTab('home')} />}
          </div>
        )}
      </main>

      {!activeSubView && (
        <BottomNav activeTab={activeTab} onTabChange={t => { setActiveTab(t); setActiveSubView(null); }} />
      )}
      </div>
    </div>
  );
};

export default App;
