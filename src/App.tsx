import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Building2, 
  Bath, 
  Layers, 
  Wind, 
  Zap, 
  Droplets, 
  Thermometer, 
  Utensils, 
  Hammer, 
  Paintbrush, 
  Square, 
  Maximize, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  ArrowRight,
  Calculator,
  Info,
  ExternalLink,
  User,
  Save,
  Clock,
  CheckCircle2,
  XCircle,
  FolderOpen,
  Folder,
  FileText,
  Volume2,
  Pin,
  Search,
  Edit3,
  MoreVertical,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  doc, 
  updateDoc,
  deleteDoc,
  getDoc,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// --- FIREBASE INIT ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test Connection
async function testConnection() {
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc);
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// --- DATA & CONSTANTS ---

const REGIONS = [
  { id: 'LOM', name: 'Lombardia', mult: 1.00 },
  { id: 'TRA', name: 'Trentino-Alto Adige', mult: 1.02 },
  { id: 'VEN', name: 'Veneto', mult: 0.95 },
  { id: 'FVG', name: 'Friuli-Venezia Giulia', mult: 0.92 },
  { id: 'PIE', name: 'Piemonte', mult: 0.93 },
  { id: 'VDA', name: 'Valle d\'Aosta', mult: 0.96 },
  { id: 'LIG', name: 'Liguria', mult: 0.97 },
  { id: 'EMR', name: 'Emilia-Romagna', mult: 0.95 },
  { id: 'TOS', name: 'Toscana', mult: 0.94 },
  { id: 'LAZ', name: 'Lazio', mult: 0.93 },
  { id: 'UMB', name: 'Umbria', mult: 0.85 },
  { id: 'MAR', name: 'Marche', mult: 0.84 },
  { id: 'ABR', name: 'Abruzzo', mult: 0.78 },
  { id: 'MOL', name: 'Molise', mult: 0.72 },
  { id: 'CAM', name: 'Campania', mult: 0.75 },
  { id: 'PUG', name: 'Puglia', mult: 0.76 },
  { id: 'BAS', name: 'Basilicata', mult: 0.70 },
  { id: 'CAL', name: 'Calabria', mult: 0.68 },
  { id: 'SIC', name: 'Sicilia', mult: 0.71 },
  { id: 'SAR', name: 'Sardegna', mult: 0.79 },
];

const PROPERTY_TYPES = [
  { id: 'res', name: 'Residenziale', mult: 1.0 },
  { id: 'com', name: 'Commerciale / Ufficio', mult: 1.15 },
];

const CONSTRUCTION_YEARS = [
  { id: 'post2000', name: 'Dopo 2000', mult: 0.95 },
  { id: '1980a2000', name: '1980 - 2000', mult: 1.0 },
  { id: '1960a1980', name: '1960 - 1980', mult: 1.08 },
  { id: 'ante1960', name: 'Prima 1960', mult: 1.18 },
];

const PROPERTY_STATUS = [
  { id: 'good', name: 'Buono', desc: 'Edificio mantenuto bene, poche riparazioni necessarie.', mult: 1.0 },
  { id: 'fair', name: 'Discreto', desc: 'Segni di usura, impianti datati ma funzionanti.', mult: 1.12 },
  { id: 'poor', name: 'Degradato', desc: 'Necessita rifacimento totale impianti e finiture.', mult: 1.28 },
  { id: 'critical', name: 'Da consolidare', desc: 'Problemi strutturali o di forte degrado murario.', mult: 1.50 },
];

const FINISH_LEVELS = [
  { id: 'low', name: 'Finiture Base', desc: 'Soluzioni standard, capitolato economico.' },
  { id: 'mid', name: 'Finiture Medie', desc: 'Marchi primari, materiali di design standard.' },
  { id: 'high', name: 'Finiture Alte', desc: 'Rivestimenti pregiati, custom design, brand luxury.' },
  { id: 'posaOnly', name: 'Solo Posa', desc: 'Calcolo esclusivo della manodopera professionale (escluse forniture).' },
];

const ROOMS_COMPLEXITY = (rooms: number) => {
  if (rooms <= 3) return 0.90;
  if (rooms <= 5) return 1.00;
  if (rooms <= 8) return 1.12;
  return 1.20;
};

const HEIGHT_MULT = (h: number) => {
  if (h <= 2.70) return 1.00;
  if (h <= 3.00) return 1.08;
  if (h <= 3.50) return 1.18;
  return 1.28;
};

const FLOOR_MULT = (floor: number, hasLift: boolean) => {
  if (floor === 0) return 1.00;
  if (hasLift) {
    if (floor <= 3) return 1.04;
    if (floor <= 6) return 1.08;
    return 1.12;
  } else {
    if (floor === 1) return 1.06;
    if (floor === 2) return 1.10;
    if (floor === 3) return 1.15;
    if (floor === 4) return 1.20;
    return 1.28;
  }
};

const SANITARY_LABOR = [380, 720];
const SANITARY_SUPPLY = {
  low: [400, 900],
  mid: [900, 2200],
  high: [2200, 6000],
};
const VASCA_DOCCIA_LABOR = [650, 1200];
const VASCA_DOCCIA_SUPPLY = {
  low: [300, 700],
  mid: [700, 1800],
  high: [1800, 5000],
};
const HYDRAULIC_LABOR = [120, 220]; // €/mq
const LAUNDRY_LABOR = [400, 750];
const LAUNDRY_SUPPLY = {
  low: [150, 350],
  mid: [350, 700],
  high: [700, 1800],
};

const NEW_BATHROOM_EXTRAS_LABOR = {
  wc: [280, 480],
  bidet: [200, 380],
  doccia: [450, 900],
  lavanderia: [300, 600],
  areazione: [300, 600],
};

const NEW_BATHROOM_EXTRAS_SUPPLY = {
  wc: { low: [150, 250], mid: [300, 600], high: [700, 2000] },
  bidet: { low: [100, 200], mid: [200, 450], high: [500, 1500] },
  doccia: { low: [300, 600], mid: [600, 1400], high: [1500, 5000] },
  lavanderia: { low: [200, 400], mid: [400, 800], high: [800, 2000] },
  areazione: { low: [200, 350], mid: [350, 600], high: [600, 1200] },
};

const FLOOR_COSTS = {
  parquet: {
    posa: [45, 80],
    supply: {
      low: [40, 80],
      mid: [80, 180],
      high: [180, 400],
    }
  },
  gres: {
    posa: [30, 55],
    supply: {
      low: [20, 50],
      mid: [50, 120],
      high: [120, 300],
    }
  },
  spc: {
    posa: [20, 40],
    supply: {
      low: [15, 35],
      mid: [35, 80],
      high: [80, 180],
    }
  },
};

const THERMAL_REMOVAL = {
  working: [300, 600],
  revise: [500, 900],
  demolish: [800, 1800],
};

const BOILER_SUPPLY = {
  low: [1200, 2200],
  mid: [2200, 4000],
  high: [4000, 8000],
};

// --- TYPES ---

interface BathroomExisting {
  id: string;
  size: number; // in mq
  type: 'complete' | 'finishOnly'; // Intervention type requested
  tubToShower: boolean;
  laundry: boolean;
}

interface NewBathroom {
  id: string;
  extras: string[]; // wc, bidet, etc.
}

// --- UTILS ---

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

// --- COMPONENT ---

