// Generated artwork for the mock library: small SVG posters (brand identities, recipes, rockets, plans,
// waveforms) so the library can be designed with believable content and no image files or network.
// Real moments use real media; nothing here ships to a signed-in user with real data.

export type ArtStyle = "wordmark" | "orbit" | "plan" | "wave" | "plate" | "type" | "page";

type Art = {
  style: ArtStyle;
  title: string;
  subtitle?: string;
  /** Background and foreground, any CSS color. */
  bg: string;
  fg: string;
  accent: string;
  width?: number;
  height?: number;
};

function escape(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function body({ style, title, subtitle = "", bg, fg, accent, width, height }: Required<Art>): string {
  const t = escape(title);
  const s = escape(subtitle);
  const cx = width / 2;

  switch (style) {
    case "wordmark":
      return `<rect width="${width}" height="${height}" fill="${bg}"/><rect x="60" y="${height - 140}" width="${width - 120}" height="6" fill="${accent}"/><text x="60" y="${height / 2}" font-family="Helvetica,Arial,sans-serif" font-size="${width / 6}" font-weight="800" letter-spacing="-4" fill="${fg}">${t}</text><text x="60" y="${height - 90}" font-family="Helvetica,Arial,sans-serif" font-size="26" fill="${fg}" opacity=".7">${s}</text>`;
    case "orbit":
      return `<rect width="${width}" height="${height}" fill="${bg}"/>${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % width}" cy="${(i * 53) % height}" r="${(i % 3) + 1}" fill="${fg}" opacity=".6"/>`).join("")}<ellipse cx="${cx}" cy="${height * 0.55}" rx="${width * 0.42}" ry="${height * 0.12}" fill="none" stroke="${accent}" stroke-width="3"/><path d="M${cx} ${height * 0.2} l40 120 v180 h-80 v-180 z" fill="${fg}"/><path d="M${cx - 40} ${height * 0.2 + 300} l-30 60 h60 z M${cx + 40} ${height * 0.2 + 300} l30 60 h-60 z" fill="${accent}"/><text x="40" y="${height - 50}" font-family="Helvetica,Arial,sans-serif" font-size="30" fill="${fg}">${t}</text>`;
    case "plan":
      return `<rect width="${width}" height="${height}" fill="${bg}"/>${Array.from({ length: 12 }, (_, i) => `<path d="M0 ${i * 80} H${width} M${i * 80} 0 V${height}" stroke="${fg}" stroke-opacity=".08"/>`).join("")}<rect x="120" y="160" width="${width - 240}" height="${height - 420}" fill="none" stroke="${fg}" stroke-width="6"/><path d="M120 ${height / 2} H${cx} V160 M${cx} ${height / 2} V${height - 260}" stroke="${fg}" stroke-width="4"/><circle cx="${cx + 120}" cy="${height / 2 + 80}" r="50" fill="none" stroke="${accent}" stroke-width="4"/><text x="120" y="${height - 150}" font-family="Helvetica,Arial,sans-serif" font-size="30" font-weight="700" fill="${fg}">${t}</text><text x="120" y="${height - 105}" font-family="Helvetica,Arial,sans-serif" font-size="22" fill="${fg}" opacity=".6">${s}</text>`;
    case "wave":
      return `<rect width="${width}" height="${height}" fill="${bg}"/>${Array.from({ length: 60 }, (_, i) => {
        const h = 20 + Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.23)) * height * 0.45;

        return `<rect x="${40 + i * ((width - 80) / 60)}" y="${height / 2 - h / 2}" width="${(width - 80) / 60 - 4}" height="${h}" rx="3" fill="${i < 24 ? accent : fg}"/>`;
      }).join("")}<text x="40" y="70" font-family="Helvetica,Arial,sans-serif" font-size="34" font-weight="700" fill="${fg}">${t}</text><text x="40" y="${height - 40}" font-family="Helvetica,Arial,sans-serif" font-size="24" fill="${fg}" opacity=".6">${s}</text>`;
    case "plate":
      return `<rect width="${width}" height="${height}" fill="${bg}"/><circle cx="${cx}" cy="${height * 0.45}" r="${width * 0.34}" fill="${fg}"/><circle cx="${cx}" cy="${height * 0.45}" r="${width * 0.24}" fill="${accent}"/>${Array.from({ length: 7 }, (_, i) => `<circle cx="${cx + Math.cos(i) * width * 0.14}" cy="${height * 0.45 + Math.sin(i * 1.7) * width * 0.12}" r="${10 + (i % 3) * 6}" fill="${bg}" opacity=".8"/>`).join("")}<text x="${cx}" y="${height - 70}" text-anchor="middle" font-family="Georgia,serif" font-size="40" font-style="italic" fill="${fg}">${t}</text>`;
    case "type":
      return `<rect width="${width}" height="${height}" fill="${bg}"/><text x="50" y="${height * 0.42}" font-family="Georgia,serif" font-size="${width / 4}" fill="${fg}">Aa</text><text x="50" y="${height * 0.62}" font-family="Georgia,serif" font-size="34" fill="${fg}">${t}</text><text x="50" y="${height * 0.7}" font-family="Helvetica,Arial,sans-serif" font-size="22" fill="${fg}" opacity=".6">${s}</text><rect x="50" y="${height - 120}" width="60" height="60" fill="${accent}"/><rect x="120" y="${height - 120}" width="60" height="60" fill="${fg}"/>`;
    case "page":
      return `<rect width="${width}" height="${height}" fill="${bg}"/><text x="70" y="140" font-family="Helvetica,Arial,sans-serif" font-size="40" font-weight="700" fill="${fg}">${t}</text><text x="70" y="190" font-family="Helvetica,Arial,sans-serif" font-size="22" fill="${fg}" opacity=".6">${s}</text>${Array.from({ length: 16 }, (_, i) => `<rect x="70" y="${250 + i * 34}" width="${(width - 140) * (0.6 + ((i * 37) % 40) / 100)}" height="12" rx="6" fill="${fg}" opacity=".12"/>`).join("")}<rect x="70" y="${height - 260}" width="${width - 140}" height="170" fill="${accent}" opacity=".35"/>`;
  }
}

/** An SVG poster as a data URL. Sized explicitly so it can be drawn to a canvas (copy as PNG). */
export function placeholderArt(art: Art): string {
  const full: Required<Art> = { subtitle: "", width: 800, height: 1000, ...art };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${full.width}" height="${full.height}" viewBox="0 0 ${full.width} ${full.height}">${body(full)}</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
