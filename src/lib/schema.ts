import { turnaj, site } from "../data/turnaj";

const strankaTurnaje = `${site.url}/predvanocni-sachovy-turnaj-2026/`;

/** Organizace = komunita Šachy Lysice. Bez adresy, bez otvírací doby – žádný LocalBusiness. */
export const organizaceSchema = {
  "@type": "Organization",
  "@id": `${site.url}/#organizace`,
  name: site.nazev,
  url: `${site.url}/`,
  description: site.popis,
  email: turnaj.email,
  telephone: turnaj.telefon,
  areaServed: {
    "@type": "Place",
    name: "Lysice, okres Blansko",
  },
};

export const webSchema = {
  "@type": "WebSite",
  "@id": `${site.url}/#web`,
  url: `${site.url}/`,
  name: site.nazev,
  inLanguage: "cs",
  publisher: { "@id": `${site.url}/#organizace` },
};

/** Akce samotná – tohle čte Google Events, Bing i AI vyhledávání. */
export const turnajSchema = {
  "@type": "Event",
  "@id": `${strankaTurnaje}#event`,
  name: turnaj.nazev,
  description: turnaj.popis,
  startDate: turnaj.zacatek,
  endDate: turnaj.konec,
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  inLanguage: "cs",
  url: strankaTurnaje,
  image: [`${site.url}${turnaj.obrazek}`],
  isAccessibleForFree: true,
  maximumAttendeeCapacity: turnaj.kapacita,
  location: {
    "@type": "Place",
    name: turnaj.misto,
    address: {
      "@type": "PostalAddress",
      streetAddress: turnaj.ulice,
      addressLocality: turnaj.obec,
      postalCode: turnaj.psc,
      addressRegion: turnaj.kraj,
      addressCountry: "CZ",
    },
  },
  organizer: { "@id": `${site.url}/#organizace` },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "CZK",
    availability: "https://schema.org/InStock",
    url: strankaTurnaje,
    description: "Vstup zdarma, dobrovolný příspěvek na místě.",
  },
};

export const breadcrumbSchema = {
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Šachy Lysice", item: `${site.url}/` },
    { "@type": "ListItem", position: 2, name: turnaj.nazev, item: strankaTurnaje },
  ],
};

/** Zabalí libovolné nody do jednoho @graph bloku. */
export function graph(nody: object[]) {
  return { "@context": "https://schema.org", "@graph": nody };
}
