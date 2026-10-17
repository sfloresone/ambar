import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toPng } from "html-to-image";

import { Button } from "@ambar/ui/components/button";

type BannerDownloadProps = {
  targetId: string;
};

export function BannerDownload({ targetId }: BannerDownloadProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(false);

  async function download() {
    const banner = document.getElementById(targetId);

    if (!banner) {
      setError(true);

      return;
    }

    setDownloading(true);
    setError(false);

    try {
      await document.fonts.ready;
      await Promise.all(Array.from(banner.querySelectorAll("img"), (image) => image.decode()));

      const url = await toPng(banner, {
        canvasWidth: 1600,
        canvasHeight: 600,
        pixelRatio: 1,
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.href = url;
      link.download = "ambar-portfolio-banner.png";
      link.click();
    } catch {
      setError(true);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={download} loading={downloading}>
        <DownloadSimpleIcon weight="bold" aria-hidden />
        Download PNG
      </Button>
      <span className="text-sm text-muted-foreground">1600 × 600 px</span>
      {error && (
        <output className="w-full text-sm text-destructive">
          The banner could not be downloaded. Please try again.
        </output>
      )}
    </div>
  );
}
