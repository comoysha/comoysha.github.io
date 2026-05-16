import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMediaQuery } from './hooks/useMediaQuery.js';
import { RECORD_TYPES, DELETED_MEMBER_IDS_KEY } from './constants.js';
import { storage } from './services/storage.js';
import { gistSync } from './services/gistSync.js';
import { tosHelper } from './services/tosHelper.js';
import { stripBase64 } from './utils/stripBase64.js';
import SettingsModal from './components/SettingsModal.jsx';
import SyncSettingsModal from './components/SyncSettingsModal.jsx';
import MemberManager from './components/MemberManager.jsx';
import HeaderMenu from './components/HeaderMenu.jsx';
import MemberPill from './components/MemberPill.jsx';
import RecordCard from './components/RecordCard.jsx';
import PhotoCapture from './components/PhotoCapture.jsx';
import QuickForm from './components/QuickForm.jsx';
import DesktopLayout from './components/DesktopLayout.jsx';
import SearchBar from './components/SearchBar.jsx';
import TypeChip from './components/TypeChip.jsx';

export default function MedicalRecords() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [members, setMembers] = useState([]);
  const [records, setRecords] = useState([]);
  const [deletedIds, setDeletedIds] = useState([]);
  const [deletedMemberIds, setDeletedMemberIds] = useState([]);
  const [filterMember, setFilterMember] = useState("all");
  const [mode, setMode] = useState("list");
  const [formMemberId, setFormMemberId] = useState(null);
  const [formType, setFormType] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [aiConfig, setAiConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem("volcengine-config") || "{}"); } catch { return {}; }
  });
  const [filterType, setFilterType] = useState("all");
  const [filterDateRange, setFilterDateRange] = useState({ from: "", to: "" });
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState("card");
  const [sortBy, setSortBy] = useState("date-desc");
  const [groupBy, setGroupBy] = useState("month");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [pendingPickAction, setPendingPickAction] = useState(null); // "form" | "photo"
  const [syncStatus, setSyncStatus] = useState("");

  // Auto-sync on load
  useEffect(() => {
    storage.load().then(async (data) => {
      const localMembers = (data && data.members && data.members.length) ? data.members : null;
      if (localMembers) setMembers(localMembers);
      if (data && data.records && data.records.length) setRecords(data.records);
      setLoaded(true);
      if (gistSync.isConfigured()) {
        try {
          setSyncStatus("syncing");
          const cfg = gistSync.getConfig();
          const remote = await gistSync.pull(cfg.token, cfg.gistId);
          const local = data || { members: [], records: [] };
          const localDeleted = JSON.parse(localStorage.getItem("deleted-record-ids") || "[]");
          const localDeletedMembers = JSON.parse(localStorage.getItem(DELETED_MEMBER_IDS_KEY) || "[]");
          const localForSync = { members: local.members, records: (local.records || []).map(r => stripBase64(r)), deletedIds: localDeleted, deletedMemberIds: localDeletedMembers };
          const merged = gistSync.mergeData(localForSync, { members: remote.members || [], records: remote.records || [], deletedIds: remote.deletedIds || [], deletedMemberIds: remote.deletedMemberIds || [] });
          const localImageMap = new Map();
          (local.records || []).forEach(r => { if (r.imageData) localImageMap.set(r.id, { imageData: r.imageData, imageThumb: r.imageThumb }); });
          const finalRecords = merged.records.map(r => {
            const imgs = localImageMap.get(r.id);
            return imgs ? { ...r, ...imgs } : r;
          });
          setMembers(merged.members);
          setRecords(finalRecords);
          setDeletedIds(merged.deletedIds || []);
          setDeletedMemberIds(merged.deletedMemberIds || []);
          localStorage.setItem("deleted-record-ids", JSON.stringify(merged.deletedIds || []));
          localStorage.setItem(DELETED_MEMBER_IDS_KEY, JSON.stringify(merged.deletedMemberIds || []));
          await storage.save({ members: merged.members, records: finalRecords });
          // Push merged result back to gist to propagate tombstones
          const currentAi = JSON.parse(localStorage.getItem("volcengine-config") || "{}");
          const tc = tosHelper.getConfig();
          gistSync.push(cfg.token, cfg.gistId, { members: merged.members, records: merged.records, deletedIds: merged.deletedIds, deletedMemberIds: merged.deletedMemberIds }, (currentAi && currentAi.apiKey) ? currentAi : (remote.aiConfig || {}), (tc && tc.accessKeyId) ? tc : (remote.tosConfig || undefined)).catch(function(e) { console.error("Auto sync push-back failed:", e); });
          if (remote.aiConfig && remote.aiConfig.apiKey) {
            const localAi = JSON.parse(localStorage.getItem("volcengine-config") || "{}");
            if (!localAi.apiKey) {
              setAiConfig(remote.aiConfig);
              localStorage.setItem("volcengine-config", JSON.stringify(remote.aiConfig));
            }
          }
          if (remote.tosConfig && remote.tosConfig.accessKeyId) {
            if (!tosHelper.isConfigured()) {
              tosHelper.saveConfig(remote.tosConfig);
            }
          }
          setSyncStatus("done");
          setTimeout(() => setSyncStatus(""), 2000);
        } catch (e) {
          console.error("Auto sync failed:", e);
          setSyncStatus("error");
          setTimeout(() => setSyncStatus(""), 3000);
        }
      }
      // No DEFAULT_MEMBERS fallback — members are managed via MemberManager
    });
  }, []);

  useEffect(() => {
    if (loaded) storage.save({ members, records });
  }, [members, records, loaded]);

  const pushNow = useCallback(function(newMembers, newRecords, newDeletedIds) {
    if (!gistSync.isConfigured()) return;
    const m = newMembers || members;
    const r = newRecords || records;
    const d = newDeletedIds || JSON.parse(localStorage.getItem("deleted-record-ids") || "[]");
    const dm = JSON.parse(localStorage.getItem(DELETED_MEMBER_IDS_KEY) || "[]");
    const cfg = gistSync.getConfig();
    const pushData = { members: m, records: r.map(function(rec) { return stripBase64(rec); }), deletedIds: d, deletedMemberIds: dm };
    const currentAi = JSON.parse(localStorage.getItem("volcengine-config") || "{}");
    const tc = tosHelper.getConfig();
    gistSync.push(cfg.token, cfg.gistId, pushData, currentAi, (tc && tc.accessKeyId) ? tc : undefined).catch(function(e) { console.error("Push failed:", e); });
  }, [members, records]);

  const addRecord = useCallback((record) => {
    setRecords((prev) => {
      const next = [record, ...prev];
      setTimeout(function() { pushNow(null, next); }, 100);
      return next;
    });
    setMode("list");
  }, [pushNow]);

  const deleteRecord = useCallback((id) => {
    setDeletedIds(function(prevDel) {
      const nextDel = prevDel.indexOf(id) === -1 ? prevDel.concat([id]) : prevDel;
      localStorage.setItem("deleted-record-ids", JSON.stringify(nextDel));
      setRecords(function(prev) {
        const next = prev.filter(function(r) { return r.id !== id; });
        setTimeout(function() { pushNow(null, next, nextDel); }, 100);
        return next;
      });
      return nextDel;
    });
  }, [pushNow]);

  const editRecord = useCallback((updated) => {
    setRecords((prev) => {
      const next = prev.map(function(r) { return r.id === updated.id ? Object.assign({}, r, updated) : r; });
      setTimeout(function() { pushNow(null, next); }, 100);
      return next;
    });
  }, [pushNow]);

  const quickSync = useCallback(async function() {
    if (!gistSync.isConfigured()) { setShowSync(true); return; }
    setSyncStatus("syncing");
    try {
      const cfg = gistSync.getConfig();
      const remote = await gistSync.pull(cfg.token, cfg.gistId);
      const local = await storage.load() || { members: [], records: [] };
      const localDeleted = JSON.parse(localStorage.getItem("deleted-record-ids") || "[]");
      const localDeletedMembers = JSON.parse(localStorage.getItem(DELETED_MEMBER_IDS_KEY) || "[]");
      const localForSync = { members: local.members, records: (local.records || []).map(function(r) { return stripBase64(r); }), deletedIds: localDeleted, deletedMemberIds: localDeletedMembers };
      const remoteClean = { members: remote.members || [], records: remote.records || [], deletedIds: remote.deletedIds || [], deletedMemberIds: remote.deletedMemberIds || [] };
      const merged = gistSync.mergeData(localForSync, remoteClean);
      const currentAi = JSON.parse(localStorage.getItem("volcengine-config") || "{}");
      const mergedAi = (currentAi && currentAi.apiKey) ? currentAi : (remote.aiConfig || {});
      const tc = tosHelper.getConfig();
      await gistSync.push(cfg.token, cfg.gistId, merged, mergedAi, (tc && tc.accessKeyId) ? tc : undefined);
      const localImageMap = new Map();
      (local.records || []).forEach(function(r) { if (r.imageData) localImageMap.set(r.id, { imageData: r.imageData, imageThumb: r.imageThumb }); });
      const finalRecords = merged.records.map(function(r) { const imgs = localImageMap.get(r.id); return imgs ? Object.assign({}, r, imgs) : r; });
      setMembers(merged.members);
      setRecords(finalRecords);
      setDeletedIds(merged.deletedIds || []);
      setDeletedMemberIds(merged.deletedMemberIds || []);
      localStorage.setItem("deleted-record-ids", JSON.stringify(merged.deletedIds || []));
      localStorage.setItem(DELETED_MEMBER_IDS_KEY, JSON.stringify(merged.deletedMemberIds || []));
      await storage.save({ members: merged.members, records: finalRecords });
      if (!currentAi.apiKey && remote.aiConfig && remote.aiConfig.apiKey) {
        setAiConfig(remote.aiConfig);
        localStorage.setItem("volcengine-config", JSON.stringify(remote.aiConfig));
      }
      if (remote.tosConfig && remote.tosConfig.accessKeyId && !tosHelper.isConfigured()) {
        tosHelper.saveConfig(remote.tosConfig);
      }
      setSyncStatus("done");
      setTimeout(function() { setSyncStatus(""); }, 2000);
    } catch (e) {
      console.error("Quick sync failed:", e);
      setSyncStatus("error");
      setTimeout(function() { setSyncStatus(""); }, 3000);
    }
  }, []);

  const saveAiConfig = (cfg) => {
    setAiConfig(cfg);
    localStorage.setItem("volcengine-config", JSON.stringify(cfg));
  };

  const handleSyncDone = (data, restoredAiConfig) => {
    if (data.members?.length) setMembers(data.members);
    if (data.records?.length) setRecords(data.records);
    if (restoredAiConfig && restoredAiConfig.apiKey) {
      setAiConfig(restoredAiConfig);
      localStorage.setItem("volcengine-config", JSON.stringify(restoredAiConfig));
    }
  };

  const exportData = () => {
    const exportRecords = records.map(r => stripBase64(r));
    const data = { members, records: exportRecords, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `medical-records-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    let result = records;
    if (filterMember !== "all") result = result.filter((r) => r.memberId === filterMember);
    if (filterType !== "all") result = result.filter((r) => r.type === filterType);
    if (filterDateRange.from) result = result.filter((r) => (r.date || "") >= filterDateRange.from);
    if (filterDateRange.to) result = result.filter((r) => (r.date || "") <= filterDateRange.to);
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter((r) => {
        const fields = [r.summary, r.hospital, r.doctor, r.diagnosis, r.notes];
        if (r.medications) r.medications.forEach((m) => fields.push(m.name));
        if (r.tests) r.tests.forEach((t) => fields.push(t.name));
        return fields.some((f) => f && f.toLowerCase().includes(q));
      });
    }
    return result;
  }, [records, filterMember, filterType, filterDateRange, searchText]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case "date-asc":
        return arr.sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.createdAt || 0) - (b.createdAt || 0));
      case "type":
        return arr.sort((a, b) => (a.type || "").localeCompare(b.type || "") || (b.date || "").localeCompare(a.date || ""));
      case "member":
        return arr.sort((a, b) => (a.memberId || "").localeCompare(b.memberId || "") || (b.date || "").localeCompare(a.date || ""));
      default: // date-desc
        return arr.sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0));
    }
  }, [filtered, sortBy]);

  const groups = useMemo(() => {
    const g = {};
    sorted.forEach((r) => {
      let key;
      switch (groupBy) {
        case "type": key = r.type || "unknown"; break;
        case "member": key = r.memberId || "unknown"; break;
        case "none": key = "all"; break;
        default: key = r.date ? r.date.slice(0, 7) : "未知日期";
      }
      if (!g[key]) g[key] = [];
      g[key].push(r);
    });
    return g;
  }, [sorted, groupBy]);

  return (
    <div style={{ maxWidth: isDesktop ? undefined : 480, margin: "0 auto", minHeight: "100vh", background: "#F5F3F0", fontFamily: "'Noto Sans SC', sans-serif" }}>
      {showSettings && <SettingsModal aiConfig={aiConfig} onSave={saveAiConfig} onClose={() => setShowSettings(false)} onPush={pushNow} />}
      {showSync && <SyncSettingsModal onClose={() => setShowSync(false)} onSyncDone={handleSyncDone} aiConfig={aiConfig} />}
      <MemberManager open={showMembers} onClose={() => setShowMembers(false)} members={members} onUpdate={function(nextMembers) {
        const nextIds = new Set(nextMembers.map(function(m) { return m.id; }));
        const removedIds = members.filter(function(m) { return !nextIds.has(m.id); }).map(function(m) { return m.id; });
        const nextDeletedMemberIds = removedIds.length ? Array.from(new Set(deletedMemberIds.concat(removedIds))) : deletedMemberIds;
        setDeletedMemberIds(nextDeletedMemberIds);
        localStorage.setItem(DELETED_MEMBER_IDS_KEY, JSON.stringify(nextDeletedMemberIds));
        setMembers(nextMembers);
        setTimeout(function() { pushNow(nextMembers); }, 100);
      }} />
      <div style={{ background: "linear-gradient(135deg, #4A7C6F 0%, #3D6B5F 100%)", padding: "20px 20px 16px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: 1 }}>家庭诊疗记录</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{records.length} 条记录 · {members.length} 位成员</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setShowSync(true)} style={{
              padding: "0 10px", height: 30, borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.3)",
              background: syncStatus === "syncing" ? "rgba(255,255,255,0.3)" : syncStatus === "done" ? "rgba(100,200,150,0.3)" : syncStatus === "error" ? "rgba(200,100,100,0.3)" : "rgba(255,255,255,0.15)",
              fontSize: 12, color: "rgba(255,255,255,0.9)", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
              display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
            }} title="云同步">
              {syncStatus === "syncing" ? <span style={{ display: "inline-block", width: 10, height: 10, border: "1.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> : "☁️"}
              {syncStatus === "done" ? "已同步" : syncStatus === "error" ? "失败" : "同步"}
            </button>
            {isDesktop ? (
              <>
                {records.length > 0 && <button onClick={exportData} style={{
                  padding: "6px 10px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)",
                  fontSize: 12, color: "rgba(255,255,255,0.8)", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
                }} title="导出数据">导出</button>}
                <button onClick={() => setShowSettings(true)} style={{
                  padding: "6px 10px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)",
                  fontSize: 14, color: "rgba(255,255,255,0.8)", cursor: "pointer",
                }} title="火山引擎配置">⚙️</button>
                <button onClick={() => setShowMembers(true)} style={{
                  padding: "6px 14px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)",
                  fontSize: 12, color: "rgba(255,255,255,0.8)", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
                }}>管理成员</button>
              </>
            ) : (
              <HeaderMenu items={[
                { icon: "📤", label: "导出", onClick: exportData, hide: records.length === 0 },
                { icon: "⚙️", label: "设置", onClick: () => setShowSettings(true) },
                { icon: "👥", label: "管理成员", onClick: () => setShowMembers(true) },
              ]} />
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 100px" }}>
        {mode === "photo" && formMemberId && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#333", marginBottom: 4 }}>📸 拍照识别</div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 14, fontFamily: "'Noto Sans SC', sans-serif" }}>
              {(function() { const m = members.find(function(x) { return x.id === formMemberId; }); return m ? m.avatar + " " + m.name : ""; })()}
            </div>
            <PhotoCapture members={members} memberId={formMemberId} onSave={addRecord} onCancel={function() { setMode("list"); }} aiConfig={aiConfig} />
          </div>
        )}

        {mode === "select-member" && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#333", marginBottom: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>选择成员</div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16, fontFamily: "'Noto Sans SC', sans-serif" }}>这条记录属于谁？</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {members.map(function(m) { return (
                <button key={m.id} onClick={function() { setFormMemberId(m.id); setMode(pendingPickAction === "photo" ? "photo" : "select-type"); }} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12,
                  border: "1.5px solid #e8e5e0", background: "#faf9f7", cursor: "pointer", transition: "all 0.15s",
                  fontFamily: "'Noto Sans SC', sans-serif",
                }}>
                  <span style={{ fontSize: 28 }}>{m.avatar}</span>
                  <span style={{ fontSize: 16, fontWeight: 500, color: m.color }}>{m.name}</span>
                </button>
              ); })}
            </div>
            <button onClick={function() { setMode("list"); }} style={{
              width: "100%", marginTop: 14, padding: "10px", borderRadius: 12, border: "1.5px solid #e8e5e0",
              background: "#fff", fontSize: 14, color: "#888", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
            }}>取消</button>
          </div>
        )}

        {mode === "select-type" && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#333", marginBottom: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>选择类型</div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16, fontFamily: "'Noto Sans SC', sans-serif" }}>
              {(function() { const m = members.find(function(x) { return x.id === formMemberId; }); return m ? m.avatar + " " + m.name : ""; })()}  ·  记录什么内容？
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {RECORD_TYPES.map(function(t) { return (
                <button key={t.key} onClick={function() { setFormType(t.key); setMode("form"); }} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12,
                  border: "1.5px solid #e8e5e0", background: "#faf9f7", cursor: "pointer", transition: "all 0.15s",
                  fontFamily: "'Noto Sans SC', sans-serif",
                }}>
                  <span style={{ fontSize: 24 }}>{t.icon}</span>
                  <span style={{ fontSize: 15, fontWeight: 500, color: "#333" }}>{t.label}</span>
                </button>
              ); })}
            </div>
            <button onClick={function() { setMode("select-member"); }} style={{
              width: "100%", marginTop: 14, padding: "10px", borderRadius: 12, border: "1.5px solid #e8e5e0",
              background: "#fff", fontSize: 14, color: "#888", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
            }}>返回</button>
          </div>
        )}

        {mode === "form" && formType && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#333", marginBottom: 14, fontFamily: "'Noto Sans SC', sans-serif" }}>
              {(function() { const t = RECORD_TYPES.find(function(x) { return x.key === formType; }); return t ? t.icon + " " + t.label : ""; })()}
              <span style={{ fontSize: 12, color: "#aaa", fontWeight: 400, marginLeft: 8 }}>{(function() { const m = members.find(function(x) { return x.id === formMemberId; }); return m ? m.avatar + " " + m.name : ""; })()}</span>
            </div>
            <QuickForm type={formType} memberId={formMemberId} onSave={addRecord} onCancel={function() { setMode("list"); }} aiConfig={aiConfig} />
          </div>
        )}
        {mode === "list" && isDesktop && (
          <DesktopLayout
            members={members} records={sorted} groups={groups}
            totalCount={records.length} filteredCount={filtered.length}
            filterMember={filterMember} onFilterMember={setFilterMember}
            filterType={filterType} onFilterType={setFilterType}
            filterDateRange={filterDateRange} onFilterDateRange={setFilterDateRange}
            searchText={searchText} onSearchText={setSearchText}
            viewMode={viewMode} onViewMode={setViewMode}
            sortBy={sortBy} onSortBy={setSortBy}
            groupBy={groupBy} onGroupBy={setGroupBy}
            onDelete={deleteRecord} onEdit={editRecord}
            onClearFilters={() => { setFilterMember("all"); setFilterType("all"); setFilterDateRange({ from: "", to: "" }); setSearchText(""); }}
          />
        )}
        {mode === "list" && !isDesktop && (
          <>
            <div style={{ marginBottom: 10 }}>
              <SearchBar value={searchText} onChange={setSearchText} />
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 4 }}>
              <button onClick={() => setFilterMember("all")} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20,
                border: filterMember === "all" ? "2px solid #4A7C6F" : "2px solid transparent",
                background: filterMember === "all" ? "#4A7C6F18" : "#f5f3f0", color: filterMember === "all" ? "#4A7C6F" : "#666",
                fontSize: 14, fontWeight: filterMember === "all" ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap",
                fontFamily: "'Noto Sans SC', sans-serif", flexShrink: 0,
              }}>全部</button>
              {members.map((m) => <MemberPill key={m.id} member={m} selected={filterMember === m.id} onClick={() => setFilterMember(m.id)} />)}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
              <TypeChip type={{ icon: "📁", label: "全部" }} selected={filterType === "all"} onClick={() => setFilterType("all")} />
              {RECORD_TYPES.map((t) => <TypeChip key={t.key} type={t} selected={filterType === t.key} onClick={() => setFilterType(t.key)} />)}
            </div>
            {Object.keys(groups).length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#bbb" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 14 }}>还没有记录</div>
                <div style={{ fontSize: 12, marginTop: 4, color: "#ccc" }}>点击下方按钮开始记录</div>
              </div>
            ) : (
              Object.entries(groups).map(([month, recs]) => (
                <div key={month} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#aaa", marginBottom: 8, paddingLeft: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>{month}</div>
                  {recs.map((r) => <RecordCard key={r.id} record={r} members={members} onDelete={deleteRecord} onEdit={editRecord} />)}
                </div>
              ))
            )}
          </>
        )}
      </div>

      {mode === "list" && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12, zIndex: 20 }}>
          <button onClick={function() { const mid = filterMember !== "all" ? filterMember : null; if (mid) { setFormMemberId(mid); setMode("photo"); } else { setPendingPickAction("photo"); setMode("select-member"); } }} style={{
            width: 56, height: 56, borderRadius: "50%", border: "none", background: "#4A7C6F", color: "#fff",
            fontSize: 24, cursor: "pointer", boxShadow: "0 4px 16px rgba(74,124,111,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.15s",
          }} onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")} onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}>📸</button>
          <button onClick={function() { const mid = filterMember !== "all" ? filterMember : null; if (mid) { setFormMemberId(mid); setMode("select-type"); } else { setPendingPickAction("form"); setMode("select-member"); } }} style={{
            width: 56, height: 56, borderRadius: "50%", border: "none", background: "#5B7FA5", color: "#fff",
            fontSize: 24, cursor: "pointer", boxShadow: "0 4px 16px rgba(91,127,165,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.15s",
          }} onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")} onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}>✏️</button>
          <button onClick={quickSync} disabled={syncStatus === "syncing"} style={{
            width: 56, height: 56, borderRadius: "50%", border: "none",
            background: syncStatus === "syncing" ? "#aaa" : syncStatus === "done" ? "#4A9C6F" : syncStatus === "error" ? "#C06B5D" : "#8B7BA5",
            color: "#fff", fontSize: 24, cursor: syncStatus === "syncing" ? "default" : "pointer",
            boxShadow: "0 4px 16px rgba(139,123,165,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
          }} onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")} onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}>
            {syncStatus === "syncing" ? <span style={{ display: "inline-block", width: 24, height: 24, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> : "🔄"}
          </button>
        </div>
      )}
    </div>
  );
}
