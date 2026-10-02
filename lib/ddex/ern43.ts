import type {
  ArtistInput,
  ConversionInput,
  CopyrightLineInput,
  DealInput,
  FileInput,
  TrackInput,
} from "./types";
import { parseDurationSeconds } from "./validate";
import { el, opt, serialize, type XmlNode } from "./xml";

export const ERN_VERSION = "4.3";
const ERN_NAMESPACE = "http://ddex.net/xml/ern/43";
const XSI_NAMESPACE = "http://www.w3.org/2001/XMLSchema-instance";
const SCHEMA_LOCATION = `${ERN_NAMESPACE} http://ddex.net/xml/ern/43/release-notification.xsd`;
const AVS_VERSION_ID = "4";

const DEFAULT_DEALS: DealInput[] = [
  { commercialModel: "SubscriptionModel", useTypes: ["OnDemandStream", "NonInteractiveStream"] },
  { commercialModel: "AdvertisementSupportedModel", useTypes: ["OnDemandStream", "NonInteractiveStream"] },
  { commercialModel: "PayAsYouGoModel", useTypes: ["PermanentDownload"] },
];

// Common industry names mapped to the DDEX ContributorRole allowed values.
const CONTRIBUTOR_ROLE_ALIASES: Record<string, string> = {
  Producer: "StudioProducer",
  Songwriter: "ComposerLyricist",
  Writer: "ComposerLyricist",
  Mixer: "MixingEngineer",
};

function isoDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `PT${h > 0 ? `${h}H` : ""}${m}M${s}S`;
}

function displayTitleText(title: string, version?: string) {
  return version ? `${title} (${version})` : title;
}

/** "A, B & C feat. D & E" */
function displayArtistName(artists: ArtistInput[]): string {
  const join = (names: string[]) =>
    names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
  const main = artists.filter((a) => (a.role ?? "MainArtist") !== "FeaturedArtist").map((a) => a.name);
  const featured = artists.filter((a) => a.role === "FeaturedArtist").map((a) => a.name);
  return featured.length ? `${join(main)} feat. ${join(featured)}` : join(main);
}

function inferReleaseType(trackCount: number): string {
  if (trackCount <= 3) return "Single";
  if (trackCount <= 6) return "EP";
  return "Album";
}

