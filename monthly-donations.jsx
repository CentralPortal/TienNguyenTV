import React, { useState, useEffect, useRef, useMemo } from "react";

/* ---------------------------------------------------------
   Data definitions (seed template for new records)
--------------------------------------------------------- */

const ITEM_SEED = [
  { name: "25+ Con Gà Giống", cost: 10000000 },
  { name: "Chuồng tầm 2.4m x 3m + Công Thợ", cost: 13000000 },
  { name: "Thức Ăn Cho Gà (3 tháng)", cost: 1000000 },
  { name: "Lưới Rào Khu Vực Chạy tầm 18.5m²", cost: 700000 },
  { name: "Lưới Che Nắng Phía Trên", cost: 700000 },
  { name: "Vắc-xin", cost: 2000000 },
  { name: "5 Máng Nước Kèm Ổ Đẻ", cost: 500000 },
  { name: "Thanh đậu dài 6m (VD: 4 thanh, mỗi thanh dài 1.5m)", cost: 200000 },
  { name: "Chi Phí Di Chuyển (xăng, phí đường, v.v.)", cost: 500000 },
  { name: "Phí Nhân Công", cost: 1500000 },
  { name: "Nệm", cost: 600000, checked: false },
];

const STORAGE_KEY = "monthly-donations-v1";
const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

const uid = () => Math.random().toString(36).slice(2, 10);

const seedItems = () =>
  ITEM_SEED.map((it) => ({
    id: uid(),
    name: it.name,
    cost: it.cost,
    checked: it.checked !== undefined ? it.checked : true,
  }));

const makeRecord = (familyId) => ({
  id: uid(),
  familyId,
  youtubeUrl: "",
  expanded: true,
  items: seedItems(),
});

const formatVnd = (n) => `${Math.round(n || 0).toLocaleString("vi-VN")} ₫`;

const sumChecked = (items) =>
  (items || []).reduce((sum, it) => (it.checked ? sum + (Number(it.cost) || 0) : sum), 0);

const recordTotal = (record) => sumChecked(record.items);

// Renames/cost-corrections applied to previously saved items that still
// carry an old name, plus ensuring the "Nệm" item always exists.
const normalizeItems = (items) => {
  const RENAMES = [
    ["Chuồng Gỗ (8ft x 10ft) + Công Thợ", "Chuồng tầm 2.4m x 3m + Công Thợ", 13000000],
    ["Lưới Rào Khu Vực Chạy (200 sq ft)", "Lưới Rào Khu Vực Chạy tầm 18.5m²", null],
    ["Thanh Đậu Dài 20 Feet (VD: 4 thanh 5 feet)", "Thanh đậu dài 6m (VD: 4 thanh, mỗi thanh dài 1.5m)", null],
    ["20 Con Gà Giống", "25+ Con Gà Giống", null],
  ];
  const COST_FIXES = {
    "Phí Nhân Công": 1500000,
    "Chi Phí Di Chuyển (xăng, phí đường, v.v.)": 500000,
  };

  let list = (items || []).map((it) => {
    let { name, cost } = it;
    const rename = RENAMES.find(([oldName]) => oldName === name);
    if (rename) {
      name = rename[1];
      if (rename[2] !== null) cost = rename[2];
    } else if (COST_FIXES[name] !== undefined) {
      cost = COST_FIXES[name];
    }
    return { ...it, name, cost };
  });

  if (!list.some((it) => it.name === "Nệm")) {
    list = [...list, { id: uid(), name: "Nệm", cost: 600000, checked: false }];
  }

  return list;
};

// Best-effort migration from older data shapes so previously saved data
// keeps working after the item model changed.
const migrateRecord = (r) => {
  // Newest shape already: single "items" array.
  if (Array.isArray(r.items)) {
    const cleaned = r.items.filter((it) => (it.name || "").trim() !== "Xe Đạp");
    return { ...r, items: normalizeItems(cleaned) };
  }

  // Previous shape: two arrays, chickenItems + otherItems.
  if (Array.isArray(r.chickenItems) || Array.isArray(r.otherItems)) {
    const merged = [
      ...(Array.isArray(r.chickenItems) ? r.chickenItems : []),
      ...(Array.isArray(r.otherItems) ? r.otherItems : []),
    ].filter((it) => (it.name || "").trim() !== "Xe Đạp");
    return { ...r, items: normalizeItems(merged.length ? merged : seedItems()) };
  }

  // Oldest shape: flat { id: { checked, cost } } map keyed by fixed ids.
  if (r.items && typeof r.items === "object") {
    const OLD_IDS_TO_SEED = [
      ["ck1", "20 Con Gà Giống", 10000000],
      ["ck2", "Chuồng Gỗ (8ft x 10ft) + Công Thợ", 7000000],
      ["ck3", "Thức Ăn Cho Gà (3 tháng)", 1000000],
      ["ck4", "Lưới Rào Khu Vực Chạy (200 sq ft)", 700000],
      ["ck5", "Lưới Che Nắng Phía Trên", 700000],
      ["ck6", "Vắc-xin", 2000000],
      ["ck7", "5 Máng Nước Kèm Ổ Đẻ", 500000],
      ["ck8", "Thanh Đậu Dài 20 Feet (VD: 4 thanh 5 feet)", 200000],
      ["oe2", "Chi Phí Di Chuyển (xăng, phí đường, v.v.)", 500000],
      ["oe3", "Phí Nhân Công", 0],
    ];
    const built = OLD_IDS_TO_SEED.map(([id, name, cost]) => ({
      id: uid(),
      name,
      cost: r.items[id] ? Number(r.items[id].cost) || 0 : cost,
      checked: r.items[id] ? !!r.items[id].checked : true,
    }));
    return { ...r, items: normalizeItems(built) };
  }

  return { ...r, items: seedItems() };
};

