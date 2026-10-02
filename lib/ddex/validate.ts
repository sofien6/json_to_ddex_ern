import type { Issue } from "./types";

const ISRC_RE = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/;
const UPC_RE = /^\d{12,14}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DPID_RE = /^PADPIDA[A-Z0-9]+$/;
const MD5_RE = /^[a-fA-F0-9]{32}$/;
const ISO_DURATION_RE = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/;

/** Parses seconds, "m:ss", "h:mm:ss" or "PT#H#M#S" into whole seconds. */
export function parseDurationSeconds(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }
  if (typeof value !== "string") return null;

  const iso = ISO_DURATION_RE.exec(value);
  if (iso && value !== "PT") {
    const [, h = "0", m = "0", s = "0"] = iso;
    const total = Number(h) * 3600 + Number(m) * 60 + Math.round(Number(s));
    return total > 0 ? total : null;
  }

  if (/^\d+(:\d{1,2}){1,2}$/.test(value)) {
    const total = value.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
    return total > 0 ? total : null;
  }
  return null;
}

class Checker {
  issues: Issue[] = [];

  error(path: string, message: string) {
    this.issues.push({ path, message, severity: "error" });
  }

  warn(path: string, message: string) {
    this.issues.push({ path, message, severity: "warning" });
  }

  object(value: unknown, path: string): Record<string, unknown> | null {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    this.error(path, "is required and must be an object");
    return null;
  }

  string(value: unknown, path: string, required = true): value is string {
    if (typeof value === "string" && value.trim() !== "") return true;
    if (value === undefined) {
      if (required) this.error(path, "is required");
    } else {
      this.error(path, "must be a non-empty string");
    }
    return false;
  }

  pattern(value: unknown, path: string, re: RegExp, hint: string, required = true) {
    if (this.string(value, path, required) && !re.test(value)) this.error(path, hint);
  }

  date(value: unknown, path: string, required = true) {
    if (!this.string(value, path, required)) return;
    if (!DATE_RE.test(value) || Number.isNaN(Date.parse(value))) {
      this.error(path, "must be a valid date in YYYY-MM-DD format");
    }
  }

  copyrightLine(value: unknown, path: string) {
    const line = this.object(value, path);
    if (!line) return;
    if (!Number.isInteger(line.year) || (line.year as number) < 1900 || (line.year as number) > 2100) {
      this.error(`${path}.year`, "must be a 4-digit year");
    }
    this.string(line.text, `${path}.text`);
  }

  artists(value: unknown, path: string, required: boolean) {
    if (value === undefined && !required) return;
    if (!Array.isArray(value) || value.length === 0) {
      this.error(path, "must be a non-empty array");
      return;
    }
    value.forEach((a, i) => {
      const artist = this.object(a, `${path}[${i}]`);
      if (!artist) return;
      this.string(artist.name, `${path}[${i}].name`);
      this.string(artist.role, `${path}[${i}].role`, false);
    });
    const hasMain = value.some(
      (a) => a && typeof a === "object" && ((a as { role?: string }).role ?? "MainArtist") === "MainArtist",
    );
    if (!hasMain) this.error(path, "needs at least one artist with role MainArtist");
  }

  file(value: unknown, path: string) {
    const file = this.object(value, path);
    if (!file) return null;
    this.string(file.uri, `${path}.uri`);
    if (file.md5 === undefined) {
      this.warn(`${path}.md5`, "is missing; most DSPs require an MD5 hash for every file");
    } else {
      this.pattern(file.md5, `${path}.md5`, MD5_RE, "must be a 32-character hex MD5 hash");
    }
    return file;
  }
}

