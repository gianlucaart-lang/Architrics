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
  FolderOpen
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
  { id: 'posaOnly', name: 'Solo Posa', desc: 'Forniture escluse (pavimenti, sanitari, etc). Solo manodopera.', mult: 0.55 },
  { id: 'base', name: 'Finiture Base', desc: 'Soluzioni standard, capitolato economico.', mult: 0.76 },
  { id: 'medium', name: 'Finiture Medie', desc: 'Marchi primari, materiali di design standard.', mult: 1.0 },
  { id: 'high', name: 'Finiture Alte', desc: 'Rivestimenti pregiati, custom design, brand luxury.', mult: 1.38 },
];

// Bathrooms Data
const BATH_VOICE_PERC = {
  impianti: [0.35, 0.38],
  rivestimenti: [0.30, 0.32],
  sanitari: [0.20, 0.22],
  vascaDoccia: [0.08, 0.10],
  boxDoccia: [0.10, 0.14],
  riscPav: [0.12, 0.18],
  vmc: [0.05, 0.08],
  cartongesso: [0.06, 0.09]
};

const BATH_BASE_COSTS = {
  small: [2800, 5500],
  medium: [4000, 8500],
  large: [6500, 14000]
};

// --- TYPES ---

interface BathroomExisting {
  id: string;
  size: 'small' | 'medium' | 'large';
  features: string[];
  laundry: 'none' | 'mini' | 'locale';
}

interface NewBathroom {
  id: string;
  features: string[];
  laundry: 'none' | 'mini' | 'locale';
}

// --- UTILS ---

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

// --- COMPONENT ---

