// Input format accepted by the converter. Kept deliberately simple and
// distributor-friendly; DDEX-specific structure is produced by the builder.

export interface PartyInput {
  /** DDEX Party ID (DPID), e.g. "PADPIDA2014120301U". */
  dpid: string;
  name: string;
}

export interface ArtistInput {
  name: string;
  /** DDEX DisplayArtistRole. Defaults to "MainArtist". */
  role?: string;
}

export interface ContributorInput {
  name: string;
  /** DDEX ContributorRole(s), e.g. "Composer", "Lyricist", "Producer". */
  role: string | string[];
}

export interface CopyrightLineInput {
  year: number;
  text: string;
}

export interface FileInput {
  /** Path of the file inside the delivery batch, e.g. "resources/01.flac". */
  uri: string;
  md5?: string;
}

export interface AudioFileInput extends FileInput {
  /** Defaults to "FLAC". */
  codec?: string;
}

export interface ImageFileInput extends FileInput {
  /** Defaults to "JPEG". */
  codec?: string;
  width?: number;
  height?: number;
}

export interface TrackInput {
  title: string;
  /** Version / subtitle, e.g. "Radio Edit". */
  version?: string;
  isrc: string;
  /** Seconds (number), "m:ss", "h:mm:ss" or ISO 8601 ("PT3M25S"). */
  duration: number | string;
  /** Defaults to the release artists. */
  artists?: ArtistInput[];
  contributors?: ContributorInput[];
  explicit?: boolean;
  /** ISO 639 language of performance, e.g. "en". */
  language?: string;
  /** Defaults to the release genre. */
  genre?: string;
  subGenre?: string;
  /** Defaults to the release P line. */
  pLine?: CopyrightLineInput;
  /** Defaults to 1. */
  discNumber?: number;
  audioFile: AudioFileInput;
}

export interface DealInput {
  /** DDEX CommercialModelType, e.g. "SubscriptionModel". */
  commercialModel: string;
  /** DDEX UseType(s), e.g. ["OnDemandStream"]. */
  useTypes: string[];
  /** ISO 3166 codes or "Worldwide". Defaults to ["Worldwide"]. */
  territories?: string[];
  /** Defaults to the release date. */
  startDate?: string;
  endDate?: string;
}

export interface ReleaseInput {
  title: string;
  version?: string;
  /** DDEX ReleaseType. Inferred from track count when omitted. */
  type?: string;
  /** UPC / EAN (ICPN). */
  upc: string;
  catalogNumber?: string;
  artists: ArtistInput[];
  label: string;
  genre: string;
  subGenre?: string;
  /** YYYY-MM-DD */
  releaseDate: string;
  originalReleaseDate?: string;
  pLine: CopyrightLineInput;
  cLine: CopyrightLineInput;
  /** Defaults to true if any track is explicit. */
  explicit?: boolean;
  /** Message language, defaults to "en". */
  language?: string;
  coverArt: ImageFileInput;
}

export interface ConversionInput {
  messageHeader: {
    messageId?: string;
    sender: PartyInput;
    recipient: PartyInput;
    /** Sends a TestMessage instead of a LiveMessage. */
    isTest?: boolean;
  };
  release: ReleaseInput;
  tracks: TrackInput[];
  /** Defaults to worldwide streaming + download deals from the release date. */
  deals?: DealInput[];
}

export interface Issue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface ConversionResult {
  xml: string | null;
  issues: Issue[];
}