export default function App() {
  // 0. AUTH & DATABASE
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [savedEstimates, setSavedEstimates] = useState<any[]>([]);
  const [currentProjectID, setCurrentProjectID] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    signInAnonymously(auth).catch((error) => {
      if (error.code === 'auth/admin-restricted-operation') {
        const msg = "L'accesso anonimo è disabilitato nel Console Firebase. Abilitalo in Authentication > Sign-in method.";
        setAuthError(msg);
        // Silenziamo l'errore in console se è quello previsto di restrizione admin
        console.warn("Firebase Auth Restricted: Cloud Sync disabled. Falling back to local storage.");
      } else {
        console.error("Firebase Auth Error:", error);
        setAuthError(error.message);
      }
    });
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      loadSavedEstimates(u?.uid);
    });
    return unsubscribe;
  }, []);

  // 1. CONTESTO
  const [clientName, setClientName] = useState('');
  const [region, setRegion] = useState(REGIONS[0].id);
  const [propType, setPropType] = useState(PROPERTY_TYPES[0].id);
  const [area, setArea] = useState<number>(85);
  const [rooms, setRooms] = useState<number>(4);
  const [height, setHeight] = useState<number>(2.70);
  const [floor, setFloor] = useState<number>(0);
  const [hasLift, setHasLift] = useState(false);
  const [year, setYear] = useState(CONSTRUCTION_YEARS[1].id);
  const [siteSetup, setSiteSetup] = useState<'min' | 'std' | 'high'>('std');

  // 2. STATO
  const [status, setStatus] = useState(PROPERTY_STATUS[0].id);

  // 3. BAGNI ESISTENTI
  const [existingBaths, setExistingBaths] = useState<BathroomExisting[]>([]);

  // 4. BAGNI NUOVI
  const [newBaths, setNewBaths] = useState<NewBathroom[]>([]);

  // 5. ALTRI INTERVENTI
  const [floorPct, setFloorPct] = useState(0);
  const [floorType, setFloorType] = useState<'parquet' | 'gres' | 'spc'>('gres');
  const [screed, setScreed] = useState(false);
  const [windows, setWindows] = useState({ small: 0, medium: 0, large: 0 });
  
  const [electric, setElectric] = useState<'none' | 'fix' | 'new'>('none');
  const [electricPoints, setElectricPoints] = useState<number>(50);
  const [electricLamps, setElectricLamps] = useState(false);
  const [plumbing, setPlumbing] = useState<'none' | 'fix' | 'new'>('none');
  
  const [thermalState, setThermalState] = useState<'none' | 'radiators' | 'fancoil' | 'underfloor'>('none');
  const [thermalCondition, setThermalCondition] = useState<'working' | 'revise' | 'demolish'>('working');
  const [thermalAction, setThermalAction] = useState<'none' | 'boiler' | 'new'>('none');
  const [thermalTerminal, setThermalTerminal] = useState<'radiators' | 'underfloor' | 'fancoil' | 'pc' | 'split'>('radiators');
  const [thermalSplitCount, setThermalSplitCount] = useState(0);

  const [acType, setAcType] = useState<'none' | 'split' | 'ducted'>('none');
  const [acUnits, setAcUnits] = useState(0);

  const [kitchen, setKitchen] = useState(false);
  const [masonryPct, setMasonryPct] = useState(0);
  const [paintingPct, setPaintingPct] = useState(0);
  const [ceilingsPct, setCeilingsPct] = useState(0);
  const [insulationPct, setInsulationPct] = useState(0);
  const [insulationType, setInsulationType] = useState<'thermal' | 'acoustic'>('thermal');
  const [balconies, setBalconies] = useState(false);
  const [automation, setAutomation] = useState<'none' | 'base' | 'smart'>('none');
  const [audioSystem, setAudioSystem] = useState<'none' | 'base' | 'multi'>('none');
  const [accessibility, setAccessibility] = useState(false);

  // 6. AVANZATE
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [pv, setPv] = useState<'none' | '3kw' | '6kw' | '10kw'>('none');
  const [stairs, setStairs] = useState<'none' | 'finish' | 'structure'>('none');
  const [cellar, setCellar] = useState(false);
  const [roof, setRoof] = useState<'none' | 'seal' | 'new'>('none');

  // 7. FINITURE
  const [finish, setFinish] = useState(FINISH_LEVELS[2].id);
  const [includeContingency, setIncludeContingency] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  // --- CALCULATION LOGIC ---

  const totals = useMemo(() => {
    const geoMult = REGIONS.find(r => r.id === region)?.mult || 1;
    const typeMult = PROPERTY_TYPES.find(t => t.id === propType)?.mult || 1;
    const yearMult = CONSTRUCTION_YEARS.find(y => y.id === year)?.mult || 1;
    const statusMult = PROPERTY_STATUS.find(s => s.id === status)?.mult || 1;
    const finishMult = FINISH_LEVELS.find(f => f.id === finish)?.id || 'mid';

    const rComp = ROOMS_COMPLEXITY(rooms);
    const hMult = HEIGHT_MULT(height);
    const fMult = FLOOR_MULT(floor, hasLift);

    // Multiplier for labor/posa
    const physicalMult = statusMult * yearMult * rComp * hMult * fMult;
    const advancedMult = geoMult;

    const applyGeo = (bMin: number, bMax: number, g: number): [number, number] => {
      const bMid = (bMin + bMax) / 2;
      const rMid = bMid * g;
      const spread = 0.15; // User requested fixed +/- 15%
      return [rMid * (1 - spread), rMid * (1 + spread)];
    };

    let min = 0;
    let max = 0;
    interface BreakdownItem {
      name: string;
      range: [number, number];
      posa?: [number, number];
      supply?: [number, number];
    }
    const breakdown: BreakdownItem[] = [];

    const addBreakdown = (name: string, pMin: number, pMax: number, sMin: number = 0, sMax: number = 0) => {
      const adjustedPosa = applyGeo(pMin, pMax, geoMult);
      const finalSupply: [number, number] = [sMin, sMax];
      
      const totalR: [number, number] = [adjustedPosa[0] + finalSupply[0], adjustedPosa[1] + finalSupply[1]];
      min += totalR[0];
      max += totalR[1];
      breakdown.push({ name, range: totalR, posa: adjustedPosa, supply: sMin > 0 ? finalSupply : undefined });
    };

    const addAdvanced = (name: string, pMin: number, pMax: number) => {
      const adjusted = applyGeo(pMin, pMax, geoMult);
      min += adjusted[0]; max += adjusted[1];
      breakdown.push({ name, range: adjusted, posa: adjusted });
    };

    // Cantierizzazione
    const siteCosts: any = { min: [1500, 3500], std: [3500, 7500], high: [7500, 15000] };
    const sc = siteCosts[siteSetup];
    addBreakdown('Cantierizzazione e Logistica', sc[0] * physicalMult, sc[1] * physicalMult);

    // Bagni Esistenti
    existingBaths.forEach((b, i) => {
      const bathPhysicalMult = statusMult;

      // Base rifacimento (completamente basato sul tipo d'intervento)
      if (b.type === 'complete') {
        const baseMin = b.size * 550 * bathPhysicalMult; // Higher base for systems+coatings+sanitaries
        const baseMax = b.size * 950 * bathPhysicalMult;
        addBreakdown(`Rifacimento Completo Bagno ${i+1}`, baseMin, baseMax);
        
        // Supply for complete usually includes sanitaries in this context
        const sSupply: [number, number] = SANITARY_SUPPLY[finish as 'low'|'mid'|'high'] as [number, number];
        if (finish !== 'posaOnly') addBreakdown(`Fornitura Sanitari Bagno ${i+1}`, 0, 0, sSupply[0], sSupply[1]);
      } else {
        const baseMin = b.size * 250 * bathPhysicalMult; // Lower base for only coatings+sanitaries
        const baseMax = b.size * 450 * bathPhysicalMult;
        addBreakdown(`Finiture (Solo Rivestimenti) Bagno ${i+1}`, baseMin, baseMax);

        const sSupply: [number, number] = SANITARY_SUPPLY[finish as 'low'|'mid'|'high'] as [number, number];
        if (finish !== 'posaOnly') addBreakdown(`Fornitura Sanitari Bagno ${i+1}`, 0, 0, sSupply[0], sSupply[1]);
      }

      if (b.tubToShower) {
        const tLabor: [number, number] = [VASCA_DOCCIA_LABOR[0] * bathPhysicalMult, VASCA_DOCCIA_LABOR[1] * bathPhysicalMult];
        const tSupply: [number, number] = VASCA_DOCCIA_SUPPLY[finish as 'low'|'mid'|'high'] as [number, number];
        addBreakdown(`Trasformazione Vasca/Doccia Bagno ${i+1}`, tLabor[0], tLabor[1], finish === 'posaOnly' ? 0 : tSupply[0], finish === 'posaOnly' ? 0 : tSupply[1]);
      }

      if (b.laundry) {
        const lLabor: [number, number] = [LAUNDRY_LABOR[0] * bathPhysicalMult, LAUNDRY_LABOR[1] * bathPhysicalMult];
        const lSupply: [number, number] = LAUNDRY_SUPPLY[finish as 'low'|'mid'|'high'] as [number, number];
        addBreakdown(`Aggiunta Mini-lavanderia Bagno ${i+1}`, lLabor[0], lLabor[1], finish === 'posaOnly' ? 0 : lSupply[0], finish === 'posaOnly' ? 0 : lSupply[1]);
      }
    });

    // Bagni Nuovi
    newBaths.forEach((b, i) => {
      let bPosaMin = 3200 * physicalMult; // Base muraria/idrica scaled to Lombardia ref
      let bPosaMax = 6500 * physicalMult;
      let bSupplyMin = 1500;
      let bSupplyMax = 3000;

      b.extras.forEach(e => {
        const lp = NEW_BATHROOM_EXTRAS_LABOR[e as keyof typeof NEW_BATHROOM_EXTRAS_LABOR] || [0,0];
        bPosaMin += lp[0] * physicalMult; bPosaMax += lp[1] * physicalMult;
        const sp = NEW_BATHROOM_EXTRAS_SUPPLY[e as keyof typeof NEW_BATHROOM_EXTRAS_SUPPLY]?.[finish as 'low' | 'mid' | 'high'] || [0,0];
        bSupplyMin += sp[0]; bSupplyMax += sp[1];
      });

      addBreakdown(`Nuovo Bagno ${i+1}`, bPosaMin, bPosaMax, bSupplyMin, bSupplyMax);
    });

    // Pavimenti
    if (floorPct > 0) {
      const floorArea = (area * floorPct) / 100;
      const costs = FLOOR_COSTS[floorType];
      let pMin = costs.posa[0] * floorArea * physicalMult;
      let pMax = costs.posa[1] * floorArea * physicalMult;

      const sCosts = costs.supply[finish as 'low' | 'mid' | 'high'];
      addBreakdown(`Pavimenti (${floorType}, ${floorPct}%)`, pMin, pMax, sCosts[0] * floorArea, sCosts[1] * floorArea);

      if (screed) {
        const SCREED_RATE = [39, 64];
        addBreakdown('Massetto (demolizione + smaltimento + posa)', SCREED_RATE[0] * floorArea, SCREED_RATE[1] * floorArea);
      }
    }

    // Infissi
    const wCount = windows.small + windows.medium + windows.large;
    if (wCount > 0) {
      let wPosaMin = ((windows.small * 150) + (windows.medium * 220) + (windows.large * 450)) * physicalMult;
      let wPosaMax = ((windows.small * 250) + (windows.medium * 450) + (windows.large * 800)) * physicalMult;
      
      let wSupplyMin = 0, wSupplyMax = 0;
      const sMult = finish === 'low' ? 0.7 : finish === 'mid' ? 1.0 : 1.8;
      wSupplyMin = ((windows.small * 500) + (windows.medium * 900) + (windows.large * 1500)) * sMult;
      wSupplyMax = ((windows.small * 900) + (windows.medium * 1500) + (windows.large * 2800)) * sMult;

      addBreakdown(`Infissi (${wCount} unità)`, wPosaMin, wPosaMax, wSupplyMin, wSupplyMax);
    }

    // Elettrico
    if (electric !== 'none') {
      let eMin = 0, eMax = 0;
      if (electric === 'fix') { eMin = 800; eMax = 2200; }
      else { eMin = electricPoints * 45; eMax = electricPoints * 75; }
      
      if (electricLamps) { eMin += 500; eMax += 1500; }
      addBreakdown(`Impianto elettrico (${electricPoints} pt)`, eMin * physicalMult, eMax * physicalMult);
    }

    // Idraulico
    if (plumbing !== 'none') {
      // Inferred points calculation
      let inferredPoints = 0;
      if (plumbing === 'new') {
        // Redoing the whole system
        // Every complete bathroom + new bathroom + kitchen
        inferredPoints += existingBaths.filter(b => b.type === 'complete').length * 5;
        inferredPoints += newBaths.length * 5;
        if (kitchen) inferredPoints += 3;
        
        // Minimum points based on size if none calculated above but still marked as 'new'
        if (inferredPoints === 0) inferredPoints = Math.max(5, Math.floor(area / 20));
      } else {
        // 'fix' (Adeguamento) - smaller intervention
        inferredPoints = Math.max(3, Math.floor(area / 40));
      }

      const phMin = (area * 12) + (inferredPoints * 220);
      const phMax = (area * 28) + (inferredPoints * 450);
      addBreakdown(`Impianto Idrico (${plumbing === 'fix' ? 'Adeguamento' : 'Rifacimento'}, ~${inferredPoints} pt)`, phMin * physicalMult, phMax * physicalMult);
    }

    // Termico
    if (thermalAction !== 'none') {
      let tMin = 0, tMax = 0;
      let tSMin = 0, tSMax = 0;

      if (thermalAction === 'boiler') {
        tMin = 400; tMax = 800;
        const bs = BOILER_SUPPLY[finish as 'low' | 'mid' | 'high'];
        tSMin = bs[0]; tSMax = bs[1];
      } else {
        // Rifacimento
        tMin = area * 35; tMax = area * 85;
        tSMin = area * 25; tSMax = area * 60;
      }
      addBreakdown(`Impianto termico (${thermalAction})`, tMin * physicalMult, tMax * physicalMult, tSMin, tSMax);
    }

    // AC
    if (acType !== 'none') {
      let acMin = 0, acMax = 0;
      let acSMin = 0, acSMax = 0;

      if (acType === 'split') {
        acMin = acUnits * 350;
        acMax = acUnits * 800;
        acSMin = acUnits * 600;
        acSMax = acUnits * 1800;
      } else {
        // Canalizzato: basato sui mq totali dell'immobile
        acMin = area * 45;
        acMax = area * 95;
        acSMin = area * 60;
        acSMax = area * 140;
      }
      addBreakdown(`Climatizzazione (${acType})`, acMin * physicalMult, acMax * physicalMult, finish === 'posaOnly' ? 0 : acSMin, finish === 'posaOnly' ? 0 : acSMax);
    }

    // Murarie
    if (masonryPct > 0) {
      // In base alla percentuale di "Intensità" (intesa come estensione/profondità delle opere murarie)
      const intenseFactor = masonryPct / 100;
      let mMin = area * 80 * intenseFactor;
      let mMax = area * 180 * intenseFactor;
      addBreakdown(`Opere murarie (${masonryPct}%)`, mMin * physicalMult, mMax * physicalMult);
    }

    // Altro
    if (kitchen) {
      const kSupply: any = { low: [4500, 8000], mid: [8000, 15000], high: [15000, 35000] };
      addBreakdown('Opere e Fornitura Cucina', 1500 * physicalMult, 3500 * physicalMult, kSupply[finish as keyof typeof kSupply][0], kSupply[finish as keyof typeof kSupply][1]);
    }
    if (paintingPct > 0) addBreakdown('Tinteggiatura', (area * paintingPct / 100) * 12 * physicalMult, (area * paintingPct / 100) * 25 * physicalMult);
    if (ceilingsPct > 0) addBreakdown('Controsoffitti', (area * ceilingsPct / 100) * 35 * physicalMult, (area * ceilingsPct / 100) * 75 * physicalMult);
    if (insulationPct > 0) addBreakdown('Isolamento', (area * insulationPct / 100) * 45 * physicalMult, (area * insulationPct / 100) * 95 * physicalMult);
    if (balconies) {
      const bSupply: any = { low: [1000, 2500], mid: [2500, 6000], high: [6000, 15000] };
      addBreakdown('Balconi/Terrazzi', 1500 * physicalMult, 5000 * physicalMult, bSupply[finish as keyof typeof bSupply][0], bSupply[finish as keyof typeof bSupply][1]);
    }
    if (automation !== 'none') {
      const aSupply: any = { low: [800, 2000], mid: [2000, 5000], high: [5000, 15000] };
      addBreakdown('Domotica', 400 * physicalMult, 1200 * physicalMult, aSupply[finish as keyof typeof aSupply][0], aSupply[finish as keyof typeof aSupply][1]);
    }
    if (audioSystem !== 'none') {
      const auSupply: any = { low: [300, 800], mid: [800, 2500], high: [2500, 8000] };
      addBreakdown('Audio', 500 * physicalMult, 1500 * physicalMult, auSupply[finish as keyof typeof auSupply][0], auSupply[finish as keyof typeof auSupply][1]);
    }
    if (accessibility) addBreakdown('Accessibilità', 2000 * physicalMult, 7000 * physicalMult);

    if (pv !== 'none') {
      const costs: any = { '3kw': [5500, 8500], '6kw': [9000, 14000], '10kw': [15000, 25000] };
      addAdvanced(`Fotovoltaico (${pv})`, costs[pv][0], costs[pv][1]);
    }
    if (stairs !== 'none') addAdvanced('Scala interna', stairs === 'finish' ? 2500 : 12000, stairs === 'finish' ? 7000 : 35000);
    if (cellar) addAdvanced('Cantina/Garage', 2500, 8000);
    if (roof !== 'none') addAdvanced('Tetto', 8000, 45000);

    // Dynamic Risk Factor (Complessità Intervento)
    let riskFactor = 1.0;
    if (status === 'critical') riskFactor += 0.25;
    if (status === 'poor') riskFactor += 0.15;
    if (year === 'ante1960') riskFactor += 0.10;
    if (masonryPct > 25) riskFactor += 0.12;
    if (roof !== 'none') riskFactor += 0.20;
    if (stairs === 'structure') riskFactor += 0.10;
    if (thermalAction === 'new') riskFactor += 0.08;
    
    // Contigency increment (additive only) scaled by riskFactor
    const baseInc = [0.08, 0.20]; 
    const riskInc = [baseInc[0] * riskFactor, baseInc[1] * riskFactor];
    
    // Cap al margine
    const maxCap = 0.30;
    const finalRiskInc = [
      Math.min(riskInc[0], maxCap * 0.6), 
      Math.min(riskInc[1], maxCap)
    ];
    
    const contMult = [1 + finalRiskInc[0], 1 + finalRiskInc[1]];

    return { 
      baseTotal: [min, max], 
      contingencyMult: contMult,
      riskFactor: (riskFactor - 1) * 100, // Percentage of extra complexity
      items: breakdown 
    };
  }, [
    region, propType, area, rooms, height, floor, hasLift, year, status,
    existingBaths, newBaths, floorPct, floorType, screed, windows, electric, electricPoints, electricLamps, plumbing,
    thermalAction, thermalTerminal, kitchen, masonryPct, paintingPct, ceilingsPct, insulationPct,
    balconies, automation, audioSystem, accessibility, pv, stairs, cellar, roof, finish,
    acType, acUnits, includeContingency, siteSetup
  ]);

  const saveEstimate = async () => {
    if (!clientName) {
      alert("Inserisci il nome del cliente prima di salvare.");
      return;
    }
    setIsSaving(true);
    
    const config = {
      region, propType, area, rooms, height, floor, hasLift, year, status, siteSetup,
      existingBaths, newBaths, floorPct, floorType, screed, windows,
      electric, electricPoints, electricLamps, plumbing,
      thermalAction, thermalTerminal, kitchen,
      masonryPct, paintingPct, ceilingsPct, insulationPct, balconies,
      automation, audioSystem, accessibility, pv, stairs, cellar, roof,
      finish, acType, acUnits, includeContingency
    };

    const estimateData: any = {
      clientName,
      date: new Date().toISOString(),
      total: totals.baseTotal,
      items: totals.items,
      config,
      userId: user?.uid || 'local-user'
    };

    try {
      if (user) {
        if (currentProjectID && currentProjectID.startsWith('cloud-')) {
          const docId = currentProjectID.replace('cloud-', '');
          await updateDoc(doc(db, 'estimates', docId), estimateData);
          alert("Stima aggiornata correttamente in Cloud.");
        } else {
          estimateData.pinned = false;
          const docRef = await addDoc(collection(db, 'estimates'), estimateData);
          setCurrentProjectID(`cloud-${docRef.id}`);
          alert("Stima salvata correttamente in Cloud.");
        }
        setLastSaved(new Date().toLocaleTimeString());
        await loadSavedEstimates(user.uid);
      } else {
        // Fallback Local Storage
        const localData = JSON.parse(localStorage.getItem('local_estimates') || '[]');
        if (currentProjectID && currentProjectID.startsWith('local-')) {
          const idx = localData.findIndex((d: any) => d.id === currentProjectID);
          if (idx !== -1) {
            localData[idx] = { ...localData[idx], ...estimateData };
            alert("Stima aggiornata localmente.");
          }
        } else {
          estimateData.pinned = false;
          const newId = `local-${Date.now()}`;
          localData.push({ id: newId, ...estimateData });
          setCurrentProjectID(newId);
          alert("Stima salvata localmente (Sincronizzazione Cloud disattivata).");
        }
        localStorage.setItem('local_estimates', JSON.stringify(localData));
        setLastSaved(new Date().toLocaleTimeString());
        await loadSavedEstimates();
      }
    } catch (e) {
      console.error(e);
      alert("Errore durante il salvataggio: " + (e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const loadSavedEstimates = async (uid?: string) => {
    try {
      let cloudItems: any[] = [];
      if (uid) {
        const q = query(collection(db, 'estimates'), where('userId', '==', uid));
        const snap = await getDocs(q);
        cloudItems = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      }

      const localItems = JSON.parse(localStorage.getItem('local_estimates') || '[]');
      const allItems = [...cloudItems, ...localItems];
      
      // Ordinamento: Pinned prima, poi data decrescente
      allItems.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      setSavedEstimates(allItems);
    } catch (e) { 
      console.error(e); 
      // Non blocchiamo l'utente se il cloud fallisce, mostriamo almeno i locali
      const localItems = JSON.parse(localStorage.getItem('local_estimates') || '[]');
      setSavedEstimates(localItems);
    }
  };

  const applyEstimate = (est: any) => {
    setCurrentProjectID(est.id);
    const c = est.config;
    setClientName(est.clientName);
    setRegion(c.region); setPropType(c.propType); setArea(c.area); 
    setRooms(c.rooms || 4); setHeight(c.height || 2.70); setFloor(c.floor || 0); setHasLift(c.hasLift || false);
      setExistingBaths((c.existingBaths || []).map((b: any) => ({
        ...b,
        type: b.type || 'complete',
        tubToShower: b.tubToShower ?? false,
        laundry: b.laundry ?? false
      })));
    setNewBaths(c.newBaths); setFloorPct(c.floorPct || 0); setFloorType(c.floorType || 'gres'); setScreed(c.screed);
    setWindows(c.windows); setElectric(c.electric); setElectricPoints(c.electricPoints);
    setElectricLamps(c.electricLamps); setAudioSystem(c.audioSystem);
    setPlumbing(c.plumbing || 'none');
    setThermalAction(c.thermalAction || 'none'); setThermalTerminal(c.thermalTerminal || 'radiators');
    setAcType(c.acType || 'none'); setAcUnits(c.acUnits || 0);
    setKitchen(c.kitchen); setMasonryPct(c.masonryPct || 0);
    setPaintingPct(c.paintingPct || 0); setCeilingsPct(c.ceilingsPct || 0); setInsulationPct(c.insulationPct || 0);
    setBalconies(c.balconies); setAutomation(c.automation); setAccessibility(c.accessibility);
    setPv(c.pv); setStairs(c.stairs); setCellar(c.cellar); setRoof(c.roof);
    setFinish(c.finish); setIncludeContingency(c.includeContingency || false);
  };

  const resetProject = () => {
    setClientName('');
    setRegion(REGIONS[0].id); setPropType(PROPERTY_TYPES[0].id); setArea(85);
    setRooms(4); setHeight(2.70); setFloor(0); setHasLift(false);
    setYear(CONSTRUCTION_YEARS[1].id); setStatus(PROPERTY_STATUS[0].id); setSiteSetup('std');
    setExistingBaths([]); setNewBaths([]); setFloorPct(0); setFloorType('gres'); setScreed(false);
    setWindows({ small: 0, medium: 0, large: 0 }); setElectric('none'); setElectricPoints(50);
    setElectricLamps(false); setAudioSystem('none'); setPlumbing('none');
    setThermalAction('none'); setThermalTerminal('radiators');
    setAcType('none'); setAcUnits(0);
    setKitchen(false); setMasonryPct(0); setPaintingPct(0); setCeilingsPct(0);
    setInsulationPct(0); setBalconies(false); setAutomation('none'); setAccessibility(false);
    setPv('none'); setStairs('none'); setCellar(false); setRoof('none'); setFinish(FINISH_LEVELS[2].id);
    setLastSaved(null);
    setCurrentProjectID(null);
  };

  const deleteEstimate = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa stima?")) return;
    try {
      if (id.startsWith('cloud-')) {
        await deleteDoc(doc(db, 'estimates', id.replace('cloud-', '')));
      } else {
        const localData = JSON.parse(localStorage.getItem('local_estimates') || '[]');
        const filtered = localData.filter((d: any) => d.id !== id);
        localStorage.setItem('local_estimates', JSON.stringify(filtered));
      }
      if (id === currentProjectID) resetProject();
      await loadSavedEstimates(user?.uid);
    } catch (e) {
      console.error(e);
      alert("Errore durante l'eliminazione.");
    }
  };

  const togglePin = async (id: string, currentPinned: boolean) => {
    try {
      if (id.startsWith('cloud-')) {
        await updateDoc(doc(db, 'estimates', id.replace('cloud-', '')), { pinned: !currentPinned });
      } else {
        const localData = JSON.parse(localStorage.getItem('local_estimates') || '[]');
        const idx = localData.findIndex((d: any) => d.id === id);
        if (idx !== -1) {
          localData[idx].pinned = !currentPinned;
          localStorage.setItem('local_estimates', JSON.stringify(localData));
        }
      }
      await loadSavedEstimates(user?.uid);
    } catch (e) {
      console.error(e);
    }
  };

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- ACTIONS ---

  const addExistingBath = () => {
    setExistingBaths([...existingBaths, { 
      id: Math.random().toString(36).substr(2, 9), 
      size: 5, 
      type: 'complete',
      tubToShower: false,
      laundry: false
    }]);
  }

  const addNewBath = () => {
    setNewBaths([...newBaths, { 
      id: Math.random().toString(36).substr(2, 9), 
      extras: ['wc', 'lavabo', 'doccia']
    }]);
  }

  const toggleBathExtra = (id: string, extra: string) => {
    setNewBaths(newBaths.map(b => b.id === id ? { 
      ...b, 
      extras: b.extras.includes(extra) ? b.extras.filter(e => e !== extra) : [...b.extras, extra] 
    } : b));
  }

  const removeBath = (id: string, type: 'existing' | 'new') => {
    if (type === 'existing') setExistingBaths(existingBaths.filter(b => b.id !== id));
    else setNewBaths(newBaths.filter(b => b.id !== id));
  }

  // --- UI COMPONENTS ---

  const SectionHeader = ({ title, icon: Icon, step }: { title: string, icon: any, step: number }) => (
    <div className="mb-8 group">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-10 h-10 rounded-xl bg-brand-accent flex items-center justify-center text-white shadow-lg shadow-brand-accent/20">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-brand-accent/60">Passaggio {step}</span>
          <h2 className="text-2xl text-brand-dark font-bold tracking-tight">
            {title}
          </h2>
        </div>
      </div>
    </div>
  );

  const CardSelect = ({ active, onClick, title, desc }: any) => (
    <button 
      onClick={onClick}
      className={`p-5 text-left rounded-2xl transition-all flex flex-col gap-2 cursor-pointer border-2 ${
        active 
          ? 'bg-white border-brand-accent shadow-apple' 
          : 'bg-white border-transparent hover:border-black/5'
      }`}
    >
      <div className="flex justify-between items-center">
        <span className={`text-sm font-bold ${active ? 'text-brand-dark' : 'text-brand-dark/80'}`}>{title}</span>
        {active && <CheckCircle2 className="w-4 h-4 text-brand-accent" />}
      </div>
      {desc && <p className="text-[11px] leading-snug font-medium opacity-50">{desc}</p>}
    </button>
  );

  const ToggleItem = ({ label, value, options, onChange }: any) => (
    <div className="flex justify-between items-center py-4 border-b border-black/5 text-sm">
      <span className="text-[13px] font-bold text-brand-dark/90 tracking-tight">{label}</span>
      <div className="flex gap-1 p-1 bg-black/5 rounded-xl">
        {options.map((opt: any) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              value === opt.id 
                ? 'bg-white text-brand-accent shadow-sm' 
                : 'text-brand-dark/40 hover:text-brand-dark/60'
            }`}
          >
            {opt.name}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* HEADER */}
      <header className="px-6 py-12 max-w-7xl mx-auto flex flex-col gap-1 relative">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-brand-dark tracking-tighter mb-1">
              Archimetro<span className="text-brand-accent italic font-light font-serif">.</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-brand-dark/40 font-bold">
              Engineering Cost Analysis System
            </p>
          </div>
          
          {/* DATABASE DRAWER TRIGGER */}
          <div className="flex gap-4">
            <button 
              onClick={() => {
                const drawer = document.getElementById('estimate-drawer');
                if (drawer) drawer.classList.toggle('translate-x-full');
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-full shadow-apple hover:scale-[1.02] transition-all group"
            >
              <FolderOpen className="w-4 h-4 text-brand-dark/40 group-hover:text-brand-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-dark/60">Archivio</span>
            </button>
          </div>
        </div>
        
        <div className="h-px w-full bg-black/5 my-10"></div>
        
        {authError && (
          <div className="mb-10 p-5 bg-brand-accent/5 border border-brand-accent/20 rounded-3xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className="w-10 h-10 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0">
               <XCircle className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-accent">Database in Modalità Locale</span>
              <p className="text-[11px] font-medium text-brand-dark/60 leading-tight">
                {authError} 
                <span className="block mt-1 opacity-40 font-bold italic">L'app continuerà a salvare le tue stime nella memoria locale del browser.</span>
              </p>
            </div>
          </div>
        )}

        {/* CLIENT INFO STRIP */}
        <div className="mb-12 grid grid-cols-1 md:grid-cols-12 gap-8 glass p-8 rounded-[32px] shadow-apple border border-white/50">
          <div className="md:col-span-8 flex flex-col gap-3">
            <label className="text-[9px] uppercase font-black tracking-[0.2em] text-brand-accent flex items-center gap-2">
              <User className="w-3 h-3" /> Client Identification
            </label>
            <input 
              type="text"
              placeholder="Nome del cliente o ID progetto..."
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="bg-transparent border-none p-0 text-3xl font-bold tracking-tight text-brand-dark focus:ring-0 placeholder:text-brand-dark/10 w-full"
            />
          </div>
          <div className="md:col-span-4 flex flex-col justify-center items-end gap-2">
            <button 
              onClick={resetProject}
              className="flex items-center gap-2 px-6 py-2 bg-brand-dark text-white rounded-full font-bold uppercase tracking-widest text-[9px] shadow-lg hover:bg-brand-accent transition-all"
            >
              <Plus className="w-3 h-3" /> Nuovo Progetto
            </button>
            {lastSaved && (
              <span className="text-[10px] font-bold text-brand-accent/50 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> {lastSaved}
              </span>
            )}
          </div>
        </div>

        <button 
          onClick={scrollToResults}
          className="lg:hidden w-full flex items-center justify-center gap-2 bg-brand-dark text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl mb-12"
        >
          View Estimate <ArrowRight className="w-3 h-3" />
        </button>
      </header>

      {/* ARCHIVE SIDE DRAWER */}
      <div 
        id="estimate-drawer"
        className="fixed top-0 right-0 h-full w-full sm:w-[380px] glass-dark text-white z-50 transform translate-x-full transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xl flex flex-col"
      >
        <div className="p-8 border-b border-white/10 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-2xl tracking-tight">Archivio Progetti</h3>
            <button 
              onClick={() => {
                const drawer = document.getElementById('estimate-drawer');
                if (drawer) drawer.classList.add('translate-x-full');
              }}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand-accent transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 transition-opacity" />
            <input 
              type="text" 
              placeholder="Cerca cliente o progetto..." 
              className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold focus:bg-white/10 focus:ring-1 focus:ring-brand-accent/50 transition-all outline-none"
              onChange={(e) => {
                const term = e.target.value.toLowerCase();
                const items = document.querySelectorAll('.archive-item');
                const folders = document.querySelectorAll('.archive-folder');
                
                items.forEach((item: any) => {
                  const matches = item.innerText.toLowerCase().includes(term);
                  item.style.display = matches ? 'block' : 'none';
                });
                
                folders.forEach((folder: any) => {
                  const matches = folder.querySelector('.folder-name').innerText.toLowerCase().includes(term);
                  // Also show folder if any child item matches
                  const children = folder.querySelectorAll('.archive-item');
                  let childMatches = false;
                  children.forEach((c: any) => { if(c.innerText.toLowerCase().includes(term)) childMatches = true; });
                  folder.style.display = (matches || childMatches) ? 'block' : 'none';
                });
              }}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-dark">
          {savedEstimates.length === 0 ? (
            <div className="py-20 text-center text-white/20 font-bold uppercase tracking-widest text-xs">Archivio Vuoto</div>
          ) : (
            (() => {
              const groups: Record<string, any[]> = {};
              savedEstimates.forEach(est => {
                const name = est.clientName || 'Senza Nome';
                if (!groups[name]) groups[name] = [];
                groups[name].push(est);
              });

              return Object.entries(groups).map(([client, estimates]) => (
                <div key={client} className="space-y-3 archive-folder">
                  <div className="flex items-center gap-2 px-2 py-1 opacity-40">
                    <Folder className="w-3 h-3 text-brand-accent" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] folder-name">{client}</span>
                    <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded-full">{estimates.length}</span>
                  </div>
                  <div className="space-y-3">
                    {estimates.map(est => {
                      const dateObj = new Date(est.date);
                      return (
                        <div key={est.id} className="archive-item group relative">
                          <div className={`w-full text-left p-5 border rounded-3xl transition-all relative pl-12 ${currentProjectID === est.id ? 'bg-brand-accent/10 border-brand-accent/40' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                            <button 
                              onClick={() => {
                                applyEstimate(est);
                                const drawer = document.getElementById('estimate-drawer');
                                if (drawer) drawer.classList.add('translate-x-full');
                              }}
                              className="absolute inset-0 w-full h-full text-left pl-12"
                            >
                              <div className="absolute left-4 top-5 opacity-20">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="flex justify-between items-center mb-1 pr-16">
                                <span className="text-[8px] font-bold opacity-30 uppercase tracking-[0.1em]">{dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                <div className="flex items-center gap-1.5">
                                  {est.pinned && <Pin className="w-2.5 h-2.5 text-brand-accent rotate-45" />}
                                  {currentProjectID === est.id && (
                                    <span className="flex items-center gap-1 text-[8px] text-brand-accent animate-pulse">
                                      <Check className="w-2 h-2" /> APERTO
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-[13px] font-bold tracking-tight mb-0.5 truncate pr-8">
                                {est.clientName} - {est.config?.area}mq
                              </div>
                              <div className="text-[10px] font-bold opacity-50">
                                {formatCurrency(est.total[0])} - {formatCurrency(est.total[1])}
                              </div>
                            </button>
                            
                            {/* Persistent Action Bar (WhatsApp Style) */}
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); togglePin(est.id, !!est.pinned); }}
                                 className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${est.pinned ? 'bg-brand-accent text-white' : 'bg-white/5 hover:bg-white/20 text-white/30 hover:text-white'}`}
                                 title="Pin"
                               >
                                 <Pin className={`w-3 h-3 ${est.pinned ? 'rotate-0' : 'rotate-45'}`} />
                               </button>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); deleteEstimate(est.id); }}
                                 className="w-7 h-7 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-500 text-white/30 flex items-center justify-center transition-all"
                                 title="Elimina"
                               >
                                 <Trash2 className="w-3 h-3" />
                               </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 pb-32 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
        
        {/* FORM SIDE */}
        <div className="lg:col-span-8 space-y-12">

          {/* 1. CONTESTO */}
          <section>
            <SectionHeader title="Contesto Generale" icon={Building2} step={1} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs uppercase font-bold tracking-wider text-brand-dark/50">Regione Intervento</label>
                <select 
                  value={region} 
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full"
                >
                  {REGIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              
              <div className="space-y-4">
                <ToggleItem 
                  label="Tipo Immobile" 
                  value={propType} 
                  onChange={setPropType} 
                  options={PROPERTY_TYPES} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase font-bold tracking-wider text-brand-dark/50">Superficie Totale (mq)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={area === 0 ? '' : area}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') { setArea(0); return; }
                      const parsed = parseInt(val, 10);
                      if (!isNaN(parsed) && parsed >= 0) setArea(parsed);
                    }}
                    onFocus={(e) => { if (area === 0) e.target.value = ''; }}
                    className="w-full text-lg font-bold"
                    placeholder="es. 85"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-brand-dark/30 uppercase tracking-widest">mq</div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase font-bold tracking-wider text-brand-dark/50">Epoca Edificio</label>
                <select 
                  value={year} 
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full"
                >
                  {CONSTRUCTION_YEARS.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </select>
              </div>

              {/* NEW PARAMETERS */}
              <div className="space-y-1">
                <label className="text-xs uppercase font-bold tracking-wider text-brand-dark/50">Numero locali (esclusi bagni)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="20"
                  value={rooms} 
                  onChange={(e) => setRooms(Number(e.target.value))}
                  placeholder="es. 4"
                  className="w-full text-lg font-bold"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs uppercase font-bold tracking-wider text-brand-dark/50">Altezza Locali Interni</label>
                  <span className="text-xs font-bold text-brand-accent">{height.toFixed(2)} m</span>
                </div>
                <input 
                  type="range"
                  min="2.20"
                  max="4.50"
                  step="0.10"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full h-1.5 bg-black/5 rounded-lg appearance-none cursor-pointer accent-brand-accent"
                />
              </div>

              <div className="md:col-span-2 grid grid-cols-2 gap-4 pt-4 border-t border-black/5">
                <div className="space-y-1">
                  <label className="text-xs uppercase font-bold tracking-wider text-brand-dark/50">Piano dell'immobile</label>
                  <select 
                    value={floor} 
                    onChange={(e) => setFloor(Number(e.target.value))}
                    className="w-full"
                  >
                    <option value={0}>Piano Terra</option>
                    {[1,2,3,4,5,6,7,8,9,10].map(f => <option key={f} value={f}>{f}° Piano</option>)}
                  </select>
                </div>
                {floor > 0 && (
                  <div className="flex flex-col justify-end">
                    <button
                      onClick={() => setHasLift(!hasLift)}
                      className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all text-xs font-bold uppercase tracking-wider ${hasLift ? 'bg-brand-accent border-brand-accent text-white' : 'bg-transparent border-black/5 text-brand-dark/40 hover:bg-black/5'}`}
                    >
                      {hasLift ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4 opacity-30" />}
                      Ascensore Presente
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-4 md:col-span-2 mt-2 pt-4 border-t border-black/5">
                <ToggleItem 
                  label="Logistica Cantiere" 
                  value={siteSetup} 
                  onChange={setSiteSetup} 
                  options={[
                    {id: 'min', name: 'Minima'},
                    {id: 'std', name: 'Standard'},
                    {id: 'high', name: 'Complessa'}
                  ]} 
                />
              </div>
            </div>
          </section>

          {/* 2. STATO */}
          <section>
            <SectionHeader title="Stato Attuale" icon={Layers} step={2} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PROPERTY_STATUS.map(s => (
                <CardSelect 
                  key={s.id}
                  active={status === s.id}
                  onClick={() => setStatus(s.id)}
                  title={s.name}
                  desc={s.desc}
                  icon={Building2}
                />
              ))}
            </div>
          </section>

          {/* 3. BAGNI ESISTENTI */}
          <section>
            <SectionHeader title="Bagni Esistenti (Rifacimento)" icon={Bath} step={3} />
            <div className="space-y-6">
              <AnimatePresence>
                {existingBaths.map((b, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    key={b.id}
                    className="glass rounded-3xl p-8 shadow-apple border border-white/50"
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-black tracking-widest text-brand-accent/60 mb-1">Dati Vano Estistente</span>
                        <h4 className="flex items-center gap-2 text-xl font-bold text-brand-dark tracking-tight">
                          Bagno #{idx + 1}
                        </h4>
                      </div>
                      <button onClick={() => removeBath(b.id, 'existing')} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-brand-dark/20 hover:bg-brand-accent hover:text-white transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-dark/30">Superficie (mq)</label>
                          <div className="flex items-center gap-4">
                            <input 
                              type="range" 
                              min="0" 
                              max="15" 
                              step="0.5"
                              value={b.size} 
                              onChange={(e) => setExistingBaths(existingBaths.map(x => x.id === b.id ? {...x, size: Number(e.target.value)} : x))}
                              className="grow h-1 bg-black/5 rounded-lg appearance-none cursor-pointer accent-brand-accent"
                            />
                            <span className="text-sm font-black text-brand-dark w-16 text-right">{b.size} mq</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <span className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-dark/30">Tipo Intervento</span>
                          <div className="grid grid-cols-1 gap-2">
                             {[
                               { id: 'complete', label: 'Rifacimento Completo', desc: 'Impianti + Rivestimenti + Sanitari' },
                               { id: 'finishOnly', label: 'Solo Finiture', desc: 'Rivestimenti + Sanitari (impianti esistenti)' }
                             ].map((t) => (
                               <button 
                                 key={t.id}
                                 onClick={() => setExistingBaths(existingBaths.map(x => x.id === b.id ? {...x, type: t.id as any} : x))}
                                 className={`flex flex-col p-4 rounded-xl border transition-all text-left ${b.type === t.id ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white border-black/5 hover:border-brand-accent'}`}
                               >
                                 <span className="text-xs font-bold">{t.label}</span>
                                 <span className={`text-[9px] uppercase tracking-wider opacity-60 ${b.type === t.id ? 'text-white/60' : 'text-brand-dark/40'}`}>{t.desc}</span>
                               </button>
                             ))}
                          </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-black/5">
                          <span className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-dark/30">Opzioni Extra</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                              { id: 'tubToShower', label: 'Trasformazione Vasca/Doccia' },
                              { id: 'laundry', label: 'Aggiunta Lavanderia' }
                            ].map((int) => (
                              <label key={int.id} className="flex items-center gap-3 p-3 bg-white/40 border border-black/5 rounded-xl cursor-pointer hover:border-brand-accent transition-all group">
                                <input 
                                  type="checkbox" 
                                  checked={!!(b as any)[int.id]}
                                  onChange={() => setExistingBaths(existingBaths.map(x => x.id === b.id ? {...x, [int.id]: !((x as any)[int.id])} : x))}
                                  className="w-3.5 h-3.5 rounded accent-brand-accent"
                                />
                                <span className="text-[9px] font-bold uppercase tracking-tight text-brand-dark/60 group-hover:text-brand-dark">{int.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button 
                onClick={addExistingBath}
                className="w-full p-8 border-2 border-dashed border-black/10 rounded-[32px] flex items-center justify-center gap-3 text-brand-dark/20 hover:text-brand-accent hover:border-brand-accent hover:bg-white transition-all font-black uppercase tracking-[0.3em] text-xs"
              >
                <Plus className="w-5 h-5" />
                Registra Rifacimento Bagno
              </button>
            </div>
          </section>

          {/* 4. BAGNI NUOVI */}
          <section>
            <SectionHeader title="Nuovi Bagni (Ex-Novo)" icon={Plus} step={4} />
            <div className="space-y-6">
              <AnimatePresence>
                {newBaths.map((b, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    key={b.id}
                    className="glass border-brand-accent/10 rounded-[32px] p-8"
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-black tracking-widest text-brand-accent mb-1">Nuovo Posizionamento</span>
                        <h4 className="text-xl font-bold tracking-tight text-brand-dark lowercase capitalize">
                           Unità Bagno #{idx + 1}
                        </h4>
                      </div>
                      <button onClick={() => removeBath(b.id, 'new')} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-brand-dark/20 hover:bg-brand-accent hover:text-white transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-dark/30">Dotazioni</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {['wc', 'bidet', 'lavabo', 'doccia', 'vasca', 'laundry'].map(extra => (
                          <label key={extra} className="flex items-center justify-between p-4 bg-white/40 border border-black/5 rounded-2xl cursor-pointer hover:border-brand-accent transition-all group">
                            <span className="text-[9px] font-bold uppercase tracking-tight text-brand-dark/60 group-hover:text-brand-dark">{extra}</span>
                            <input 
                              type="checkbox" 
                              checked={b.extras.includes(extra)}
                              onChange={() => toggleBathExtra(b.id, extra)}
                              className="w-4 h-4 rounded accent-brand-accent"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button 
                onClick={addNewBath}
                className="w-full p-8 border-2 border-dashed border-brand-accent/20 rounded-[32px] flex items-center justify-center gap-3 text-brand-accent/40 hover:text-brand-accent hover:border-brand-accent hover:bg-white transition-all font-black uppercase tracking-[0.3em] text-xs"
              >
                <Plus className="w-5 h-5" />
                Initialize New Unit
              </button>
            </div>
          </section>

          {/* 5. ALTRI INTERVENTI */}
          <section>
            <SectionHeader title="Interventi Principali" icon={Hammer} step={5} />
            <div className="space-y-12">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                
                {/* Pavimenti */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-brand-accent" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">Pavimenti</span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-brand-dark/40">Estensione (%)</label>
                    <input type="range" min="0" max="100" step="10" value={floorPct} onChange={(e) => setFloorPct(Number(e.target.value))} className="w-full h-1 bg-black/5 rounded-lg appearance-none cursor-pointer accent-brand-accent" />
                    <div className="flex justify-between text-[9px] font-bold opacity-30 uppercase tracking-tighter">
                      <span>0%</span> <span>{floorPct}%</span> <span>100%</span>
                    </div>
                  </div>
                  <ToggleItem label="Tipologia" value={floorType} onChange={setFloorType} options={[{id:'gres', name:'Gres'}, {id:'parquet', name:'Parquet'}, {id:'spc', name:'SPC'}]} />
                  <div className="flex items-center gap-3 mt-2 px-3 py-2 bg-white rounded border border-brand-dark/5">
                    <input type="checkbox" checked={screed} onChange={() => setScreed(!screed)} className="accent-brand-accent" />
                    <span className="text-[10px] uppercase font-bold text-brand-dark/60">Rifacimento Massetto (+18-35€/mq)</span>
                  </div>
                </div>

                {/* Infissi */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Maximize className="w-4 h-4 text-brand-accent" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">Infissi e Serramenti</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 p-3 bg-white/50 border border-black/5 rounded-xl">
                    {[
                      {id:'small', n:'Piccolo', d: 'Finestra standard'},
                      {id:'medium', n:'Medio', d: 'Portafinestra'},
                      {id:'large', n:'Grande', d: 'Scorrevoli / Grandi'}
                    ].map(sz => (
                      <div key={sz.id} className="flex justify-between items-center py-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase text-brand-dark/70">{sz.n}</span>
                          <span className="text-[9px] text-brand-dark/40 uppercase leading-none">{sz.d}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setWindows({...windows, [sz.id]: Math.max(0, windows[sz.id as keyof typeof windows] - 1)})} className="w-6 h-6 flex items-center justify-center bg-black/5 rounded">-</button>
                          <span className="w-6 text-center text-xs font-bold">{windows[sz.id as keyof typeof windows]}</span>
                          <button onClick={() => setWindows({...windows, [sz.id]: windows[sz.id as keyof typeof windows] + 1})} className="w-6 h-6 flex items-center justify-center bg-black/5 rounded">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Elettrico */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-brand-accent" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">Impianto Elettrico</span>
                  </div>
                  <ToggleItem label="Tipo" value={electric} onChange={setElectric} options={[{id:'none', name:'No'}, {id:'fix', name:'Adeguamento'}, {id:'new', name:'Nuovo'}]} />
                  {electric === 'new' && (
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase opacity-40"><span>Punti (Luce/Prese/Accensioni)</span> <span>{electricPoints} pts</span></div>
                      <input type="range" min="30" max="150" step="10" value={electricPoints} onChange={(e) => setElectricPoints(Number(e.target.value))} className="w-full h-1 accent-brand-accent" />
                      <label className="flex items-center gap-2 pt-2 cursor-pointer">
                        <input type="checkbox" checked={electricLamps} onChange={() => setElectricLamps(!electricLamps)} className="accent-brand-accent" />
                        <span className="text-[10px] font-bold uppercase opacity-60">Installazione Lampadari</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Termico */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="w-4 h-4 text-brand-accent" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">Riscaldamento</span>
                  </div>
                  <ToggleItem label="Intervento" value={thermalAction} onChange={setThermalAction} options={[{id:'none', name:'No'}, {id:'boiler', name:'Caldaia'}, {id:'total', name:'Rifacimento'}]} />
                  {thermalAction === 'total' && (
                    <ToggleItem label="Terminali" value={thermalTerminal} onChange={setThermalTerminal} options={[{id:'radiators', name:'Radiatori'}, {id:'underfloor', name:'Radiante'}]} />
                  )}
                </div>

                {/* AC */}
                <div className="space-y-4">
                   <div className="flex items-center gap-2 mb-2">
                    <Wind className="w-4 h-4 text-brand-accent" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">Climatizzazione</span>
                  </div>
                  <ToggleItem label="Tipo" value={acType} onChange={setAcType} options={[{id:'none', name:'No'}, {id:'split', name:'Split'}, {id:'ducted', name:'Canalizzato'}]} />
                  {acType === 'split' && (
                    <div className="flex justify-between items-center bg-white/50 p-3 rounded-lg border border-black/5 mt-2">
                      <label className="text-[10px] font-bold uppercase opacity-60">Unità Interne</label>
                      <input type="number" min="1" value={acUnits} onChange={(e) => setAcUnits(Number(e.target.value))} className="w-12 text-center font-bold text-xs" />
                    </div>
                  )}
                  {acType === 'ducted' && (
                    <div className="p-3 bg-brand-accent/5 rounded-lg border border-brand-accent/10 mt-2">
                      <span className="text-[9px] font-bold uppercase text-brand-accent">Calcolato su superficie immobile ({area}mq)</span>
                    </div>
                  )}
                </div>

                {/* Murarie */}
                <div className="space-y-4">
                   <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-brand-accent" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">Opere Murarie</span>
                  </div>
                  <div className="space-y-2 mt-2">
                      <div className="flex justify-between text-[9px] font-bold uppercase opacity-30"><span>Intensità Interventi</span> <span>{masonryPct}%</span></div>
                      <input type="range" min="0" max="100" step="5" value={masonryPct} onChange={(e) => setMasonryPct(Number(e.target.value))} className="w-full h-1 bg-black/5 rounded-lg appearance-none cursor-pointer accent-brand-accent" />
                  </div>
                </div>

                {/* Idraulico */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="w-4 h-4 text-brand-accent" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">Impianto Idraulico</span>
                  </div>
                  <ToggleItem 
                    label="Intervento" 
                    value={plumbing} 
                    onChange={setPlumbing} 
                    options={[{id:'none', name:'No'}, {id:'fix', name:'Adeguamento'}, {id:'new', name:'Nuovo'}]} 
                  />
                  {plumbing !== 'none' && (
                    <div className="p-3 bg-brand-accent/5 rounded-lg border border-brand-accent/10 mt-2">
                       <p className="text-[9px] text-brand-dark/40 italic">* Punti calcolati automaticamente in base a mq ({area}mq) e rifacimento bagni/cucina.</p>
                    </div>
                  )}
                </div>

                {/* Audio */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Volume2 className="w-4 h-4 text-brand-accent" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">Impianto Audio</span>
                  </div>
                  <ToggleItem 
                    label="Diffusione Sonora" 
                    value={audioSystem} 
                    onChange={setAudioSystem} 
                    options={[{id:'none', name:'No'}, {id:'base', name:'Singola'}, {id:'multi', name:'Multiroom'}]} 
                  />
                </div>
              </div>

              {/* Quick Options Box */}
              <div className="p-8 bg-brand-dark/5 rounded-[40px] border border-black/5">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-6 block text-center">Interventi Complementari</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {id:'kitchen', n:'Cucina', state: kitchen, set: setKitchen},
                    {id:'balconies', n:'Balconi', state: balconies, set: setBalconies},
                    {id:'accessibility', n:'Accessibilità', state: accessibility, set: setAccessibility},
                    {id:'cellar', n:'Cantina', state: cellar, set: setCellar},
                  ].map(o => (
                    <button key={o.id} onClick={() => o.set(!o.state)} className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${o.state ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white border-transparent text-brand-dark/40 hover:border-black/5'}`}>
                      {o.n}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10 pt-10 border-t border-black/5">
                   <div className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[9px] font-bold uppercase opacity-40">Tinteggiatura</span>
                        <span className="text-[10px] font-black text-brand-dark">{paintingPct}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={paintingPct} onChange={(e) => setPaintingPct(Number(e.target.value))} className="w-full accent-brand-accent" />
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[9px] font-bold uppercase opacity-40">Controsoffitti</span>
                        <span className="text-[10px] font-black text-brand-dark">{ceilingsPct}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={ceilingsPct} onChange={(e) => setCeilingsPct(Number(e.target.value))} className="w-full accent-brand-accent" />
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[9px] font-bold uppercase opacity-40">Isolamento</span>
                        <span className="text-[10px] font-black text-brand-dark">{insulationPct}%</span>
                      </div>
                      <ToggleItem label="Tipo Isolamento" value={insulationType} onChange={setInsulationType as any} options={[{id:'thermal', name:'Termico'}, {id:'acoustic', name:'Acustico'}]} />
                      <input type="range" min="0" max="100" value={insulationPct} onChange={(e) => setInsulationPct(Number(e.target.value))} className="w-full accent-brand-accent mt-2" />
                   </div>
                </div>
              </div>
            </div>
          </section>

          {/* 6. AVANZATE */}
          <section className="bg-white border border-brand-dark/10 rounded-2xl overflow-hidden">
            <button 
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="w-full flex items-center justify-between p-8 hover:bg-brand-cream/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <SectionHeader title="Voci Avanzate" icon={Hammer} step={6} />
              </div>
              {advancedOpen ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
            </button>
            <AnimatePresence>
              {advancedOpen && (
                <motion.div 
                  initial={{ height: 0 }} 
                  animate={{ height: 'auto' }} 
                  exit={{ height: 0 }}
                  className="px-8 pb-8 space-y-10"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <ToggleItem 
                      label="Fotovoltaico" 
                      value={pv} 
                      onChange={setPv} 
                      options={[{id:'none',name:'No'}, {id:'3kw',name:'~3kW'}, {id:'6kw',name:'~6kW'}, {id:'10kw',name:'~10kW'}]} 
                    />
                    <ToggleItem 
                      label="Scala Interna" 
                      value={stairs} 
                      onChange={setStairs} 
                      options={[{id:'none',name:'No'}, {id:'finish',name:'Solo Posa'}, {id:'structure',name:'Nuova'}]} 
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex items-center gap-3 p-4 bg-brand-cream/50 rounded-lg border border-brand-dark/5">
                      <input type="checkbox" checked={cellar} onChange={() => setCellar(!cellar)} className="accent-brand-accent w-4 h-4" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Cantina / Garage</span>
                        <span className="text-[9px] text-brand-dark/40 uppercase">Rifacimento finiture (~5% sup)</span>
                      </div>
                    </div>
                    <ToggleItem 
                      label="Rifacimento Tetto" 
                      value={roof} 
                      onChange={setRoof} 
                      options={[{id:'none',name:'No'}, {id:'seal',name:'Guaina'}, {id:'new',name:'Completo'}]} 
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* 7. FINITURE */}
          <section>
            <SectionHeader title="Livello Finiture" icon={Layers} step={7} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {FINISH_LEVELS.map(f => (
                <CardSelect 
                  key={f.id}
                  active={finish === f.id}
                  onClick={() => setFinish(f.id)}
                  title={f.name}
                  desc={f.desc}
                />
              ))}
            </div>
            {finish === 'posaOnly' && (
              <div className="mt-8 p-6 glass border-brand-accent/20 rounded-2xl flex gap-4 text-brand-dark/60 italic text-sm shadow-apple">
                <Info className="w-5 h-5 text-brand-accent shrink-0" />
                <p>Nota: La stima "Solo Posa" esclude i costi vivi di acquisto materiali (pavimenti, sanitari, corpi illuminanti). Viene calcolata solo la manodopera professionale.</p>
              </div>
            )}
          </section>

        </div>

        {/* RESULTS PANEL (STICKY ON DESKTOP) */}
        <div ref={resultsRef} className="lg:col-span-4">
          <div className="lg:sticky lg:top-8 flex flex-col h-full lg:max-h-[calc(100vh-6rem)]">
            <div className="glass-dark text-white rounded-[40px] p-10 shadow-2xl flex flex-col h-full overflow-hidden border border-white/20">
              <div className="flex justify-between items-start mb-6">
                <div className="px-3 py-1 bg-brand-accent/20 text-brand-accent text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-brand-accent/30">
                  {FINISH_LEVELS.find(f => f.id === finish)?.name}
                </div>
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-[0.1em]">Rapporto di Stima</div>
              </div>

              {(() => {
                const currentTotal = includeContingency 
                  ? [totals.baseTotal[0] * totals.contingencyMult[0], totals.baseTotal[1] * totals.contingencyMult[1]]
                  : totals.baseTotal;
                
                return (
                  <>
                    <div className="text-4xl font-bold tracking-tighter mb-1 mt-4">
                      {formatCurrency(currentTotal[0])} —
                    </div>
                    <div className="text-4xl font-bold tracking-tighter text-white/40 mb-8">
                      {formatCurrency(currentTotal[1])}
                    </div>

                    <div className="flex items-center justify-between p-4 mb-8 bg-white/10 rounded-2xl border border-white/10 cursor-pointer hover:bg-white/20 transition-all" onClick={() => setIncludeContingency(!includeContingency)}>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent">Margine Cautelativo</span>
                        <span className="text-[9px] text-white/50 uppercase font-bold">
                          Incremento per rischi di cantiere ({formatCurrency(currentTotal[0] - totals.baseTotal[0])} - {formatCurrency(currentTotal[1] - totals.baseTotal[1])})
                        </span>
                        {totals.riskFactor > 0 && (
                          <span className="text-[8px] text-brand-accent/60 uppercase font-black tracking-tighter mt-1">
                            + {totals.riskFactor.toFixed(0)}% Incremento per Complessità Tecnica
                          </span>
                        )}
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-all ${includeContingency ? 'bg-brand-accent' : 'bg-white/20'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${includeContingency ? 'left-6' : 'left-1'}`}></div>
                      </div>
                    </div>

                    <div className="h-px w-full bg-white/10 mb-8"></div>

                    <div className="detail-list flex-1 overflow-y-auto space-y-4 mb-8 pr-2 scrollbar-dark">
                      {totals.items.map((item, idx) => (
                        <div key={idx} className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                          <div className="flex justify-between items-baseline gap-4 text-[11px] text-white">
                            <span className="font-bold tracking-tight">{item.name}</span>
                            <span className="shrink-0 font-black text-brand-accent">{formatCurrency(item.range[0])}</span>
                          </div>
                          {(item.posa || item.supply) && (
                            <div className="flex gap-4 text-[9px] font-bold uppercase tracking-widest opacity-40">
                              {item.posa && <span>Opere: {formatCurrency(item.posa[0])}</span>}
                              {item.supply && <span>Fornitura: {formatCurrency(item.supply[0])}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4 mb-8">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-40">Incidenza / mq</span>
                        <span className="text-xl font-bold tracking-tight text-brand-accent">
                          ~ {formatCurrency(currentTotal[0] / area)} / mq
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}

              <p className="disclaimer text-[9px] leading-relaxed text-white/20 font-medium">
                * Stima algoritmica basata su listini DEI 2024. Il presente calcolo non costituisce preventivo contrattuale. Escluso: IVA, Arredi Mobili, Oneri Tecnici.
              </p>
            </div>

            <button 
              onClick={() => window.print()}
              className="mt-6 w-full flex items-center justify-center gap-3 p-5 glass rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] text-brand-dark hover:bg-white transition-all shadow-apple group border"
            >
              <ExternalLink className="w-4 h-4 text-brand-accent" />
              Esporta PDF di Progetto
            </button>
            
            {/* SAVE ACTION AT THE END */}
            <div className="mt-6 glass p-8 rounded-3xl border border-black/5 flex flex-col items-center gap-4 text-center">
              <div>
                <h3 className="text-sm font-bold tracking-tight mb-1">Salva Progetto</h3>
                <p className="text-[9px] text-brand-dark/40 uppercase tracking-widest font-black">
                  Registra nell'archivio cloud
                </p>
              </div>
              <div className="w-full space-y-2">
                <button 
                  onClick={saveEstimate}
                  disabled={isSaving || !clientName}
                  className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all ${
                    clientName 
                      ? 'bg-brand-dark text-white shadow-lg hover:scale-[1.02] active:scale-95' 
                      : 'bg-black/5 text-brand-dark/20 cursor-not-allowed border border-black/5'
                  }`}
                >
                  {isSaving ? <CheckCircle2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  {isSaving ? 'In corso...' : (currentProjectID ? 'Aggiorna Progetto' : 'Salva Ora')}
                </button>
                
                {currentProjectID && (
                  <button 
                    onClick={() => { setCurrentProjectID(null); saveEstimate(); }}
                    disabled={isSaving || !clientName}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black uppercase tracking-widest text-[8px] transition-all text-brand-dark/40 border border-black/5 hover:bg-black/5"
                  >
                    Salva come Nuovo (Duplica)
                  </button>
                )}
              </div>
              {!clientName && <p className="text-[8px] text-brand-accent font-bold uppercase tracking-widest">Inserisci nome cliente per salvare</p>}
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="px-6 py-32 bg-white border-t border-black/5 text-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-8">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-brand-dark flex items-center justify-center text-white">
                <Square className="w-4 h-4" />
             </div>
             <span className="text-xl font-bold tracking-tighter">Archimetro.</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-[10px] font-black uppercase tracking-[0.2em] text-brand-dark/30">
            <span>Engineering v.2.4</span>
            <span>Data Core 2024</span>
            <span>Cloud Sync Active</span>
          </div>
          <p className="max-w-xl text-[11px] leading-relaxed text-brand-dark/30 font-medium">
            Questo calcolatore professionale automatizza il processo di pre-dimensionamento economico. 
            La validità definitiva è soggetta a rilievo e computo metrico redatto da tecnico abilitato.
          </p>
        </div>
      </footer>
    </div>
  );
}