export default function App() {
  // 0. AUTH & DATABASE
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [savedEstimates, setSavedEstimates] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) loadSavedEstimates(u.uid);
    });
    return unsubscribe;
  }, []);

  // 1. CONTESTO
  const [clientName, setClientName] = useState('');
  const [precision, setPrecision] = useState<'preliminary' | 'developed' | 'executive'>('preliminary');
  const [region, setRegion] = useState(REGIONS[0].id);
  const [propType, setPropType] = useState(PROPERTY_TYPES[0].id);
  const [area, setArea] = useState<number>(85);
  const [year, setYear] = useState(CONSTRUCTION_YEARS[1].id);
  const [siteSetup, setSiteSetup] = useState<'min' | 'std' | 'high'>('std');

  // 2. STATO
  const [status, setStatus] = useState(PROPERTY_STATUS[0].id);

  // 3. BAGNI ESISTENTI
  const [existingBaths, setExistingBaths] = useState<BathroomExisting[]>([]);

  // 4. BAGNI NUOVI
  const [newBaths, setNewBaths] = useState<NewBathroom[]>([]);

  // 5. ALTRI INTERVENTI
  const [flooring, setFlooring] = useState<'none' | 'partial' | 'total'>('none');
  const [screed, setScreed] = useState(false);
  const [windows, setWindows] = useState({ small: 0, medium: 0, large: 0 });
  const [electric, setElectric] = useState<'none' | 'fix' | 'new'>('none');
  const [electricPoints, setElectricPoints] = useState<number>(50);
  const [electricLamps, setElectricLamps] = useState(false);
  const [audioSystem, setAudioSystem] = useState<'none' | 'base' | 'multi'>('none');
  const [hydraulic, setHydraulic] = useState<'none' | 'fix' | 'new'>('none');
  const [thermal, setThermal] = useState<'none' | 'boiler' | 'distrib'>('none');
  const [thermalDist, setThermalDist] = useState<'radiators' | 'underfloor' | 'fancoil' | 'air' | 'split'>('radiators');
  const [thermalNew, setThermalNew] = useState(false);
  const [kitchen, setKitchen] = useState(false);
  const [masonry, setMasonry] = useState<'none' | 'light' | 'heavy'>('none');
  const [painting, setPainting] = useState(false);
  const [ceilings, setCeilings] = useState<'none' | 'partial' | 'total'>('none');
  const [insulation, setInsulation] = useState<'none' | 'partial' | 'total'>('none');
  const [balconies, setBalconies] = useState(false);
  const [automation, setAutomation] = useState<'none' | 'base' | 'smart'>('none');
  const [accessibility, setAccessibility] = useState(false);

  // 6. AVANZATE
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [pv, setPv] = useState<'none' | '3kw' | '6kw' | '10kw'>('none');
  const [stairs, setStairs] = useState<'none' | 'finish' | 'structure'>('none');
  const [cellar, setCellar] = useState(false);
  const [roof, setRoof] = useState<'none' | 'seal' | 'new'>('none');

  // 7. FINITURE
  const [finish, setFinish] = useState(FINISH_LEVELS[2].id);

  const resultsRef = useRef<HTMLDivElement>(null);

  // --- CALCULATION LOGIC ---

  const totals = useMemo(() => {
    const geoMult = REGIONS.find(r => r.id === region)?.mult || 1;
    const typeMult = PROPERTY_TYPES.find(t => t.id === propType)?.mult || 1;
    const yearMult = CONSTRUCTION_YEARS.find(y => y.id === year)?.mult || 1;
    const statusMult = PROPERTY_STATUS.find(s => s.id === status)?.mult || 1;
    const finishMult = FINISH_LEVELS.find(f => f.id === finish)?.mult || 1;

    const baseMult = geoMult * typeMult * finishMult * statusMult * yearMult;
    const bathMult = geoMult * typeMult * statusMult * yearMult; // Bathrooms are all-in, excluding finish mult as per user request
    const advancedMult = geoMult;

    let min = 0;
    let max = 0;
    const breakdown: { name: string; range: [number, number] }[] = [];

    // Cantierizzazione
    let sMin = 0, sMax = 0;
    if (siteSetup === 'min') { sMin = 1500; sMax = 3500; }
    else if (siteSetup === 'std') { sMin = 3500; sMax = 7500; }
    else { sMin = 8000; sMax = 18000; }
    const setupR: [number, number] = [sMin * geoMult, sMax * geoMult];
    min += setupR[0];
    max += setupR[1];
    breakdown.push({ name: 'Base Cantierizzazione / Logistica', range: setupR });

    // Bagni Esistenti
    existingBaths.forEach((b, i) => {
      let bMin = 0;
      let bMax = 0;
      const baseRange = BATH_BASE_COSTS[b.size];
      
      // Calculate based on features
      b.features.forEach(f => {
        const perc = BATH_VOICE_PERC[f as keyof typeof BATH_VOICE_PERC];
        if (perc) {
          bMin += baseRange[0] * perc[0];
          bMax += baseRange[1] * perc[1];
        }
      });

      if (b.laundry === 'mini') { bMin += 800; bMax += 2200; }
      else if (b.laundry === 'locale') { bMin += 2500; bMax += 6000; }

      const finalR: [number, number] = [bMin * bathMult, bMax * bathMult];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: `Rifacimento Bagno ${i+1} (${b.size})`, range: finalR });
    });

    // Bagni Nuovi
    newBaths.forEach((b, i) => {
      let bMin = 3500; // Opere murarie base
      let bMax = 7000;

      b.features.forEach(f => {
        if (f === 'wc') { bMin += 400; bMax += 900; }
        if (f === 'lavabo') { bMin += 350; bMax += 800; }
        if (f === 'bidet') { bMin += 300; bMax += 700; }
        if (f === 'doccia') { bMin += 600; bMax += 1400; }
        if (f === 'vasca') { bMin += 800; bMax += 2000; }
        if (f === 'box') { bMin += 1200; bMax += 3500; }
        if (f === 'risc') { bMin += 900; bMax += 2400; }
        if (f === 'vmc') { bMin += 400; bMax += 900; }
      });

      if (b.laundry === 'mini') { bMin += 900; bMax += 2500; }
      else if (b.laundry === 'locale') { bMin += 3000; bMax += 7000; }

      const finalR: [number, number] = [bMin * bathMult, bMax * bathMult];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: `Nuovo Bagno ${i+1}`, range: finalR });
    });

    // Pavimenti
    if (flooring !== 'none') {
      const multArea = flooring === 'partial' ? 0.5 : 1;
      let fMin = (area * multArea) * 35;
      let fMax = (area * multArea) * 72;
      if (screed) {
        fMin += (area * multArea) * 15;
        fMax += (area * multArea) * 25;
      }
      const finalR: [number, number] = [fMin * baseMult, fMax * baseMult];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: `Pavimentazione ${flooring === 'partial' ? 'parziale' : 'totale'}`, range: finalR });
    }

    // Infissi
    const wCount = windows.small + windows.medium + windows.large;
    if (wCount > 0) {
      let wMin = (windows.small * 700) + (windows.medium * 1100) + (windows.large * 1800);
      let wMax = (windows.small * 1100) + (windows.medium * 1800) + (windows.large * 3200);
      
      const finalR: [number, number] = [wMin * baseMult, wMax * baseMult];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: `Infissi (${wCount} unità divise per size)`, range: finalR });
    }

    // Elettrico
    if (electric !== 'none') {
      // Base cost for panel, certification, etc.
      const baseRate = electric === 'fix' ? [800, 1800] : [1500, 3500];
      
      // Points cost (approx 45-65 € per point)
      let eMin = baseRate[0] + (electricPoints * 45);
      let eMax = baseRate[1] + (electricPoints * 68);
      
      // Lamp installation (only labor, approx 30-55 € per unit)
      if (electricLamps) {
        const estUnits = Math.ceil(electricPoints * 0.4); // Estimated 40% of points are lamps
        eMin += estUnits * 30;
        eMax += estUnits * 55;
      }

      const finalR: [number, number] = [eMin * baseMult, eMax * baseMult];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: `Impianto elettrico (${electricPoints} pt${electricLamps ? ' + montaggio' : ''})`, range: finalR });
    }

    // Idraulico
    if (hydraulic !== 'none') {
      const rate = hydraulic === 'fix' ? [12, 24] : [22, 48];
      const finalR: [number, number] = [area * rate[0] * baseMult, area * rate[1] * baseMult];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: `Impianto idraulico (${hydraulic === 'fix' ? 'adeguamento' : 'rifacimento'})`, range: finalR });
    }

    // Termico
    if (thermal !== 'none') {
      let tMin = 0;
      let tMax = 0;
      if (thermal === 'boiler') {
        tMin = 2500; tMax = 6000;
      } else {
        // Caldaia + Distribuzione
        tMin = 2500; tMax = 6000;
        const eMult = thermalNew ? 1.5 : 1.0; // Estimate for new vs integration
        if (thermalDist === 'radiators') { tMin += area * 18 * eMult; tMax += area * 45 * eMult; }
        else if (thermalDist === 'underfloor') { tMin += area * 35 * eMult; tMax += area * 80 * eMult; }
        else if (thermalDist === 'fancoil') { tMin += area * 25 * eMult; tMax += area * 65 * eMult; }
        else if (thermalDist === 'air') { tMin += 8000; tMax += 18000; }
        else if (thermalDist === 'split') {
          const units = Math.ceil(area / 20);
          tMin += units * 800 * eMult; tMax += units * 2500 * eMult;
        }
      }
      const finalR: [number, number] = [tMin * baseMult, tMax * baseMult];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: `Impianto termico (${thermalDist === 'radiators' ? 'radiatori' : thermalDist})`, range: finalR });
    }

    // Cucina
    if (kitchen) {
      const finalR: [number, number] = [7000 * baseMult, 22000 * baseMult];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: 'Opere cucina + forniture', range: finalR });
    }

    // Murarie
    if (masonry !== 'none') {
      let mMin = 0, mMax = 0;
      if (masonry === 'light') { mMin = 2500; mMax = 7000; }
      else { mMin = area * 15; mMax = area * 42; }
      const finalR: [number, number] = [mMin * baseMult, mMax * baseMult];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: `Opere murarie (${masonry === 'light' ? 'leggere' : 'importanti'})`, range: finalR });
    }

    // Tinteggiatura
    if (painting) {
      const finalR: [number, number] = [area * 9 * baseMult, area * 20 * baseMult];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: 'Tinteggiatura e intonaci', range: finalR });
    }

    // Controsoffitti
    if (ceilings !== 'none') {
      const mult = ceilings === 'partial' ? 0.4 : 1;
      const finalR: [number, number] = [area * mult * 22 * baseMult, area * mult * 55 * baseMult];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: `Controsoffitti (${ceilings === 'partial' ? 'parziali' : 'totali'})`, range: finalR });
    }

    // Isolamento
    if (insulation !== 'none') {
      const mult = insulation === 'partial' ? 0.4 : 1;
      const finalR: [number, number] = [area * mult * 25 * baseMult, area * mult * 60 * baseMult];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: `Isolamento termoacustico (${insulation === 'partial' ? 'parziale' : 'totale'})`, range: finalR });
    }

    // Balconi
    if (balconies) {
      const bArea = area * 0.1;
      const finalR: [number, number] = [bArea * 80 * baseMult, bArea * 200 * baseMult];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: 'Balconi e terrazze (stima 10% sup.)', range: finalR });
    }

    // Domotica
    if (automation !== 'none') {
      const finalR: [number, number] = [
        (automation === 'base' ? 1800 : 6000) * baseMult,
        (automation === 'base' ? 5000 : 20000) * baseMult
      ];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: `Domotica / Allarme (${automation})`, range: finalR });
    }

    // Barriere
    if (accessibility) {
      const finalR: [number, number] = [2500 * baseMult, 8000 * baseMult];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: 'Abbattimento barriere architettoniche', range: finalR });
    }

    // Audio
    if (audioSystem !== 'none') {
      const rate = audioSystem === 'base' ? [1200, 2800] : [3500, 8500];
      const finalR: [number, number] = [rate[0] * baseMult, rate[1] * baseMult];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: `Predisposizione Audio (${audioSystem === 'base' ? 'Soggiorno' : 'Multi-room'})`, range: finalR });
    }

    // AVANZATE
    if (pv !== 'none') {
      let rate = [0, 0];
      if (pv === '3kw') rate = [6000, 10000];
      else if (pv === '6kw') rate = [10000, 17000];
      else rate = [16000, 28000];
      const finalR: [number, number] = [rate[0] * advancedMult, rate[1] * advancedMult];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: `Fotovoltaico (${pv})`, range: finalR });
    }

    if (stairs !== 'none') {
      let rate = stairs === 'finish' ? [3000, 8000] : [12000, 35000];
      const finalR: [number, number] = [rate[0] * advancedMult, rate[1] * advancedMult];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: `Scala interna (${stairs === 'finish' ? 'restauro' : 'nuova'})`, range: finalR });
    }

    if (cellar) {
      const finalR: [number, number] = [area * 0.05 * 40 * advancedMult, area * 0.05 * 100 * advancedMult];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: 'Cantina / Garage (stima 5% sup.)', range: finalR });
    }

    if (roof !== 'none') {
      const rArea = area * 0.1;
      let rate = roof === 'seal' ? [60, 130] : [180, 380];
      const finalR: [number, number] = [rArea * rate[0] * advancedMult, rArea * rate[1] * advancedMult];
      min += finalR[0];
      max += finalR[1];
      breakdown.push({ name: `Copertura / Tetto (${roof === 'seal' ? 'manutenzione' : 'rifacimento'})`, range: finalR });
    }

    // Contingency based on precision
    // preliminary: 8-15%, developed: 5-10%, executive: 2-5%
    let pMin = 1.08, pMax = 1.15;
    if (precision === 'developed') { pMin = 1.05; pMax = 1.10; }
    else if (precision === 'executive') { pMin = 1.02; pMax = 1.05; }

    const finalMin = min * pMin;
    const finalMax = max * pMax;

    return { total: [finalMin, finalMax], items: breakdown };
  }, [
    region, propType, area, year, status, existingBaths, newBaths, 
    flooring, screed, windows, electric, electricPoints, electricLamps, audioSystem, hydraulic, thermal, thermalDist, 
    thermalNew, kitchen, masonry, painting, ceilings, insulation, 
    balconies, automation, accessibility, pv, stairs, cellar, roof, finish,
    siteSetup, precision
  ]);

  const saveEstimate = async () => {
    if (!user || !clientName) {
      if (!clientName) alert("Inserisci il nome del cliente prima di salvare.");
      return;
    }
    setIsSaving(true);
    try {
      const config = {
        region, propType, area, year, status, siteSetup,
        existingBaths, newBaths, flooring, screed, windows,
        electric, electricPoints, electricLamps, audioSystem,
        hydraulic, thermal, thermalDist, thermalNew, kitchen,
        masonry, painting, ceilings, insulation, balconies,
        automation, accessibility, pv, stairs, cellar, roof,
        finish, precision
      };

      await addDoc(collection(db, 'estimates'), {
        clientName,
        date: new Date().toISOString(),
        total: totals.total,
        items: totals.items,
        config,
        precision,
        userId: user.uid
      });
      setLastSaved(new Date().toLocaleTimeString());
      await loadSavedEstimates(user.uid);
      alert("Stima salvata correttamente nell'archivio.");
    } catch (e) {
      console.error(e);
      alert("Errore durante il salvataggio: " + (e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const loadSavedEstimates = async (uid: string) => {
    try {
      const q = query(collection(db, 'estimates'), where('userId', '==', uid));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      // Ordinamento manuale per evitare necessità di indici compositi Firestore
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSavedEstimates(items);
    } catch (e) { 
      console.error(e); 
      alert("Errore caricamento archivio: " + (e as Error).message);
    }
  };

  const applyEstimate = (est: any) => {
    const c = est.config;
    setClientName(est.clientName);
    setPrecision(est.precision || 'preliminary');
    setRegion(c.region); setPropType(c.propType); setArea(c.area); setYear(c.year);
    setSiteSetup(c.siteSetup); setStatus(c.status); setExistingBaths(c.existingBaths);
    setNewBaths(c.newBaths); setFlooring(c.flooring); setScreed(c.screed);
    setWindows(c.windows); setElectric(c.electric); setElectricPoints(c.electricPoints);
    setElectricLamps(c.electricLamps); setAudioSystem(c.audioSystem);
    setHydraulic(c.hydraulic); setThermal(c.thermal); setThermalDist(c.thermalDist);
    setThermalNew(c.thermalNew); setKitchen(c.kitchen); setMasonry(c.masonry);
    setPainting(c.painting); setCeilings(c.ceilings); setInsulation(c.insulation);
    setBalconies(c.balconies); setAutomation(c.automation); setAccessibility(c.accessibility);
    setPv(c.pv); setStairs(c.stairs); setCellar(c.cellar); setRoof(c.roof);
    setFinish(c.finish);
  };

  const resetProject = () => {
    setClientName('');
    setPrecision('preliminary');
    setRegion(REGIONS[0].id); setPropType(PROPERTY_TYPES[0].id); setArea(85);
    setYear(CONSTRUCTION_YEARS[1].id); setSiteSetup('std'); setStatus(PROPERTY_STATUS[0].id);
    setExistingBaths([]); setNewBaths([]); setFlooring('none'); setScreed(false);
    setWindows({ small: 0, medium: 0, large: 0 }); setElectric('none'); setElectricPoints(50);
    setElectricLamps(false); setAudioSystem('none'); setHydraulic('none');
    setThermal('none'); setThermalDist('radiators'); setThermalNew(false);
    setKitchen(false); setMasonry('none'); setPainting(false); setCeilings('none');
    setInsulation('none'); setBalconies(false); setAutomation('none'); setAccessibility(false);
    setPv('none'); setStairs('none'); setCellar(false); setRoof('none'); setFinish(FINISH_LEVELS[2].id);
    setLastSaved(null);
  };

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- ACTIONS ---

  const addExistingBath = () => {
    setExistingBaths([...existingBaths, { 
      id: Math.random().toString(36).substr(2, 9), 
      size: 'medium', 
      features: ['impianti', 'rivestimenti', 'sanitari'],
      laundry: 'none'
    }]);
  }

  const addNewBath = () => {
    setNewBaths([...newBaths, { 
      id: Math.random().toString(36).substr(2, 9), 
      features: ['wc', 'lavabo', 'doccia'],
      laundry: 'none'
    }]);
  }

  const toggleBathFeature = (id: string, feature: string, type: 'existing' | 'new') => {
    if (type === 'existing') {
      setExistingBaths(existingBaths.map(b => 
        b.id === id ? { ...b, features: b.features.includes(feature) ? b.features.filter(f => f !== feature) : [...b.features, feature] } : b
      ));
    } else {
      setNewBaths(newBaths.map(b => 
        b.id === id ? { ...b, features: b.features.includes(feature) ? b.features.filter(f => f !== feature) : [...b.features, feature] } : b
      ));
    }
  }

  const updateBathLaundry = (id: string, laundry: 'none' | 'mini' | 'locale', type: 'existing' | 'new') => {
    if (type === 'existing') {
      setExistingBaths(existingBaths.map(b => b.id === id ? { ...b, laundry } : b));
    } else {
      setNewBaths(newBaths.map(b => b.id === id ? { ...b, laundry } : b));
    }
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
        <div className="p-8 border-b border-white/10 flex justify-between items-center">
          <h3 className="font-bold text-2xl tracking-tight">Project Archive</h3>
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
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-dark">
          {savedEstimates.length === 0 ? (
            <div className="py-20 text-center text-white/20 font-bold uppercase tracking-widest text-xs">Storage is Empty</div>
          ) : (
            savedEstimates.map(est => {
              const dateObj = new Date(est.date);
              return (
                <button 
                  key={est.id}
                  onClick={() => {
                    applyEstimate(est);
                    const drawer = document.getElementById('estimate-drawer');
                    if (drawer) drawer.classList.add('translate-x-full');
                  }}
                  className="w-full text-left p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl transition-all group"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="px-2 py-0.5 bg-brand-accent text-[8px] font-black uppercase tracking-widest rounded">{est.precision || 'Prelim'}</span>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-bold opacity-30 uppercase tracking-[0.1em]">{dateObj.toLocaleDateString()}</span>
                      <span className="text-[8px] font-medium opacity-20 uppercase tracking-[0.1em]">{dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                  <div className="text-xl font-bold tracking-tight mb-3 group-hover:text-brand-accent transition-colors">{est.clientName}</div>
                  <div className="text-sm font-bold opacity-60">
                    {formatCurrency(est.total[0])} - {formatCurrency(est.total[1])}
                  </div>
                </button>
              );
            })
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
                <ToggleItem 
                  label="Grado Precisione" 
                  value={precision} 
                  onChange={setPrecision} 
                  options={[
                    {id:'preliminary', name:'Prelim.'}, 
                    {id:'developed', name:'Svilupp.'}, 
                    {id:'executive', name:'Esecut.'}
                  ]} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase font-bold tracking-wider text-brand-dark/50">Superficie Totale (mq)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={area} 
                    onChange={(e) => setArea(Number(e.target.value))}
                    className="w-full text-lg font-bold"
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
                <p className="text-[10px] text-brand-dark/40 italic">
                  * Trattamento spazzature, protezioni, logistica piani, permessi occupazione suolo.
                </p>
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
            <SectionHeader title="Bagni Esistenti" icon={Bath} step={3} />
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
                        <span className="text-[10px] uppercase font-black tracking-widest text-brand-accent/60 mb-1">Configurazione</span>
                        <h4 className="flex items-center gap-2 text-xl font-bold text-brand-dark tracking-tight">
                          Bagno Esistente #{idx + 1}
                        </h4>
                      </div>
                      <button onClick={() => removeBath(b.id, 'existing')} className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-brand-dark/20 hover:bg-brand-accent hover:text-white transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <ToggleItem 
                          label="Dimensioni" 
                          value={b.size} 
                          onChange={(val: any) => setExistingBaths(existingBaths.map(x => x.id === b.id ? {...x, size: val} : x))}
                          options={[{id: 'small', name: '<4 mq'}, {id: 'medium', name: '4-8 mq'}, {id: 'large', name: '>8 mq'}]}
                        />
                        <div className="space-y-3">
                          <span className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-dark/30">Voci di Capitolato</span>
                          <div className="grid grid-cols-1 gap-2">
                            {Object.keys(BATH_VOICE_PERC).map(feat => (
                              <label key={feat} className="flex items-center justify-between p-4 bg-white/40 border border-black/5 rounded-2xl cursor-pointer hover:border-brand-accent transition-all group">
                                <span className="text-[11px] font-bold uppercase tracking-tight text-brand-dark/60 group-hover:text-brand-dark">
                                  {feat === 'impianti' && 'Impianti Tecnologici'}
                                  {feat === 'rivestimenti' && 'Superfici & Finiture'}
                                  {feat === 'sanitari' && 'Sanitari & Rubinetteria'}
                                  {feat === 'vascaDoccia' && 'Ricollocazione Vasca/Doccia'}
                                  {feat === 'boxDoccia' && 'Chiusure Cristallo'}
                                  {feat === 'riscPav' && 'Clima Radiante'}
                                  {feat === 'vmc' && 'Ventilazione Forzata'}
                                  {feat === 'cartongesso' && 'Lighting Design'}
                                </span>
                                <input 
                                  type="checkbox" 
                                  checked={b.features.includes(feat)}
                                  onChange={() => toggleBathFeature(b.id, feat, 'existing')}
                                  className="w-5 h-5 rounded-md accent-brand-accent"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-dark/30">Integrazione Lavanderia</span>
                        <div className="flex flex-col gap-2">
                          {['none', 'mini', 'locale'].map(l => (
                            <button 
                              key={l}
                              onClick={() => updateBathLaundry(b.id, l as any, 'existing')}
                              className={`p-4 rounded-2xl text-left transition-all text-[11px] font-bold uppercase tracking-widest border-2 ${b.laundry === l ? 'border-brand-accent bg-white shadow-sm text-brand-dark' : 'border-transparent bg-black/5 text-brand-dark/30 hover:bg-black/10'}`}
                            >
                              {l === 'none' && 'Escludi'}
                              {l === 'mini' && 'Integrata (+800-2.2k€)'}
                              {l === 'locale' && 'Locale Dedicato (+2.5k-6k€)'}
                            </button>
                          ))}
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
                Registra Nuovo vano
              </button>
            </div>
          </section>

          {/* 4. BAGNI NUOVI */}
          <section>
            <SectionHeader title="Sviluppo Nuovi Vani" icon={Plus} step={4} />
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-3">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-dark/30">Dotazioni di Progetto</span>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            {id: 'wc', n: 'Suspended WC', c: '400-900'},
                            {id: 'lavabo', n: 'Design Basin', c: '350-800'},
                            {id: 'bidet', n: 'Suspended Bidet', c: '300-700'},
                            {id: 'doccia', n: 'Fixed Shower', c: '600-1400'},
                            {id: 'vasca', n: 'Free-standing Tub', c: '800-2000'},
                            {id: 'box', n: 'Crystal Glass Encl.', c: '1200-3500'},
                            {id: 'risc', n: 'Clima Solutions', c: '900-2400'},
                            {id: 'vmc', n: 'Smart Air VMC', c: '400-900'},
                          ].map(f => (
                            <label key={f.id} className="flex items-center justify-between p-4 bg-white/50 border border-black/5 rounded-2xl cursor-pointer hover:border-brand-accent transition-all group">
                              <div className="flex items-center gap-3">
                                <input 
                                  type="checkbox" 
                                  checked={b.features.includes(f.id)}
                                  onChange={() => toggleBathFeature(b.id, f.id, 'new')}
                                  className="w-5 h-5 rounded-md accent-brand-accent"
                                />
                                <span className="text-[11px] font-bold uppercase tracking-tight text-brand-dark/60 group-hover:text-brand-dark">{f.n}</span>
                              </div>
                              <span className="text-[9px] font-black text-brand-dark/20">+{f.c}€</span>
                            </label>
                          ))}
                        </div>
                        <p className="mt-4 text-[9px] text-brand-dark/30 font-bold uppercase tracking-widest text-center">* Technical foundations included in estimate</p>
                      </div>
                      
                      <div className="space-y-4">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-dark/30">Laundry Integration</span>
                        <div className="flex flex-col gap-2">
                          {['none', 'mini', 'locale'].map(l => (
                            <button 
                              key={l}
                              onClick={() => updateBathLaundry(b.id, l as any, 'new')}
                              className={`p-5 rounded-2xl text-left transition-all border-2 ${b.laundry === l ? 'border-brand-accent bg-white shadow-apple text-brand-dark' : 'border-transparent bg-black/5 text-brand-dark/20 hover:bg-black/10'}`}
                            >
                              <div className="flex flex-col">
                                <span className="text-[11px] font-black uppercase tracking-widest">
                                  {l === 'none' && 'Excluded'}
                                  {l === 'mini' && 'Internal (+900-2.5k)'}
                                  {l === 'locale' && 'Dedicated Suite (+3k-7k)'}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
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
                  <ToggleItem 
                    label="Estensione" 
                    value={flooring} 
                    onChange={setFlooring} 
                    options={[{id:'none', name:'No'}, {id:'partial', name:'50%'}, {id:'total', name:'100%'}]} 
                  />
                  {flooring !== 'none' && (
                    <div className="flex items-center gap-3 mt-2 px-3 py-2 bg-white rounded border border-brand-dark/5">
                      <input type="checkbox" checked={screed} onChange={() => setScreed(!screed)} className="accent-brand-accent" />
                      <span className="text-[10px] uppercase font-bold text-brand-dark/60">Rifacimento Massetto (+15-25€/mq)</span>
                    </div>
                  )}
                </div>

                {/* Infissi */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Maximize className="w-4 h-4 text-brand-accent" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">Infissi e Serramenti</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 p-3 bg-white/50 border border-black/5 rounded-xl">
                    {[
                      {id:'small', n:'Piccolo', d: 'Finestra/Finestrina'},
                      {id:'medium', n:'Medio', d: 'Portafinestra standard'},
                      {id:'large', n:'Grande', d: 'Scorrevoli / Grandi vetrate'}
                    ].map(sz => (
                      <div key={sz.id} className="flex justify-between items-center py-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase text-brand-dark/70">{sz.n}</span>
                          <span className="text-[9px] text-brand-dark/40 uppercase leading-none">{sz.d}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setWindows({...windows, [sz.id]: Math.max(0, windows[sz.id as keyof typeof windows] - 1)})}
                            className="w-6 h-6 flex items-center justify-center bg-black/5 rounded hover:bg-black/10 transition-colors"
                          >-</button>
                          <input 
                            type="number"
                            value={windows[sz.id as keyof typeof windows]}
                            onChange={(e) => setWindows({...windows, [sz.id]: Math.max(0, Number(e.target.value))})}
                            className="w-10 text-center bg-transparent border-none font-bold text-xs p-0 focus:ring-0"
                          />
                          <button 
                            onClick={() => setWindows({...windows, [sz.id]: windows[sz.id as keyof typeof windows] + 1})}
                            className="w-6 h-6 flex items-center justify-center bg-black/5 rounded hover:bg-black/10 transition-colors"
                          >+</button>
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
                  <ToggleItem 
                    label="Tipo Intervento" 
                    value={electric} 
                    onChange={setElectric} 
                    options={[{id:'none', name:'No'}, {id:'fix', name:'Adeguamento'}, {id:'new', name:'Rifacimento'}]} 
                  />
                  {electric !== 'none' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="space-y-4 pt-4 border-t border-black/5"
                    >
                      <div className="flex justify-between items-center bg-white/50 p-3 rounded-lg border border-black/5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-brand-dark/60">Punti Luce Totali</label>
                        <div className="relative w-16">
                          <input 
                            type="number" 
                            value={electricPoints} 
                            onChange={(e) => setElectricPoints(Number(e.target.value))}
                            className="w-full text-center font-bold text-sm bg-transparent border-b border-black/10 focus:border-brand-accent transition-colors py-1 outline-none appearance-none"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-3 p-3 bg-white/50 border border-black/5 rounded cursor-pointer hover:border-brand-accent/20 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={electricLamps}
                          onChange={() => setElectricLamps(!electricLamps)}
                          className="w-3.5 h-3.5 accent-brand-accent"
                        />
                        <span className="text-[10px] font-bold uppercase text-brand-dark/70">Montaggio Corpi Illuminanti (solo manodopera)</span>
                      </label>
                    </motion.div>
                  )}
                </div>

                {/* Idraulico */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="w-4 h-4 text-brand-accent" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">Impianto Idraulico</span>
                  </div>
                  <ToggleItem 
                    label="Tipo Intervento" 
                    value={hydraulic} 
                    onChange={setHydraulic} 
                    options={[{id:'none', name:'No'}, {id:'fix', name:'Adeguamento'}, {id:'new', name:'Rifacimento'}]} 
                  />
                </div>

                {/* Audio */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind className="w-4 h-4 text-brand-accent" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">Impianto Audio</span>
                  </div>
                  <ToggleItem 
                    label="Predisposizione" 
                    value={audioSystem} 
                    onChange={setAudioSystem} 
                    options={[{id:'none', name:'No'}, {id:'base', name:'Singola'}, {id:'multi', name:'Multiroom'}]} 
                  />
                  <p className="text-[9px] text-brand-dark/40 uppercase italic">Solo passaggio cavi e scatole (no diffusori)</p>
                </div>
              </div>

              {/* Termico - Focus */}
              <div className="p-8 bg-white border border-black/5 rounded-2xl shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <Thermometer className="w-5 h-5 text-brand-accent opacity-60" />
                  <h3 className="text-lg font-serif lowercase grow border-b border-black/5 pb-1 capitalize">Impianto Termico</h3>
                </div>
                
                <ToggleItem 
                  label="Configurazione" 
                  value={thermal} 
                  onChange={setThermal} 
                  options={[
                    {id:'none', name:'Nessuno'}, 
                    {id:'boiler', name:'Solo Caldaia'}, 
                    {id:'distrib', name:'Completo'}
                  ]} 
                />

                {thermal === 'distrib' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="space-y-6 pt-6 border-t border-brand-dark/5"
                  >
                    <div className="space-y-4">
                      <span className="text-[10px] uppercase font-bold text-brand-dark/40">Tipologia Terminali</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {[
                          {id:'radiators', n:'Radiatori'},
                          {id:'underfloor', n:'Radiante'},
                          {id:'fancoil', n:'Fancoil'},
                          {id:'air', n:'Pompa Calore'},
                          {id:'split', n:'Split AC'},
                        ].map(t => (
                          <button 
                            key={t.id}
                            onClick={() => setThermalDist(t.id as any)}
                            className={`p-3 text-[10px] font-bold uppercase border rounded transition-all ${thermalDist === t.id ? 'bg-brand-dark text-white' : 'bg-white hover:border-brand-accent/50'}`}
                          >
                            {t.n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 bg-brand-cream/50 rounded border border-dashed border-brand-dark/20">
                      <input type="checkbox" checked={thermalNew} onChange={() => setThermalNew(!thermalNew)} className="accent-brand-accent" />
                      <span className="text-xs font-medium text-brand-dark/70">Interamente Nuovo (Senza tubazioni esistenti)</span>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Opzioni Quick Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { id: 'kitchen', n: 'Cucina (Opere + Forn.)', icon: Utensils, state: kitchen, set: setKitchen },
                  { id: 'painting', n: 'Tinteggiatura / Intonaci', icon: Paintbrush, state: painting, set: setPainting },
                  { id: 'balconies', n: 'Balconi / Terrazze', icon: Square, state: balconies, set: setBalconies },
                  { id: 'accessibility', n: 'Abbattimento Barriere', icon: Info, state: accessibility, set: setAccessibility },
                ].map(item => (
                  <button 
                    key={item.id}
                    onClick={() => item.set(!item.state)}
                    className={`flex items-center gap-3 p-4 border rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all ${
                      item.state ? 'bg-brand-accent text-white border-brand-accent' : 'bg-white border-brand-dark/10 text-brand-dark/60 hover:border-brand-accent/40'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${item.state ? 'text-white' : 'text-brand-accent'}`} />
                    {item.n}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ToggleItem label="Opere Murarie" value={masonry} onChange={setMasonry} options={[{id:'none', n:'No'}, {id:'light', n:'Leggere'}, {id:'heavy', n:'Importanti'}].map(o => ({id:o.id, name:o.n}))} />
                <ToggleItem label="Controsoffitti" value={ceilings} onChange={setCeilings} options={[{id:'none', n:'No'}, {id:'partial', n:'40%'}, {id:'total', n:'100%'}].map(o => ({id:o.id, name:o.n}))} />
                <ToggleItem label="Isolamento" value={insulation} onChange={setInsulation} options={[{id:'none', n:'No'}, {id:'partial', n:'40%'}, {id:'total', n:'100%'}].map(o => ({id:o.id, name:o.n}))} />
              </div>

              <ToggleItem 
                label="Domotica / Sicurezza" 
                value={automation} 
                onChange={setAutomation} 
                options={[{id:'none', name:'No'}, {id:'base', name:'Base'}, {id:'smart', name:'Smart Home'}]} 
              />
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

          {/* SAVE ACTION AT THE END */}
          <section className="pt-12">
            <div className="glass p-10 rounded-[40px] border border-white shadow-2xl flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-brand-accent/10 flex items-center justify-center text-brand-accent mb-2">
                <Save className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight mb-2">Concludi e Salva Progetto</h3>
                <p className="text-sm text-brand-dark/40 max-w-sm mx-auto font-medium">
                  Salva questa configurazione nell'archivio. Ogni salvataggio creerà una nuova versione datata per permetterti di vedere l'evoluzione della stima.
                </p>
              </div>
              <button 
                onClick={saveEstimate}
                disabled={isSaving || !clientName}
                className={`flex items-center gap-3 px-12 py-5 rounded-[24px] font-bold uppercase tracking-widest text-xs transition-all ${
                  clientName 
                    ? 'bg-brand-accent text-white shadow-xl shadow-brand-accent/30 hover:scale-[1.05] active:scale-95' 
                    : 'bg-black/5 text-brand-dark/20 cursor-not-allowed border border-black/5'
                }`}
              >
                {isSaving ? <CheckCircle2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Registrazione in corso...' : 'Salva nell\'Archivio'}
              </button>
              {!clientName && <p className="text-[10px] text-brand-accent font-bold uppercase tracking-widest">* Inserisci il nome del cliente all'inizio per salvare</p>}
            </div>
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
              
              <div className="text-4xl font-bold tracking-tighter mb-1 mt-4">
                {formatCurrency(totals.total[0])} —
              </div>
              <div className="text-4xl font-bold tracking-tighter text-white/40 mb-8">
                {formatCurrency(totals.total[1])}
              </div>

              <div className="h-px w-full bg-white/10 mb-8"></div>

              <div className="detail-list flex-1 overflow-y-auto space-y-4 mb-8 pr-2 scrollbar-dark">
                {totals.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-baseline gap-4 text-[11px] text-white/70">
                    <span className="font-medium tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>
                    <div className="h-[1px] grow bg-white/5 mx-2"></div>
                    <span className="shrink-0 font-bold text-white/40">{formatCurrency(item.range[0])}</span>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4 mb-8">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.15em] text-white/40">
                  <span>Imprevisti ({precision === 'preliminary' ? '15%' : precision === 'developed' ? '10%' : '5%'})</span>
                  <span className="text-brand-accent flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Calcolati</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-40">Incidenza / mq</span>
                  <span className="text-xl font-bold tracking-tight text-brand-accent">
                    ~ {formatCurrency(totals.total[0] / area)} / mq
                  </span>
                </div>
              </div>

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
