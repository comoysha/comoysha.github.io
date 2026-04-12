import { TOS_CONFIG_KEY } from '../constants.js';

export const tosHelper = {
  getConfig() {
    try { return JSON.parse(localStorage.getItem(TOS_CONFIG_KEY) || "{}"); } catch { return {}; }
  },
  saveConfig(cfg) { localStorage.setItem(TOS_CONFIG_KEY, JSON.stringify(cfg)); },
  isConfigured() {
    const c = this.getConfig();
    return !!(c.accessKeyId && c.accessKeySecret && c.bucket);
  },
  getClient() {
    const c = this.getConfig();
    if (!c.accessKeyId || !c.accessKeySecret || !c.bucket) return null;
    const region = c.region || "cn-beijing";
    return new window.TOS({
      accessKeyId: c.accessKeyId,
      accessKeySecret: c.accessKeySecret,
      region: region,
      endpoint: "tos-" + region + ".volces.com",
      bucket: c.bucket,
    });
  },
  async upload(file, recordId) {
    const client = this.getClient();
    if (!client) throw new Error("TOS 未配置");
    const ext = (file.name || "photo.jpg").split(".").pop().toLowerCase();
    const key = "medical-images/" + recordId + "." + ext;
    await client.putObject({ key: key, body: file });
    const c = this.getConfig();
    const region = c.region || "cn-beijing";
    return "https://" + c.bucket + ".tos-" + region + ".volces.com/" + key;
  },
  async uploadBase64(base64DataUrl, recordId) {
    const parts = base64DataUrl.split(",");
    const mime = parts[0].match(/:(.*?);/)[1];
    const ext = mime.split("/")[1] || "jpg";
    const bstr = atob(parts[1]);
    const arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) arr[i] = bstr.charCodeAt(i);
    const blob = new Blob([arr], { type: mime });
    const file = new File([blob], recordId + "." + ext, { type: mime });
    return this.upload(file, recordId);
  },
  async uploadThumb(base64DataUrl, recordId) {
    const parts = base64DataUrl.split(",");
    const mime = parts[0].match(/:(.*?);/)[1];
    const ext = mime.split("/")[1] || "jpg";
    const bstr = atob(parts[1]);
    const arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) arr[i] = bstr.charCodeAt(i);
    const blob = new Blob([arr], { type: mime });
    const key = "medical-images/" + recordId + "_thumb." + ext;
    const client = this.getClient();
    if (!client) throw new Error("TOS 未配置");
    await client.putObject({ key: key, body: blob });
    const c = this.getConfig();
    const region = c.region || "cn-beijing";
    return "https://" + c.bucket + ".tos-" + region + ".volces.com/" + key;
  },
};
