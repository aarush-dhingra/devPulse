import { useRef } from "react";
import { ImagePlus, X, Video } from "lucide-react";

const MAX_IMAGES = 4;
const MAX_VIDEO = 1;

/**
 * MediaUpload — drag-drop + click to select, preview thumbnails, remove button.
 * Props:
 *   files        — array of File objects currently selected
 *   onChange     — (files: File[]) => void
 */
export default function MediaUpload({ files = [], onChange }) {
  const inputRef = useRef(null);

  const hasVideo = files.some((f) => f.type.startsWith("video/"));
  const canAdd = hasVideo ? false : files.length < MAX_IMAGES;

  function handleFiles(incoming) {
    const next = [...files];
    for (const f of incoming) {
      if (f.type.startsWith("video/")) {
        if (next.length === 0) { next.push(f); break; }
        continue;
      }
      if (next.length < MAX_IMAGES) next.push(f);
    }
    onChange(next);
  }

  function remove(idx) {
    const next = [...files];
    next.splice(idx, 1);
    onChange(next);
  }

  function onDrop(e) {
    e.preventDefault();
    handleFiles(Array.from(e.dataTransfer.files));
  }

  return (
    <div className="flex flex-wrap gap-2 items-start">
      {files.map((f, i) => {
        const url = URL.createObjectURL(f);
        return (
          <div key={i} className="relative rounded-lg overflow-hidden w-20 h-20 bg-white/5 shrink-0">
            {f.type.startsWith("video/") ? (
              <div className="w-full h-full flex items-center justify-center">
                <Video size={28} className="text-ink-faint" />
              </div>
            ) : (
              <img src={url} alt="" className="w-full h-full object-cover" />
            )}
            <button
              onClick={() => remove(i)}
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"
              aria-label="Remove"
            >
              <X size={11} className="text-white" />
            </button>
          </div>
        );
      })}

      {canAdd && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="w-20 h-20 rounded-lg border border-dashed border-white/20 hover:border-brand-400 flex flex-col items-center justify-center gap-1 text-ink-faint hover:text-brand-400 transition-colors shrink-0"
          aria-label="Add media"
        >
          <ImagePlus size={20} />
          <span className="text-[10px]">Add</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple={!hasVideo}
        className="hidden"
        onChange={(e) => { handleFiles(Array.from(e.target.files)); e.target.value = ""; }}
      />
    </div>
  );
}
