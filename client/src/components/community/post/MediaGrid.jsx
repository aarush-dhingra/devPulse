/**
 * MediaGrid — displays 1-4 images or a video in a responsive mosaic.
 * Props: urls (string[])
 */
export default function MediaGrid({ urls = [] }) {
  if (!urls.length) return null;

  const isVideo = (url) => /\.(mp4|webm|ogg)(\?.*)?$/i.test(url) || url.includes("video");

  if (isVideo(urls[0])) {
    return (
      <div className="rounded-xl overflow-hidden mt-3 bg-black/30">
        <video
          src={urls[0]}
          controls
          className="w-full max-h-[400px] object-contain"
          preload="metadata"
        />
      </div>
    );
  }

  const count = Math.min(urls.length, 4);
  const shown = urls.slice(0, count);

  const gridClass = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-2",
    4: "grid-cols-2",
  }[count];

  return (
    <div className={`grid ${gridClass} gap-1 mt-3 rounded-xl overflow-hidden`}>
      {shown.map((url, i) => {
        const isLast = i === count - 1;
        const remaining = urls.length - 4;
        return (
          <div
            key={i}
            className={`relative bg-white/5 ${count === 3 && i === 0 ? "row-span-2" : ""}`}
            style={{ aspectRatio: count === 1 ? "16/9" : "1/1" }}
          >
            <img
              src={url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {isLast && remaining > 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-bold text-2xl">+{remaining}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
