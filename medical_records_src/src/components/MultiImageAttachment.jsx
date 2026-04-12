import { useRef } from 'react';

export default function MultiImageAttachment({ images, onChange }) {
  const fileRef = useRef();

  const handleFile = function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function() {
      const fullData = reader.result;
      const img = new Image();
      img.onload = function() {
        const c = document.createElement("canvas");
        const s = 88 / Math.max(img.width, img.height);
        c.width = img.width * s; c.height = img.height * s;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        onChange(images.concat([{ imageData: fullData, imageThumb: c.toDataURL("image/jpeg", 0.7) }]));
      };
      img.src = fullData;
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRemove = function(idx) { onChange(images.filter(function(_, i) { return i !== idx; })); };

  return (
    <div style={{ marginBottom: 10 }}>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      {images.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {images.map(function(img, i) {
            const src = img.thumbUrl || img.imageThumb || img.imageUrl || img.imageData;
            return (
              <div key={i} style={{ position: "relative", display: "inline-block" }}>
                <img src={src} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover" }} />
                <button onClick={function() { handleRemove(i); }} style={{
                  position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%",
                  border: "none", background: "#c06b5d", color: "#fff", fontSize: 12,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>×</button>
              </div>
            );
          })}
        </div>
      )}
      <button onClick={function() { fileRef.current && fileRef.current.click(); }} style={{
        padding: "8px 14px", borderRadius: 8, border: "1.5px dashed #d0cdc5", background: "#faf9f7",
        fontSize: 12, color: "#aaa", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
      }}>📎 添加图片</button>
    </div>
  );
}
