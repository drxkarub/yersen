import { useState } from "react";
import { Camera } from "lucide-react";
import type { TrayPhotoView } from "@yersen/shared";
import { api, errorText } from "../api.ts";

const MAX = 6; // sunucudaki MAX_TRAY_PHOTOS ile aynı

/**
 * Günün tepsisinin gerçek fotoğrafı, menünün hemen altında. Fotoğraf yoksa normal kullanıcıya
 * hiçbir şey görünmez; moderatör/admin "Tepsi fotoğrafı ekle" düğmesini görür.
 */
export function TrayPhotos({
  date,
  photos,
  canUpload,
  canRemove,
  onChange,
}: {
  date: string;
  photos: TrayPhotoView[];
  canUpload: boolean;
  canRemove: boolean;
  onChange: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showUpload = canUpload && photos.length < MAX;
  if (photos.length === 0 && !showUpload) return null;

  const current = photos[Math.min(selected, photos.length - 1)];

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setSelected(0);
      onChange();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="tepsi" aria-label="Tepsinin fotoğrafı">
      {current && (
        <figure className="tepsi-buyuk">
          <img src={current.url} alt="Günün tepsisi" loading="lazy" />
          <figcaption>
            <span>Gelen tepsi{current.uploadedBy ? `, ${current.uploadedBy} çekti` : ""}</span>
            {canRemove && (
              <button
                type="button"
                className="tepsi-kaldir"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Bu tepsi fotoğrafı kaldırılsın mı?")) void run(() => api.admin.removeTrayPhoto(current.id));
                }}
              >
                Kaldır
              </button>
            )}
          </figcaption>
        </figure>
      )}

      {photos.length > 1 && (
        <div className="tepsi-serit" role="group" aria-label="Diğer fotoğraflar">
          {photos.map((p, i) => (
            <button key={p.id} type="button" aria-pressed={p.id === current?.id} aria-label={`${i + 1}. fotoğraf`} onClick={() => setSelected(i)}>
              <img src={p.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {showUpload && (
        <label className="dugme dugme-ikincil dugme-baglanti tepsi-ekle" aria-disabled={busy || undefined}>
          <Camera size={20} aria-hidden="true" />
          {busy ? "Yükleniyor..." : photos.length === 0 ? "Tepsi fotoğrafı ekle" : "Bir fotoğraf daha ekle"}
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void run(() => api.admin.uploadTrayPhoto(date, f));
            }}
          />
        </label>
      )}

      {error && (
        <p className="hata" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
