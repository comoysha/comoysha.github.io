import { tosHelper } from '../services/tosHelper.js';

// Prefer thumbnail; fall back to full image. Accepts new key fields and legacy url/base64 fields.
export function getThumbSrc(img) {
  if (!img) return null;
  if (img.thumbKey) return tosHelper.buildUrl(img.thumbKey);
  if (img.imageThumb) return img.imageThumb;
  if (img.thumbUrl) return img.thumbUrl;
  return getFullSrc(img);
}

// Prefer full image; fall back to thumbnail.
export function getFullSrc(img) {
  if (!img) return null;
  if (img.imageKey) return tosHelper.buildUrl(img.imageKey);
  if (img.imageData) return img.imageData;
  if (img.imageUrl) return img.imageUrl;
  if (img.thumbKey) return tosHelper.buildUrl(img.thumbKey);
  if (img.thumbUrl) return img.thumbUrl;
  if (img.imageThumb) return img.imageThumb;
  return null;
}
