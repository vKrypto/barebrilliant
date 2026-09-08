import { mediaUrl, PLACEHOLDER_IMAGE } from "../lib/storage.js";

// The dashboard publisher emits a media OBJECT per image / video:
//   image: { type:"image", src, srcset:"path 320w, …", sizes, width, height, alt }
//   video: { type:"video", poster, sources:[{src,type,media?}], width, height, alt }
//   none : { type:"image", placeholder:true, src:"product_placeholder.webp" }
// `src`/`srcset`/`poster`/`sources[].src` are storage-relative; resolve through
// MEDIA_BASE here so JSON and media can live on different hosts / a CDN.

export function resolveSrcset(srcset) {
  if (!srcset) return undefined;
  return srcset
    .split(",")
    .map((part) => {
      const [path, descriptor] = part.trim().split(/\s+/);
      return `${mediaUrl(path)} ${descriptor || ""}`.trim();
    })
    .join(", ");
}

// Small still for a gallery thumbnail strip: a video's poster, else the
// narrowest image rung, else the object's own src.
export function posterOrThumb(media) {
  if (!media) return PLACEHOLDER_IMAGE;
  if (media.type === "video") return media.poster ? mediaUrl(media.poster) : PLACEHOLDER_IMAGE;
  const firstRung = media.srcset ? media.srcset.split(",")[0].trim().split(/\s+/)[0] : null;
  return mediaUrl(firstRung || media.src || "");
}

export default function Media({ media, sizes, className, preview = false, eager = false, ...rest }) {
  if (!media) {
    return (
      <img className={className} src={PLACEHOLDER_IMAGE} alt="" width="1080" height="1080"
           loading={eager ? "eager" : "lazy"} {...rest} />
    );
  }

  if (media.type === "video" && Array.isArray(media.sources) && media.sources.length) {
    return (
      <video
        className={className}
        poster={media.poster ? mediaUrl(media.poster) : undefined}
        width={media.width}
        height={media.height}
        muted
        playsInline
        loop
        controls={!preview}
        preload={preview ? "none" : "metadata"}
        {...rest}
      >
        {media.sources.map((s, i) => (
          <source key={i} src={mediaUrl(s.src)} type={s.type} media={s.media || undefined} />
        ))}
      </video>
    );
  }

  const isPlaceholder = media.placeholder || !media.src;
  const src = isPlaceholder ? PLACEHOLDER_IMAGE : mediaUrl(media.src);
  return (
    <img
      className={className}
      src={src}
      srcSet={isPlaceholder ? undefined : resolveSrcset(media.srcset)}
      sizes={isPlaceholder ? undefined : sizes || media.sizes || undefined}
      alt={media.alt || ""}
      width={media.width || 1080}
      height={media.height || 1080}
      loading={eager ? "eager" : "lazy"}
      onError={(e) => {
        if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
          e.currentTarget.srcset = "";
          e.currentTarget.src = PLACEHOLDER_IMAGE;
        }
      }}
      {...rest}
    />
  );
}
