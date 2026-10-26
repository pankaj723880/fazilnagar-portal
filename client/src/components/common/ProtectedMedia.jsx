import React, { useState } from 'react';

/**
 * ProtectedImage: Reusable image component with built-in deterrence against
 * right-click, dragging, and image saving.
 *
 * Preserves responsive styling, alt tags, error fallbacks, and standard event handlers.
 */
export function ProtectedImage({
  src,
  alt = '',
  className = '',
  fallbackSrc,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  style = {},
  onClick,
  onError,
  onLoad,
  ...props
}) {
  const [hasError, setHasError] = useState(false);

  const handleError = (e) => {
    if (!hasError && fallbackSrc) {
      setHasError(true);
      e.currentTarget.src = fallbackSrc;
    }
    if (onError) onError(e);
  };

  return (
    <img
      src={hasError && fallbackSrc ? fallbackSrc : src}
      alt={alt}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      draggable={false}
      data-protected-media="true"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={onClick}
      onError={handleError}
      onLoad={onLoad}
      className={`select-none pointer-events-auto ${className}`}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitUserDrag: 'none',
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * ProtectedVideo: Reusable HTML5 video component with built-in deterrence against
 * right-click, video downloading, and picture-in-picture saving.
 *
 * Preserves custom video controls, seek bars, playback events, and responsive styling.
 */
export function ProtectedVideo({
  src,
  poster,
  controls = true,
  controlsList = 'nodownload noplaybackrate',
  disablePictureInPicture = true,
  className = '',
  style = {},
  preload = 'metadata',
  children,
  onContextMenu,
  ...props
}) {
  const mergedControlsList = Array.from(
    new Set([...(controlsList || '').split(/\s+/), 'nodownload', 'noplaybackrate'])
  ).filter(Boolean).join(' ');

  return (
    <video
      src={src}
      poster={poster}
      preload={preload}
      controls={controls}
      controlsList={mergedControlsList}
      disablePictureInPicture={disablePictureInPicture}
      draggable={false}
      data-protected-media="true"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onContextMenu) onContextMenu(e);
      }}
      className={`select-none pointer-events-auto ${className}`}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        ...style,
      }}
      {...props}
    >
      {children}
    </video>
  );
}

export default ProtectedImage;
