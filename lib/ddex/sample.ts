import type { ConversionInput } from "./types";

export const SAMPLE_INPUT: ConversionInput = {
  messageHeader: {
    sender: { dpid: "PADPIDA2014120301U", name: "BBS Entertainment Group" },
    recipient: { dpid: "PADPIDA2011072101T", name: "Example DSP" },
    isTest: true,
  },
  release: {
    title: "Midnight Signals",
    upc: "0123456789012",
    catalogNumber: "BBS-001",
    artists: [{ name: "Nova Lane", role: "MainArtist" }],
    label: "BBS Records",
    genre: "Electronic",
    subGenre: "Deep House",
    releaseDate: "2026-11-20",
    pLine: { year: 2026, text: "2026 BBS Records" },
    cLine: { year: 2026, text: "2026 BBS Records" },
    language: "en",
    coverArt: {
      uri: "resources/cover.jpg",
      md5: "9e107d9d372bb6826bd81d3542a419d6",
      width: 3000,
      height: 3000,
    },
  },
  tracks: [
    {
      title: "Midnight Signals",
      isrc: "USBBS2600001",
      duration: "3:42",
      explicit: false,
      language: "en",
      contributors: [
        { name: "Nova Lane", role: ["Composer", "Lyricist"] },
        { name: "Sam Ortega", role: "Producer" },
      ],
      audioFile: { uri: "resources/01_midnight_signals.flac", md5: "e4d909c290d0fb1ca068ffaddf22cbd0" },
    },
    {
      title: "Glass City",
      version: "Extended Mix",
      isrc: "USBBS2600002",
      duration: 395,
      artists: [
        { name: "Nova Lane", role: "MainArtist" },
        { name: "Kairo", role: "FeaturedArtist" },
      ],
      explicit: true,
      language: "en",
      contributors: [
        { name: "Nova Lane", role: "Composer" },
        { name: "Kairo", role: "Lyricist" },
      ],
      audioFile: { uri: "resources/02_glass_city.flac", md5: "d41d8cd98f00b204e9800998ecf8427e" },
    },
  ],
  deals: [
    {
      commercialModel: "SubscriptionModel",
      useTypes: ["OnDemandStream", "NonInteractiveStream"],
      territories: ["Worldwide"],
    },
    {
      commercialModel: "PayAsYouGoModel",
      useTypes: ["PermanentDownload"],
      territories: ["Worldwide"],
    },
  ],
};
