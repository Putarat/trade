
import { useEffect, useMemo, useRef, useState } from "react";

// Responsive window width hook
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return width;
}
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area, BarChart, Bar, Treemap } from "recharts";

const PIE_COLORS = ["#2667ff", "#38b000", "#ff7b00", "#f72585", "#00b4d8", "#7b2cbf"];
const USD_TO_THB_RATE_DEFAULT = 36;
const PAYMENT_PLANS = [
  { id: "pay-per-scan", title: "สแกน 1 ครั้ง", priceTHB: 20, credits: 1, note: "เหมาะกับใช้งานเป็นครั้ง ๆ" },
  { id: "starter-pack", title: "แพ็กเริ่มต้น", priceTHB: 149, credits: 10, note: "เฉลี่ยถูกลงต่อครั้ง" },
  { id: "pro-monthly", title: "รายเดือน", priceTHB: 299, credits: 30, note: "สำหรับคนสแกนบ่อย" }
];
const MEGA_TREND_SYMBOL_MAP = {
  // AI & Machine Learning
  NVDA:"AI & Machine Learning", MSFT:"AI & Machine Learning",
  GOOGL:"AI & Machine Learning", GOOG:"AI & Machine Learning",
  META:"AI & Machine Learning", PLTR:"AI & Machine Learning",
  // EV & Clean Energy
  TSLA:"EV & พลังงานสะอาด", NIO:"EV & พลังงานสะอาด",
  RIVN:"EV & พลังงานสะอาด", LCID:"EV & พลังงานสะอาด",
  ENPH:"EV & พลังงานสะอาด", PLUG:"EV & พลังงานสะอาด",
  // Cybersecurity
  PANW:"Cybersecurity", CRWD:"Cybersecurity", OKTA:"Cybersecurity",
  ZS:"Cybersecurity", FTNT:"Cybersecurity",
  // Healthcare & Biotech
  JNJ:"สุขภาพ & ไบโอเทค", PFE:"สุขภาพ & ไบโอเทค",
  MRNA:"สุขภาพ & ไบโอเทค", LLY:"สุขภาพ & ไบโอเทค",
  ABBV:"สุขภาพ & ไบโอเทค", NVO:"สุขภาพ & ไบโอเทค",
  AMGN:"สุขภาพ & ไบโอเทค", GILD:"สุขภาพ & ไบโอเทค",
  // FinTech
  PYPL:"FinTech & การชำระเงิน", SQ:"FinTech & การชำระเงิน",
  V:"FinTech & การชำระเงิน", MA:"FinTech & การชำระเงิน",
  NU:"FinTech & การชำระเงิน", SOFI:"FinTech & การชำระเงิน",
  // Cloud & SaaS
  AMZN:"Cloud & SaaS", SNOW:"Cloud & SaaS",
  DDOG:"Cloud & SaaS", CRM:"Cloud & SaaS", NOW:"Cloud & SaaS",
  // Defense & Space
  LMT:"อวกาศ & กลาโหม", RTX:"อวกาศ & กลาโหม",
  NOC:"อวกาศ & กลาโหม", GD:"อวกาศ & กลาโหม", BA:"อวกาศ & กลาโหม",
  // Consumer Tech
  AAPL:"Consumer Tech", SONY:"Consumer Tech",
  // Energy
  XOM:"พลังงาน & น้ำมัน", CVX:"พลังงาน & น้ำมัน", COP:"พลังงาน & น้ำมัน",
  // Thai stocks
  PTT:"พลังงาน & น้ำมัน", PTTEP:"พลังงาน & น้ำมัน", PTTGC:"พลังงาน & น้ำมัน",
  KBANK:"ธนาคาร & การเงิน", BBL:"ธนาคาร & การเงิน", SCB:"ธนาคาร & การเงิน",
  KTB:"ธนาคาร & การเงิน", BAY:"ธนาคาร & การเงิน", KKP:"ธนาคาร & การเงิน",
  TISCO:"ธนาคาร & การเงิน", TMB:"ธนาคาร & การเงิน",
  CPALL:"ค้าปลีก & ผู้บริโภค", CPAXT:"ค้าปลีก & ผู้บริโภค",
  BJC:"ค้าปลีก & ผู้บริโภค", HMPRO:"ค้าปลีก & ผู้บริโภค",
  CPNREIT:"อสังหาริมทรัพย์", CPN:"อสังหาริมทรัพย์",
  AWC:"อสังหาริมทรัพย์", LH:"อสังหาริมทรัพย์", SPALI:"อสังหาริมทรัพย์",
  AOT:"การขนส่ง & โลจิสติกส์", BTS:"การขนส่ง & โลจิสติกส์",
  ADVANC:"เทคโนโลยี & ดิจิทัล", INTUCH:"เทคโนโลยี & ดิจิทัล",
  TRUE:"เทคโนโลยี & ดิจิทัล", DTAC:"เทคโนโลยี & ดิจิทัล",
  GULF:"พลังงานสะอาด & Utility", GPSC:"พลังงานสะอาด & Utility",
  BGRIM:"พลังงานสะอาด & Utility", EA:"พลังงานสะอาด & Utility",
};

const SECTOR_TO_TREND = {
  "Technology":             "เทคโนโลยี & ดิจิทัล",
  "Communication Services": "เทคโนโลยี & ดิจิทัล",
  "Healthcare":             "สุขภาพ & ไบโอเทค",
  "Financial Services":     "ธนาคาร & การเงิน",
  "Consumer Cyclical":      "ค้าปลีก & ผู้บริโภค",
  "Consumer Defensive":     "ค้าปลีก & ผู้บริโภค",
  "Energy":                 "พลังงาน & น้ำมัน",
  "Basic Materials":        "แร่ & วัตถุดิบ",
  "Materials":              "แร่ & วัตถุดิบ",
  "Industrials":            "อุตสาหกรรม & การผลิต",
  "Utilities":              "พลังงานสะอาด & Utility",
  "Real Estate":            "อสังหาริมทรัพย์",
};

const TREND_META = {
  "AI & Machine Learning":    { icon: "🤖", color: "#6366f1" },
  "EV & พลังงานสะอาด":       { icon: "⚡", color: "#10b981" },
  "Cybersecurity":            { icon: "🔒", color: "#f59e0b" },
  "สุขภาพ & ไบโอเทค":        { icon: "🏥", color: "#ec4899" },
  "FinTech & การชำระเงิน":   { icon: "💳", color: "#14b8a6" },
  "Cloud & SaaS":             { icon: "☁️", color: "#3b82f6" },
  "อวกาศ & กลาโหม":          { icon: "🚀", color: "#64748b" },
  "Consumer Tech":            { icon: "📱", color: "#8b5cf6" },
  "พลังงาน & น้ำมัน":         { icon: "🛢", color: "#f97316" },
  "ธนาคาร & การเงิน":         { icon: "🏦", color: "#0891b2" },
  "ค้าปลีก & ผู้บริโภค":      { icon: "🛒", color: "#d97706" },
  "อสังหาริมทรัพย์":          { icon: "🏢", color: "#059669" },
  "การขนส่ง & โลจิสติกส์":   { icon: "✈️", color: "#7c3aed" },
  "เทคโนโลยี & ดิจิทัล":     { icon: "💻", color: "#2563eb" },
  "แร่ & วัตถุดิบ":           { icon: "⛏️", color: "#92400e" },
  "อุตสาหกรรม & การผลิต":    { icon: "🏭", color: "#475569" },
  "พลังงานสะอาด & Utility":  { icon: "🌱", color: "#16a34a" },
  "หุ้นทั่วไป":               { icon: "📊", color: "#6b7280" },
};

const MEGA_TRENDS_LIST = [
  {
    trend: "AI & Machine Learning",
    icon: "🤖", color: "#6366f1",
    desc: "ปัญญาประดิษฐ์และ Generative AI กำลังปฏิวัติทุกอุตสาหกรรม ตั้งแต่ automation ไปจนถึง drug discovery",
  },
  {
    trend: "EV & พลังงานสะอาด",
    icon: "⚡", color: "#10b981",
    desc: "การเปลี่ยนผ่านจากเชื้อเพลิงฟอสซิลสู่ยานยนต์ไฟฟ้าและพลังงานหมุนเวียน ขับเคลื่อนด้วยนโยบายสิ่งแวดล้อมโลก",
  },
  {
    trend: "Cybersecurity",
    icon: "🔒", color: "#f59e0b",
    desc: "ภัยคุกคามไซเบอร์เพิ่มขึ้นทุกปี บริษัทและรัฐบาลต้องลงทุนในความปลอดภัยดิจิทัลอย่างต่อเนื่อง",
  },
  {
    trend: "Cloud & SaaS",
    icon: "☁️", color: "#3b82f6",
    desc: "คลาวด์คอมพิวติ้งและซอฟต์แวร์แบบ Subscription กลายเป็นโครงสร้างพื้นฐานของทุกธุรกิจยุคใหม่",
  },
  {
    trend: "สุขภาพ & ไบโอเทค",
    icon: "🏥", color: "#ec4899",
    desc: "เทคโนโลยีการแพทย์ การวิจัยยา และ Longevity Science ที่ช่วยยืดอายุขัยและคุณภาพชีวิต",
  },
  {
    trend: "FinTech & การชำระเงิน",
    icon: "💳", color: "#14b8a6",
    desc: "การเงินดิจิทัล Neo-Banking และระบบชำระเงินไร้รอยต่อที่กำลังแทนที่ธนาคารดั้งเดิม",
  },
  {
    trend: "อวกาศ & กลาโหม",
    icon: "🚀", color: "#64748b",
    desc: "เศรษฐกิจอวกาศ ดาวเทียม Starlink และอุตสาหกรรมกลาโหมที่เติบโตในยุคความตึงเครียดภูมิรัฐศาสตร์",
  },
  {
    trend: "Consumer Tech",
    icon: "📱", color: "#8b5cf6",
    desc: "อุปกรณ์ผู้บริโภค Wearable AR/VR และ Smart Devices ที่เชื่อมต่อชีวิตประจำวัน",
  },
  {
    trend: "พลังงาน & น้ำมัน",
    icon: "🛢", color: "#f97316",
    desc: "พลังงานดั้งเดิมยังคงสำคัญในช่วงเปลี่ยนผ่าน ราคาน้ำมันผันผวนตาม geopolitics และอุปสงค์โลก",
  },
  {
    trend: "ธนาคาร & การเงิน",
    icon: "🏦", color: "#0891b2",
    desc: "สถาบันการเงินที่ปรับตัวสู่ดิจิทัล ได้ประโยชน์จากดอกเบี้ยสูงและการขยายตัวของสินเชื่อ",
  },
  {
    trend: "เทคโนโลยี & ดิจิทัล",
    icon: "💻", color: "#2563eb",
    desc: "โทรคมนาคม อินเทอร์เน็ต และแพลตฟอร์มดิจิทัลที่เป็นกระดูกสันหลังของเศรษฐกิจยุคใหม่",
  },
  {
    trend: "อสังหาริมทรัพย์",
    icon: "🏢", color: "#059669",
    desc: "อสังหาริมทรัพย์ REIT และ Data Center ที่เติบโตตามความต้องการพื้นที่ AI infrastructure",
  },
];

const INVESTOR_MODELS = [
  {
    id: "buffett",
    label: "Warren Buffett (Value)",
    archetype: "หุ้น Value",
    targetRange: [4, 9],
    maxTopShare: 0.45,
    strategyHint: "เน้นธุรกิจคุณภาพ ถือไม่กระจายเกินไป และคุมสัดส่วนตัวใหญ่ไม่ให้เสี่ยงเกิน"
  },
  {
    id: "lynch",
    label: "Peter Lynch (Growth Blend)",
    archetype: "หุ้นเติบโต",
    targetRange: [8, 16],
    maxTopShare: 0.3,
    strategyHint: "ชอบพอร์ตที่มีหลายตัวพอสมควร เพื่อเก็บโอกาสเติบโตหลายธีม"
  },
  {
    id: "bogle",
    label: "John Bogle (Diversified)",
    archetype: "พอร์ตกระจายความเสี่ยง",
    targetRange: [12, 30],
    maxTopShare: 0.18,
    strategyHint: "ยิ่งกระจายมากและไม่กระจุกตัว คะแนนยิ่งดี"
  }
];

function getStockLogoSources(symbol) {
  const clean = (symbol || "").replace(/\.BK$/i, "").toUpperCase();
  return [
    // 1. FMP — best coverage for US stocks (no API key needed for images)
    `https://financialmodelingprep.com/image-stock/${encodeURIComponent(clean)}.png`,
    // 2. Parqet — good for international stocks (free CDN)
    `https://assets.parqet.com/logos/symbol/${encodeURIComponent(clean)}?format=jpg`,
    // 3. EODHD — free logo CDN, good for US/EU stocks
    `https://eodhd.com/img/logos/US/${encodeURIComponent(clean)}.png`,
  ];
}

function StockLogo({ symbol, className = "stock-logo" }) {
  const [srcIndex, setSrcIndex] = useState(0);

  useEffect(() => {
    setSrcIndex(0);
  }, [symbol]);

  const clean = (symbol || "").replace(/\.BK$/i, "").toUpperCase();
  const sources = getStockLogoSources(symbol);

  if (!symbol || srcIndex >= sources.length) {
    return <span className={`${className} stock-logo-fallback`}>{clean.slice(0, 2) || "?"}</span>;
  }

  return (
    <img
      src={sources[srcIndex]}
      alt={`${symbol} logo`}
      className={className}
      loading="lazy"
      onError={() => setSrcIndex((prev) => prev + 1)}
    />
  );
}

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0]?.payload;
  if (!item) {
    return null;
  }

  return (
    <div className="pie-tooltip-card">
      <div className="pie-tooltip-header">
        <StockLogo symbol={item.name} className="stock-logo stock-logo-sm" />
        <strong>{item.name}</strong>
      </div>
      {item.isEstimated ? (
        <p className="pie-tooltip-value">
          มูลค่า: THB {item.value.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </p>
      ) : (
        <p className="pie-tooltip-value">{item.value} record{item.value > 1 ? "s" : ""}</p>
      )}
    </div>
  );
}

function PieSliceLabel({ cx, cy, midAngle, outerRadius, percent, name, fill }) {
  const [srcIndex, setSrcIndex] = useState(0);
  useEffect(() => { setSrcIndex(0); }, [name]);
  const imgError = srcIndex >= getStockLogoSources(name).length;

  if (!percent || percent < 0.02) {
    return null;
  }

  const RADIAN = Math.PI / 180;
  const ICON_SIZE = 24;
  const GAP = 8;
  const iconR = (outerRadius || 100) + GAP + ICON_SIZE / 2;
  const iconCx = (cx || 0) + iconR * Math.cos(-midAngle * RADIAN);
  const iconCy = (cy || 0) + iconR * Math.sin(-midAngle * RADIAN);
  const clipId = `pie-clip-${name}`;

  const textR = iconR + ICON_SIZE / 2 + 6;
  const textX = (cx || 0) + textR * Math.cos(-midAngle * RADIAN);
  const textY = (cy || 0) + textR * Math.sin(-midAngle * RADIAN);
  const anchor = textX > (cx || 0) ? "start" : "end";

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <circle cx={iconCx} cy={iconCy} r={ICON_SIZE / 2} />
        </clipPath>
      </defs>
      {/* connector line from pie edge to icon */}
      <line
        x1={(cx || 0) + (outerRadius || 140) * Math.cos(-midAngle * RADIAN)}
        y1={(cy || 0) + (outerRadius || 140) * Math.sin(-midAngle * RADIAN)}
        x2={iconCx}
        y2={iconCy}
        stroke="currentColor"
        strokeWidth={1}
        opacity={0.35}
      />
      <circle cx={iconCx} cy={iconCy} r={ICON_SIZE / 2 + 1.5} fill={fill || "#888"} opacity={0.25} />
      {imgError ? (
        <>
          <circle cx={iconCx} cy={iconCy} r={ICON_SIZE / 2} fill={fill || "#888"} opacity={0.85} />
          <text x={iconCx} y={iconCy} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700} fill="white">
            {(name || "?").slice(0, 2)}
          </text>
        </>
      ) : (
        <image
          href={getStockLogoSources(name)[srcIndex]}
          x={iconCx - ICON_SIZE / 2}
          y={iconCy - ICON_SIZE / 2}
          width={ICON_SIZE}
          height={ICON_SIZE}
          clipPath={`url(#${clipId})`}
          onError={() => setSrcIndex((prev) => prev + 1)}
        />
      )}
      <text
        x={textX}
        y={textY}
        fill="currentColor"
        textAnchor={anchor}
        dominantBaseline="central"
        fontSize={12}
        fontWeight={700}
      >
        {name}
      </text>
    </g>
  );
}

const STATUS_LABELS = { open: "Open", in_progress: "In Progress", resolved: "Resolved" };
const STATUS_NEXT = { open: "in_progress", in_progress: "resolved", resolved: "open" };