function messageId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? uuid.replace(/-/g, "") : `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
}

/** Hands out stable DDEX party references, de-duplicated by name. */
class PartyRegistry {
  private refs = new Map<string, string>();

  ref(name: string): string {
    let ref = this.refs.get(name);
    if (!ref) {
      ref = `P${this.refs.size + 1}`;
      this.refs.set(name, ref);
    }
    return ref;
  }

  toXml(): XmlNode {
    return el(
      "PartyList",
      [...this.refs].map(([name, ref]) =>
        el("Party", [el("PartyReference", ref), el("PartyName", [el("FullName", name)])]),
      ),
    );
  }
}

function copyrightLine(name: "PLine" | "CLine", line: CopyrightLineInput) {
  return el(name, [el("Year", line.year), el(`${name}Text`, line.text)]);
}

function displayTitle(title: string, version?: string) {
  return el("DisplayTitle", [el("TitleText", title), opt("SubTitle", version)]);
}

function displayArtists(artists: ArtistInput[], parties: PartyRegistry) {
  return artists.map((a, i) =>
    el(
      "DisplayArtist",
      [el("ArtistPartyReference", parties.ref(a.name)), el("DisplayArtistRole", a.role ?? "MainArtist")],
      { SequenceNumber: i + 1 },
    ),
  );
}

function genre(name: string, sub?: string) {
  return el("Genre", [el("GenreText", name), opt("SubGenre", sub)]);
}

function file(f: FileInput) {
  return el("File", [
    el("URI", f.uri),
    f.md5 && el("HashSum", [el("Algorithm", "MD5"), el("HashSumValue", f.md5.toLowerCase())]),
  ]);
}

function parentalWarning(explicit: boolean | undefined) {
  return el("ParentalWarningType", explicit ? "Explicit" : "NotExplicit");
}

export function buildErn43(input: ConversionInput, now = new Date()): string {
  const { messageHeader: header, release, tracks } = input;
  const parties = new PartyRegistry();
  const labelRef = parties.ref(release.label);
  const releaseLanguage = release.language ?? "en";

  // Resource / release references. A1..An are sound recordings, the cover is last.
  const trackRefs = tracks.map((_, i) => `A${i + 1}`);
  const coverRef = `A${tracks.length + 1}`;
  const durations = tracks.map((t) => parseDurationSeconds(t.duration) ?? 0);
  const isExplicit = release.explicit ?? tracks.some((t) => t.explicit);

  const soundRecording = (t: TrackInput, i: number) => {
    const artists = t.artists ?? release.artists;
    return el("SoundRecording", [
      el("ResourceReference", trackRefs[i]),
      el("Type", "MusicalWorkSoundRecording"),
      el("SoundRecordingEdition", [
        el("ResourceId", [el("ISRC", t.isrc)]),
        copyrightLine("PLine", t.pLine ?? release.pLine),
        el("TechnicalDetails", [
          el("TechnicalResourceDetailsReference", `T${i + 1}`),
          el("DeliveryFile", [
            el("Type", "AudioFile"),
            el("AudioCodecType", t.audioFile.codec ?? "FLAC"),
            file(t.audioFile),
          ]),
        ]),
      ]),
      el("DisplayTitleText", displayTitleText(t.title, t.version)),
      displayTitle(t.title, t.version),
      el("DisplayArtistName", displayArtistName(artists)),
      ...displayArtists(artists, parties),
      ...(t.contributors ?? []).map((c, j) =>
        el(
          "Contributor",
          [
            el("ContributorPartyReference", parties.ref(c.name)),
            ...(Array.isArray(c.role) ? c.role : [c.role]).map((r) =>
              el("Role", CONTRIBUTOR_ROLE_ALIASES[r] ?? r),
            ),
          ],
          { SequenceNumber: j + 1 },
        ),
      ),
      el("Duration", isoDuration(durations[i])),
      parentalWarning(t.explicit),
      opt("LanguageOfPerformance", t.language),
    ]);
  };

  const cover = release.coverArt;
  const image = el("Image", [
    el("ResourceReference", coverRef),
    el("Type", "FrontCoverImage"),
    el("ResourceId", [el("ProprietaryId", `${release.upc}_cover`, { Namespace: `DPID:${header.sender.dpid}` })]),
    el("TechnicalDetails", [
      el("TechnicalResourceDetailsReference", `T${tracks.length + 1}`),
      el("ImageCodecType", cover.codec ?? "JPEG"),
      opt("ImageHeight", cover.height),
      opt("ImageWidth", cover.width),
      file(cover),
    ]),
  ]);

  // Group tracks by disc, preserving input order within each disc.
  const discs = new Map<number, number[]>();
  tracks.forEach((t, i) => {
    const disc = t.discNumber ?? 1;
    discs.set(disc, [...(discs.get(disc) ?? []), i]);
  });
  const resourceGroup = el("ResourceGroup", [
    ...[...discs.keys()]
      .sort((a, b) => a - b)
      .map((disc, d) =>
        el(
          "ResourceGroup",
          [
            el("SequenceNumber", d + 1),
          ...discs.get(disc)!.map((trackIndex, seq) =>
            el("ResourceGroupContentItem", [
              el("SequenceNumber", seq + 1),
              el("ReleaseResourceReference", trackRefs[trackIndex]),
            ]),
          ),
          ],
          { ResourceGroupType: "Component" },
        ),
      ),
    el("LinkedReleaseResourceReference", coverRef),
  ]);

  const mainRelease = el("Release", [
    el("ReleaseReference", "R0"),
    el("ReleaseType", release.type ?? inferReleaseType(tracks.length)),
    el("ReleaseId", [
      el("ICPN", release.upc),
      release.catalogNumber &&
        el("CatalogNumber", release.catalogNumber, { Namespace: `DPID:${header.sender.dpid}` }),
    ]),
    el("DisplayTitleText", displayTitleText(release.title, release.version)),
    displayTitle(release.title, release.version),
    el("DisplayArtistName", displayArtistName(release.artists)),
    ...displayArtists(release.artists, parties),
    el("ReleaseLabelReference", labelRef),
    copyrightLine("PLine", release.pLine),
    copyrightLine("CLine", release.cLine),
    el("Duration", isoDuration(durations.reduce((a, b) => a + b, 0))),
    genre(release.genre, release.subGenre),
    el("ReleaseDate", release.releaseDate),
    opt("OriginalReleaseDate", release.originalReleaseDate),
    parentalWarning(isExplicit),
    resourceGroup,
  ]);

  const trackReleases = tracks.map((t, i) =>
    el("TrackRelease", [
      el("ReleaseReference", `R${i + 1}`),
      // ERN 4.3 doesn't allow ISRC as a ReleaseId; identify track releases by a proprietary ID instead.
      el("ReleaseId", [el("ProprietaryId", t.isrc, { Namespace: `DPID:${header.sender.dpid}` })]),
      el("ReleaseResourceReference", trackRefs[i]),
      el("ReleaseLabelReference", labelRef),
      genre(t.genre ?? release.genre, t.subGenre ?? (t.genre ? undefined : release.subGenre)),
    ]),
  );

  const deals = input.deals ?? DEFAULT_DEALS;
  const dealList = el("DealList", [
    el("ReleaseDeal", [
      el("DealReleaseReference", "R0"),
      ...deals.map((d) =>
        el("Deal", [
          el("DealTerms", [
            ...(d.territories ?? ["Worldwide"]).map((t) => el("TerritoryCode", t)),
            el("ValidityPeriod", [
              el("StartDate", d.startDate ?? release.releaseDate),
              opt("EndDate", d.endDate),
            ]),
            el("CommercialModelType", d.commercialModel),
            ...d.useTypes.map((u) => el("UseType", u)),
          ]),
        ]),
      ),
    ]),
  ]);

  // Build these before parties.toXml() so every referenced party is registered.
  const resourceList = el("ResourceList", [...tracks.map(soundRecording), image]);
  const releaseList = el("ReleaseList", [mainRelease, ...trackReleases]);

  const root = el(
    "ern:NewReleaseMessage",
    [
      el("MessageHeader", [
        el("MessageThreadId", release.upc),
        el("MessageId", header.messageId ?? messageId()),
        el("MessageSender", [
          el("PartyId", header.sender.dpid),
          el("PartyName", [el("FullName", header.sender.name)]),
        ]),
        el("MessageRecipient", [
          el("PartyId", header.recipient.dpid),
          el("PartyName", [el("FullName", header.recipient.name)]),
        ]),
        el("MessageCreatedDateTime", now.toISOString().replace(/\.\d{3}Z$/, "Z")),
        el("MessageControlType", header.isTest ? "TestMessage" : "LiveMessage"),
      ]),
      parties.toXml(),
      resourceList,
      releaseList,
      dealList,
    ],
    {
      "xmlns:ern": ERN_NAMESPACE,
      "xmlns:xsi": XSI_NAMESPACE,
      "xsi:schemaLocation": SCHEMA_LOCATION,
      ReleaseProfileVersionId: "Audio",
      LanguageAndScriptCode: releaseLanguage,
      AvsVersionId: AVS_VERSION_ID,
    },
  );

  return serialize(root);
}
