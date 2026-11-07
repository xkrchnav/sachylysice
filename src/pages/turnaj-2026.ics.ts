import type { APIRoute } from "astro";
import { turnaj, site } from "../data/turnaj";

/** UTC formát pro iCalendar (20261212T090000Z). */
function icsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Zalomí text po ~70 znacích podle RFC 5545. */
function wrap(line: string) {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    out.push(rest.slice(0, 73));
    rest = " " + rest.slice(73);
  }
  out.push(rest);
  return out.join("\r\n");
}

export const GET: APIRoute = () => {
  const popis = [
    `${turnaj.nazev} – rapid ${turnaj.tempo}.`,
    `Vstup zdarma, dobrovolný příspěvek na místě. Kapacita ${turnaj.kapacita} hráčů.`,
    `Přihlášky: ${turnaj.email} nebo SMS ${turnaj.telefon}.`,
    `${site.url}/predvanocni-sachovy-turnaj-2026/`,
  ].join("\\n");

  const radky = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sachy Lysice//Turnaj 2026//CS",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:predvanocni-turnaj-2026@sachylysice.cz`,
    `DTSTAMP:${icsDate(turnaj.zacatek)}`,
    `DTSTART:${icsDate(turnaj.zacatek)}`,
    `DTEND:${icsDate(turnaj.konec)}`,
    wrap(`SUMMARY:${turnaj.nazev}`),
    wrap(
      `LOCATION:${turnaj.misto}\\, ${turnaj.ulice}\\, ${turnaj.psc} ${turnaj.obec}`,
    ),
    wrap(`DESCRIPTION:${popis.replace(/\n/g, "\\n")}`),
    `URL:${site.url}/predvanocni-sachovy-turnaj-2026/`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new Response(radky.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sachy-lysice-turnaj-2026.ics"',
    },
  });
};
