import type { LayoutId, ThemeId } from "@/lib/theme";
import { themeDefinitions } from "@/lib/theme";

/** A schematic miniature of the homepage: the real theme image placed where the layout puts it. */
export function LayoutPreview({
  layout,
  theme,
  caption,
}: {
  layout: LayoutId;
  theme: ThemeId;
  caption: string;
}) {
  return (
    <figure className={`layout-preview layout-preview-${layout}`}>
      <div className="layout-preview-frame" aria-hidden="true">
        <img
          className="layout-preview-image"
          src={themeDefinitions[theme].desktopImage}
          alt=""
          width={1536}
          height={1024}
          loading="lazy"
          decoding="async"
        />
        <div className="layout-preview-copy">
          <span className="layout-preview-line layout-preview-heading" />
          <span className="layout-preview-line layout-preview-heading short" />
          <span className="layout-preview-line" />
          <span className="layout-preview-line short" />
          <span className="layout-preview-button" />
        </div>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
