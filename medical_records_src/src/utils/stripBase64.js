// Remove base64 payloads (imageData/imageThumb) before syncing to gist; keep
// all other image fields untouched so older clients with different field names
// can't accidentally drop them.
export function stripBase64(rec) {
  const o = Object.assign({}, rec);
  delete o.imageData; delete o.imageThumb;
  if (Array.isArray(o.images)) {
    o.images = o.images.map(function(img) {
      const cleaned = Object.assign({}, img);
      delete cleaned.imageData;
      delete cleaned.imageThumb;
      return cleaned;
    }).filter(function(img) { return Object.keys(img).length > 0; });
  }
  return o;
}
