export function stripBase64(rec) {
  const o = Object.assign({}, rec);
  delete o.imageData; delete o.imageThumb;
  if (o.images) {
    o.images = o.images.map(function(img) {
      if (img.imageUrl) return { imageUrl: img.imageUrl, thumbUrl: img.thumbUrl };
      return null;
    }).filter(Boolean);
  }
  return o;
}