/* ---------------------------------------------------------
   Small building blocks
--------------------------------------------------------- */

function ItemTable({ title, icon, items, onToggle, onNameChange, onCostChange, onDeleteItem, onAddItem }) {
  const subtotal = sumChecked(items);

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
              <th className="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className={it.checked ? "row-checked" : ""}>
                <td className="col-check">
                  <input
                    type="checkbox"
                    className="chk"
                    checked={it.checked}
                    onChange={(e) => onToggle(it.id, e.target.checked)}
                    aria-label={`Chọn ${it.name}`}
                  />
                </td>
                <td className="col-name">
                  <input
                    type="text"
                    className="name-input"
                    value={it.name}
                    placeholder="Tên vật phẩm"
                    onChange={(e) => onNameChange(it.id, e.target.value)}
                  />
                </td>
                <td className="col-cost">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="cost-input"
                    value={Number(it.cost || 0).toLocaleString("vi-VN")}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^\d]/g, "");
                      onCostChange(it.id, digits === "" ? 0 : parseInt(digits, 10));
                    }}
                  />
                </td>
                <td className="col-actions">
                  <button
                    type="button"
                    className="row-delete"
                    onClick={() => onDeleteItem(it.id)}
                    title="Xóa vật phẩm"
                    aria-label="Xóa vật phẩm"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-row">
                  Chưa có vật phẩm nào trong mục này.
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="subtotal-label">
                Tổng phần này (đã chọn)
              </td>
              <td className="subtotal-value">{formatVnd(subtotal)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <button type="button" className="add-item-btn" onClick={onAddItem}>
        + Thêm vật phẩm
      </button>
    </div>
  );
}