export function validate(input: unknown): Issue[] {
  const c = new Checker();
  const root = c.object(input, "$");
  if (!root) return c.issues;

  const header = c.object(root.messageHeader, "messageHeader");
  if (header) {
    for (const key of ["sender", "recipient"] as const) {
      const party = c.object(header[key], `messageHeader.${key}`);
      if (!party) continue;
      c.pattern(party.dpid, `messageHeader.${key}.dpid`, DPID_RE, 'must be a DDEX Party ID starting with "PADPIDA"');
      c.string(party.name, `messageHeader.${key}.name`);
    }
    c.string(header.messageId, "messageHeader.messageId", false);
  }

  const release = c.object(root.release, "release");
  if (release) {
    c.string(release.title, "release.title");
    c.string(release.version, "release.version", false);
    c.string(release.type, "release.type", false);
    c.pattern(release.upc, "release.upc", UPC_RE, "must be a 12–14 digit UPC/EAN");
    c.string(release.catalogNumber, "release.catalogNumber", false);
    c.artists(release.artists, "release.artists", true);
    c.string(release.label, "release.label");
    c.string(release.genre, "release.genre");
    c.string(release.subGenre, "release.subGenre", false);
    c.date(release.releaseDate, "release.releaseDate");
    c.date(release.originalReleaseDate, "release.originalReleaseDate", false);
    c.copyrightLine(release.pLine, "release.pLine");
    c.copyrightLine(release.cLine, "release.cLine");
    c.string(release.language, "release.language", false);

    const cover = c.file(release.coverArt, "release.coverArt");
    if (cover) {
      for (const dim of ["width", "height"] as const) {
        const v = cover[dim];
        if (v === undefined) continue;
        if (!Number.isInteger(v) || (v as number) <= 0) {
          c.error(`release.coverArt.${dim}`, "must be a positive integer");
        } else if ((v as number) < 1400) {
          c.warn(`release.coverArt.${dim}`, "is below 1400px; most DSPs require at least 1400×1400 (3000×3000 recommended)");
        }
      }
    }
  }

  if (!Array.isArray(root.tracks) || root.tracks.length === 0) {
    c.error("tracks", "must be a non-empty array");
  } else {
    const seenIsrc = new Map<string, number>();
    root.tracks.forEach((t, i) => {
      const path = `tracks[${i}]`;
      const track = c.object(t, path);
      if (!track) return;
      c.string(track.title, `${path}.title`);
      c.string(track.version, `${path}.version`, false);
      c.pattern(track.isrc, `${path}.isrc`, ISRC_RE, "must be a 12-character ISRC like USRC17607839 (no dashes)");
      if (typeof track.isrc === "string") {
        const prev = seenIsrc.get(track.isrc);
        if (prev !== undefined) c.error(`${path}.isrc`, `duplicates tracks[${prev}].isrc`);
        seenIsrc.set(track.isrc, i);
      }
      if (parseDurationSeconds(track.duration) === null) {
        c.error(`${path}.duration`, 'must be seconds, "m:ss", "h:mm:ss" or ISO 8601 like "PT3M25S"');
      }
      c.artists(track.artists, `${path}.artists`, false);
      if (track.contributors !== undefined) {
        if (!Array.isArray(track.contributors)) {
          c.error(`${path}.contributors`, "must be an array");
        } else {
          track.contributors.forEach((x, j) => {
            const p = `${path}.contributors[${j}]`;
            const contributor = c.object(x, p);
            if (!contributor) return;
            c.string(contributor.name, `${p}.name`);
            const roles = Array.isArray(contributor.role) ? contributor.role : [contributor.role];
            if (roles.length === 0) c.error(`${p}.role`, "is required");
            roles.forEach((r) => c.string(r, `${p}.role`));
          });
          const roles = track.contributors.flatMap((x) => (x as { role?: unknown } | null)?.role ?? []);
          if (!roles.includes("Composer")) {
            c.warn(`${path}.contributors`, "has no Composer; most DSPs require composer credits");
          }
        }
      } else {
        c.warn(`${path}.contributors`, "is missing; most DSPs require at least composer credits");
      }
      if (track.explicit !== undefined && typeof track.explicit !== "boolean") {
        c.error(`${path}.explicit`, "must be true or false");
      }
      c.string(track.language, `${path}.language`, false);
      c.string(track.genre, `${path}.genre`, false);
      if (track.pLine !== undefined) c.copyrightLine(track.pLine, `${path}.pLine`);
      if (track.discNumber !== undefined && (!Number.isInteger(track.discNumber) || (track.discNumber as number) < 1)) {
        c.error(`${path}.discNumber`, "must be a positive integer");
      }
      c.file(track.audioFile, `${path}.audioFile`);
    });
  }

  if (root.deals !== undefined) {
    if (!Array.isArray(root.deals) || root.deals.length === 0) {
      c.error("deals", "must be a non-empty array when provided");
    } else {
      root.deals.forEach((d, i) => {
        const path = `deals[${i}]`;
        const deal = c.object(d, path);
        if (!deal) return;
        c.string(deal.commercialModel, `${path}.commercialModel`);
        if (!Array.isArray(deal.useTypes) || deal.useTypes.length === 0) {
          c.error(`${path}.useTypes`, "must be a non-empty array");
        } else {
          deal.useTypes.forEach((u, j) => c.string(u, `${path}.useTypes[${j}]`));
        }
        if (deal.territories !== undefined) {
          if (!Array.isArray(deal.territories) || deal.territories.length === 0) {
            c.error(`${path}.territories`, "must be a non-empty array");
          } else {
            deal.territories.forEach((t, j) => c.string(t, `${path}.territories[${j}]`));
          }
        }
        c.date(deal.startDate, `${path}.startDate`, false);
        c.date(deal.endDate, `${path}.endDate`, false);
      });
    }
  } else {
    c.warn("deals", "not provided; using worldwide streaming + download deals starting on the release date");
  }

  return c.issues;
}
