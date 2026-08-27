import React, { useState, useEffect, useRef, useMemo } from "react";

/* ---------------------------------------------------------
   Data definitions
--------------------------------------------------------- */

const ESSENTIAL_ITEMS = [
  { id: "es1", name: "Thực Phẩm Thiết Yếu", cost: 1200000 },
  { id: "es2", name: "Nệm Phụ", cost: 600000 },
  { id: "es3", name: "Đèn Năng Lượng Mặt Trời", cost: 2200000 },
  { id: "es4", name: "Nhu Yếu Phẩm Cho Giấc Ngủ", cost: 1750000 },
  { id: "es5", name: "Giường Gỗ Mặt Phẳng (tự đóng)", cost: 2000000 },
  { id: "es6", name: "Giường Sắt", cost: 3000000 },
  { id: "es7", name: "Đồ Dùng Nhà Bếp", cost: 2000000 },
  { id: "es8", name: "2 Bình Chứa Nước (20-30 lít)", cost: 80000 },
  { id: "es9", name: "Bạt Che", cost: 1500000 },
];

const CHICKEN_ITEMS = [
  { id: "ck1", name: "20 Con Gà Giống", cost: 10000000 },
  { id: "ck2", name: "Chuồng Gỗ (8ft x 10ft) + Công Thợ", cost: 7000000 },
  { id: "ck3", name: "Thức Ăn Cho Gà (3 tháng)", cost: 1000000 },
  { id: "ck4", name: "Lưới Rào Khu Vực Chạy (200 sq ft)", cost: 700000 },
  { id: "ck5", name: "Lưới Che Nắng Phía Trên", cost: 700000 },
  { id: "ck6", name: "Vắc-xin", cost: 2000000 },
  { id: "ck7", name: "5 Máng Nước Kèm Ổ Đẻ", cost: 500000 },
  { id: "ck8", name: "Thanh Đậu Dài 20 Feet (VD: 4 thanh 5 feet)", cost: 200000 },
];

const OTHER_ITEMS = [
  { id: "oe1", name: "Xe Đạp", cost: 2000000 },
  { id: "oe2", name: "Chi Phí Di Chuyển (xăng, phí đường, v.v.)", cost: 500000 },
  { id: "oe3", name: "Phí Nhân Công", cost: 0 },
];

const ALL_ITEMS = [...ESSENTIAL_ITEMS, ...CHICKEN_ITEMS, ...OTHER_ITEMS];

const STORAGE_KEY = "monthly-donations-v1";
const PASSWORD = "TNTV";
const DEFAULT_RATE = 25400;
const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

const uid = () => Math.random().toString(36).slice(2, 10);

const defaultItemsMap = () => {
  const map = {};
  ALL_ITEMS.forEach((it) => {
    map[it.id] = { checked: false, cost: it.cost };
  });
  return map;
};

const makeRecord = (familyId) => ({
  id: uid(),
  familyId,
  youtubeUrl: "",
  expanded: true,
  items: defaultItemsMap(),
});