function RecordCard({
  record,
  index,
  onField,
  onToggleExpand,
  onToggleItem,
  onNameChange,
  onCostChange,
  onRequestDeleteItem,
  onAddItem,
  onDelete,
}) {
  const total = recordTotal(record);

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
            <span>{formatVnd(total)}</span>
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
            title="Vật Liệu Và Chi Phí"
            icon="🐔"
            items={record.items}
            onToggle={(id, checked) => onToggleItem("items", id, checked)}
            onNameChange={(id, name) => onNameChange("items", id, name)}
            onCostChange={(id, cost) => onCostChange("items", id, cost)}
            onDeleteItem={(id) => onRequestDeleteItem("items", id)}
            onAddItem={() => onAddItem("items")}
          />

          <div className="record-total-footer">
            <span className="record-total-label">Tổng chi phí đã chọn cho gia đình này</span>
            <span className="record-total-values">
              <span className="rt-vnd">{formatVnd(total)}</span>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function ConfirmModal({ modal, onConfirm, onCancel }) {
  if (!modal.open) return null;
  const message =
    modal.type === "delete"
      ? "Bạn có chắc chắn muốn xóa gia đình này? Hành động này không thể hoàn tác."
      : modal.type === "deleteItem"
      ? "Bạn có chắc chắn muốn xóa vật phẩm này? Hành động này không thể hoàn tác."
      : modal.type === "restore"
      ? "Khôi phục sẽ ghi đè toàn bộ dữ liệu hiện tại bằng dữ liệu từ tệp sao lưu. Bạn có chắc chắn muốn tiếp tục?"
      : "Bạn có chắc chắn muốn xóa tất cả các mục đang được chọn (ở mọi gia đình)?";

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>Xác Nhận</h3>
        <p>{message}</p>
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
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [records, setRecords] = useState([]);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | offline
  const [modal, setModal] = useState({
    open: false,
    type: null,
    recordId: null,
    section: null,
    itemId: null,
    payload: null,
  });

  const loadedRef = useRef(false);
  const saveTimer = useRef(null);
  const fileInputRef = useRef(null);

  // Load from cloud storage on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setMonth(parsed.month || new Date().getMonth() + 1);
          const recs = Array.isArray(parsed.records) ? parsed.records : [];
          const migrated = recs.map(migrateRecord);
          setRecords(migrated.length ? migrated : [makeRecord("Gia đình 1"), makeRecord("Gia đình 2")]);
        } else {
          setRecords([makeRecord("Gia đình 1"), makeRecord("Gia đình 2")]);
        }
      } catch (e) {
        setRecords([makeRecord("Gia đình 1"), makeRecord("Gia đình 2")]);
      } finally {
        loadedRef.current = true;
        setLoading(false);
      }
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
          JSON.stringify({ month, records }),
          false
        );
        setSaveStatus(result ? "saved" : "offline");
      } catch (e) {
        setSaveStatus("offline");
      }
    }, 700);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, records]);

  const grandTotal = useMemo(() => {
    let vnd = 0;
    records.forEach((r) => {
      vnd += recordTotal(r);
    });
    return vnd;
  }, [records]);

  const updateField = (recordId, field, value) => {
    setRecords((prev) => prev.map((r) => (r.id === recordId ? { ...r, [field]: value } : r)));
  };

  const toggleExpand = (recordId) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, expanded: !r.expanded } : r))
    );
  };

  const mapSectionItems = (recs, recordId, section, fn) =>
    recs.map((r) => (r.id === recordId ? { ...r, [section]: fn(r[section]) } : r));

  const toggleItem = (recordId, section, itemId, checked) => {
    setRecords((prev) =>
      mapSectionItems(prev, recordId, section, (items) =>
        items.map((it) => (it.id === itemId ? { ...it, checked } : it))
      )
    );
  };

  const changeItemName = (recordId, section, itemId, name) => {
    setRecords((prev) =>
      mapSectionItems(prev, recordId, section, (items) =>
        items.map((it) => (it.id === itemId ? { ...it, name } : it))
      )
    );
  };

  const changeItemCost = (recordId, section, itemId, cost) => {
    setRecords((prev) =>
      mapSectionItems(prev, recordId, section, (items) =>
        items.map((it) => (it.id === itemId ? { ...it, cost } : it))
      )
    );
  };

  const addItem = (recordId, section) => {
    setRecords((prev) =>
      mapSectionItems(prev, recordId, section, (items) => [
        ...items,
        { id: uid(), name: "", cost: 0, checked: false },
      ])
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
    setModal({ open: true, type: "delete", recordId, section: null, itemId: null, payload: null });
  };

  const requestDeleteItem = (recordId, section, itemId) => {
    setModal({ open: true, type: "deleteItem", recordId, section, itemId, payload: null });
  };

  const requestClear = () => {
    setModal({ open: true, type: "clear", recordId: null, section: null, itemId: null, payload: null });
  };

  const requestRestore = (payload) => {
    setModal({ open: true, type: "restore", recordId: null, section: null, itemId: null, payload });
  };

  const closeModal = () =>
    setModal({ open: false, type: null, recordId: null, section: null, itemId: null, payload: null });

  const confirmModal = () => {
    if (modal.type === "delete") {
      setRecords((prev) => prev.filter((r) => r.id !== modal.recordId));
    } else if (modal.type === "deleteItem") {
      setRecords((prev) =>
        mapSectionItems(prev, modal.recordId, modal.section, (items) =>
          items.filter((it) => it.id !== modal.itemId)
        )
      );
    } else if (modal.type === "clear") {
      setRecords((prev) =>
        prev.map((r) => ({
          ...r,
          items: r.items.map((it) => ({ ...it, checked: false })),
        }))
      );
    } else if (modal.type === "restore" && modal.payload) {
      const recs = Array.isArray(modal.payload.records) ? modal.payload.records : [];
      const migrated = recs.map(migrateRecord);
      setMonth(modal.payload.month || month);
      setRecords(migrated.length ? migrated : records);
    }
    closeModal();
  };

  const handleBackup = () => {
    const payload = JSON.stringify({ month, records }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `sao-luu-quyen-gop-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestoreClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileSelected = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (!parsed || !Array.isArray(parsed.records)) {
          window.alert("Tệp sao lưu không hợp lệ.");
          return;
        }
        requestRestore(parsed);
      } catch (err) {
        window.alert("Không thể đọc tệp sao lưu. Vui lòng kiểm tra định dạng JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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
        .backup-btn { background: var(--surface); color: var(--green-deep); border: 1px solid var(--border); }
        .backup-btn:hover { background: var(--gold-soft); border-color: var(--gold); }
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
        .col-cost { width: 170px; white-space: nowrap; }
        .col-actions { width: 36px; text-align: center; }

        .chk {
          width: 18px; height: 18px;
          accent-color: var(--green);
          cursor: pointer;
        }

        .name-input {
          width: 100%;
          font-family: 'Be Vietnam Pro', sans-serif;
          font-size: 13.5px;
          padding: 6px 8px;
          border: 1px solid transparent;
          border-radius: 6px;
          background: transparent;
        }
        .name-input:hover { border-color: var(--border); background: #fff; }
        .name-input:focus { outline: none; border-color: var(--gold); background: #fff; }

        .cost-input {
          width: 140px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          padding: 5px 8px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: #fff;
          text-align: right;
        }
        .cost-input:focus { outline: none; border-color: var(--gold); }

        .row-delete {
          width: 26px; height: 26px;
          border-radius: 6px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--ink-soft);
          font-size: 16px;
          line-height: 1;
          cursor: pointer;
        }
        .row-delete:hover { background: var(--rust-bg); color: var(--rust); border-color: #E9C3B0; }

        .empty-row {
          text-align: center;
          color: var(--ink-soft);
          font-size: 13px;
          padding: 14px 8px;
          font-style: italic;
        }

        .item-table tfoot td {
          border-bottom: none;
          border-top: 2px solid var(--border);
          padding-top: 9px;
          font-weight: 700;
        }
        .subtotal-label { color: var(--ink-soft); font-weight: 600; font-size: 12.5px; }
        .subtotal-value { font-family: 'IBM Plex Mono', monospace; color: var(--green-deep); }

        .add-item-btn {
          margin-top: 8px;
          background: transparent;
          border: 1px dashed var(--moss);
          color: var(--green-deep);
          font-weight: 700;
          font-size: 12.5px;
          padding: 7px 14px;
          border-radius: 8px;
          cursor: pointer;
        }
        .add-item-btn:hover { background: var(--gold-soft); border-style: solid; border-color: var(--gold); }

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
          .save-status { width: 100%; }

          /* Nav */
          .record-nav { padding: 0 12px; gap: 8px; margin: 12px auto 0; }
          .nav-pill { font-size: 12px; padding: 6px 11px; }
          .spacer { flex-basis: 100%; height: 0; }
          .add-btn, .clear-btn, .backup-btn { flex: 1 1 auto; text-align: center; font-size: 12.5px; padding: 9px 12px; }

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

          /* Tables: keep horizontal scroll, but shrink so more fits without scrolling */
          .section-title { font-size: 13.5px; }
          .item-table { font-size: 12px; }
          .item-table th { font-size: 10px; padding: 5px 6px; }
          .item-table td { padding: 6px 6px; }
          .col-name { min-width: 140px; }
          .col-cost { width: 120px; }
          .cost-input { width: 100px; font-size: 12px; padding: 4px 6px; }
          .name-input { font-size: 12.5px; padding: 5px 6px; }
          .chk { width: 16px; height: 16px; }
          .row-delete { width: 24px; height: 24px; font-size: 14px; }

          .record-total-footer { flex-direction: column; align-items: flex-start; gap: 6px; padding: 12px 14px; }
          .record-total-values { gap: 10px; }
          .rt-vnd { font-size: 16px; }

          /* Modal */
          .modal-box { padding: 18px; max-width: 92vw; }
        }

        @media (max-width: 400px) {
          .col-name { min-width: 120px; }
          .cost-input { width: 84px; }
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
                  <span className="total-vnd">{formatVnd(grandTotal)}</span>
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
            <input
              type="file"
              accept="application/json,.json"
              ref={fileInputRef}
              onChange={handleFileSelected}
              style={{ display: "none" }}
            />
            <button className="backup-btn" onClick={handleBackup}>
              ⬇ Sao lưu
            </button>
            <button className="backup-btn" onClick={handleRestoreClick}>
              ⬆ Khôi phục
            </button>
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
                onField={(field, value) => updateField(record.id, field, value)}
                onToggleExpand={() => toggleExpand(record.id)}
                onToggleItem={(section, itemId, checked) =>
                  toggleItem(record.id, section, itemId, checked)
                }
                onNameChange={(section, itemId, name) =>
                  changeItemName(record.id, section, itemId, name)
                }
                onCostChange={(section, itemId, cost) =>
                  changeItemCost(record.id, section, itemId, cost)
                }
                onRequestDeleteItem={(section, itemId) =>
                  requestDeleteItem(record.id, section, itemId)
                }
                onAddItem={(section) => addItem(record.id, section)}
                onDelete={() => requestDelete(record.id)}
              />
            ))}
          </main>
        </>
      )}

      <ConfirmModal modal={modal} onConfirm={confirmModal} onCancel={closeModal} />
    </div>
  );
}