function IssueCard({ issue, onUpdate }) {
  const [note, setNote] = useState(issue.admin_note || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onUpdate(issue.id, issue.status, note);
    setSaving(false);
  }

  async function cycleStatus() {
    const next = STATUS_NEXT[issue.status] || "open";
    await onUpdate(issue.id, next, note);
  }

  return (
    <div className={`issue-card issue-card--${issue.status}`}>
      <div className="issue-card-top">
        <div className="issue-card-meta">
          {issue.user_display_name && (
            <span className="issue-user">{issue.user_display_name}</span>
          )}
          <span className={`issue-badge issue-badge--${issue.status}`}>
            {STATUS_LABELS[issue.status] || issue.status}
          </span>
        </div>
        <span className="issue-date">{new Date(issue.created_at).toLocaleDateString("th-TH")}</span>
      </div>
      <p className="issue-subject">{issue.subject}</p>
      <p className="issue-description">{issue.description}</p>
      <div className="issue-admin-row">
        <input
          className="issue-note-input"
          placeholder="Admin note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button type="button" className="btn-inline-action" onClick={handleSave} disabled={saving}>
          {saving ? "..." : "Save Note"}
        </button>
        <button type="button" className="btn-inline-action btn-status-cycle" onClick={cycleStatus}>
          → {STATUS_LABELS[STATUS_NEXT[issue.status]] || "Open"}
        </button>
      </div>
      {issue.admin_note && (
        <p className="issue-admin-note">Note: {issue.admin_note}</p>
      )}
    </div>
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildScanResult(summary, pieData, investorId) {
  const model = INVESTOR_MODELS.find((item) => item.id === investorId) || INVESTOR_MODELS[0];
  const basis = pieData.map((item) => ({
    name: item.name,
    value: Number(item.value) || 0
  }));

  const totalRecords = basis.reduce((acc, item) => acc + item.value, 0);
  const stockCount = basis.length;
  const topStock = basis.reduce((best, item) => {
    if (!best || item.value > best.value) {
      return item;
    }
    return best;
  }, null);

  const [minPick, maxPick] = model.targetRange;
  const topShare = topStock && totalRecords > 0 ? topStock.value / totalRecords : 0;
  const center = (minPick + maxPick) / 2;
  const spread = Math.max(1, (maxPick - minPick) / 2);
  const diversificationScore = clamp(10 - (Math.abs(stockCount - center) / spread) * 5, 0, 10);
  const concentrationScore = clamp(10 - (Math.max(0, topShare - model.maxTopShare) / 0.35) * 10, 0, 10);
  const qualityBonus = clamp(summary.filter((item) => item.name.length <= 5).length * 0.35, 0, 2);
  const estimatedCoverage = pieData.length
    ? pieData.filter((item) => item.isEstimated).length / pieData.length
    : 0;
  const confidenceScore = clamp(4 + estimatedCoverage * 6, 0, 10);

  const rawScore = diversificationScore * 0.45 + concentrationScore * 0.35 + confidenceScore * 0.2 + qualityBonus;
  const score = Number(clamp(rawScore + (Math.random() - 0.5) * 0.6, 1, 10).toFixed(1));
  const type = model.archetype;

  return {
    selectedModel: model.label,
    formulaBreakdown: [
      `Diversification ${diversificationScore.toFixed(1)}/10`,
      `Concentration ${concentrationScore.toFixed(1)}/10`,
      `Data confidence ${confidenceScore.toFixed(1)}/10`
    ],
    score,
    type,
    totalRecords,
    analyzedStocks: basis.map((item) => `${item.name} (${item.value.toLocaleString("en-US", { maximumFractionDigits: 2 })})`),
    note: topStock
      ? `${model.strategyHint} | ตัวที่ถือมากสุดคือ ${topStock.name} สัดส่วน ${(topShare * 100).toFixed(1)}%`
      : "ยังไม่มีข้อมูลหุ้นในพอร์ต"
  };
}

// ── LOGIN PAGE ───────────────────────────────────────────────────────────────

const LP_STOCKS = [
  {s:'PTT',    n:'PTT Pcl',               px:34.50,  prev:34.00,  o:34.00,  h:34.75, l:33.75, vol:28450000},
  {s:'ADVANC', n:'Adv Info Service',      px:218.00, prev:219.50, o:220.00, h:221.50,l:217.00,vol:3240000},
  {s:'CPALL',  n:'CP All Pcl',            px:60.75,  prev:59.50,  o:59.50,  h:61.25, l:59.25, vol:12800000},
  {s:'SCB',    n:'SCB X Pcl',             px:108.50, prev:107.00, o:107.00, h:109.00,l:106.50,vol:5600000},
  {s:'KBANK',  n:'Kasikorn Bank',         px:149.00, prev:150.50, o:151.00, h:151.50,l:148.50,vol:4200000},
  {s:'AOT',    n:'Airports of Thailand',  px:68.25,  prev:67.75,  o:67.75,  h:68.50, l:67.50, vol:9800000},
  {s:'SCC',    n:'Siam Cement',           px:205.00, prev:207.00, o:208.00, h:208.50,l:204.00,vol:1800000},
  {s:'GULF',   n:'Gulf Energy Dev',       px:49.50,  prev:48.75,  o:48.75,  h:49.75, l:48.50, vol:15000000},
  {s:'PTTEP',  n:'PTT Exploration',       px:137.50, prev:136.00, o:136.00, h:138.00,l:135.50,vol:7200000},
  {s:'BBL',    n:'Bangkok Bank',          px:160.00, prev:158.50, o:158.50, h:160.50,l:158.00,vol:2900000},
  {s:'KTB',    n:'Krungthai Bank',        px:21.50,  prev:21.30,  o:21.30,  h:21.60, l:21.20, vol:32000000},
  {s:'BDMS',   n:'Bangkok Dusit Med',     px:28.75,  prev:28.50,  o:28.50,  h:28.90, l:28.40, vol:18200000},
  {s:'CPN',    n:'Central Pattana',       px:60.50,  prev:59.75,  o:59.75,  h:60.75, l:59.50, vol:6400000},
  {s:'MINT',   n:'Minor International',   px:34.75,  prev:34.25,  o:34.25,  h:35.00, l:34.00, vol:11200000},
  {s:'AAPL',   n:'Apple Inc',             px:189.50, prev:188.00, o:188.00, h:190.00,l:187.50,vol:54000000},
  {s:'MSFT',   n:'Microsoft Corp',        px:420.30, prev:418.90, o:418.90, h:421.50,l:418.00,vol:21000000},
  {s:'NVDA',   n:'NVIDIA Corp',           px:875.40, prev:862.00, o:862.00, h:878.00,l:860.00,vol:38000000},
  {s:'TSLA',   n:'Tesla Inc',             px:245.80, prev:248.20, o:248.20, h:250.00,l:244.50,vol:95000000},
  {s:'GOOGL',  n:'Alphabet Inc',          px:168.70, prev:167.00, o:167.00, h:169.50,l:166.50,vol:28000000},
  {s:'AMZN',   n:'Amazon.com',            px:198.40, prev:196.80, o:196.80, h:199.50,l:196.00,vol:33000000},
];

// ── CONSTELLATION BACKGROUND (used after login) ───────────────────────────────
const CONSTELLATION_SYMBOLS = ['PTT','ADVANC','CPALL','KBANK','AOT','AAPL','MSFT','NVDA','TSLA','GOOGL','GULF','BBL'];

function ConstellationBg() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const LINK = 160;
    let W = 0, H = 0, nodes = [], raf = null;
    function rand(a, b) { return a + Math.random() * (b - a); }
    function resetNodes() {
      const n = Math.round(Math.min(48, W * H / 32000));
      nodes = [];
      for (let i = 0; i < n; i++) {
        nodes.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: rand(-0.2, 0.2), vy: rand(-0.2, 0.2),
          r: rand(1, 2),
          label: Math.random() < 0.25
            ? CONSTELLATION_SYMBOLS[Math.floor(Math.random() * CONSTELLATION_SYMBOLS.length)]
            : null,
        });
      }
    }
    function frame() {
      ctx.clearRect(0, 0, W, H);
      for (const p of nodes) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(100,80,200,${(1 - d / LINK) * 0.14})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (const p of nodes) {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28);
        ctx.fillStyle = p.label ? 'rgba(120,90,210,0.45)' : 'rgba(110,100,170,0.3)';
        ctx.fill();
        if (p.label) {
          ctx.font = '8px JetBrains Mono, monospace';
          ctx.fillStyle = 'rgba(120,100,200,0.22)';
          ctx.fillText(p.label, p.x + 5, p.y + 3);
        }
      }
      raf = requestAnimationFrame(frame);
    }
    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      resetNodes();
    }
    window.addEventListener('resize', resize);
    resize();
    frame();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{position:'fixed',inset:0,zIndex:0,display:'block',pointerEvents:'none'}} />;
}