const formatVnd = (n) => `${Math.round(n || 0).toLocaleString("vi-VN")} ₫`;
const formatUsd = (n) =>
  `$${(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const recordTotals = (record, rate) => {
  let vnd = 0;
  Object.values(record.items).forEach((entry) => {
    if (entry.checked) vnd += Number(entry.cost) || 0;
  });
  return { vnd, usd: rate ? vnd / rate : 0 };
};

/* ---------------------------------------------------------
   Small building blocks
--------------------------------------------------------- */

function ItemTable({ title, icon, items, itemState, onToggle, onCostChange, rate }) {
  let subtotal = 0;
  Object.keys(itemState).forEach((id) => {
    if (items.find((i) => i.id === id) && itemState[id].checked) {
      subtotal += Number(itemState[id].cost) || 0;
    }
  });

  return (
    <div className="item-table-wrap">
      <h3 className="section-title">
        <span className="section-icon">{icon}</span>
        {title}
      </h3>
      <div className="table-scroll">
        <table className="item-table">
          <thead>
            <tr>
              <th className="col-check"></th>
              <th className="col-name">Tên vật phẩm</th>
              <th className="col-cost">Chi phí (VND)</th>
              <th className="col-cost">Chi phí (USD)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const entry = itemState[it.id] || { checked: false, cost: it.cost };
              const usd = rate ? (Number(entry.cost) || 0) / rate : 0;
              return (
                <tr key={it.id} className={entry.checked ? "row-checked" : ""}>
                  <td className="col-check">
                    <input
                      type="checkbox"
                      className="chk"
                      checked={entry.checked}
                      onChange={(e) => onToggle(it.id, e.target.checked)}
                      aria-label={`Chọn ${it.name}`}
                    />
                  </td>
                  <td className="col-name">{it.name}</td>
                  <td className="col-cost">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="cost-input"
                      value={Number(entry.cost || 0).toLocaleString("vi-VN")}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^\d]/g, "");
                        onCostChange(it.id, digits === "" ? 0 : parseInt(digits, 10));
                      }}
                    />
                  </td>
                  <td className="col-cost usd-cell">{formatUsd(usd)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="subtotal-label">
                Tổng phần này (đã chọn)
              </td>
              <td className="subtotal-value">{formatVnd(subtotal)}</td>
              <td className="subtotal-value usd-cell">{formatUsd(rate ? subtotal / rate : 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function RecordCard({
  record,
  index,
  rate,
  onField,
  onToggleExpand,
  onToggleItem,
  onCostChange,
  onDelete,
}) {
  const totals = recordTotals(record, rate);

  return (
    <section id={`record-${record.id}`} className="record-card">
      <div className="record-header">
        <span className="record-tab">{String(index + 1).padStart(2, "0")}</span>

        <div className="record-title-block">
          <label className="field-label">Gia đình</label>
          <input
            className="family-input"
            value={record.familyId}
            onChange={(e) => onField("familyId", e.target.value)}
            placeholder="Tên / mã số gia đình"
          />
        </div>

        <div className="record-header-actions">
          <div className="mini-total">
            <span>{formatVnd(totals.vnd)}</span>
            <span className="mini-total-usd">{formatUsd(totals.usd)}</span>
          </div>
          <button
            className="icon-btn"
            onClick={onToggleExpand}
            aria-label={record.expanded ? "Thu gọn" : "Mở rộng"}
            title={record.expanded ? "Thu gọn" : "Mở rộng"}
          >
            {record.expanded ? "▲" : "▼"}
          </button>
          <button className="icon-btn danger" onClick={onDelete} title="Xóa gia đình này">
            🗑
          </button>
        </div>
      </div>

      {record.expanded && (
        <div className="record-body">
          <div className="youtube-row">
            <label className="field-label">Đường dẫn video YouTube</label>
            <div className="youtube-input-row">
              <input
                className="youtube-input"
                value={record.youtubeUrl}
                onChange={(e) => onField("youtubeUrl", e.target.value)}
                placeholder="https://youtube.com/..."
              />
              {record.youtubeUrl ? (
                <a
                  className="youtube-open"
                  href={record.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Mở video ↗
                </a>
              ) : null}
            </div>
          </div>

          <ItemTable
            title="Nhu Yếu Phẩm Thiết Yếu"
            icon="🏠"
            items={ESSENTIAL_ITEMS}
            itemState={record.items}
            rate={rate}
            onToggle={(id, checked) => onToggleItem(id, checked)}
            onCostChange={(id, cost) => onCostChange(id, cost)}
          />

          <div className="precondition-note">
            <strong>Điều Kiện Trước Khi Quyên Góp Gà:</strong> hãy xác nhận gia đình đã sẵn sàng
            (khu vực úm gà an toàn, chuồng thông gió tốt, có biện pháp chống rắn/thú săn mồi)
            trước khi tiến hành phần chi phí nuôi gà bên dưới.
          </div>

          <ItemTable
            title="Gà — Vật Liệu Và Chi Phí"
            icon="🐔"
            items={CHICKEN_ITEMS}
            itemState={record.items}
            rate={rate}
            onToggle={(id, checked) => onToggleItem(id, checked)}
            onCostChange={(id, cost) => onCostChange(id, cost)}
          />

          <ItemTable
            title="Chi Phí Khác"
            icon="🧾"
            items={OTHER_ITEMS}
            itemState={record.items}
            rate={rate}
            onToggle={(id, checked) => onToggleItem(id, checked)}
            onCostChange={(id, cost) => onCostChange(id, cost)}
          />

          <div className="record-total-footer">
            <span className="record-total-label">Tổng chi phí đã chọn cho gia đình này</span>
            <span className="record-total-values">
              <span className="rt-vnd">{formatVnd(totals.vnd)}</span>
              <span className="rt-usd">{formatUsd(totals.usd)}</span>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function PasswordModal({ modal, value, onChange, onConfirm, onCancel }) {
  if (!modal.open) return null;
  const message =
    modal.type === "delete"
      ? "Nhập mật khẩu để xóa gia đình này. Hành động này không thể hoàn tác."
      : "Nhập mật khẩu để xóa tất cả các mục đang được chọn (ở mọi gia đình).";

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>Xác Nhận Mật Khẩu</h3>
        <p>{message}</p>
        <input
          type="password"
          autoFocus
          className="modal-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onConfirm();
          }}
          placeholder="Mật khẩu"
        />
        {modal.error ? <div className="modal-error">{modal.error}</div> : null}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>
            Hủy
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   App
--------------------------------------------------------- */

export default function App() {
  const [loading, setLoading] = useState(true);
  const [rate, setRate] = useState(DEFAULT_RATE);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [records, setRecords] = useState([]);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | offline
  const [rateStatus, setRateStatus] = useState("idle"); // idle | loading | live | cached | error
  const [rateUpdatedAt, setRateUpdatedAt] = useState(null);
  const [modal, setModal] = useState({ open: false, type: null, recordId: null, error: "" });
  const [pwInput, setPwInput] = useState("");

  const loadedRef = useRef(false);
  const saveTimer = useRef(null);

  // Fetch the live VND/USD exchange rate and override the current rate
  const fetchLiveRate = async () => {
    setRateStatus("loading");
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      const data = await res.json();
      const liveVnd = data && data.rates && data.rates.VND;
      if (liveVnd) {
        setRate(Math.round(liveVnd));
        setRateStatus("live");
        setRateUpdatedAt(new Date());
      } else {
        setRateStatus("error");
      }
    } catch (e) {
      setRateStatus("error");
    }
  };

  // Load from cloud storage on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setRate(parsed.rate || DEFAULT_RATE);
          setMonth(parsed.month || new Date().getMonth() + 1);
          const recs = Array.isArray(parsed.records) ? parsed.records : [];
          // merge in any new items that may not exist yet on old saved records
          const merged = recs.map((r) => ({
            ...r,
            items: { ...defaultItemsMap(), ...r.items },
          }));
          setRecords(merged.length ? merged : [makeRecord("Gia đình 1"), makeRecord("Gia đình 2")]);
        } else {
          setRecords([makeRecord("Gia đình 1"), makeRecord("Gia đình 2")]);
        }
      } catch (e) {
        setRecords([makeRecord("Gia đình 1"), makeRecord("Gia đình 2")]);
      } finally {
        loadedRef.current = true;
        setLoading(false);
      }
      // Always refresh the exchange rate from the live source when the app opens
      fetchLiveRate();
    })();
  }, []);

  // Auto-save (debounced) whenever data changes, after initial load
  useEffect(() => {
    if (!loadedRef.current) return;
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const result = await window.storage.set(
          STORAGE_KEY,
          JSON.stringify({ rate, month, records }),
          false
        );
        setSaveStatus(result ? "saved" : "offline");
      } catch (e) {
        setSaveStatus("offline");
      }
    }, 700);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate, month, records]);

  const grand = useMemo(() => {
    let vnd = 0;
    records.forEach((r) => {
      vnd += recordTotals(r, rate).vnd;
    });
    return { vnd, usd: rate ? vnd / rate : 0 };
  }, [records, rate]);

  const updateField = (recordId, field, value) => {
    setRecords((prev) => prev.map((r) => (r.id === recordId ? { ...r, [field]: value } : r)));
  };

  const toggleExpand = (recordId) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, expanded: !r.expanded } : r))
    );
  };

  const toggleItem = (recordId, itemId, checked) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? { ...r, items: { ...r.items, [itemId]: { ...r.items[itemId], checked } } }
          : r
      )
    );
  };

  const changeCost = (recordId, itemId, cost) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? { ...r, items: { ...r.items, [itemId]: { ...r.items[itemId], cost } } }
          : r
      )
    );
  };

  const addRecord = () => {
    const nextNum = records.length + 1;
    const newRec = makeRecord(`Gia đình ${nextNum}`);
    setRecords((prev) => [...prev, newRec]);
    setTimeout(() => {
      const el = document.getElementById(`record-${newRec.id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const scrollToRecord = (recordId) => {
    setRecords((prev) => prev.map((r) => (r.id === recordId ? { ...r, expanded: true } : r)));
    setTimeout(() => {
      const el = document.getElementById(`record-${recordId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const requestDelete = (recordId) => {
    setPwInput("");
    setModal({ open: true, type: "delete", recordId, error: "" });
  };

  const requestClear = () => {
    setPwInput("");
    setModal({ open: true, type: "clear", recordId: null, error: "" });
  };

  const closeModal = () => setModal({ open: false, type: null, recordId: null, error: "" });

  const confirmModal = () => {
    if (pwInput !== PASSWORD) {
      setModal((m) => ({ ...m, error: "Mật khẩu không đúng. Vui lòng thử lại." }));
      return;
    }
    if (modal.type === "delete") {
      setRecords((prev) => prev.filter((r) => r.id !== modal.recordId));
    } else if (modal.type === "clear") {
      setRecords((prev) =>
        prev.map((r) => ({
          ...r,
          items: Object.fromEntries(
            Object.entries(r.items).map(([k, v]) => [k, { ...v, checked: false }])
          ),
        }))
      );
    }
    closeModal();
  };

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

        :root {
          --bg: #FAF3E7;
          --surface: #FFFDF8;
          --ink: #2B2620;
          --ink-soft: #6B6153;
          --green: #2F4A3C;
          --green-deep: #223A2E;
          --moss: #6B7F5B;
          --gold: #C98A2C;
          --gold-soft: #F0DBAF;
          --rust: #A6461F;
          --rust-bg: #FBEAE0;
          --border: #E4D9C4;
        }

        * { box-sizing: border-box; }

        .app {
          font-family: 'Be Vietnam Pro', sans-serif;
          background: var(--bg);
          color: var(--ink);
          min-height: 100%;
          padding: 0 0 48px 0;
        }

        .mono { font-family: 'IBM Plex Mono', monospace; }

        /* ---------- Hero / header ---------- */
        .hero {
          background: var(--green);
          background-image: radial-gradient(circle at 15% 20%, rgba(255,255,255,0.05), transparent 45%),
                             radial-gradient(circle at 85% 80%, rgba(255,255,255,0.04), transparent 50%);
          color: #F5EFDF;
          padding: 16px 20px;
          border-bottom: 5px solid var(--gold);
        }
        .hero-inner {
          max-width: 980px;
          margin: 0 auto;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px 20px;
        }
        .eyebrow { display: none; }
        .title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .hero h1 {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }
        .month-select {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(240,219,175,0.45);
          border-radius: 8px;
          padding: 6px 10px;
          cursor: pointer;
        }
        .month-select:focus { outline: none; border-color: var(--gold); }
        .month-select option { color: var(--ink); }

        .totals-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          flex: 1 1 auto;
        }
        .total-card {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(240,219,175,0.35);
          border-radius: 10px;
          padding: 6px 14px;
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .total-label {
          font-size: 11px;
          color: var(--gold-soft);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .total-vnd {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 17px;
          font-weight: 600;
          color: #FFFFFF;
        }
        .total-usd {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12.5px;
          color: var(--gold-soft);
        }
        .rate-card {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(240,219,175,0.35);
          border-radius: 10px;
          padding: 5px 12px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px 8px;
        }
        .rate-card label {
          font-size: 11px;
          color: var(--gold-soft);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          white-space: nowrap;
        }
        .rate-card input {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(240,219,175,0.5);
          color: #fff;
          padding: 2px 0;
          width: 90px;
        }
        .rate-card input:focus { outline: none; border-bottom-color: var(--gold); }
        .rate-refresh {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(240,219,175,0.4);
          color: #fff;
          border-radius: 6px;
          width: 24px;
          height: 24px;
          font-size: 12px;
          line-height: 1;
          cursor: pointer;
          flex-shrink: 0;
        }
        .rate-refresh:hover { background: rgba(255,255,255,0.2); }
        .rate-status {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10.5px;
          color: var(--gold-soft);
          width: 100%;
          white-space: nowrap;
        }
        .rate-status-live { color: #9FD9AA; }
        .rate-status-error { color: #E9B48A; }

        .save-status {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--gold-soft);
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .save-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #7FBF8C; display: inline-block;
        }
        .save-dot.saving { background: var(--gold); }
        .save-dot.offline { background: var(--rust); }

        /* ---------- Nav ---------- */
        .record-nav {
          max-width: 980px;
          margin: 14px auto 0;
          padding: 0 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
        .nav-pill {
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--green-deep);
          padding: 7px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .nav-pill:hover { background: var(--gold-soft); border-color: var(--gold); }
        .spacer { flex: 1; }
        .add-btn, .clear-btn {
          border-radius: 999px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: none;
        }
        .add-btn { background: var(--green); color: #F5EFDF; }
        .add-btn:hover { background: var(--green-deep); }
        .clear-btn { background: var(--rust-bg); color: var(--rust); border: 1px solid #E9C3B0; }
        .clear-btn:hover { background: #F5D9C8; }

        /* ---------- Records ---------- */
        .records {
          max-width: 980px;
          margin: 24px auto 0;
          padding: 0 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .record-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-top: 4px solid var(--gold);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(43,38,32,0.04);
          scroll-margin-top: 20px;
        }

        .record-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: linear-gradient(180deg, #FFFDF8, #FAF3E7);
        }
        .record-tab {
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 700;
          font-size: 13px;
          background: var(--green);
          color: #F5EFDF;
          border-radius: 8px;
          padding: 6px 9px;
        }
        .record-title-block { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 120px; }
        .field-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--ink-soft);
        }
        .family-input {
          font-size: 19px;
          font-weight: 700;
          border: none;
          background: transparent;
          color: var(--green-deep);
          padding: 2px 0;
          border-bottom: 1px solid transparent;
        }
        .family-input:focus { outline: none; border-bottom: 1px solid var(--gold); }

        .record-header-actions { display: flex; align-items: center; gap: 10px; }
        .mini-total {
          font-family: 'IBM Plex Mono', monospace;
          display: flex; flex-direction: column; text-align: right; font-size: 13px;
          color: var(--green-deep); font-weight: 600;
        }
        .mini-total-usd { font-size: 11px; color: var(--ink-soft); font-weight: 400; }

        .icon-btn {
          border: 1px solid var(--border);
          background: #fff;
          border-radius: 8px;
          width: 34px; height: 34px;
          cursor: pointer;
          font-size: 14px;
        }
        .icon-btn:hover { background: var(--gold-soft); }
        .icon-btn.danger:hover { background: var(--rust-bg); border-color: var(--rust); }

        .record-body { padding: 4px 20px 20px; border-top: 1px solid var(--border); }

        .youtube-row { padding: 14px 0 6px; display: flex; flex-direction: column; gap: 4px; }
        .youtube-input-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .youtube-input {
          flex: 1 1 260px;
          padding: 9px 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          background: #FFFEFB;
        }
        .youtube-input:focus { outline: none; border-color: var(--gold); }
        .youtube-open {
          font-size: 13px; font-weight: 700; color: var(--rust);
          text-decoration: none; white-space: nowrap;
        }
        .youtube-open:hover { text-decoration: underline; }

        .precondition-note {
          background: var(--gold-soft);
          border-left: 4px solid var(--gold);
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13.5px;
          line-height: 1.5;
          margin: 4px 0 18px;
          color: #4B3A15;
        }

        .item-table-wrap { margin-top: 18px; }
        .section-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 15px; font-weight: 700; color: var(--green-deep);
          margin: 0 0 8px 0;
          padding-bottom: 6px;
          border-bottom: 2px solid var(--border);
        }
        .section-icon { font-size: 16px; }

        .table-scroll { overflow-x: auto; }
        .item-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
        .item-table th {
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--ink-soft);
          padding: 6px 8px;
          border-bottom: 1px solid var(--border);
        }
        .item-table td { padding: 7px 8px; border-bottom: 1px dashed var(--border); vertical-align: middle; }
        .item-table tr.row-checked td { background: #FBF5E4; }
        .col-check { width: 34px; text-align: center; }
        .col-name { min-width: 220px; }
        .col-cost { width: 150px; white-space: nowrap; }
        .usd-cell { font-family: 'IBM Plex Mono', monospace; color: var(--ink-soft); }

        .chk {
          width: 18px; height: 18px;
          accent-color: var(--green);
          cursor: pointer;
        }

        .cost-input {
          width: 120px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          padding: 5px 8px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: #fff;
          text-align: right;
        }
        .cost-input:focus { outline: none; border-color: var(--gold); }

        .item-table tfoot td {
          border-bottom: none;
          border-top: 2px solid var(--border);
          padding-top: 9px;
          font-weight: 700;
        }
        .subtotal-label { color: var(--ink-soft); font-weight: 600; font-size: 12.5px; }
        .subtotal-value { font-family: 'IBM Plex Mono', monospace; color: var(--green-deep); }

        .record-total-footer {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          background: var(--green);
          color: #F5EFDF;
          padding: 14px 18px;
          border-radius: 12px;
        }
        .record-total-label { font-weight: 600; font-size: 14px; }
        .record-total-values { display: flex; gap: 14px; align-items: baseline; font-family: 'IBM Plex Mono', monospace; }
        .rt-vnd { font-size: 18px; font-weight: 700; color: #fff; }
        .rt-usd { font-size: 13px; color: var(--gold-soft); }

        /* ---------- Modal ---------- */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(43,38,32,0.55);
          display: flex; align-items: center; justify-content: center;
          z-index: 50; padding: 20px;
        }
        .modal-box {
          background: var(--surface);
          border-radius: 16px;
          padding: 22px;
          max-width: 360px;
          width: 100%;
          border-top: 5px solid var(--rust);
        }
        .modal-box h3 { margin: 0 0 8px; color: var(--rust); font-size: 17px; }
        .modal-box p { margin: 0 0 14px; font-size: 13.5px; color: var(--ink-soft); line-height: 1.5; }
        .modal-input {
          width: 100%; padding: 9px 12px; border: 1px solid var(--border);
          border-radius: 8px; font-size: 14px; margin-bottom: 8px;
        }
        .modal-input:focus { outline: none; border-color: var(--rust); }
        .modal-error { color: var(--rust); font-size: 12.5px; margin-bottom: 8px; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
        .btn { padding: 8px 16px; border-radius: 8px; border: none; font-weight: 700; font-size: 13px; cursor: pointer; }
        .btn-ghost { background: transparent; color: var(--ink-soft); border: 1px solid var(--border); }
        .btn-danger { background: var(--rust); color: #fff; }
        .btn-danger:hover { background: #8C3A18; }

        .loading-screen {
          display: flex; align-items: center; justify-content: center;
          min-height: 60vh; font-family: 'IBM Plex Mono', monospace; color: var(--green);
        }

        @media (max-width: 640px) {
          .app { padding-bottom: 32px; }

          /* Hero */
          .hero { padding: 14px 14px; }
          .hero-inner { gap: 10px; }
          .hero h1 { font-size: 16px; white-space: normal; }
          .title-row { width: 100%; flex-wrap: wrap; gap: 8px; }
          .month-select { font-size: 12px; padding: 5px 8px; }
          .totals-row { width: 100%; gap: 8px; }
          .total-card { flex: 1 1 100%; padding: 8px 12px; }
          .total-vnd { font-size: 16px; }
          .rate-card { flex: 1 1 100%; padding: 6px 12px; }
          .rate-card input { width: 100px; }
          .rate-status { font-size: 10px; }
          .save-status { width: 100%; }

          /* Nav */
          .record-nav { padding: 0 12px; gap: 8px; margin: 12px auto 0; }
          .nav-pill { font-size: 12px; padding: 6px 11px; }
          .spacer { flex-basis: 100%; height: 0; }
          .add-btn, .clear-btn { flex: 1 1 auto; text-align: center; font-size: 12.5px; padding: 9px 12px; }

          /* Records */
          .records { padding: 0 12px; gap: 14px; margin-top: 16px; }
          .record-card { border-radius: 12px; }
          .record-header { padding: 12px 14px; gap: 10px; flex-wrap: wrap; }
          .record-title-block { flex: 1 1 140px; min-width: 0; }
          .family-input { width: 100%; font-size: 17px; }
          .record-header-actions { gap: 6px; }
          .mini-total { display: none; }
          .icon-btn { width: 32px; height: 32px; font-size: 13px; }

          .record-body { padding: 4px 14px 16px; }
          .youtube-input-row { flex-direction: column; align-items: stretch; gap: 6px; }
          .youtube-open { text-align: right; }

          .precondition-note { font-size: 12.5px; padding: 9px 12px; }

          /* Tables: keep horizontal scroll, but shrink so more fits without scrolling */
          .section-title { font-size: 13.5px; }
          .item-table { font-size: 12px; }
          .item-table th { font-size: 10px; padding: 5px 6px; }
          .item-table td { padding: 6px 6px; }
          .col-name { min-width: 150px; }
          .col-cost { width: 110px; }
          .cost-input { width: 90px; font-size: 12px; padding: 4px 6px; }
          .chk { width: 16px; height: 16px; }

          .record-total-footer { flex-direction: column; align-items: flex-start; gap: 6px; padding: 12px 14px; }
          .record-total-values { gap: 10px; }
          .rt-vnd { font-size: 16px; }

          /* Modal */
          .modal-box { padding: 18px; max-width: 92vw; }
        }

        @media (max-width: 400px) {
          .col-name { min-width: 130px; }
          .cost-input { width: 78px; }
        }
      `}</style>

      {loading ? (
        <div className="loading-screen">Đang tải dữ liệu…</div>
      ) : (
        <>
          <header className="hero">
            <div className="hero-inner">
              <div className="title-row">
                <h1>Các gia đình thụ hưởng:</h1>
                <select
                  className="month-select"
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="totals-row">
                <div className="total-card">
                  <span className="total-label">Tổng cộng</span>
                  <span className="total-vnd">{formatVnd(grand.vnd)}</span>
                  <span className="total-usd">≈ {formatUsd(grand.usd)}</span>
                </div>
                <div className="rate-card">
                  <label>Tỷ giá (VND/$1)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={Number(rate || 0).toLocaleString("vi-VN")}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^\d]/g, "");
                      setRate(digits === "" ? 0 : parseInt(digits, 10));
                    }}
                  />
                  <button
                    type="button"
                    className="rate-refresh"
                    onClick={fetchLiveRate}
                    title="Cập nhật tỷ giá trực tuyến"
                    aria-label="Cập nhật tỷ giá trực tuyến"
                  >
                    {rateStatus === "loading" ? "…" : "🔄"}
                  </button>
                  <span className={`rate-status rate-status-${rateStatus}`}>
                    {rateStatus === "loading"
                      ? "Đang cập nhật…"
                      : rateStatus === "live"
                      ? `Trực tuyến · ${rateUpdatedAt ? rateUpdatedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}`
                      : rateStatus === "error"
                      ? "Dùng giá đã lưu"
                      : ""}
                  </span>
                </div>
              </div>

              <div className="save-status">
                <span
                  className={`save-dot ${
                    saveStatus === "saving" ? "saving" : saveStatus === "offline" ? "offline" : ""
                  }`}
                ></span>
                {saveStatus === "saving"
                  ? "Đang lưu…"
                  : saveStatus === "offline"
                  ? "Chưa đồng bộ"
                  : "Đã lưu"}
              </div>
            </div>
          </header>

          <nav className="record-nav">
            {records.map((r, i) => (
              <button key={r.id} className="nav-pill" onClick={() => scrollToRecord(r.id)}>
                {String(i + 1).padStart(2, "0")} · {r.familyId || "Chưa đặt tên"}
              </button>
            ))}
            <span className="spacer" />
            <button className="clear-btn" onClick={requestClear}>
              Xóa mục đã chọn
            </button>
            <button className="add-btn" onClick={addRecord}>
              + Thêm gia đình
            </button>
          </nav>

          <main className="records">
            {records.map((record, idx) => (
              <RecordCard
                key={record.id}
                record={record}
                index={idx}
                rate={rate}
                onField={(field, value) => updateField(record.id, field, value)}
                onToggleExpand={() => toggleExpand(record.id)}
                onToggleItem={(itemId, checked) => toggleItem(record.id, itemId, checked)}
                onCostChange={(itemId, cost) => changeCost(record.id, itemId, cost)}
                onDelete={() => requestDelete(record.id)}
              />
            ))}
          </main>
        </>
      )}

      <PasswordModal
        modal={modal}
        value={pwInput}
        onChange={setPwInput}
        onConfirm={confirmModal}
        onCancel={closeModal}
      />
    </div>
  );
}
