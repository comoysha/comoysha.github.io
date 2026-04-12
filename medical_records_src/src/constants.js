export const STORAGE_KEY = "family-medical-records";
export const GIST_CONFIG_KEY = "gist-sync-config";
export const GIST_FILENAME = "medical-records.json";
export const DELETED_MEMBER_IDS_KEY = "deleted-member-ids";
export const TOS_CONFIG_KEY = "tos-config";

export const DEFAULT_MEMBERS = [
  { id: "m1", name: "我", avatar: "👤", color: "#4A7C6F" },
  { id: "m2", name: "女儿", avatar: "👧", color: "#C06B5D" },
  { id: "m3", name: "妻子", avatar: "👩", color: "#7B6B8D" },
];

export const RECORD_TYPES = [
  { key: "visit", label: "就诊", icon: "🏥" },
  { key: "medication", label: "用药", icon: "💊" },
  { key: "test", label: "检查", icon: "📋" },
  { key: "symptom", label: "症状", icon: "🌡️" },
  { key: "note", label: "备注", icon: "📝" },
];

export const createId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