function LoginPage({ authMode, authEmail, authPassword, authDisplayName, authError, isAuthenticating,
  setAuthMode, setAuthEmail, setAuthPassword, setAuthDisplayName, setAuthError, onSubmit, onGoogleLogin }) {

  const boardRef    = useRef(null);
  const tickerRef   = useRef(null);
  const clockRef    = useRef(null);
  const setItemRef  = useRef(null);
  const nyseItemRef = useRef(null);
  const vnItemRef   = useRef(null);
  const cnItemRef   = useRef(null);
  const hkItemRef   = useRef(null);
  const setDotRef   = useRef(null);
  const nyseDotRef  = useRef(null);
  const vnDotRef    = useRef(null);
  const cnDotRef    = useRef(null);
  const hkDotRef    = useRef(null);
  const setStatRef  = useRef(null);
  const nyseStatRef = useRef(null);
  const vnStatRef   = useRef(null);
  const cnStatRef   = useRef(null);
  const hkStatRef   = useRef(null);
  const setTimeRef  = useRef(null);
  const nyseTimeRef = useRef(null);
  const vnTimeRef   = useRef(null);
  const cnTimeRef   = useRef(null);
  const hkTimeRef   = useRef(null);
  const stocksRef   = useRef(LP_STOCKS.map(s => ({ ...s })));

  useEffect(() => {
    const stocks = stocksRef.current;
    function f2(n) { return n.toFixed(2); }
    function fVol(v) {
      if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
      if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
      if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
      return String(v);
    }
    function cc(chg) { return chg > 0 ? 'lp-up' : chg < 0 ? 'lp-down' : 'lp-flat'; }
    function cp(chg) { return chg > 0 ? '+' : ''; }
    function rowHTML(st) {
      const chg = st.px - st.prev, pct = (chg / st.prev) * 100;
      const c = cc(chg), p = cp(chg);
      return `<div class="lp-s-row" data-lpsym="${st.s}">
        <span class="lp-col-sym">${st.s}</span><span class="lp-col-nm">${st.n}</span>
        <span class="lp-col-px">${f2(st.px)}</span>
        <span class="lp-col-chg ${c}">${p}${f2(chg)}</span>
        <span class="lp-col-pct ${c}">${p}${f2(pct)}%</span>
        <span class="lp-col-aux">${f2(st.o)}</span><span class="lp-col-aux">${f2(st.h)}</span>
        <span class="lp-col-aux">${f2(st.l)}</span><span class="lp-col-vol">${fVol(st.vol)}</span>
      </div>`;
    }
    function renderBoard() {
      if (boardRef.current) boardRef.current.innerHTML = [...stocks, ...stocks].map(rowHTML).join('');
    }
    function renderTicker() {
      if (tickerRef.current) {
        tickerRef.current.innerHTML = [...stocks, ...stocks].map(st => {
          const chg = st.px - st.prev, pct = (chg / st.prev) * 100;
          const c = cc(chg), p = cp(chg);
          return `<div class="lp-t-chip" data-lp-tsym="${st.s}">
            <span class="lp-t-sym">${st.s}</span>
            <span class="lp-t-px">${f2(st.px)}</span>
            <span class="lp-t-ch ${c}">${p}${f2(pct)}%</span>
          </div>`;
        }).join('');
      }
    }
    function getZoneParts(tz) {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false
      }).formatToParts(now);
      const get = type => parts.find(p => p.type === type)?.value || '';
      return { h: parseInt(get('hour')) % 24, m: parseInt(get('minute')), day: get('weekday') };
    }
    function fmtZoneTime(tz) {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }).format(new Date()).replace(/^24/, '00');
    }
    function isWeekday(tz) {
      const { day } = getZoneParts(tz);
      return day !== 'Sat' && day !== 'Sun';
    }
    function minsNow(tz) {
      const { h, m } = getZoneParts(tz);
      return h * 60 + m;
    }
    function isSetOpen()  { const t = minsNow('Asia/Bangkok');    return isWeekday('Asia/Bangkok')    && ((t >= 600 && t < 750) || (t >= 840 && t < 990)); }
    function isNyseOpen() { const t = minsNow('America/New_York'); return isWeekday('America/New_York') && (t >= 570 && t < 960); }
    function isVnOpen()   { const t = minsNow('Asia/Bangkok');    return isWeekday('Asia/Bangkok')    && ((t >= 540 && t < 690) || (t >= 780 && t < 900)); }
    function isCnOpen()   { const t = minsNow('Asia/Shanghai');   return isWeekday('Asia/Shanghai')   && ((t >= 570 && t < 690) || (t >= 780 && t < 900)); }
    function isHkOpen()   { const t = minsNow('Asia/Hong_Kong');  return isWeekday('Asia/Hong_Kong')  && ((t >= 570 && t < 720) || (t >= 780 && t < 960)); }

    function applyMkt(itemRef, dotRef, statRef, timeRef, open, tz) {
      if (itemRef.current)  itemRef.current.className  = 'lp-mkt-item ' + (open ? 'lp-is-open' : 'lp-is-closed');
      if (dotRef.current)   dotRef.current.className   = 'lp-mkt-dot '  + (open ? 'lp-dot-open' : 'lp-dot-closed');
      if (statRef.current)  { statRef.current.textContent = open ? 'OPEN' : 'CLOSED'; statRef.current.className = 'lp-mkt-stat ' + (open ? 'lp-is-open' : 'lp-is-closed'); }
      if (timeRef.current)  timeRef.current.textContent = fmtZoneTime(tz);
    }
    function updateMarketStatus() {
      applyMkt(setItemRef,  setDotRef,  setStatRef,  setTimeRef,  isSetOpen(),  'Asia/Bangkok');
      applyMkt(nyseItemRef, nyseDotRef, nyseStatRef, nyseTimeRef, isNyseOpen(), 'America/New_York');
      applyMkt(vnItemRef,   vnDotRef,   vnStatRef,   vnTimeRef,   isVnOpen(),   'Asia/Bangkok');
      applyMkt(cnItemRef,   cnDotRef,   cnStatRef,   cnTimeRef,   isCnOpen(),   'Asia/Shanghai');
      applyMkt(hkItemRef,   hkDotRef,   hkStatRef,   hkTimeRef,   isHkOpen(),   'Asia/Hong_Kong');
    }
    function updateClock() {
      if (clockRef.current) clockRef.current.textContent = new Date().toTimeString().slice(0, 8);
      updateMarketStatus();
    }
    function simulateUpdate() {
      const count = Math.floor(Math.random() * 3) + 1;
      const idxs = new Set();
      while (idxs.size < count) idxs.add(Math.floor(Math.random() * stocks.length));
      idxs.forEach(i => {
        const st = stocks[i];
        const delta = (Math.random() * 0.5 - 0.25) / 100;
        const oldPx = st.px;
        st.px = Math.round(st.px * (1 + delta) * 100) / 100;
        if (st.px > st.h) st.h = st.px;
        if (st.px < st.l) st.l = st.px;
        if (Math.random() > 0.6) st.vol += Math.floor(Math.random() * 80000);
        document.querySelectorAll(`[data-lpsym="${st.s}"]`).forEach(row => {
          const chg = st.px - st.prev, pct = (chg / st.prev) * 100;
          const c = cc(chg), p = cp(chg);
          const cells = row.querySelectorAll('span');
          if (cells.length < 9) return;
          cells[2].textContent = f2(st.px);
          cells[3].textContent = p + f2(chg); cells[3].className = 'lp-col-chg ' + c;
          cells[4].textContent = p + f2(pct) + '%'; cells[4].className = 'lp-col-pct ' + c;
          cells[6].textContent = f2(st.h); cells[7].textContent = f2(st.l);
          cells[8].textContent = fVol(st.vol);
          const flash = st.px > oldPx ? 'lp-flash-up' : 'lp-flash-down';
          row.classList.add(flash); setTimeout(() => row.classList.remove(flash), 700);
        });
        document.querySelectorAll(`[data-lp-tsym="${st.s}"]`).forEach(chip => {
          const chg = st.px - st.prev, pct = (chg / st.prev) * 100;
          const c = cc(chg), p = cp(chg);
          const sp = chip.querySelectorAll('span');
          if (sp[1]) sp[1].textContent = f2(st.px);
          if (sp[2]) { sp[2].textContent = p + f2(pct) + '%'; sp[2].className = 'lp-t-ch ' + c; }
        });
      });
    }
    renderBoard(); renderTicker(); updateClock();
    const clockTimer = setInterval(updateClock, 1000);
    const simTimer   = setInterval(simulateUpdate, 2200);
    return () => { clearInterval(clockTimer); clearInterval(simTimer); };
  }, []);

  return (
    <div className="lp-root">
      {/* TOP BAR */}
      <div className="lp-top-bar">
        <div className="lp-live-dot" />
        <div className="lp-tb-item"><span className="lp-tb-label">SET</span><span className="lp-tb-val">1,412.45</span><span className="lp-tb-up">▲ +0.82%</span></div>
        <div className="lp-tb-item"><span className="lp-tb-label">S&amp;P 500</span><span className="lp-tb-val">5,431.60</span><span className="lp-tb-up">▲ +0.34%</span></div>
        <div className="lp-tb-item"><span className="lp-tb-label">NASDAQ</span><span className="lp-tb-val">17,442</span><span className="lp-tb-up">▲ +0.21%</span></div>
        <div className="lp-tb-item"><span className="lp-tb-label">DOW</span><span className="lp-tb-val">39,118</span><span className="lp-tb-dn">▼ −0.09%</span></div>
        <div className="lp-tb-item"><span className="lp-tb-label">USD/THB</span><span className="lp-tb-val">35.42</span><span className="lp-tb-flat">—</span></div>
        <div className="lp-tb-spacer" />
        <div className="lp-tb-time" ref={clockRef}>--:--:--</div>
      </div>
      {/* STOCK BOARD */}
      <div className="lp-stock-board">
        <div className="lp-board-head">
          <span style={{textAlign:'left'}}>SYMBOL</span><span style={{textAlign:'left'}}>NAME</span>
          <span>LAST</span><span>CHG</span><span>% CHG</span>
          <span>OPEN</span><span>HIGH</span><span>LOW</span><span>VOLUME</span>
        </div>
        <div className="lp-board-rows" ref={boardRef} />
      </div>
      {/* VIGNETTE */}
      <div className="lp-vignette" />
      {/* TICKER TAPE */}
      <div className="lp-ticker-tape">
        <div className="lp-ticker-inner" ref={tickerRef} />
      </div>
      {/* LOGIN CARD */}
      <div className="lp-page">
        <div className="lp-card">
          <div className="lp-logo-wrap">
            <div className="lp-logo-icon">
              <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                <polyline points="2,16 7,10 12,13 20,4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="20" cy="4" r="2" fill="white"/>
              </svg>
            </div>
            <div className="lp-logo-name"><span className="lp-gr">Stock</span>Port</div>
          </div>

          <div className="lp-headline">
            {authMode === 'login' ? 'ยินดีต้อนรับกลับมา' : 'สร้างบัญชีใหม่'}
          </div>
          <div className="lp-subline">
            {authMode === 'login'
              ? 'เข้าสู่ระบบเพื่อดูพอร์ตหุ้นและติดตามการลงทุนของคุณ'
              : 'สมัครสมาชิกเพื่อเริ่มต้นติดตามพอร์ตหุ้น'}
          </div>

          <div className="lp-mkt-row">
            <div className="lp-mkt-item lp-is-closed" ref={setItemRef}>
              <div className="lp-mkt-item-top">
                <span className="lp-mkt-flag">🇹🇭</span>
                <div className="lp-mkt-dot lp-dot-closed" ref={setDotRef} />
                <span className="lp-mkt-exch">SET</span>
                <span className="lp-mkt-stat lp-is-closed" ref={setStatRef}>CLOSED</span>
              </div>
              <div className="lp-mkt-time-row">
                <span className="lp-mkt-time-val" ref={setTimeRef}>--:--:--</span>
                <span className="lp-mkt-tz">ICT</span>
              </div>
            </div>
            <div className="lp-mkt-item lp-is-closed" ref={nyseItemRef}>
              <div className="lp-mkt-item-top">
                <span className="lp-mkt-flag">🇺🇸</span>
                <div className="lp-mkt-dot lp-dot-closed" ref={nyseDotRef} />
                <span className="lp-mkt-exch">NYSE</span>
                <span className="lp-mkt-stat lp-is-closed" ref={nyseStatRef}>CLOSED</span>
              </div>
              <div className="lp-mkt-time-row">
                <span className="lp-mkt-time-val" ref={nyseTimeRef}>--:--:--</span>
                <span className="lp-mkt-tz">ET</span>
              </div>
            </div>
            <div className="lp-mkt-item lp-is-closed" ref={vnItemRef}>
              <div className="lp-mkt-item-top">
                <span className="lp-mkt-flag">🇻🇳</span>
                <div className="lp-mkt-dot lp-dot-closed" ref={vnDotRef} />
                <span className="lp-mkt-exch">HOSE</span>
                <span className="lp-mkt-stat lp-is-closed" ref={vnStatRef}>CLOSED</span>
              </div>
              <div className="lp-mkt-time-row">
                <span className="lp-mkt-time-val" ref={vnTimeRef}>--:--:--</span>
                <span className="lp-mkt-tz">ICT</span>
              </div>
            </div>
            <div className="lp-mkt-item lp-is-closed" ref={cnItemRef}>
              <div className="lp-mkt-item-top">
                <span className="lp-mkt-flag">🇨🇳</span>
                <div className="lp-mkt-dot lp-dot-closed" ref={cnDotRef} />
                <span className="lp-mkt-exch">SSE</span>
                <span className="lp-mkt-stat lp-is-closed" ref={cnStatRef}>CLOSED</span>
              </div>
              <div className="lp-mkt-time-row">
                <span className="lp-mkt-time-val" ref={cnTimeRef}>--:--:--</span>
                <span className="lp-mkt-tz">CST</span>
              </div>
            </div>
            <div className="lp-mkt-item lp-is-closed" ref={hkItemRef}>
              <div className="lp-mkt-item-top">
                <span className="lp-mkt-flag">🇭🇰</span>
                <div className="lp-mkt-dot lp-dot-closed" ref={hkDotRef} />
                <span className="lp-mkt-exch">HKEX</span>
                <span className="lp-mkt-stat lp-is-closed" ref={hkStatRef}>CLOSED</span>
              </div>
              <div className="lp-mkt-time-row">
                <span className="lp-mkt-time-val" ref={hkTimeRef}>--:--:--</span>
                <span className="lp-mkt-tz">HKT</span>
              </div>
            </div>
          </div>

          <div className="lp-divider"><span>เข้าสู่ระบบ</span></div>

          <button
            type="button"
            className="lp-btn-google"
            onClick={onGoogleLogin}
            disabled={isAuthenticating}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" style={{flexShrink:0}}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            เข้าสู่ระบบด้วย Google
          </button>

          <div className="lp-or-divider"><span>หรือ</span></div>

          <form className="lp-auth-form" onSubmit={onSubmit}>
            <input
              className="lp-input"
              type="email"
              placeholder="Email"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              required
            />
            <input
              className="lp-input"
              type="password"
              placeholder="Password (อย่างน้อย 6 ตัว)"
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              required
            />
            {authMode === 'register' && (
              <input
                className="lp-input"
                type="text"
                placeholder="Display name"
                value={authDisplayName}
                onChange={e => setAuthDisplayName(e.target.value)}
              />
            )}
            <button className="lp-btn-submit" type="submit" disabled={isAuthenticating}>
              {isAuthenticating ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="lp-spin" style={{flexShrink:0}}>
                    <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,.18)" strokeWidth="2.5"/>
                    <path d="M12 3a9 9 0 0 1 9 9" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  กำลังเชื่อมต่อ…
                </>
              ) : authMode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
            </button>
          </form>

          {authError && <p className="lp-error">{authError}</p>}

          <div className="lp-terms">
            <button
              type="button"
              className="lp-toggle-btn"
              onClick={() => { setAuthError(''); setAuthMode(prev => prev === 'login' ? 'register' : 'login'); }}
            >
              {authMode === 'login' ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CandlestickChart({ data, height = 240 }) {
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!data || data.length === 0) return null;

  const pL = 60, pR = 16, pT = 10, pB = 28;
  const cW = Math.max(1, containerW - pL - pR);
  const cH = height - pT - pB;

  const allLows = data.map(d => d.low ?? d.close);
  const allHighs = data.map(d => d.high ?? d.close);
  const minV = Math.min(...allLows) * 0.9995;
  const maxV = Math.max(...allHighs) * 1.0005;
  const range = maxV - minV || 1;
  const toY = v => pT + (1 - (v - minV) / range) * cH;

  const step = cW / Math.max(data.length, 1);
  const bodyW = Math.max(2, Math.min(14, step * 0.65));

  const yTicks = 5;
  const tickVals = Array.from({ length: yTicks }, (_, i) => minV + (i / (yTicks - 1)) * range);
  const xTickInterval = Math.max(1, Math.floor(data.length / 6));

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <svg width="100%" height={height} style={{ display: "block" }}>
        {tickVals.map((v, i) => (
          <line key={i} x1={pL} y1={toY(v)} x2={pL + cW} y2={toY(v)}
            stroke="rgba(128,128,128,0.15)" strokeDasharray="3 3" />
        ))}
        {tickVals.map((v, i) => (
          <text key={i} x={pL - 5} y={toY(v)} textAnchor="end" dominantBaseline="central"
            fontSize={10} fill="currentColor" opacity={0.55}>
            {v >= 1000 ? v.toFixed(0) : v >= 10 ? v.toFixed(2) : v.toFixed(4)}
          </text>
        ))}
        {data.map((d, i) => {
          const cx = pL + (i + 0.5) * step;
          const o = d.open ?? d.close;
          const c = d.close;
          const h = d.high ?? Math.max(o, c);
          const l = d.low ?? Math.min(o, c);
          const isUp = c >= o;
          const color = isUp ? "#22c55e" : "#ef4444";
          const bTop = toY(Math.max(o, c));
          const bBot = toY(Math.min(o, c));
          const bH = Math.max(1, bBot - bTop);
          return (
            <g key={i}>
              <line x1={cx} y1={toY(h)} x2={cx} y2={toY(l)} stroke={color} strokeWidth={1} />
              <rect x={cx - bodyW / 2} y={bTop} width={bodyW} height={bH} fill={color} fillOpacity={0.9} />
            </g>
          );
        })}
        {data.map((d, i) => {
          if (i % xTickInterval !== 0 && i !== data.length - 1) return null;
          const cx = pL + (i + 0.5) * step;
          return (
            <text key={i} x={cx} y={height - 6} textAnchor="middle"
              fontSize={10} fill="currentColor" opacity={0.55}>
              {(d.date || "").slice(5)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function getMarketStatus() {
  function getZoneParts(tz) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: 'numeric', minute: 'numeric', weekday: 'short', hour12: false,
    }).formatToParts(new Date());
    const get = type => parts.find(p => p.type === type)?.value || '';
    return { h: parseInt(get('hour')) % 24, m: parseInt(get('minute')), day: get('weekday') };
  }
  function fmtTime(tz) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date()).replace(/^24/, '00');
  }
  const isWeekday = z => z.day !== 'Sat' && z.day !== 'Sun';
  const mins = z => z.h * 60 + z.m;

  const bkk = getZoneParts('Asia/Bangkok');
  const ny  = getZoneParts('America/New_York');
  const sh  = getZoneParts('Asia/Shanghai');
  const hk  = getZoneParts('Asia/Hong_Kong');

  const bkkM = mins(bkk), nyM = mins(ny), shM = mins(sh), hkM = mins(hk);

  const setOpen  = isWeekday(bkk) && ((bkkM >= 600 && bkkM < 750) || (bkkM >= 840 && bkkM < 990));
  const nyseOpen = isWeekday(ny)  && (nyM >= 570 && nyM < 960);
  // Vietnam HOSE: 09:00–11:30 and 13:00–15:00 ICT (same tz as Bangkok)
  const vnOpen   = isWeekday(bkk) && ((bkkM >= 540 && bkkM < 690) || (bkkM >= 780 && bkkM < 900));
  // China SSE/SZSE: 09:30–11:30 and 13:00–15:00 CST
  const cnOpen   = isWeekday(sh)  && ((shM >= 570 && shM < 690) || (shM >= 780 && shM < 900));
  // Hong Kong HKEX: 09:30–12:00 and 13:00–16:00 HKT
  const hkOpen   = isWeekday(hk)  && ((hkM >= 570 && hkM < 720) || (hkM >= 780 && hkM < 960));

  return {
    setOpen,  setTime:  fmtTime('Asia/Bangkok'),
    nyseOpen, nyseTime: fmtTime('America/New_York'),
    vnOpen,   vnTime:   fmtTime('Asia/Bangkok'),
    cnOpen,   cnTime:   fmtTime('Asia/Shanghai'),
    hkOpen,   hkTime:   fmtTime('Asia/Hong_Kong'),
  };
}

export default function App() {
  const windowWidth = useWindowWidth();
  const [authToken, setAuthToken] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState([]);
  const [errorText, setErrorText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [scanResult, setScanResult] = useState(null);
  const [isScanningPortfolio, setIsScanningPortfolio] = useState(false);
  const [displayName, setDisplayName] = useState("Demo Investor");
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [draftDisplayName, setDraftDisplayName] = useState("Demo Investor");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearingPortfolio, setIsClearingPortfolio] = useState(false);
  const [stockMeta, setStockMeta] = useState({});
  const [manualStockName, setManualStockName] = useState("");
  const [isAddingManualStock, setIsAddingManualStock] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [activeScreen, setActiveScreen] = useState("app");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [scanCredits, setScanCredits] = useState(0);
  const [selectedInvestorId, setSelectedInvestorId] = useState(INVESTOR_MODELS[0].id);
  const [planModalStockName, setPlanModalStockName] = useState(null);
  const [planDraft, setPlanDraft] = useState("");
  const [cashBalance, setCashBalance] = useState(0);
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashDraft, setCashDraft] = useState("0");
  const [fetchingPriceFor, setFetchingPriceFor] = useState(null);
  const [priceFetchError, setPriceFetchError] = useState(null);
  const [features, setFeatures] = useState({});
  const [featureMsgDraft, setFeatureMsgDraft] = useState({});
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportSubject, setReportSubject] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [issues, setIssues] = useState([]);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [adminTab, setAdminTab] = useState("issues");
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [marketNow, setMarketNow] = useState(getMarketStatus);
  const [usdToThbRate, setUsdToThbRate] = useState(USD_TO_THB_RATE_DEFAULT);
  const [chartMode, setChartMode] = useState("stock");
  const [chartType, setChartType] = useState("pie");
  const [stockTab, setStockTab] = useState("portfolio");
  const [txModal, setTxModal] = useState(null);
  const [txList, setTxList] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txForm, setTxForm] = useState({ tx_type: "buy", quantity: "", price: "", tx_date: new Date().toISOString().slice(0, 10), currency: "THB", note: "" });
  const [historyModal, setHistoryModal] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyPeriod, setHistoryPeriod] = useState("1mo");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyChartType, setHistoryChartType] = useState("candle");
  const [portfolios, setPortfolios] = useState([]);
  const [showCreatePortfolio, setShowCreatePortfolio] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [activePortfolioId, setActivePortfolioId] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [commodities, setCommodities] = useState([]);
  const [commoditiesLoading, setCommoditiesLoading] = useState(false);
  const [pieOrder, setPieOrder] = useState([]);
  const [pieDragOver, setPieDragOver] = useState(null);
  const dragPieFrom = useRef(null);
  const [stockSearchResults, setStockSearchResults] = useState([]);
  const [stockSearchLoading, setStockSearchLoading] = useState(false);
  const stockSearchTimer = useRef(null);
  const _apiCount = useRef(0);
  const [globalLoading, setGlobalLoading] = useState(false);

  function apiStart() {
    _apiCount.current += 1;
    setGlobalLoading(true);
  }
  function apiEnd() {
    _apiCount.current = Math.max(0, _apiCount.current - 1);
    if (_apiCount.current === 0) setGlobalLoading(false);
  }

  useEffect(() => {
    const id = setInterval(() => setMarketNow(getMarketStatus()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("trade-theme");
    if (!savedTheme) {
      return;
    }

    setDarkMode(savedTheme === "dark");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("trade-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const savedToken = window.localStorage.getItem("trade-auth-token") || "";
    if (!savedToken) {
      return;
    }

    setAuthToken(savedToken);
    fetchMe(savedToken);
  }, []);

  useEffect(() => {
    const savedName = window.localStorage.getItem("trade-display-name");
    if (savedName) {
      setDisplayName(savedName);
      setDraftDisplayName(savedName);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("trade-display-name", displayName);
  }, [displayName]);

  useEffect(() => {
    const savedMeta = window.localStorage.getItem("trade-stock-meta");
    if (!savedMeta) {
      return;
    }

    try {
      setStockMeta(JSON.parse(savedMeta));
    } catch {
      setStockMeta({});
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("trade-stock-meta", JSON.stringify(stockMeta));
  }, [stockMeta]);

  useEffect(() => {
    const savedCredits = window.localStorage.getItem("trade-scan-credits");
    if (!savedCredits) {
      return;
    }

    const parsed = Number(savedCredits);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      setScanCredits(parsed);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("trade-scan-credits", String(scanCredits));
  }, [scanCredits]);

  useEffect(() => {
    if (!authToken) {
      return;
    }

    async function bootstrap() {
      apiStart();
      try {
        await Promise.all([loadRecords(), loadFeatures(), loadFxRate(), loadPortfolios(), loadCommodities()]);
      } finally {
        apiEnd();
      }
    }

    bootstrap();
  }, [authToken]);

  async function fetchMe(token) {
    try {
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unauthorized");
      }

      setAuthUser(data.user || null);
      if (data.user?.display_name) {
        setDisplayName(data.user.display_name);
        setDraftDisplayName(data.user.display_name);
      }
      if (data.user?.avatar_url) setAvatarUrl(data.user.avatar_url);
    } catch {
      window.localStorage.removeItem("trade-auth-token");
      setAuthToken("");
      setAuthUser(null);
    }
  }

  async function submitAuth(event) {
    event.preventDefault();

    setAuthError("");
    setIsAuthenticating(true);

    try {
      if (authMode === "register") {
        const registerRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: authEmail.trim().toLowerCase(),
            password: authPassword,
            display_name: authDisplayName.trim() || "Investor"
          })
        });
        const registerData = await registerRes.json();
        if (!registerRes.ok) {
          setAuthError(registerData.detail || "Register failed");
          return;
        }
      }

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail.trim().toLowerCase(),
          password: authPassword
        })
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        setAuthError(loginData.detail || "Login failed");
        return;
      }

      const token = loginData.token || "";
      setAuthToken(token);
      setAuthUser(loginData.user || null);
      window.localStorage.setItem("trade-auth-token", token);
      if (loginData.user?.display_name) {
        setDisplayName(loginData.user.display_name);
        setDraftDisplayName(loginData.user.display_name);
      }
      if (loginData.user?.avatar_url) setAvatarUrl(loginData.user.avatar_url);

      setAuthPassword("");
      setAuthDisplayName("");
    } catch {
      setAuthError("Authentication failed");
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleGoogleLogin() {
    if (!window.google) {
      setAuthError("Google Sign-In not loaded yet, please refresh.");
      return;
    }
    setAuthError("");
    setIsAuthenticating(true);

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      cancel_on_tap_outside: false,
      callback: async (response) => {
        try {
          const res = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: response.credential }),
          });
          const data = await res.json();
          if (!res.ok) {
            setAuthError(data.detail || "Google login failed");
            return;
          }
          const token = data.token || "";
          setAuthToken(token);
          setAuthUser(data.user || null);
          window.localStorage.setItem("trade-auth-token", token);
          if (data.user?.display_name) {
            setDisplayName(data.user.display_name);
            setDraftDisplayName(data.user.display_name);
          }
          if (data.user?.avatar_url) setAvatarUrl(data.user.avatar_url);
        } catch {
          setAuthError("Google login failed");
        } finally {
          setIsAuthenticating(false);
        }
      },
    });

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setAuthError("Google sign-in was suppressed. Please try again.");
        setIsAuthenticating(false);
      }
    });
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch("/api/auth/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: form,
      });
      const data = await res.json();
      if (res.ok) setAvatarUrl(data.avatar_url);
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = "";
    }
  }

  async function handleClearPortfolio() {
    setIsClearingPortfolio(true);
    apiStart();
    try {
      const res = await fetch("/api/portfolio/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ portfolio_id: activePortfolioId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErrorText(d.detail || "ล้างพอร์ตไม่สำเร็จ กรุณาลองใหม่");
        return;
      }
      setRecords([]);
      setSummary([]);
      setStockMeta({});
      setCashBalance(0);
      setCashDraft("0");
      setShowClearConfirm(false);
      window.localStorage.removeItem("trade-stock-meta");
    } finally {
      setIsClearingPortfolio(false);
      apiEnd();
    }
  }

  async function handleLogout() {
    try {
      if (authToken) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` }
        });
      }
    } finally {
      window.localStorage.removeItem("trade-auth-token");
      window.localStorage.removeItem("trade-stock-meta");
      window.localStorage.removeItem("trade-scan-credits");
      setAuthToken("");
      setAuthUser(null);
      setDisplayName("Demo Investor");
      setDraftDisplayName("Demo Investor");
      setAvatarUrl("");
      setAuthEmail("");
      setAuthPassword("");
      setAuthDisplayName("");
      setRecords([]);
      setSummary([]);
      setStockMeta({});
      setCashBalance(0);
      setCashDraft("0");
      setScanCredits(0);
      setPortfolios([]);
      setActivePortfolioId(null);
      setActiveScreen("app");
    }
  }

  async function loadRecords(portfolioId) {
    apiStart();
    try {
      const token = localStorage.getItem("trade-auth-token");
      const pid = portfolioId !== undefined ? portfolioId : activePortfolioId;
      const url = pid ? `/api/stocks?portfolio_id=${pid}` : "/api/stocks";
      const response = await fetch(url, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      const items = data.items || [];
      setRecords(items);
      setSummary(data.summary || []);

      // Sync holdings from API (source of truth)
      const metaFromApi = {};
      for (const item of items) {
        metaFromApi[item.stock_name] = {
          quantity: item.quantity || "",
          price: item.avg_cost || "",
          current_price: item.current_price || "",
          target_price: item.target_price || "",
          stop_loss: item.stop_loss || "",
          currency: item.currency || "THB",
          note: item.note || "",
          is_watchlist: item.is_watchlist || false,
        };
      }
      setStockMeta(metaFromApi);
      if (data.cash_balance !== undefined) {
        setCashBalance(Number(data.cash_balance) || 0);
        setCashDraft(String(Number(data.cash_balance) || 0));
      }
    } catch (error) {
      setErrorText("Cannot load stock records");
    } finally {
      apiEnd();
    }
  }

  async function loadFeatures() {
    try {
      const res = await fetch("/api/config/features");
      if (!res.ok) return;
      const data = await res.json();
      setFeatures(data.features || {});
    } catch {}
  }

  async function updateFeature(key, patch) {
    const token = localStorage.getItem("trade-auth-token");
    try {
      const res = await fetch(`/api/config/features/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
      if (!res.ok) return;
      const data = await res.json();
      setFeatures((prev) => ({ ...prev, [key]: { enabled: data.enabled, message: data.message } }));
    } catch {}
  }

  async function loadFxRate() {
    const token = localStorage.getItem("trade-auth-token");
    try {
      const res = await fetch("/api/fx-rate", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      if (data.rate) setUsdToThbRate(data.rate);
    } catch {}
  }

  async function loadPortfolios() {
    const token = localStorage.getItem("trade-auth-token");
    try {
      const res = await fetch("/api/portfolios", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const items = data.items || [];
      setPortfolios(items);
      setActivePortfolioId((prev) => {
        if (prev) return prev;
        const def = items.find((p) => p.is_default) || items[0];
        return def ? def.id : null;
      });
    } catch {}
  }

  async function loadCommodities() {
    setCommoditiesLoading(true);
    const token = localStorage.getItem("trade-auth-token");
    try {
      const r = await fetch("/api/commodities", { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const d = await r.json();
        setCommodities(d.items || []);
      }
    } catch {}
    setCommoditiesLoading(false);
  }

  async function createPortfolio() {
    if (!newPortfolioName.trim()) return;
    const token = localStorage.getItem("trade-auth-token");
    apiStart();
    try {
      const res = await fetch("/api/portfolios/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newPortfolioName.trim() }),
      });
      if (res.ok) {
        setNewPortfolioName("");
        setShowCreatePortfolio(false);
        await loadPortfolios();
      } else {
        const d = await res.json();
        setErrorText(d.detail || "Create portfolio failed");
      }
    } catch { setErrorText("Create portfolio failed"); }
    finally { apiEnd(); }
  }

  function exportCsv() {
    const headers = ["Symbol", "Qty", "AvgCost", "CurrentPrice", "TargetPrice", "StopLoss", "Currency", "Sector", "PnL_THB"];
    const rows = records.map((r) => {
      const meta = getStockMeta(r.stock_name);
      const qty = Number(meta.quantity) || 0;
      const avg = Number(meta.price) || 0;
      const cur = Number(meta.current_price) || 0;
      const rate = meta.currency === "USD" ? usdToThbRate : 1;
      const pnl = cur > 0 ? (cur - avg) * qty * rate : 0;
      return [r.stock_name, qty, avg, cur, meta.target_price || "", meta.stop_loss || "", meta.currency, r.sector || "", pnl.toFixed(2)];
    });
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portfolio_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function loadTransactions(stockId) {
    setTxLoading(true);
    apiStart();
    const token = localStorage.getItem("trade-auth-token");
    try {
      const pid = activePortfolioId ? `?portfolio_id=${activePortfolioId}` : "";
      const res = await fetch(`/api/transactions/${stockId}${pid}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setTxList(data.items || []);
    } catch { setTxList([]); }
    finally { setTxLoading(false); apiEnd(); }
  }

  async function addTransactionFn(stockId) {
    const token = localStorage.getItem("trade-auth-token");
    apiStart();
    try {
      const res = await fetch(`/api/transactions/${stockId}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(txForm),
      });
      if (res.ok) {
        setTxForm({ tx_type: "buy", quantity: "", price: "", tx_date: new Date().toISOString().slice(0, 10), currency: "THB", note: "" });
        await loadTransactions(stockId);
      } else {
        const d = await res.json();
        setErrorText(d.detail || "Add transaction failed");
      }
    } catch { setErrorText("Add transaction failed"); }
    finally { apiEnd(); }
  }

  async function deleteTransactionFn(txId, stockId) {
    const token = localStorage.getItem("trade-auth-token");
    apiStart();
    try {
      const res = await fetch(`/api/transactions/delete/${txId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErrorText(d.detail || "Delete transaction failed");
        return;
      }
      await loadTransactions(stockId);
    } catch {
      setErrorText("Delete transaction failed");
    } finally {
      apiEnd();
    }
  }

  async function toggleWatchlistFn(stockId) {
    const token = localStorage.getItem("trade-auth-token");
    try {
      const res = await fetch(`/api/stocks/${stockId}/watchlist`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      await loadRecords();
    } catch {}
  }

  async function loadPriceHistory(symbol, currency, period) {
    setHistoryLoading(true);
    setHistoryData([]);
    apiStart();
    const token = localStorage.getItem("trade-auth-token");
    try {
      const res = await fetch(`/api/price/${encodeURIComponent(symbol)}/history?period=${period}&currency=${currency}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setHistoryData(data.data || []);
    } catch { setHistoryData([]); }
    finally { setHistoryLoading(false); apiEnd(); }
  }

  async function fetchStockPrice(name) {
    const meta = getStockMeta(name);
    setFetchingPriceFor(name);
    setPriceFetchError(null);
    const token = localStorage.getItem("trade-auth-token");
    try {
      const sym = encodeURIComponent(name);
      const res = await fetch(`/api/price/${sym}?currency=${meta.currency || "THB"}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `ดึงราคาไม่สำเร็จ (${res.status})`);
      }
      const data = await res.json();
      updateStockMeta(name, { current_price: String(data.price), price_mode: "auto" });
    } catch (err) {
      setPriceFetchError(err.message);
      updateStockMeta(name, { price_mode: "auto" });
    } finally {
      setFetchingPriceFor(null);
    }
  }

  async function saveCashBalance() {
    const val = parseFloat(cashDraft) || 0;
    setCashBalance(val);
    setIsEditingCash(false);
    const token = localStorage.getItem("trade-auth-token");
    try {
      await fetch("/api/portfolio/cash", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ cash_balance: val, portfolio_id: activePortfolioId }),
      });
    } catch {
      setErrorText("Save cash balance failed");
    }
  }

  const pieData = useMemo(() => {
    return summary.map((item) => {
      const meta = getStockMeta(item.name);
      const quantity = Number(meta.quantity) || 0;
      const price = Number(meta.price) || 0;
      const isEstimated = quantity > 0 && price > 0;

      if (!isEstimated) {
        return { name: item.name, value: item.value, isEstimated: false };
      }

      const rawValue = quantity * price;
      const valueInTHB = meta.currency === "USD" ? rawValue * usdToThbRate : rawValue;
      return { name: item.name, value: Number(valueInTHB.toFixed(2)), isEstimated: true };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, stockMeta, records]);

  const usesEstimatedValues = useMemo(() => pieData.some((item) => item.isEstimated), [pieData]);
  const total = useMemo(() => pieData.reduce((acc, item) => acc + item.value, 0), [pieData]);

  useEffect(() => {
    setPieOrder(prev => {
      const names = pieData.map(d => d.name);
      const kept = prev.filter(n => names.includes(n));
      const added = names.filter(n => !prev.includes(n));
      return [...kept, ...added];
    });
  }, [pieData]);

  const sortedPieData = useMemo(() => {
    if (!pieOrder.length) return pieData;
    const idxMap = Object.fromEntries(pieOrder.map((n, i) => [n, i]));
    return [...pieData].sort((a, b) => (idxMap[a.name] ?? 999) - (idxMap[b.name] ?? 999));
  }, [pieData, pieOrder]);

  const pnlData = useMemo(() => {
    let totalCost = 0;
    let totalCurrentValue = 0;
    const perStock = summary.map((item) => {
      const meta = getStockMeta(item.name);
      const qty = Number(meta.quantity) || 0;
      const avgCost = Number(meta.price) || 0;
      const curPrice = Number(meta.current_price) || 0;
      const rate = meta.currency === "USD" ? usdToThbRate : 1;
      const cost = qty * avgCost * rate;
      const value = curPrice > 0 ? qty * curPrice * rate : cost;
      const pnl = value - cost;
      totalCost += cost;
      totalCurrentValue += value;
      return { name: item.name, cost, value, pnl, qty, avgCost, curPrice, currency: meta.currency };
    });
    const totalPnL = totalCurrentValue - totalCost;
    const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
    const totalWealth = cashBalance + totalCurrentValue;
    return { perStock, totalCost, totalCurrentValue, totalPnL, totalPnLPct, totalWealth };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, stockMeta, records, cashBalance, usdToThbRate]);

  const sectorData = useMemo(() => {
    const map = {};
    for (const item of summary) {
      const rec = records.find((r) => r.stock_name === item.name);
      const sector = rec?.sector || "Other";
      const meta = getStockMeta(item.name);
      const qty = Number(meta.quantity) || 0;
      const price = Number(meta.price) || 0;
      const rate = meta.currency === "USD" ? usdToThbRate : 1;
      const value = qty > 0 && price > 0 ? qty * price * rate : item.value;
      map[sector] = (map[sector] || 0) + value;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, stockMeta, records, usdToThbRate]);

  const marketData = useMemo(() => {
    const map = {};
    for (const item of summary) {
      const meta = getStockMeta(item.name);
      const qty = Number(meta.quantity) || 0;
      const price = Number(meta.price) || 0;
      const rate = meta.currency === "USD" ? usdToThbRate : 1;
      const value = qty > 0 && price > 0 ? qty * price * rate : item.value;
      const key = meta.currency === "USD" ? "USD (US Stocks)" : "THB (Thai Stocks)";
      map[key] = (map[key] || 0) + value;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, stockMeta, records, usdToThbRate]);

  const pnlStatusData = useMemo(() => {
    const map = { "กำไร": 0, "ขาดทุน": 0 };
    for (const s of pnlData.perStock) {
      if (s.curPrice <= 0) continue;
      if (s.pnl >= 0) map["กำไร"] += s.value;
      else map["ขาดทุน"] += s.value;
    }
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
  }, [pnlData]);

  const megaTrendData = useMemo(() => {
    // classify user stocks into trends
    const userMap = {};
    for (const r of records) {
      const sym = (r.stock_name || "").replace(/\.BK$/i, "").toUpperCase();
      const sector = r.sector || "";
      const trendName = MEGA_TREND_SYMBOL_MAP[sym] || SECTOR_TO_TREND[sector] || null;
      if (!trendName) continue;
      if (!userMap[trendName]) userMap[trendName] = { stocks: [], totalValue: 0 };
      const m = getStockMeta(r.stock_name);
      const qty = Number(m.quantity) || 0;
      const price = Number(m.current_price) || Number(m.price) || 0;
      const valueThb = m.currency === "USD" ? qty * price * usdToThbRate : qty * price;
      userMap[trendName].stocks.push(r.stock_name);
      userMap[trendName].totalValue += valueThb;
    }
    const grandTotal = Object.values(userMap).reduce((s, t) => s + t.totalValue, 0);
    return MEGA_TRENDS_LIST.map(t => ({
      ...t,
      stocks: userMap[t.trend]?.stocks || [],
      totalValue: userMap[t.trend]?.totalValue || 0,
      pct: grandTotal > 0 ? Math.round((userMap[t.trend]?.totalValue || 0) / grandTotal * 100) : 0,
      hasHoldings: !!(userMap[t.trend]?.stocks?.length),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, stockMeta, usdToThbRate]);

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  async function saveGroupEdit(oldName) {
    if (!editingName.trim()) {
      return;
    }

    const token = localStorage.getItem("trade-auth-token");
    const authHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

    apiStart();
    try {
      // Step 1: rename if name changed
      const newName = editingName.trim().toUpperCase();
      if (newName !== oldName) {
        const renameRes = await fetch("/api/stocks/group", {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({ old_name: oldName, new_name: newName }),
        });
        const renameData = await renameRes.json();
        if (!renameRes.ok) {
          setErrorText(renameData.detail || "Rename failed");
          return;
        }
      }

      // Step 2: save holdings (qty / avg_cost / current_price / currency) to DB
      const stock = records.find((r) => r.stock_name === oldName);
      if (stock) {
        const meta = stockMeta[oldName] || {};
        await fetch(`/api/holdings/${stock.id}`, {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({
            quantity: Number(meta.quantity) || 0,
            avg_cost: Number(meta.price) || 0,
            current_price: meta.current_price ? Number(meta.current_price) : null,
            target_price: meta.target_price ? Number(meta.target_price) : null,
            stop_loss: meta.stop_loss ? Number(meta.stop_loss) : null,
            currency: meta.currency || "THB",
            portfolio_id: activePortfolioId,
          }),
        });
      }

      cancelEdit();
      await loadRecords();
    } catch {
      setErrorText("Save failed");
    } finally {
      apiEnd();
    }
  }

  async function deleteGroup(stockName) {
    const token = localStorage.getItem("trade-auth-token");
    apiStart();
    try {
      const response = await fetch("/api/stocks/group/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ stock_name: stockName, portfolio_id: activePortfolioId }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorText(data.detail || "Delete failed");
        return;
      }

      if (editingId === `group:${stockName}`) cancelEdit();
      await loadRecords();
    } catch {
      setErrorText("Delete failed");
    } finally {
      apiEnd();
    }
  }

  async function simulatePortfolioScan() {
    if (summary.length === 0) {
      setErrorText("Upload stocks before scanning the portfolio");
      return;
    }

    setErrorText("");
    setIsScanningPortfolio(true);

    await new Promise((resolve) => {
      window.setTimeout(resolve, 900);
    });

    setScanResult(buildScanResult(summary, pieData, selectedInvestorId));
    setIsScanningPortfolio(false);
  }

  function getStockMeta(name) {
    const matchingRecord = records.find(
      (r) => (r.stock_name || "").trim().toUpperCase() === name.trim().toUpperCase()
    );
    return {
      quantity: "",
      price: "",
      current_price: "",
      target_price: "",
      stop_loss: "",
      price_mode: "manual",
      currency: "THB",
      note: "",
      is_watchlist: false,
      ...(matchingRecord
        ? {
            quantity: matchingRecord.quantity || "",
            price: matchingRecord.avg_cost || "",
            current_price: matchingRecord.current_price || "",
            target_price: matchingRecord.target_price || "",
            stop_loss: matchingRecord.stop_loss || "",
            price_mode: "manual",
            currency: matchingRecord.currency || "THB",
            note: matchingRecord.note || "",
            is_watchlist: matchingRecord.is_watchlist || false,
          }
        : {}),
      ...(stockMeta[name] || {}),
    };
  }

  function updateStockMeta(name, patch) {
    setStockMeta((prev) => ({
      ...prev,
      [name]: {
        quantity: "",
        price: "",
        current_price: "",
        price_mode: "manual",
        currency: "THB",
        note: "",
        ...(prev[name] || {}),
        ...patch,
      },
    }));

    // Mirror into records so pieData and indicators re-render immediately
    setRecords((prev) =>
      prev.map((record) => {
        if ((record.stock_name || "").trim().toUpperCase() !== name.trim().toUpperCase()) {
          return record;
        }
        return {
          ...record,
          quantity: patch.quantity !== undefined ? patch.quantity : (record.quantity || ""),
          avg_cost: patch.price !== undefined ? patch.price : (record.avg_cost || ""),
          current_price: patch.current_price !== undefined ? patch.current_price : (record.current_price || ""),
          currency: patch.currency !== undefined ? patch.currency : (record.currency || "THB"),
          note: patch.note !== undefined ? patch.note : (record.note || ""),
        };
      })
    );
  }

  async function saveDisplayName() {
    const nextName = draftDisplayName.trim();
    if (!nextName) return;

    const token = localStorage.getItem("trade-auth-token");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ display_name: nextName }),
      });
      if (!res.ok) return;
    } catch {}

    setDisplayName(nextName);
    setDraftDisplayName(nextName);
    setIsEditingUser(false);
  }

  function cancelDisplayNameEdit() {
    setDraftDisplayName(displayName);
    setIsEditingUser(false);
  }

  async function addManualStock() {
    const name = manualStockName.trim().toUpperCase();
    if (!name) {
      return;
    }

    setIsAddingManualStock(true);
    setErrorText("");
    apiStart();

    const token = localStorage.getItem("trade-auth-token");
    try {
      const response = await fetch("/api/stocks/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ stock_name: name, portfolio_id: activePortfolioId }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorText(data.detail || "Add stock failed");
        return;
      }

      setManualStockName("");
      setStockSearchResults([]);
      setShowAddStockModal(false);
      await loadRecords();
    } catch {
      setErrorText("Add stock failed");
    } finally {
      setIsAddingManualStock(false);
      apiEnd();
    }
  }

  async function searchStocks(q) {
    if (!q.trim()) { setStockSearchResults([]); setStockSearchLoading(false); return; }
    setStockSearchLoading(true);
    const token = localStorage.getItem("trade-auth-token");
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStockSearchResults(data.items || []);
      }
    } catch {}
    setStockSearchLoading(false);
  }

  function openPlanModal(stockName) {
    const meta = getStockMeta(stockName);
    setPlanDraft(meta.note || "");
    setPlanModalStockName(stockName);
  }

  async function savePlan() {
    if (!planModalStockName) return;
    const stock = records.find(
      (r) => (r.stock_name || "").trim().toUpperCase() === planModalStockName.trim().toUpperCase()
    );
    if (!stock) {
      setPlanModalStockName(null);
      return;
    }
    const token = localStorage.getItem("trade-auth-token");
    try {
      await fetch(`/api/holdings/${stock.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ note: planDraft, portfolio_id: activePortfolioId }),
      });
      updateStockMeta(planModalStockName, { note: planDraft });
    } catch {
      setErrorText("Save plan failed");
    }
    setPlanModalStockName(null);
  }

  async function submitReport() {
    if (!reportSubject.trim() || !reportDescription.trim()) return;
    setReportSubmitting(true);
    const token = localStorage.getItem("trade-auth-token");
    try {
      const res = await fetch("/api/issues/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ subject: reportSubject.trim(), description: reportDescription.trim() }),
      });
      if (res.ok) {
        setReportSuccess(true);
        setReportSubject("");
        setReportDescription("");
        window.setTimeout(() => {
          setReportSuccess(false);
          setReportModalOpen(false);
        }, 1800);
      } else {
        const d = await res.json();
        setErrorText(d.detail || "Submit failed");
      }
    } catch {
      setErrorText("Submit failed");
    } finally {
      setReportSubmitting(false);
    }
  }

  async function loadUsers() {
    setIsLoadingUsers(true);
    const token = localStorage.getItem("trade-auth-token");
    try {
      const res = await fetch("/api/admin/users", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data.items || []);
    } catch {
      setErrorText("Failed to load users");
    } finally {
      setIsLoadingUsers(false);
    }
  }

  async function updateUser(id, patch) {
    const token = localStorage.getItem("trade-auth-token");
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const d = await res.json();
        setUsers((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, role: d.user.role, status: d.user.status } : u
          )
        );
      }
    } catch {
      setErrorText("Update user failed");
    }
  }

  async function loadIssues() {
    setIsLoadingIssues(true);
    const token = localStorage.getItem("trade-auth-token");
    try {
      const res = await fetch("/api/issues", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      setIssues(data.items || []);
    } catch {
      setErrorText("Failed to load issues");
    } finally {
      setIsLoadingIssues(false);
    }
  }

  async function updateIssueStatus(id, status, adminNote) {
    const token = localStorage.getItem("trade-auth-token");
    try {
      const res = await fetch(`/api/issues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status, admin_note: adminNote }),
      });
      if (res.ok) {
        const d = await res.json();
        setIssues((prev) =>
          prev.map((issue) =>
            issue.id === id
              ? { ...issue, status: d.issue.status, admin_note: d.issue.admin_note }
              : issue
          )
        );
      }
    } catch {
      setErrorText("Update failed");
    }
  }

  const selectedPlan = useMemo(
    () => PAYMENT_PLANS.find((plan) => plan.id === selectedPlanId) || null,
    [selectedPlanId]
  );

  function openPaymentUI() {
    setSelectedPlanId("");
    setActiveScreen("pricing");
  }

  function choosePlan(planId) {
    setSelectedPlanId(planId);
    setActiveScreen("checkout");
  }

  async function completeMockPayment() {
    if (!selectedPlan) {
      return;
    }

    setIsProcessingPayment(true);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    setScanCredits((prev) => prev + selectedPlan.credits);
    setIsProcessingPayment(false);
    setActiveScreen("success");
  }

  function goBackToApp() {
    setActiveScreen("app");
  }

  const globalLoadingOverlay = globalLoading && (
    <div className="global-loading-overlay" aria-live="polite" aria-label="กำลังโหลด">
      <div className="global-loading-card">
        <div className="global-loading-spinner" />
        <span className="global-loading-text">กำลังโหลด...</span>
      </div>
    </div>
  );

  if (!authUser) {
    return (
      <LoginPage
        authMode={authMode}
        authEmail={authEmail}
        authPassword={authPassword}
        authDisplayName={authDisplayName}
        authError={authError}
        isAuthenticating={isAuthenticating}
        setAuthMode={setAuthMode}
        setAuthEmail={setAuthEmail}
        setAuthPassword={setAuthPassword}
        setAuthDisplayName={setAuthDisplayName}
        setAuthError={setAuthError}
        onSubmit={submitAuth}
        onGoogleLogin={handleGoogleLogin}
      />
    );
  }

  if (activeScreen === "admin") {
    return (
      <>
      {globalLoadingOverlay}
      <main className="container admin-page">
        <section className="panel admin-panel">
          <div className="admin-panel-header">
            <div>
              <h1>Admin Dashboard</h1>
              <p className="subtext">จัดการปัญหาและผู้ใช้ระบบ</p>
            </div>
            <button type="button" className="btn-inline-action" onClick={() => setActiveScreen("app")}>
              ← Back to App
            </button>
          </div>

          {/* Tabs */}
          <div className="admin-tabs">
            <button
              type="button"
              className={`admin-tab-btn${adminTab === "issues" ? " admin-tab-btn--active" : ""}`}
              onClick={() => { setAdminTab("issues"); loadIssues(); }}
            >
              Issues {issues.length > 0 && <span className="admin-tab-badge">{issues.length}</span>}
            </button>
            <button
              type="button"
              className={`admin-tab-btn${adminTab === "users" ? " admin-tab-btn--active" : ""}`}
              onClick={() => { setAdminTab("users"); loadUsers(); }}
            >
              Users {users.length > 0 && <span className="admin-tab-badge">{users.length}</span>}
            </button>
            <button
              type="button"
              className={`admin-tab-btn${adminTab === "features" ? " admin-tab-btn--active" : ""}`}
              onClick={() => setAdminTab("features")}
            >
              Features
            </button>
          </div>

          {/* Issues tab */}
          {adminTab === "issues" && (
            isLoadingIssues ? (
              <p className="subtext">กำลังโหลด...</p>
            ) : issues.length === 0 ? (
              <p className="subtext">ไม่มีปัญหาที่แจ้งเข้ามา</p>
            ) : (
              <div className="issue-list">
                {issues.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} onUpdate={updateIssueStatus} />
                ))}
              </div>
            )
          )}

          {/* Users tab */}
          {adminTab === "users" && (
            isLoadingUsers ? (
              <p className="subtext">กำลังโหลด...</p>
            ) : users.length === 0 ? (
              <p className="subtext">ไม่มีข้อมูลผู้ใช้</p>
            ) : (
              <div className="user-list">
                {users.map((u) => (
                  <div key={u.id} className={`user-card${u.status === "suspended" ? " user-card--suspended" : ""}`}>
                    <div className="user-card-avatar">
                      {(u.display_name || u.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="user-card-info">
                      <p className="user-card-name">{u.display_name || "(no name)"}</p>
                      <p className="user-card-email">{u.email}</p>
                      <p className="user-card-meta">
                        สมัครเมื่อ {new Date(u.created_at).toLocaleDateString("th-TH")}
                        {u.issue_count > 0 && <> · {u.issue_count} issue{u.issue_count > 1 ? "s" : ""}</>}
                      </p>
                    </div>
                    <div className="user-card-badges">
                      <span className={`user-role-badge user-role-badge--${u.role}`}>
                        {u.role === "admin" ? "Admin" : "User"}
                      </span>
                      <span className={`user-status-badge user-status-badge--${u.status}`}>
                        {u.status}
                      </span>
                    </div>
                    <div className="user-card-actions">
                      <button
                        type="button"
                        className="btn-inline-action"
                        onClick={() => updateUser(u.id, { role: u.role === "admin" ? "user" : "admin" })}
                        title={u.role === "admin" ? "Revoke admin" : "Make admin"}
                      >
                        {u.role === "admin" ? "→ User" : "→ Admin"}
                      </button>
                      <button
                        type="button"
                        className={`btn-inline-action${u.status === "suspended" ? "" : " btn-inline-delete"}`}
                        onClick={() => updateUser(u.id, { status: u.status === "suspended" ? "active" : "suspended" })}
                      >
                        {u.status === "suspended" ? "Unsuspend" : "Suspend"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Features tab */}
          {adminTab === "features" && (
            <div className="feature-list">
              {(() => {
                const feat = features.evaluation_simulator;
                const isOn = feat?.enabled !== false;
                const msgDraft = featureMsgDraft.evaluation_simulator ?? feat?.message ?? "";
                return (
                  <div className="feature-card">
                    <div className="feature-card-header">
                      <span className="feature-card-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m3 21 9-9"/>
                          <path d="M12.22 6.22 15 3.5c.65-.65 1.7-.65 2.35 0l2.93 2.93c.65.65.65 1.7 0 2.35l-2.72 2.72a2 2 0 0 1-2.83 0l-2.51-2.51a2 2 0 0 1 0-2.77Z"/>
                        </svg>
                      </span>
                      <div className="feature-card-info">
                        <p className="feature-card-name">Portfolio Evaluation Simulator</p>
                        <p className="subtext">ซิมูเลเตอร์ประเมินพอร์ตหุ้นในหน้าหลัก</p>
                      </div>
                      <button
                        type="button"
                        className={`feature-toggle-btn${isOn ? " feature-toggle-btn--on" : " feature-toggle-btn--off"}`}
                        onClick={() => updateFeature("evaluation_simulator", { enabled: !isOn })}
                      >
                        {isOn ? "เปิดอยู่" : "ปิดอยู่"}
                      </button>
                    </div>
                    {!isOn && (
                      <div className="feature-msg-edit">
                        <label className="feature-msg-label">ข้อความแสดงต่อ user</label>
                        <textarea
                          className="feature-msg-input"
                          rows={3}
                          placeholder="กำลังปรับปรุงชั่วคราว..."
                          value={msgDraft}
                          onChange={(e) => setFeatureMsgDraft((prev) => ({ ...prev, evaluation_simulator: e.target.value }))}
                        />
                        <button
                          type="button"
                          className="btn-pnl-save"
                          onClick={() => updateFeature("evaluation_simulator", { message: msgDraft })}
                        >
                          บันทึกข้อความ
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
              {(() => {
                const feat = features.top_up;
                const isOn = feat?.enabled !== false;
                const msgDraft = featureMsgDraft.top_up ?? feat?.message ?? "";
                return (
                  <div className="feature-card">
                    <div className="feature-card-header">
                      <span className="feature-card-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m3 21 9-9"/>
                          <path d="M12.22 6.22 15 3.5c.65-.65 1.7-.65 2.35 0l2.93 2.93c.65.65.65 1.7 0 2.35l-2.72 2.72a2 2 0 0 1-2.83 0l-2.51-2.51a2 2 0 0 1 0-2.77Z"/>
                        </svg>
                      </span>
                      <div className="feature-card-info">
                        <p className="feature-card-name">Top Up / เติมเงิน</p>
                        <p className="subtext">หน้าเติมเครดิตและชำระเงิน</p>
                      </div>
                      <button
                        type="button"
                        className={`feature-toggle-btn${isOn ? " feature-toggle-btn--on" : " feature-toggle-btn--off"}`}
                        onClick={() => updateFeature("top_up", { enabled: !isOn })}
                      >
                        {isOn ? "เปิดอยู่" : "ปิดอยู่"}
                      </button>
                    </div>
                    {!isOn && (
                      <div className="feature-msg-edit">
                        <label className="feature-msg-label">ข้อความแสดงต่อ user</label>
                        <textarea
                          className="feature-msg-input"
                          rows={3}
                          placeholder="กำลังปรับปรุงชั่วคราว..."
                          value={msgDraft}
                          onChange={(e) => setFeatureMsgDraft((prev) => ({ ...prev, top_up: e.target.value }))}
                        />
                        <button
                          type="button"
                          className="btn-pnl-save"
                          onClick={() => updateFeature("top_up", { message: msgDraft })}
                        >
                          บันทึกข้อความ
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </section>
      </main>
      </>
    );
  }

  if (activeScreen !== "app") {
    if (features.top_up?.enabled === false) {
      return (
        <>{globalLoadingOverlay}
        <main className="container payment-page">
          <section className="panel payment-panel">
            <div className="payment-header">
              <h1>Payment Center</h1>
              <button type="button" className="btn-inline-action" onClick={goBackToApp}>กลับไปหน้าสแกน</button>
            </div>
            <div className="feature-maintenance">
              <div className="feature-maintenance-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m3 21 9-9"/>
                  <path d="M12.22 6.22 15 3.5c.65-.65 1.7-.65 2.35 0l2.93 2.93c.65.65.65 1.7 0 2.35l-2.72 2.72a2 2 0 0 1-2.83 0l-2.51-2.51a2 2 0 0 1 0-2.77Z"/>
                </svg>
              </div>
              <h3 className="feature-maintenance-title">กำลังปรับปรุง</h3>
              <p className="feature-maintenance-msg">
                {features.top_up?.message || "ขออภัยในความไม่สะดวก ระบบจะกลับมาให้บริการเร็วๆ นี้"}
              </p>
            </div>
          </section>
        </main>
        </>
      );
    }
    return (
      <>{globalLoadingOverlay}
      <main className="container payment-page">
        <section className="panel payment-panel">
          <div className="payment-header">
            <h1>Payment Center</h1>
            <button type="button" className="btn-inline-action" onClick={goBackToApp}>กลับไปหน้าสแกน</button>
          </div>
          <p className="subtext">เครดิตคงเหลือ: {scanCredits} ครั้ง</p>

          {activeScreen === "pricing" && (
            <div className="plan-grid">
              {PAYMENT_PLANS.map((plan) => (
                <article className="plan-card" key={plan.id}>
                  <h2>{plan.title}</h2>
                  <p className="plan-price">{plan.priceTHB} บาท</p>
                  <p className="subtext">{plan.note}</p>
                  <p className="plan-credits">ได้ {plan.credits} เครดิตสแกน</p>
                  <button type="button" onClick={() => choosePlan(plan.id)}>เลือกแพ็กนี้</button>
                </article>
              ))}
            </div>
          )}

          {activeScreen === "checkout" && selectedPlan && (
            <div className="checkout-card">
              <h2>Checkout</h2>
              <p>แพ็กเกจ: <strong>{selectedPlan.title}</strong></p>
              <p>ราคา: <strong>{selectedPlan.priceTHB} บาท</strong></p>
              <p>เครดิตที่จะได้รับ: <strong>{selectedPlan.credits} ครั้ง</strong></p>
              <div className="checkout-actions">
                <button type="button" className="btn-cancel" onClick={() => setActiveScreen("pricing")}>เปลี่ยนแพ็ก</button>
                <button type="button" onClick={completeMockPayment} disabled={isProcessingPayment}>
                  {isProcessingPayment ? "กำลังชำระเงิน..." : "ชำระเงิน (Mock)"}
                </button>
              </div>
            </div>
          )}

          {activeScreen === "success" && selectedPlan && (
            <div className="checkout-card success-card">
              <h2>ชำระเงินสำเร็จ</h2>
              <p>เพิ่มเครดิตแล้ว {selectedPlan.credits} ครั้ง</p>
              <p>เครดิตคงเหลือล่าสุด: <strong>{scanCredits} ครั้ง</strong></p>
              <button type="button" onClick={goBackToApp}>เริ่มสแกนพอร์ต</button>
            </div>
          )}
        </section>
      </main>
      </>
    );
  }

  return (
    <>
      {globalLoadingOverlay}
      <ConstellationBg />
      <main className="container" style={{position:'relative',zIndex:1}}>
      <section className="panel top-panel">
        <div className="profile-layout">
          {/* Avatar + Identity */}
          <div className="profile-identity">
            <label className="profile-avatar-wrap" title="เปลี่ยนรูปโปรไฟล์">
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleAvatarUpload}
                disabled={isUploadingAvatar}
              />
              {isUploadingAvatar ? (
                <div className="profile-avatar profile-avatar-loading">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="lp-spin">
                    <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,.2)" strokeWidth="2.5"/>
                    <path d="M12 3a9 9 0 0 1 9 9" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </div>
              ) : avatarUrl ? (
                <div className="profile-avatar profile-avatar-img">
                  <img src={avatarUrl} alt="avatar" className="profile-avatar-image" />
                  <div className="profile-avatar-overlay">✎</div>
                </div>
              ) : (
                <div className="profile-avatar">
                  {(displayName || "?").slice(0, 2).toUpperCase()}
                  <div className="profile-avatar-overlay">✎</div>
                </div>
              )}
            </label>
            <div className="profile-info">
              {isEditingUser ? (
                <div className="profile-edit-row">
                  <input
                    className="profile-edit-input"
                    value={draftDisplayName}
                    autoFocus
                    onChange={(e) => setDraftDisplayName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveDisplayName();
                      if (e.key === "Escape") cancelDisplayNameEdit();
                    }}
                  />
                  <button className="btn-save" type="button" onClick={saveDisplayName}>Save</button>
                  <button className="btn-cancel" type="button" onClick={cancelDisplayNameEdit}>✕</button>
                </div>
              ) : (
                <>
                  <h2 className="profile-name">{displayName}</h2>
                  <p className="profile-email">{authUser?.email}</p>
                  <button
                    className="btn-inline-action btn-edit-profile"
                    type="button"
                    onClick={() => {
                      setDraftDisplayName(displayName);
                      setIsEditingUser(true);
                    }}
                  >
                    Edit Name
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="profile-stats">
            <div className="stat-card">
              <span className="stat-value">{summary.length}</span>
              <span className="stat-label">Stocks</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {usesEstimatedValues
                  ? total.toLocaleString("en-US", { maximumFractionDigits: 0 })
                  : total}
              </span>
              <span className="stat-label">{usesEstimatedValues ? "THB est." : "Records"}</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{scanCredits}</span>
              <span className="stat-label">Credits</span>
            </div>
          </div>

          {/* Actions */}
          <div className="profile-actions">
            <button className="btn-dark-toggle" type="button" onClick={() => setDarkMode((d) => !d)}>
              {darkMode ? "☀ Light" : "☾ Dark"}
            </button>
            {portfolios.length > 0 && (
              <div className="portfolio-selector">
                <select
                  className="portfolio-select"
                  value={activePortfolioId || ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    setActivePortfolioId(id);
                    loadRecords(id);
                  }}
                  title="เลือก Portfolio"
                >
                  {portfolios.map((p) => <option key={p.id} value={p.id}>{p.name}{p.is_default ? " ★" : ""}</option>)}
                </select>
                <button type="button" className="btn-inline-action" onClick={() => setShowCreatePortfolio(true)} title="สร้าง Portfolio ใหม่">+</button>
              </div>
            )}
            <button className="btn-inline-action" type="button" onClick={openPaymentUI}>
              Top Up
            </button>
            <button
              className="btn-inline-action btn-report"
              type="button"
              onClick={() => { setReportSuccess(false); setReportModalOpen(true); }}
            >
              แจ้งปัญหา
            </button>
            {authUser?.role === "admin" && (
              <button
                className="btn-inline-action btn-admin"
                type="button"
                onClick={() => { setActiveScreen("admin"); setAdminTab("issues"); loadIssues(); }}
              >
                Admin Panel
              </button>
            )}
            <button
              className="btn-inline-action btn-clear-port"
              type="button"
              onClick={() => setShowClearConfirm(true)}
            >
              ล้างพอร์ต
            </button>
            <button
              className="btn-inline-action btn-help"
              type="button"
              onClick={() => setShowHelpModal(true)}
            >
              วิธีใช้งาน
            </button>
            <button className="btn-inline-delete" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </section>

      {showClearConfirm && (
        <div className="clear-confirm-backdrop" onClick={() => !isClearingPortfolio && setShowClearConfirm(false)}>
          <div className="clear-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="clear-confirm-icon">⚠</div>
            <h3 className="clear-confirm-title">ล้างพอร์ตทั้งหมด?</h3>
            <p className="clear-confirm-desc">
              ข้อมูลหุ้น ยอดถือครอง และยอดเงินสดจะถูกลบถาวร<br/>ไม่สามารถกู้คืนได้
            </p>
            <div className="clear-confirm-actions">
              <button
                className="btn-cancel"
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearingPortfolio}
              >
                ยกเลิก
              </button>
              <button
                className="btn-confirm-delete"
                type="button"
                onClick={handleClearPortfolio}
                disabled={isClearingPortfolio}
              >
                {isClearingPortfolio ? "กำลังล้าง…" : "ยืนยัน ล้างพอร์ต"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="panel market-status-panel">
        <div className="mkt-bar">
          {[
            { flag:"🇹🇭", name:"SET Thailand",   hours:"10:00–12:30 · 14:30–17:00 ICT", open: marketNow.setOpen,  time: marketNow.setTime  },
            { flag:"🇺🇸", name:"NYSE / NASDAQ",  hours:"09:30–16:00 ET",                open: marketNow.nyseOpen, time: marketNow.nyseTime },
            { flag:"🇻🇳", name:"HOSE Vietnam",   hours:"09:00–11:30 · 13:00–15:00 ICT", open: marketNow.vnOpen,   time: marketNow.vnTime   },
            { flag:"🇨🇳", name:"SSE China",      hours:"09:30–11:30 · 13:00–15:00 CST", open: marketNow.cnOpen,   time: marketNow.cnTime   },
            { flag:"🇭🇰", name:"HKEX",           hours:"09:30–12:00 · 13:00–16:00 HKT", open: marketNow.hkOpen,   time: marketNow.hkTime   },
          ].map((m, i, arr) => (
            <div key={m.name} style={{display:"contents"}}>
              <div className={`mkt-item${m.open ? " mkt-open" : " mkt-closed"}`}>
                <span className="mkt-flag">{m.flag}</span>
                <span className={`mkt-dot${m.open ? " mkt-dot-open" : " mkt-dot-closed"}`} />
                <div className="mkt-info">
                  <span className="mkt-name">{m.name}</span>
                  <span className="mkt-hours">{m.hours}</span>
                </div>
                <div className="mkt-right">
                  <span className="mkt-time">{m.time}</span>
                  <span className={`mkt-badge${m.open ? " mkt-badge-open" : " mkt-badge-closed"}`}>
                    {m.open ? "OPEN" : "CLOSED"}
                  </span>
                </div>
              </div>
              {i < arr.length - 1 && <div className="mkt-sep" />}
            </div>
          ))}
        </div>
      </section>

      {/* ราคาแร่ & สินค้าโภคภัณฑ์ */}
      <section className="panel commodity-panel">
        <div className="commodity-header">
          <div className="commodity-title-row">
            <span className="commodity-title-icon">🪙</span>
            <h2>ราคาแร่ &amp; สินค้าโภคภัณฑ์</h2>
            <span className="commodity-subtitle">เรียงตามการเปลี่ยนแปลงวันนี้</span>
          </div>
          <button
            className="btn-commodity-refresh"
            onClick={loadCommodities}
            disabled={commoditiesLoading}
            title="รีเฟรช"
          >
            {commoditiesLoading ? "⌛" : "↻"}
          </button>
        </div>
        {commoditiesLoading ? (
          <div className="commodity-empty">กำลังโหลดราคา...</div>
        ) : commodities.length === 0 ? (
          <div className="commodity-empty">ไม่สามารถโหลดราคาได้ กดรีเฟรชเพื่อลองใหม่</div>
        ) : (
          <div className="commodity-list">
            {commodities.map((c, i) => (
              <div key={c.symbol} className="commodity-item">
                <span className="commodity-rank">#{i + 1}</span>
                <span className="commodity-icon-cell">{c.icon}</span>
                <div className="commodity-info">
                  <span className="commodity-name">{c.name_th}</span>
                  <span className="commodity-unit">{c.unit}</span>
                </div>
                <div className="commodity-price-block">
                  <span className="commodity-price">
                    ${c.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`commodity-pct ${c.change_pct >= 0 ? "commodity-up" : "commodity-down"}`}>
                    {c.change_pct >= 0 ? "▲" : "▼"} {Math.abs(c.change_pct).toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* เมกะเทรนด์โลก */}
      <section className="panel megatrend-panel">
        <div className="megatrend-header">
          <div className="megatrend-title-row">
            <span className="megatrend-title-icon">🌐</span>
            <h2>Mega Trends โลก 2025</h2>
          </div>
          <span className="megatrend-subtitle">เทรนด์การลงทุนระยะยาวที่กำลังเปลี่ยนโลก — พอร์ตคุณมี exposure ไหน?</span>
        </div>
        <div className="megatrend-list">
          {megaTrendData.map((t) => (
            <div key={t.trend} className={`megatrend-item${t.hasHoldings ? " megatrend-item--active" : ""}`}
              style={t.hasHoldings ? { borderColor: t.color + "55" } : {}}>
              <div className="megatrend-icon-wrap" style={{ background: t.color + "18" }}>
                <span className="megatrend-icon">{t.icon}</span>
              </div>
              <div className="megatrend-body">
                <div className="megatrend-top-row">
                  <span className="megatrend-name" style={{ color: t.hasHoldings ? t.color : undefined }}>{t.trend}</span>
                  {t.hasHoldings ? (
                    <span className="megatrend-badge megatrend-badge--yes" style={{ background: t.color + "20", color: t.color }}>
                      ✓ มีในพอร์ต
                    </span>
                  ) : (
                    <span className="megatrend-badge megatrend-badge--no">ยังไม่ลงทุน</span>
                  )}
                </div>
                <span className="megatrend-desc">{t.desc}</span>
                {t.hasHoldings && (
                  <div className="megatrend-bottom-row">
                    <div className="megatrend-chips">
                      {t.stocks.map((s) => (
                        <span key={s} className="megatrend-chip"
                          style={{ borderColor: t.color, color: t.color }}>
                          {s.replace(/\.BK$/i, "")}
                        </span>
                      ))}
                    </div>
                    {t.pct > 0 && (
                      <div className="megatrend-bar-wrap">
                        <div className="megatrend-bar-track">
                          <div className="megatrend-bar-fill"
                            style={{ width: `${Math.max(t.pct, 3)}%`, background: t.color }} />
                        </div>
                        <span className="megatrend-pct" style={{ color: t.color }}>{t.pct}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel pnl-panel">
        <div className="pnl-panel-header">
          <h2>Portfolio P&amp;L</h2>
        </div>
        <div className="pnl-grid">
          <div className="pnl-card">
            <span className="pnl-label">เงินสด</span>
            {isEditingCash ? (
              <div className="pnl-cash-edit">
                <input
                  className="pnl-cash-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashDraft}
                  onChange={(e) => setCashDraft(e.target.value)}
                  autoFocus
                />
                <div className="pnl-cash-actions">
                  <button className="btn-pnl-save" onClick={saveCashBalance}>Save</button>
                  <button className="btn-pnl-cancel" onClick={() => { setIsEditingCash(false); setCashDraft(String(cashBalance)); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="pnl-value-row">
                <span className="pnl-big-number">฿{cashBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <button className="btn-pnl-edit" onClick={() => setIsEditingCash(true)}>Edit</button>
              </div>
            )}
          </div>
          <div className="pnl-card">
            <span className="pnl-label">มูลค่าลงทุน (ต้นทุน)</span>
            <span className="pnl-big-number">฿{pnlData.totalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="pnl-card">
            <span className="pnl-label">มูลค่าพอร์ตปัจจุบัน</span>
            <span className="pnl-big-number">฿{pnlData.totalCurrentValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className={`pnl-card pnl-card--highlight ${pnlData.totalPnL >= 0 ? "pnl-card--profit" : "pnl-card--loss"}`}>
            <span className="pnl-label">กำไร / ขาดทุน</span>
            <span className="pnl-big-number pnl-pnl-number">
              {pnlData.totalPnL >= 0 ? "+" : ""}฿{pnlData.totalPnL.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="pnl-pct">({pnlData.totalPnLPct >= 0 ? "+" : ""}{pnlData.totalPnLPct.toFixed(2)}%)</span>
          </div>
          <div className="pnl-card pnl-card--wealth">
            <span className="pnl-label">ความมั่งคั่งรวม</span>
            <span className="pnl-big-number pnl-wealth-number">฿{pnlData.totalWealth.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </section>

      <section className="panel chart-panel">
        {(() => {
          const CHART_MODES = [
            { key: "stock",  label: "By Stock"  },
            { key: "sector", label: "By Sector" },
            { key: "market", label: "By Market" },
            { key: "pnl",    label: "By P&L"   },
          ];
          const CHART_TYPES = [
            { key: "pie",     label: "🥧 Pie"     },
            { key: "bar",     label: "📊 Bar"     },
            { key: "treemap", label: "⬛ Treemap" },
          ];
          const CHART_TITLES = {
            stock:  "แยกตามหุ้น",
            sector: "แยกตาม Sector",
            market: "แยกตาม THB / USD",
            pnl:    "แยกตาม P&L",
          };
          const activeData = chartMode === "sector" ? sectorData
            : chartMode === "market" ? marketData
            : chartMode === "pnl"    ? pnlStatusData
            : sortedPieData;

          function getCellColor(entry, index) {
            if (chartMode === "pnl") return entry.name === "กำไร" ? "#22c55e" : "#ef4444";
            if (chartMode === "market") return entry.name.startsWith("USD") ? "#f59e0b" : "#6366f1";
            return PIE_COLORS[index % PIE_COLORS.length];
          }

          const isMobile = windowWidth <= 599;
          const chartH = isMobile ? 240 : 360;
          const barH = Math.max(chartH, activeData.length * (isMobile ? 32 : 38));
          const treemapData = activeData.map((item, i) => ({ ...item, fill: getCellColor(item, i) }));

          const emptyMsg = chartMode === "pnl"
            ? "ยังไม่มีราคาปัจจุบัน กด $ บนหุ้นเพื่อดึงราคา"
            : "No data yet.";

          return (
            <>
              <div className="chart-panel-header">
                <div>
                  <h2>{CHART_TITLES[chartMode]}</h2>
                  <p className="subtext">
                    {usesEstimatedValues
                      ? `Total (THB est.): ${total.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
                      : `Total records: ${total}`}
                    {usdToThbRate !== USD_TO_THB_RATE_DEFAULT && <span className="fx-rate-tag"> · USD/THB {usdToThbRate.toFixed(2)}</span>}
                  </p>
                </div>
                <div className="chart-controls">
                  <div className="chart-mode-toggle">
                    {CHART_TYPES.map((t) => (
                      <button key={t.key} type="button"
                        className={`price-mode-btn${chartType === t.key ? " price-mode-btn--active" : ""}`}
                        onClick={() => setChartType(t.key)}
                      >{t.label}</button>
                    ))}
                  </div>
                  <div className="chart-mode-toggle">
                    {CHART_MODES.map((m) => (
                      <button key={m.key} type="button"
                        className={`price-mode-btn${chartMode === m.key ? " price-mode-btn--active" : ""}`}
                        onClick={() => setChartMode(m.key)}
                      >{m.label}</button>
                    ))}
                  </div>
                </div>
              </div>

              {summary && summary.length > 0 ? (
                activeData.length > 0 ? (
                  <div className="chart-wrap chart-wrap-with-legend">

                    {/* ── PIE ── */}
                    {chartType === "pie" && (
                      <ResponsiveContainer width="100%" height={chartH}>
                        <PieChart>
                          <Pie data={activeData} dataKey="value" nameKey="name"
                            outerRadius={isMobile ? 80 : 140} labelLine={false}
                            label={chartMode === "stock" ? <PieSliceLabel /> : undefined}
                          >
                            {activeData.map((entry, i) => <Cell key={entry.name} fill={getCellColor(entry, i)} />)}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}

                    {/* ── BAR ── */}
                    {chartType === "bar" && (
                      <ResponsiveContainer width="100%" height={barH}>
                        <BarChart layout="vertical" data={activeData}
                          margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
                        >
                          <XAxis type="number" tick={{ fontSize: 10 }}
                            tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toFixed(0)} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={isMobile ? 55 : 90} />
                          <Tooltip formatter={(v) => [v.toLocaleString("en-US", { maximumFractionDigits: 2 }), "Value"]} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {activeData.map((entry, i) => <Cell key={entry.name} fill={getCellColor(entry, i)} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}

                    {/* ── TREEMAP ── */}
                    {chartType === "treemap" && (
                      <ResponsiveContainer width="100%" height={chartH}>
                        <Treemap data={treemapData} dataKey="value" aspectRatio={16/9}
                          content={({ x, y, width, height, name, value, fill }) => {
                            if (!width || !height || width < 2 || height < 2) return null;
                            const showText = width > 44 && height > 26;
                            const showVal  = width > 60 && height > 46;
                            const fs = Math.min(12, Math.floor(width / 7));
                            return (
                              <g>
                                <rect x={x} y={y} width={width} height={height}
                                  fill={fill} stroke="var(--panel-bg)" strokeWidth={2} rx={4} />
                                {showText && (
                                  <text x={x + width/2} y={y + height/2 - (showVal ? 7 : 0)}
                                    textAnchor="middle" dominantBaseline="middle"
                                    fill="#fff" fontSize={fs} fontWeight={600}
                                  >{name}</text>
                                )}
                                {showVal && (
                                  <text x={x + width/2} y={y + height/2 + 9}
                                    textAnchor="middle" dominantBaseline="middle"
                                    fill="rgba(255,255,255,0.75)" fontSize={Math.max(8, fs - 2)}
                                  >{value.toLocaleString("en-US", { maximumFractionDigits: 0 })}</text>
                                )}
                              </g>
                            );
                          }}
                        />
                      </ResponsiveContainer>
                    )}

                    {/* ── LEGEND (ซ่อนสำหรับ bar เพราะ Y-axis แสดงชื่อแล้ว) ── */}
                    {chartType !== "bar" && (
                      <div className="chart-legend">
                        {activeData.map((item, index) => {
                          const isDraggable = chartMode === "stock" && chartType === "pie";
                          return (
                            <div
                              key={item.name}
                              className={[
                                "chart-legend-item",
                                isDraggable ? "chart-legend-item--draggable" : "",
                                isDraggable && pieDragOver === index ? "chart-legend-item--dragover" : "",
                              ].join(" ").trim()}
                              draggable={isDraggable}
                              onDragStart={() => { dragPieFrom.current = index; }}
                              onDragOver={(e) => { if (!isDraggable) return; e.preventDefault(); setPieDragOver(index); }}
                              onDragLeave={() => setPieDragOver(null)}
                              onDrop={() => {
                                setPieDragOver(null);
                                const from = dragPieFrom.current;
                                const to = index;
                                if (from === null || from === to) return;
                                setPieOrder(prev => {
                                  const next = [...prev];
                                  const [moved] = next.splice(from, 1);
                                  next.splice(to, 0, moved);
                                  return next;
                                });
                                dragPieFrom.current = null;
                              }}
                              onDragEnd={() => { setPieDragOver(null); dragPieFrom.current = null; }}
                            >
                              {isDraggable && <span className="chart-legend-drag-handle">⠿</span>}
                              {chartMode === "stock" && chartType === "pie"
                                ? <StockLogo symbol={item.name} className="stock-logo-sm" />
                                : <span className="sector-dot" style={{ background: getCellColor(item, index) }} />}
                              <span>{item.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="subtext">{emptyMsg}</p>
                )
              ) : (
                <p className="subtext">No data yet. Upload images and add stock names.</p>
              )}
            </>
          );
        })()}
      </section>

      <section className="panel stock-manager-panel">
        <div className="stock-manager-header">
          <h2>{stockTab === "watchlist" ? "Watchlist" : "Stocks In Pie"}</h2>
          <div className="stock-manager-header-actions">
            <button type="button" className={`price-mode-btn${stockTab === "portfolio" ? " price-mode-btn--active" : ""}`} onClick={() => setStockTab("portfolio")}>Portfolio</button>
            <button type="button" className={`price-mode-btn${stockTab === "watchlist" ? " price-mode-btn--active" : ""}`} onClick={() => setStockTab("watchlist")}>Watchlist</button>
            <button type="button" className="btn-inline-action" onClick={exportCsv} title="Export CSV">↓ CSV</button>
            <button type="button" className="btn-open-add-stock" onClick={() => setShowAddStockModal(true)}>+ Add Stock</button>
          </div>
        </div>
        {errorText && <p className="error" style={{ marginBottom: 8 }}>{errorText}</p>}
        {summary.length > 0 ? (
          <div className="stock-manager-list">
            {summary.filter((item) => {
              const meta = getStockMeta(item.name);
              return stockTab === "watchlist" ? meta.is_watchlist : !meta.is_watchlist;
            }).map((item, index) => {
              const groupEditingId = `group:${item.name}`;
              const meta = getStockMeta(item.name);
              const quantity = Number(meta.quantity) || 0;
              const price = Number(meta.price) || 0;
              const totalValue = quantity * price;
              const currencyLabel = meta.currency === "USD" ? "USD" : "บาท";
              const curPrice = Number(meta.current_price) || 0;
              const targetPrice = Number(meta.target_price) || 0;
              const stopLoss = Number(meta.stop_loss) || 0;
              const hitTarget = targetPrice > 0 && curPrice >= targetPrice;
              const hitStop = stopLoss > 0 && curPrice > 0 && curPrice <= stopLoss;
              const record = records.find((r) => r.stock_name === item.name);

              return (
                <div className="stock-manager-item" key={item.name}>
                  <div className="stock-manager-marker">
                    <StockLogo symbol={item.name} />
                    <span
                      className="stock-color-dot"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                  </div>
                  {editingId === groupEditingId ? (
                    <>
                      <div className="stock-manager-edit-row">
                        <input
                          className="edit-input"
                          value={editingName}
                          autoFocus
                          onChange={(event) => setEditingName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") saveGroupEdit(item.name);
                            if (event.key === "Escape") cancelEdit();
                          }}
                        />
                        <button className="btn-save" onClick={() => saveGroupEdit(item.name)}>Save</button>
                        <button className="btn-cancel" onClick={cancelEdit}>Cancel</button>
                      </div>
                      <div className="stock-manager-edit-finance">
                        <div className="stock-finance-grid">
                          <label className="stock-finance-field">
                            Qty
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={meta.quantity}
                              onChange={(event) => updateStockMeta(item.name, { quantity: event.target.value })}
                            />
                          </label>
                          <label className="stock-finance-field">
                            Price
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={meta.price}
                              onChange={(event) => updateStockMeta(item.name, { price: event.target.value })}
                            />
                          </label>
                          <label className="stock-finance-field">
                            Currency
                            <select
                              value={meta.currency}
                              onChange={(event) => updateStockMeta(item.name, { currency: event.target.value })}
                            >
                              <option value="THB">บาท</option>
                              <option value="USD">USD</option>
                            </select>
                          </label>
                          <label className="stock-finance-field">
                            Target Price
                            <input type="number" min="0" step="0.01" placeholder="(ไม่บังคับ)" value={meta.target_price}
                              onChange={(e) => updateStockMeta(item.name, { target_price: e.target.value })} />
                          </label>
                          <label className="stock-finance-field">
                            Stop Loss
                            <input type="number" min="0" step="0.01" placeholder="(ไม่บังคับ)" value={meta.stop_loss}
                              onChange={(e) => updateStockMeta(item.name, { stop_loss: e.target.value })} />
                          </label>
                          <div className="stock-finance-field stock-price-mode-field">
                            <div className="stock-price-mode-header">
                              <span className="stock-finance-label">ราคาปัจจุบัน</span>
                              <div className="price-mode-toggle">
                                <button
                                  type="button"
                                  className={`price-mode-btn${meta.price_mode !== "auto" ? " price-mode-btn--active" : ""}`}
                                  onClick={() => updateStockMeta(item.name, { price_mode: "manual" })}
                                >Manual</button>
                                <button
                                  type="button"
                                  className={`price-mode-btn${meta.price_mode === "auto" ? " price-mode-btn--active" : ""}`}
                                  onClick={() => fetchStockPrice(item.name)}
                                  disabled={fetchingPriceFor === item.name}
                                >Auto</button>
                              </div>
                            </div>
                            {meta.price_mode === "auto" ? (
                              <div className="stock-price-auto-row">
                                <span className="stock-price-auto-value">
                                  {fetchingPriceFor === item.name
                                    ? "กำลังดึง..."
                                    : meta.current_price
                                      ? Number(meta.current_price).toLocaleString("en-US", { maximumFractionDigits: 4 })
                                      : "—"}
                                </span>
                                <button
                                  type="button"
                                  className="btn-refresh-price"
                                  onClick={() => fetchStockPrice(item.name)}
                                  disabled={fetchingPriceFor === item.name}
                                  title="รีเฟรชราคา"
                                >↻</button>
                              </div>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="(ไม่บังคับ)"
                                value={meta.current_price}
                                onChange={(event) => updateStockMeta(item.name, { current_price: event.target.value })}
                              />
                            )}
                            {priceFetchError && fetchingPriceFor === null && meta.price_mode === "auto" && (
                              <span className="stock-price-error">{priceFetchError}</span>
                            )}
                          </div>
                        </div>
                        <p className="stock-estimate">
                          มูลค่าประมาณ: {currencyLabel} {totalValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="stock-manager-info">
                        <p className="stock-manager-name">
                          {item.name}
                          {meta.note && <span className="note-dot" title={meta.note} />}
                          {hitTarget && <span className="alert-badge alert-badge--target" title={`ถึงเป้า ${targetPrice}`}>▲ Target</span>}
                          {hitStop && <span className="alert-badge alert-badge--stop" title={`ถึง Stop ${stopLoss}`}>▼ Stop</span>}
                        </p>
                        <p className="stock-manager-count">{item.value} record{item.value > 1 ? "s" : ""}</p>
                        {(meta.quantity || meta.price) && (
                          <p className="stock-estimate">
                            มูลค่าประมาณ: {currencyLabel} {totalValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                          </p>
                        )}
                        {/* ราคาปัจจุบัน + %change */}
                        {fetchingPriceFor === item.name ? (
                          <p className="stock-live-price stock-live-price--loading">⌛ กำลังดึงราคา...</p>
                        ) : curPrice > 0 ? (
                          <p className="stock-live-price">
                            <span className="stock-live-price-val">
                              {meta.currency === "USD" ? "$" : "฿"}{curPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            </span>
                            {price > 0 && (() => {
                              const pct = (curPrice - price) / price * 100;
                              return (
                                <span className={`stock-live-pct ${pct >= 0 ? "stock-live-pct--up" : "stock-live-pct--down"}`}>
                                  {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
                                </span>
                              );
                            })()}
                          </p>
                        ) : null}
                        {(targetPrice > 0 || stopLoss > 0) && (
                          <p className="stock-targets">
                            {targetPrice > 0 && <span className="target-tag">🎯 {targetPrice}</span>}
                            {stopLoss > 0 && <span className="stop-tag">🛑 {stopLoss}</span>}
                          </p>
                        )}
                        {meta.note && <p className="note-preview">{meta.note}</p>}
                      </div>
                      <div className="stock-manager-actions">
                        <button
                          className={`btn-inline-action btn-fetch-price${fetchingPriceFor === item.name ? " btn-fetch-price--active" : ""}`}
                          onClick={() => fetchStockPrice(item.name)}
                          disabled={fetchingPriceFor === item.name}
                          title="ดึงราคาปัจจุบัน"
                        >$</button>
                        <button className="btn-inline-action" onClick={() => { setEditingId(groupEditingId); setEditingName(item.name); }}>Edit</button>
                        <button className="btn-inline-action btn-plan" onClick={() => openPlanModal(item.name)} title={meta.note ? "แก้ไขโน้ต" : "เพิ่มโน้ต"}>Plan</button>
                        <button className="btn-inline-action" onClick={() => { setHistoryModal({ symbol: item.name, currency: meta.currency }); setHistoryPeriod("1mo"); loadPriceHistory(item.name, meta.currency, "1mo"); }} title="ดูกราฟราคา">Chart</button>
                        <button className="btn-inline-action" onClick={() => { if (record) { setTxModal({ stockId: record.id, stockName: item.name }); loadTransactions(record.id); } }} title="ประวัติการซื้อขาย">Tx</button>
                        <button className="btn-inline-action" onClick={() => record && toggleWatchlistFn(record.id)} title={meta.is_watchlist ? "นำออกจาก Watchlist" : "เพิ่มใน Watchlist"}>
                          {meta.is_watchlist ? "★" : "☆"}
                        </button>
                        <button className="btn-inline-action btn-inline-delete" onClick={() => deleteGroup(item.name)}>Del</button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="subtext">No stocks in pie yet.</p>
        )}
      </section>

      <section className="panel evaluation-panel">
        {features.evaluation_simulator?.enabled === false ? (
          <div className="feature-maintenance">
            <div className="feature-maintenance-icon">⚙</div>
            <h3 className="feature-maintenance-title">กำลังปรับปรุง</h3>
            <p className="feature-maintenance-msg">
              {features.evaluation_simulator?.message || "ขออภัยในความไม่สะดวก ระบบจะกลับมาให้บริการเร็วๆ นี้"}
            </p>
          </div>
        ) : (
        <><div className="evaluation-header">
          <div>
            <h2>Portfolio Evaluation Simulator</h2>
            <p className="subtext">สุ่มคะแนนพอร์ตเต็ม 10 แล้วจัดประเภทเป็นหุ้นเติบโตหรือหุ้น Value</p>
            <div className="evaluation-controls">
              <label htmlFor="investor-model" className="subtext">สูตรจากนักลงทุน:</label>
              <select
                id="investor-model"
                value={selectedInvestorId}
                onChange={(event) => {
                  setSelectedInvestorId(event.target.value);
                  setScanResult(null);
                }}
              >
                {INVESTOR_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>{model.label}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            className="btn-scan-portfolio"
            onClick={simulatePortfolioScan}
            disabled={isScanningPortfolio || summary.length === 0}
          >
            {isScanningPortfolio ? "กำลังสแกน..." : "สแกนพอตหุ้น"}
          </button>
        </div>

        {summary.length === 0 ? (
          <p className="subtext">ยังไม่มีข้อมูลพอร์ตสำหรับจำลองการประเมิน</p>
        ) : scanResult ? (
          <div className="evaluation-result">
            <div className="score-card">
              <span className="score-label">คะแนนประเมิน</span>
              <strong className="score-value">{scanResult.score}/10</strong>
            </div>
            <div className="evaluation-meta">
              <span className="type-badge">{scanResult.type}</span>
              <p className="evaluation-note">สูตรที่ใช้: {scanResult.selectedModel}</p>
              <p className="evaluation-note">{scanResult.note}</p>
              <p className="evaluation-note">ดึงข้อมูลจาก Pie Chart ทั้งหมด {scanResult.totalRecords} รายการ</p>
              <div className="scan-stock-list">
                {scanResult.formulaBreakdown.map((item) => (
                  <span className="scan-stock-pill" key={item}>{item}</span>
                ))}
              </div>
              <div className="scan-stock-list">
                {scanResult.analyzedStocks.map((item) => (
                  <span className="scan-stock-pill" key={item}>{item}</span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="subtext">กดปุ่มสแกนเพื่อจำลองผลประเมินพอร์ตหุ้น</p>
        )}
        </>
        )}
      </section>

      {showAddStockModal && (
        <div className="add-stock-modal-backdrop" onClick={() => {
          setShowAddStockModal(false);
          setStockSearchResults([]);
          clearTimeout(stockSearchTimer.current);
        }}>
          <div className="add-stock-modal" onClick={(e) => e.stopPropagation()}>
            <h3>เพิ่มหุ้น</h3>
            <p className="subtext">ค้นหาหุ้น US 🇺🇸 · ไทย 🇹🇭 · จีน 🇨🇳 · เวียดนาม 🇻🇳 · ฮ่องกง 🇭🇰</p>
            <div className="add-stock-search-wrap">
              <input
                className="add-stock-search-input"
                value={manualStockName}
                placeholder="พิมพ์ชื่อหรือ symbol เช่น Apple, PTT, AAPL"
                autoFocus
                autoComplete="off"
                onChange={(e) => {
                  const val = e.target.value;
                  setManualStockName(val);
                  clearTimeout(stockSearchTimer.current);
                  if (val.trim().length >= 1) {
                    setStockSearchLoading(true);
                    stockSearchTimer.current = setTimeout(() => searchStocks(val.trim()), 350);
                  } else {
                    setStockSearchResults([]);
                    setStockSearchLoading(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addManualStock();
                  if (e.key === "Escape") { setShowAddStockModal(false); setStockSearchResults([]); }
                }}
              />
              {/* Dropdown results */}
              {(stockSearchLoading || stockSearchResults.length > 0) && (
                <div className="stock-search-dropdown">
                  {stockSearchLoading ? (
                    <div className="stock-search-empty">🔍 กำลังค้นหา...</div>
                  ) : stockSearchResults.length === 0 ? (
                    <div className="stock-search-empty">ไม่พบหุ้นที่ค้นหา</div>
                  ) : (
                    stockSearchResults.map((r) => (
                      <div key={r.symbol} className="stock-search-item"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setManualStockName(r.symbol);
                          setStockSearchResults([]);
                        }}
                      >
                        <span className="stock-search-flag">{r.flag}</span>
                        <span className="stock-search-symbol">{r.symbol}</span>
                        <span className="stock-search-name">{r.name}</span>
                        <span className="stock-search-exch">{r.exchange}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            {manualStockName.trim() && (
              <p className="add-stock-hint">
                กด <strong>Add</strong> เพื่อเพิ่ม <strong>{manualStockName.trim().toUpperCase()}</strong>
              </p>
            )}
            <div className="add-stock-modal-actions">
              <button type="button" className="btn-cancel" onClick={() => {
                setShowAddStockModal(false);
                setStockSearchResults([]);
              }}>Cancel</button>
              <button type="button" className="btn-add-stock" onClick={addManualStock} disabled={isAddingManualStock || !manualStockName.trim()}>
                {isAddingManualStock ? "กำลังเพิ่ม..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportModalOpen && (
        <div className="report-modal-backdrop" onClick={() => setReportModalOpen(false)}>
          <div className="report-modal" onClick={(e) => e.stopPropagation()}>
            <h3>แจ้งปัญหา / Report Issue</h3>
            <p className="subtext">ทีมงานจะรับเรื่องและตอบกลับโดยเร็ว</p>
            {reportSuccess ? (
              <div className="report-success">
                <p>ส่งเรื่องเรียบร้อยแล้ว ขอบคุณที่แจ้งปัญหา</p>
              </div>
            ) : (
              <>
                <input
                  className="report-subject-input"
                  placeholder="หัวข้อปัญหา เช่น ล็อกอินไม่ได้, ข้อมูลหาย"
                  value={reportSubject}
                  onChange={(e) => setReportSubject(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") setReportModalOpen(false); }}
                  autoFocus
                />
                <textarea
                  className="plan-textarea"
                  placeholder="อธิบายปัญหาให้ละเอียด เพื่อให้ทีมงานช่วยได้เร็วขึ้น..."
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={5}
                  onKeyDown={(e) => { if (e.key === "Escape") setReportModalOpen(false); }}
                />
                <div className="plan-modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setReportModalOpen(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitReport}
                    disabled={reportSubmitting || !reportSubject.trim() || !reportDescription.trim()}
                  >
                    {reportSubmitting ? "กำลังส่ง..." : "ส่งเรื่อง"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {txModal && (
        <div className="modal-backdrop" onClick={() => setTxModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transaction Log — {txModal.stockName}</h3>
              <button type="button" className="btn-cancel" onClick={() => setTxModal(null)}>✕</button>
            </div>
            <div className="tx-form">
              <div className="tx-form-row">
                <select className="tx-select" value={txForm.tx_type} onChange={(e) => setTxForm((f) => ({ ...f, tx_type: e.target.value }))}>
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
                <input className="tx-input" type="number" min="0" step="0.01" placeholder="Qty" value={txForm.quantity} onChange={(e) => setTxForm((f) => ({ ...f, quantity: e.target.value }))} />
                <input className="tx-input" type="number" min="0" step="0.01" placeholder="Price" value={txForm.price} onChange={(e) => setTxForm((f) => ({ ...f, price: e.target.value }))} />
                <select className="tx-select" value={txForm.currency} onChange={(e) => setTxForm((f) => ({ ...f, currency: e.target.value }))}>
                  <option value="THB">THB</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="tx-form-row">
                <input className="tx-input" type="date" value={txForm.tx_date} onChange={(e) => setTxForm((f) => ({ ...f, tx_date: e.target.value }))} />
                <input className="tx-input" type="text" placeholder="Note (optional)" value={txForm.note} onChange={(e) => setTxForm((f) => ({ ...f, note: e.target.value }))} style={{ flex: 2 }} />
                <button type="button" className="btn-add-stock" onClick={() => addTransactionFn(txModal.stockId)}>+ Add</button>
              </div>
            </div>
            <div className="tx-list">
              {txLoading ? <p className="subtext">Loading...</p> : txList.length === 0 ? <p className="subtext">No transactions yet.</p> : txList.map((tx) => (
                <div key={tx.id} className={`tx-item tx-item--${tx.tx_type}`}>
                  <span className={`tx-type-badge tx-type-badge--${tx.tx_type}`}>{tx.tx_type.toUpperCase()}</span>
                  <span className="tx-detail">{tx.quantity} @ {tx.price} {tx.currency}</span>
                  <span className="tx-date">{tx.tx_date}</span>
                  {tx.note && <span className="tx-note">{tx.note}</span>}
                  <button type="button" className="btn-inline-delete tx-del" onClick={() => deleteTransactionFn(tx.id, txModal.stockId)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {historyModal && (
        <div className="modal-backdrop" onClick={() => setHistoryModal(null)}>
          <div className="modal-box modal-box--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Price History — {historyModal.symbol}</h3>
              <div className="history-period-btns">
                {["1wk","1mo","3mo","6mo","1y"].map((p) => (
                  <button key={p} type="button"
                    className={`price-mode-btn${historyPeriod === p ? " price-mode-btn--active" : ""}`}
                    onClick={() => { setHistoryPeriod(p); loadPriceHistory(historyModal.symbol, historyModal.currency, p); }}>
                    {p}
                  </button>
                ))}
              </div>
              <div className="history-period-btns" style={{marginLeft:8}}>
                {[{id:"candle",label:"แท่งเทียน"},{id:"line",label:"เส้น"},{id:"area",label:"พื้นที่"}].map(({id,label}) => (
                  <button key={id} type="button"
                    className={`price-mode-btn${historyChartType === id ? " price-mode-btn--active" : ""}`}
                    onClick={() => setHistoryChartType(id)}>
                    {label}
                  </button>
                ))}
              </div>
              <button type="button" className="btn-cancel" onClick={() => setHistoryModal(null)}>✕</button>
            </div>
            {historyLoading ? <p className="subtext" style={{padding:"24px"}}>Loading...</p> : historyData.length === 0 ? <p className="subtext" style={{padding:"24px"}}>No data.</p> : (() => {
              const closes = historyData.map((d) => d.close);
              const lows = historyData.map((d) => d.low ?? d.close);
              const highs = historyData.map((d) => d.high ?? d.close);
              const min = Math.min(...lows);
              const max = Math.max(...highs);
              const last = closes[closes.length - 1] ?? 0;
              const first = closes[0] ?? 0;
              const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
              return (
                <div className="history-chart-wrap">
                  <div className="history-stats">
                    <span>Low: <strong>{min.toFixed(2)}</strong></span>
                    <span>High: <strong>{max.toFixed(2)}</strong></span>
                    <span>Last: <strong>{last.toFixed(2)}</strong></span>
                    <span className={changePct >= 0 ? "pnl-positive" : "pnl-negative"}>{changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%</span>
                  </div>
                  {historyChartType === "candle" && (
                    <CandlestickChart data={historyData} height={260} />
                  )}
                  {historyChartType === "line" && (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={historyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} interval="preserveStartEnd" />
                        <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} width={55} />
                        <Tooltip formatter={(v) => [v.toFixed(2), "Close"]} labelStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="close" stroke="#7c3aed" strokeWidth={1.8} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  {historyChartType === "area" && (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={historyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} interval="preserveStartEnd" />
                        <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} width={55} />
                        <Tooltip formatter={(v) => [v.toFixed(2), "Close"]} labelStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="close" stroke="#7c3aed" strokeWidth={1.8} fill="url(#areaGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {showCreatePortfolio && (
        <div className="modal-backdrop" onClick={() => setShowCreatePortfolio(false)}>
          <div className="add-stock-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Portfolio</h3>
            <input className="lp-input" type="text" placeholder="Portfolio name" value={newPortfolioName}
              autoFocus onChange={(e) => setNewPortfolioName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createPortfolio(); if (e.key === "Escape") setShowCreatePortfolio(false); }} />
            <div className="add-stock-modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowCreatePortfolio(false)}>Cancel</button>
              <button type="button" className="btn-add-stock" onClick={createPortfolio} disabled={!newPortfolioName.trim()}>Create</button>
            </div>
          </div>
        </div>
      )}

      {planModalStockName && (
        <div className="plan-modal-backdrop" onClick={() => setPlanModalStockName(null)}>
          <div className="plan-modal" onClick={(e) => e.stopPropagation()}>
            <div className="plan-modal-header">
              <StockLogo symbol={planModalStockName} />
              <div>
                <h3>{planModalStockName}</h3>
                <p className="subtext">บันทึกเหตุผลที่ซื้อหุ้นตัวนี้</p>
              </div>
            </div>
            <textarea
              className="plan-textarea"
              value={planDraft}
              onChange={(e) => setPlanDraft(e.target.value)}
              placeholder="เช่น ซื้อเพราะ P/E ต่ำ, ปันผลดี, เป็นผู้นำตลาด, เติบโต 20%/ปี..."
              rows={6}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") setPlanModalStockName(null);
              }}
            />
            <div className="plan-modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setPlanModalStockName(null)}>
                Cancel
              </button>
              <button type="button" onClick={savePlan}>
                Save Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {showHelpModal && (
        <div className="help-modal-backdrop" onClick={() => setShowHelpModal(false)}>
          <div className="help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="help-modal-header">
              <h2 className="help-modal-title">วิธีใช้งาน</h2>
              <button type="button" className="help-modal-close" onClick={() => setShowHelpModal(false)}>✕</button>
            </div>
            <div className="help-modal-body">
              <div className="help-section">
                <div className="help-step-num">1</div>
                <div className="help-step-content">
                  <h4>เพิ่มหุ้นเข้าพอร์ต</h4>
                  <p>กดปุ่ม <strong>+ Add Stock</strong> ใต้รายการหุ้น พิมพ์ชื่อหุ้น แล้วกด Add</p>
                  <div className="help-tip">หุ้นไทยใช้ชื่อย่อ เช่น <code>PTT</code>, <code>AOT</code> — หุ้นสหรัฐใช้ <code>AAPL</code>, <code>NVDA</code></div>
                </div>
              </div>

              <div className="help-section">
                <div className="help-step-num">2</div>
                <div className="help-step-content">
                  <h4>ตั้งค่าจำนวนและต้นทุน</h4>
                  <p>กดแถบหุ้นเพื่อกรอก <strong>Qty</strong> (จำนวนหุ้น) และ <strong>Cost</strong> (ราคาทุนเฉลี่ยต่อหุ้น) จากนั้นกด <strong>Save</strong></p>
                </div>
              </div>

              <div className="help-section">
                <div className="help-step-num">3</div>
                <div className="help-step-content">
                  <h4>ดึงราคาปัจจุบัน</h4>
                  <p>กดปุ่ม <strong>$</strong> บนการ์ดหุ้น ระบบจะดึงราคา real-time และคำนวณ P&amp;L ให้อัตโนมัติ</p>
                  <div className="help-tip">ตั้ง <strong>Target</strong> และ <strong>Stop</strong> เพื่อติดตามเป้าหมาย</div>
                </div>
              </div>

              <div className="help-section">
                <div className="help-step-num">4</div>
                <div className="help-step-content">
                  <h4>บันทึกประวัติซื้อขาย</h4>
                  <p>กดปุ่ม <strong>Tx</strong> บนหุ้น → เลือก Buy หรือ Sell → กรอก qty / ราคา / วันที่ แล้วกด Add</p>
                </div>
              </div>

              <div className="help-section">
                <div className="help-step-num">5</div>
                <div className="help-step-content">
                  <h4>ดูกราฟราคา</h4>
                  <p>กดปุ่ม <strong>Chart</strong> บนหุ้น เลือกรูปแบบ แท่งเทียน / เส้น / พื้นที่ และ timeframe ที่ต้องการ</p>
                </div>
              </div>

              <div className="help-section">
                <div className="help-step-num">6</div>
                <div className="help-step-content">
                  <h4>Watchlist</h4>
                  <p>กดปุ่ม <strong>☆</strong> บนหุ้นเพื่อเพิ่มเข้า Watchlist แล้วสลับดูที่แถบ <strong>Watchlist</strong> ด้านล่าง</p>
                </div>
              </div>

              <div className="help-section">
                <div className="help-step-num">7</div>
                <div className="help-step-content">
                  <h4>ยอดเงินสด</h4>
                  <p>กดช่อง <strong>Cash</strong> ใน P&amp;L Panel เพื่อแก้ไขยอดเงินสดในพอร์ต ระบบจะรวมยอดในภาพรวม Wealth</p>
                </div>
              </div>

              <div className="help-section">
                <div className="help-step-num">8</div>
                <div className="help-step-content">
                  <h4>สแกนพอร์ต (Scan)</h4>
                  <p>กดปุ่ม <strong>Scan</strong> แล้ว Upload ภาพ screenshot พอร์ต ระบบจะอ่านชื่อหุ้นให้อัตโนมัติ (ใช้ Credits)</p>
                </div>
              </div>

              <div className="help-section help-section--warn">
                <div className="help-step-num help-step-num--warn">!</div>
                <div className="help-step-content">
                  <h4>ล้างพอร์ต</h4>
                  <p>ปุ่ม <strong>ล้างพอร์ต</strong> จะลบข้อมูลหุ้น ยอดถือครอง และยอดเงินสดทั้งหมด <strong>ไม่สามารถกู้คืนได้</strong></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
    </>
  );
}
