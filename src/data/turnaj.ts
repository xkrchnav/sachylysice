/**
 * Jediný zdroj pravdy o nejbližším turnaji.
 * Odtud čerpá homepage, stránka akce i strukturovaná data (schema.org).
 */
export const turnaj = {
  nazev: "II. předvánoční šachový turnaj v Lysicích",
  nazevKrátký: "Předvánoční šachový turnaj",
  slug: "predvanocni-sachovy-turnaj-2026",
  // +01:00 = CET, 12. 12. je už zimní čas
  zacatek: "2026-12-12T10:00:00+01:00",
  konec: "2026-12-12T18:00:00+01:00",
  zacatekText: "Sobota 12. 12. 2026, 10:00",
  misto: "Lysické Jablíčko, z.s.",
  ulice: "Halasova 102",
  psc: "679 71",
  obec: "Lysice",
  okres: "Blansko",
  kraj: "Jihomoravský kraj",
  kapacita: 16,
  tempo: "15 minut + 10 sekund na tah",
  system: "švýcarský, podle počtu hráčů",
  email: "info@sachylysice.cz",
  telefon: "+420 777 347 591",
  facebook: "https://fb.me/e/7ZlGGUkD4",
  obrazek: "/og/turnaj-2026.jpg",
  popis:
    "Komunitní šachový turnaj pro každého – od začátečníků po zkušené hráče. Rapid 15+10 v Lysickém Jablíčku, vstup zdarma, 16 míst.",
  mapaUrl:
    "https://mapy.com/cs/turisticka?q=Lysick%C3%A9%20Jabl%C3%AD%C4%8Dko%20Halasova%20102%20Lysice",
} as const;

export const site = {
  nazev: "Šachy Lysice",
  url: "https://sachylysice.cz",
  popis:
    "Sousedské šachy v zámeckých Lysicích. Hrajeme pro radost a setkání – žádný klub, žádné ELO, jen šachovnice a dobří lidé.",
} as const;
