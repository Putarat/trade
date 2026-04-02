import { useEffect, useMemo, useState } from "react";

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
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const PIE_COLORS = ["#2667ff", "#38b000", "#ff7b00", "#f72585", "#00b4d8", "#7b2cbf"];
const USD_TO_THB_RATE = 36;
const PAYMENT_PLANS = [
  { id: "pay-per-scan", title: "สแกน 1 ครั้ง", priceTHB: 20, credits: 1, note: "เหมาะกับใช้งานเป็นครั้ง ๆ" },
  { id: "starter-pack", title: "แพ็กเริ่มต้น", priceTHB: 149, credits: 10, note: "เฉลี่ยถูกลงต่อครั้ง" },
  { id: "pro-monthly", title: "รายเดือน", priceTHB: 299, credits: 30, note: "สำหรับคนสแกนบ่อย" }
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

function getStockLogoUrl(symbol) {
  return `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`;
}

function StockLogo({ symbol, className = "stock-logo" }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [symbol]);

  if (!symbol || hasError) {
    return <span className={`${className} stock-logo-fallback`}>{(symbol || "?").slice(0, 2)}</span>;
  }

  return (
    <img
      src={getStockLogoUrl(symbol)}
      alt={`${symbol} logo`}
      className={className}
      loading="lazy"
      onError={() => setHasError(true)}
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
  const [imgError, setImgError] = useState(false);

  if (!percent || percent < 0.06) {
    return null;
  }

  const RADIAN = Math.PI / 180;
  const ICON_SIZE = 26;
  const GAP = 10;
  const iconR = (outerRadius || 140) + GAP + ICON_SIZE / 2;
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
          href={getStockLogoUrl(name)}
          x={iconCx - ICON_SIZE / 2}
          y={iconCy - ICON_SIZE / 2}
          width={ICON_SIZE}
          height={ICON_SIZE}
          clipPath={`url(#${clipId})`}
          onError={() => setImgError(true)}
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
  const [statusText, setStatusText] = useState("Loading backend status...");
  const [selectedFile, setSelectedFile] = useState(null);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState([]);
  const [lastExtracted, setLastExtracted] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [scanResult, setScanResult] = useState(null);
  const [isScanningPortfolio, setIsScanningPortfolio] = useState(false);
  const [displayName, setDisplayName] = useState("Demo Investor");
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [draftDisplayName, setDraftDisplayName] = useState("Demo Investor");
  const [stockMeta, setStockMeta] = useState({});
  const [manualStockName, setManualStockName] = useState("");
  const [isAddingManualStock, setIsAddingManualStock] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [activeScreen, setActiveScreen] = useState("app");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [scanCredits, setScanCredits] = useState(0);
  const [selectedInvestorId, setSelectedInvestorId] = useState(INVESTOR_MODELS[0].id);

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
      try {
        const healthResponse = await fetch("/api/health");
        const healthData = await healthResponse.json();
        setStatusText(`Backend: ${healthData.status}`);
      } catch (error) {
        setStatusText("Backend unavailable");
      }

      await loadRecords();
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

      setAuthPassword("");
      setAuthDisplayName("");
    } catch {
      setAuthError("Authentication failed");
    } finally {
      setIsAuthenticating(false);
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
      setAuthToken("");
      setAuthUser(null);
      setDisplayName("Demo Investor");
      setDraftDisplayName("Demo Investor");
      setAuthEmail("");
      setAuthPassword("");
      setAuthDisplayName("");
      setActiveScreen("app");
    }
  }

  async function loadRecords() {
    try {
      const response = await fetch("/api/stocks");
      const data = await response.json();
      setRecords(data.items || []);
      setSummary(data.summary || []);
    } catch (error) {
      setErrorText("Cannot load stock records");
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setErrorText("");
    }
  }

  function handleDragOver(event) {
    event.preventDefault();
  }

  function handleFileInput(event) {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setErrorText("");
    }
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!selectedFile) {
      setErrorText("Please choose an image");
      return;
    }

    setIsUploading(true);
    setErrorText("");

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch("/api/stocks/upload", {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorText(data.detail || "Upload failed");
        return;
      }

      setRecords((prev) => [...(data.items || []), ...prev]);
      setSummary(data.summary || []);
      setLastExtracted(data.extracted || []);
      setSelectedFile(null);
    } catch (error) {
      setErrorText("Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  const pieData = useMemo(() => {
    return summary.map((item) => {
      const meta = {
        quantity: "",
        price: "",
        currency: "THB",
        ...(stockMeta[item.name] || {})
      };

      const quantity = Number(meta.quantity) || 0;
      const price = Number(meta.price) || 0;
      const isEstimated = quantity > 0 && price > 0;

      if (!isEstimated) {
        return {
          name: item.name,
          value: item.value,
          isEstimated: false
        };
      }

      const rawValue = quantity * price;
      const valueInTHB = meta.currency === "USD" ? rawValue * USD_TO_THB_RATE : rawValue;

      return {
        name: item.name,
        value: Number(valueInTHB.toFixed(2)),
        isEstimated: true
      };
    });
  }, [summary, stockMeta]);

  const usesEstimatedValues = useMemo(() => pieData.some((item) => item.isEstimated), [pieData]);
  const total = useMemo(() => pieData.reduce((acc, item) => acc + item.value, 0), [pieData]);

  function startEdit(item) {
    setEditingId(item.id);
    setEditingName(item.stock_name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  async function saveEdit(id) {
    if (!editingName.trim()) return;

    try {
      const response = await fetch(`/api/stocks/${id}/rename`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_name: editingName.trim() })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorText(data.detail || "Rename failed");
        return;
      }

      setRecords((prev) =>
        prev.map((r) => (r.id === id ? data.item : r))
      );
      setSummary(data.summary || []);
      cancelEdit();
    } catch {
      setErrorText("Rename failed");
    }
  }

  async function deleteRecord(id) {
    try {
      const response = await fetch(`/api/stocks/${id}/delete`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setErrorText(data.detail || "Delete failed");
        return;
      }
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setSummary(data.summary || []);
    } catch {
      setErrorText("Delete failed");
    }
  }

  async function saveGroupEdit(oldName) {
    if (!editingName.trim()) {
      return;
    }

    try {
      const response = await fetch("/api/stocks/group", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_name: oldName, new_name: editingName.trim() })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorText(data.detail || "Rename failed");
        return;
      }

      setRecords((prev) =>
        prev.map((record) =>
          record.stock_name === oldName ? { ...record, stock_name: editingName.trim().toUpperCase() } : record
        )
      );
      setStockMeta((prev) => {
        const nextName = editingName.trim().toUpperCase();
        const nextMeta = { ...prev };
        if (oldName in nextMeta) {
          nextMeta[nextName] = nextMeta[oldName];
          delete nextMeta[oldName];
        }
        return nextMeta;
      });
      setSummary(data.summary || []);
      cancelEdit();
    } catch {
      setErrorText("Rename failed");
    }
  }

  async function deleteGroup(stockName) {
    try {
      const response = await fetch("/api/stocks/group/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_name: stockName })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorText(data.detail || "Delete failed");
        return;
      }

      setRecords((prev) => prev.filter((record) => record.stock_name !== stockName));
      setStockMeta((prev) => {
        const nextMeta = { ...prev };
        delete nextMeta[stockName];
        return nextMeta;
      });
      setSummary(data.summary || []);
      if (editingId === `group:${stockName}`) {
        cancelEdit();
      }
    } catch {
      setErrorText("Delete failed");
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
    return {
      quantity: "",
      price: "",
      currency: "THB",
      ...(stockMeta[name] || {})
    };
  }

  function updateStockMeta(name, patch) {
    setStockMeta((prev) => ({
      ...prev,
      [name]: {
        quantity: "",
        price: "",
        currency: "THB",
        ...(prev[name] || {}),
        ...patch
      }
    }));
  }

  function saveDisplayName() {
    const nextName = draftDisplayName.trim();
    if (!nextName) {
      return;
    }

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

    try {
      const response = await fetch("/api/stocks/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_name: name })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorText(data.detail || "Add stock failed");
        return;
      }

      setRecords((prev) => [data.item, ...prev]);
      setSummary(data.summary || []);
      setManualStockName("");
      setShowAddStockModal(false);
    } catch {
      setErrorText("Add stock failed");
    } finally {
      setIsAddingManualStock(false);
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

  if (!authUser) {
    return (
      <main className="container auth-page">
        <section className="panel auth-panel">
          <h1>{authMode === "login" ? "Login" : "Create Account"}</h1>
          <p className="subtext">ล็อกอินก่อนใช้งานระบบสแกนพอร์ตหุ้น</p>

          <form className="auth-form" onSubmit={submitAuth}>
            <input
              type="email"
              placeholder="Email"
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password (อย่างน้อย 6 ตัว)"
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
              required
            />
            {authMode === "register" && (
              <input
                type="text"
                placeholder="Display name"
                value={authDisplayName}
                onChange={(event) => setAuthDisplayName(event.target.value)}
              />
            )}

            <button type="submit" disabled={isAuthenticating}>
              {isAuthenticating ? "Processing..." : authMode === "login" ? "Login" : "Register & Login"}
            </button>
          </form>

          {authError && <p className="error">{authError}</p>}

          <button
            type="button"
            className="btn-inline-action"
            onClick={() => {
              setAuthError("");
              setAuthMode((prev) => (prev === "login" ? "register" : "login"));
            }}
          >
            {authMode === "login" ? "ยังไม่มีบัญชี? สมัครสมาชิก" : "มีบัญชีแล้ว? เข้าสู่ระบบ"}
          </button>
        </section>
      </main>
    );
  }

  if (activeScreen !== "app") {
    return (
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
    );
  }

  return (
    <main className="container">
      <section className="panel top-panel">
        <div className="top-panel-grid">
          <div className="top-panel-main">
            <div className="title-row">
              <h1>Stock Image Tracker</h1>
            </div>
            <p className="status">{statusText}</p>

            <form onSubmit={handleUpload} className="upload-form">
              <div className="dropzone" onDrop={handleDrop} onDragOver={handleDragOver}>
                <p>Drop portfolio screenshot here</p>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  style={{ display: "none" }}
                />
                <label htmlFor="file-upload" style={{
                  display: "block",
                  width: "100%",
                  background: "#222a",
                  color: "#fff",
                  borderRadius: 8,
                  padding: "10px 0",
                  textAlign: "center",
                  cursor: "pointer",
                  marginBottom: 8,
                  fontWeight: 600,
                  fontSize: "1rem"
                }}>
                  เลือกไฟล์
                </label>
                <span style={{
                  display: "block",
                  width: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "0.98rem",
                  color: "#fff",
                  background: "#2226",
                  borderRadius: 8,
                  padding: "6px 8px",
                  marginBottom: 4
                }}>
                  {selectedFile ? selectedFile.name : "ไม่ได้เลือกไฟล์ใด"}
                </span>
              </div>

              <button type="submit" disabled={isUploading}>
                {isUploading ? "Extracting..." : "Extract Stocks and Build Pie"}
              </button>
            </form>
          </div>

          <aside className="top-panel-side">
            <div className="user-chip user-chip-panel">
              <span className="user-chip-label">Logged in as</span>
              {isEditingUser ? (
                <div className="user-chip-edit-row">
                  <input
                    className="user-chip-input"
                    value={draftDisplayName}
                    autoFocus
                    onChange={(event) => setDraftDisplayName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") saveDisplayName();
                      if (event.key === "Escape") cancelDisplayNameEdit();
                    }}
                  />
                  <button className="btn-save" type="button" onClick={saveDisplayName}>Save</button>
                  <button className="btn-cancel" type="button" onClick={cancelDisplayNameEdit}>Cancel</button>
                </div>
              ) : (
                <div className="user-chip-view">
                  <strong className="user-chip-name">{displayName}</strong>
                  <button
                    className="btn-inline-action"
                    type="button"
                    onClick={() => {
                      setDraftDisplayName(displayName);
                      setIsEditingUser(true);
                    }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            <button className="btn-dark-toggle" onClick={() => setDarkMode((d) => !d)} title="Toggle dark mode">
              {darkMode ? "☀ Light" : "☾ Dark"}
            </button>
            <button className="btn-inline-delete" type="button" onClick={handleLogout}>Logout</button>
            <button className="btn-inline-action" type="button" onClick={openPaymentUI}>Payment UI</button>
            <p className="credits-badge">Credits: {scanCredits}</p>
          </aside>
        </div>

        {errorText && <p className="error">{errorText}</p>}
        {lastExtracted.length > 0 && (
          <p className="subtext">Detected: {lastExtracted.join(", ")}</p>
        )}
      </section>

      <section className="panel evaluation-panel">
        <div className="evaluation-header">
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
      </section>

      <section className="panel chart-panel">
        <h2>Pie Chart by Stock Name</h2>
        <p className="subtext">
          {usesEstimatedValues
            ? `Total value (THB est.): ${total.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
            : `Total records: ${total}`}
        </p>
        {summary && summary.length > 0 && pieData && pieData.length > 0 ? (
          <div className="chart-wrap chart-wrap-with-legend">
            <ResponsiveContainer width="100%" height={windowWidth <= 500 ? 260 : 560}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={windowWidth <= 500 ? 70 : 190}
                  labelLine={false}
                  label={<PieSliceLabel />}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="subtext">No data yet. Upload images and add stock names.</p>
        )}
      </section>

      <section className="panel stock-manager-panel">
        <div className="stock-manager-header">
          <h2>Stocks In Pie</h2>
          <button
            type="button"
            className="btn-open-add-stock"
            onClick={() => setShowAddStockModal(true)}
          >
            + Add Stock
          </button>
        </div>
        {summary.length > 0 ? (
          <div className="stock-manager-list">
            {summary.map((item, index) => {
              const groupEditingId = `group:${item.name}`;
              const meta = getStockMeta(item.name);
              const quantity = Number(meta.quantity) || 0;
              const price = Number(meta.price) || 0;
              const totalValue = quantity * price;
              const currencyLabel = meta.currency === "USD" ? "USD" : "บาท";

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
                        </div>
                        <p className="stock-estimate">
                          มูลค่าประมาณ: {currencyLabel} {totalValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="stock-manager-info">
                        <p className="stock-manager-name">{item.name}</p>
                        <p className="stock-manager-count">{item.value} record{item.value > 1 ? "s" : ""}</p>
                        {(meta.quantity || meta.price) && (
                          <p className="stock-estimate">
                            มูลค่าประมาณ: {currencyLabel} {totalValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                      <div className="stock-manager-actions">
                        <button
                          className="btn-inline-action"
                          onClick={() => {
                            setEditingId(groupEditingId);
                            setEditingName(item.name);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-inline-action btn-inline-delete"
                          onClick={() => deleteGroup(item.name)}
                        >
                          Delete
                        </button>
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

      <section className="panel">
        <h2>Saved Records</h2>
        <div className="records">
          {records.length === 0 && <p className="subtext">No records</p>}
          {records.map((item) => (
            <article className="record-card" key={item.id}>
              <div className="card-img-wrap">
                <img
                  src={item.image_url}
                  alt={item.stock_name}
                  loading="lazy"
                  className="card-img"
                  onClick={() => setLightboxUrl(item.image_url)}
                  title="Click to view full image"
                />
                <button
                  className="btn-delete-card"
                  onClick={() => deleteRecord(item.id)}
                  title="Delete record"
                >
                  🗑
                </button>
              </div>
              {editingId === item.id ? (
                <div className="edit-row">
                  <input
                    className="edit-input"
                    value={editingName}
                    autoFocus
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(item.id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                  />
                  <button className="btn-save" onClick={() => saveEdit(item.id)}>✓</button>
                  <button className="btn-cancel" onClick={cancelEdit}>✕</button>
                </div>
              ) : (
                <p className="stock-name" onClick={() => startEdit(item)} title="Click to edit">
                  {item.stock_name} ✎
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      {lightboxUrl && (
        <div className="lightbox" onClick={() => setLightboxUrl(null)}>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxUrl(null)}>✕</button>
            <img src={lightboxUrl} alt="preview" />
          </div>
        </div>
      )}

      {showAddStockModal && (
        <div className="add-stock-modal-backdrop" onClick={() => setShowAddStockModal(false)}>
          <div className="add-stock-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Add Stock Symbol</h3>
            <p className="subtext">กรอกชื่อหุ้น เช่น AAPL, MSFT, PTT</p>
            <input
              value={manualStockName}
              placeholder="Stock symbol"
              autoFocus
              onChange={(event) => setManualStockName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  addManualStock();
                }
                if (event.key === "Escape") {
                  setShowAddStockModal(false);
                }
              }}
            />
            <div className="add-stock-modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowAddStockModal(false)}>Cancel</button>
              <button type="button" className="btn-add-stock" onClick={addManualStock} disabled={isAddingManualStock}>
                {isAddingManualStock ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
