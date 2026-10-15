/**
 * Migration routes drawn on the globe (routes/geometry.ts, map/MapView.tsx): hand-picked, like the tours,
 * and kept in the app rather than the data pipeline. A route joins dated sites already on the globe, so
 * every date and place it reaches carries that site's own source; `via` points only bend the line
 * (a coast, a strait) and carry no date of their own (the line passes them at a time interpolated
 * by distance). The line grows as the slider passes each site's date (the middle of its range), and
 * stays drawn until `until`. routes.test.ts checks every site is on the globe and the dates run forward.
 *
 * The routes are a picture of where people had reached by when, not tracks anyone walked.
 */

export type Waypoint = { site: string } | { via: [lon: number, lat: number]; place: string };

export interface Route {
  id: string;
  name: string;
  description: string;
  color: string;
  /** Astronomical year after which the route is no longer drawn. */
  until: number;
  /** Where the route as a whole (its direction, the coasts and straits it follows) comes from. */
  source: { label: string; url: string };
  waypoints: Waypoint[];
}

const EARLY_MIGRATIONS = {
  label: "Wikipedia: Early human migrations (revision 1377121594, 28 Sep 2026)",
  url: "https://en.wikipedia.org/w/index.php?title=Early_human_migrations&oldid=1377121594",
};

/** End of the last Ice Age, roughly: the routes have done their work by then. */
const ICE_AGE_END = 1 - 9_700;

export const ROUTES: Route[] = [
  {
    id: "southern-route",
    name: "Out of Africa: the southern route",
    description:
      "Modern humans crossed the Red Sea at Bab-el-Mandeb, when the sea was low, and followed the coasts of Arabia and Persia to South Asia, then on to Southeast Asia and across the sea gaps of Wallacea to Sahul (Australia and New Guinea) by 65,000 to 50,000 years ago.",
    color: "#ff9f1c",
    until: ICE_AGE_END,
    source: EARLY_MIGRATIONS,
    waypoints: [
      { site: "homo-sapiens@19" }, // Panga ya Saidi, 78 ka
      { via: [43.4, 12.6], place: "Bab-el-Mandeb" },
      { via: [52.5, 16.0], place: "Southern Arabia" },
      { via: [62.0, 25.0], place: "Makran coast" },
      { via: [72.8, 19.5], place: "West coast of India" },
      { via: [80.5, 13.5], place: "East coast of India" },
      { via: [92.5, 20.0], place: "Bay of Bengal" },
      { site: "homo-sapiens@21" }, // Tam Pa Ling, 54.5 ka
      { via: [110.0, 1.0], place: "Sunda" },
      { via: [124.0, -9.0], place: "Wallacea" },
      { via: [131.0, -13.0], place: "Northern Sahul" },
      { site: "homo-sapiens@8" }, // Lake Mungo, 40 ka
    ],
  },
  {
    id: "northern-route",
    name: "Out of Africa: through the Levant into Europe",
    description:
      "A second way out ran down the Nile and across Sinai into the Levant. From there modern humans reached Europe by about 45,000 years ago and spread across it over the next 15,000 to 20,000 years, as the Neanderthals disappeared.",
    color: "#ff5d73",
    until: ICE_AGE_END,
    source: EARLY_MIGRATIONS,
    waypoints: [
      { site: "homo-sapiens@19" }, // Panga ya Saidi, 78 ka
      { via: [37.5, 9.0], place: "Ethiopian highlands" },
      { via: [32.6, 15.6], place: "Nile valley" },
      { via: [32.9, 24.1], place: "Upper Nile" },
      { via: [33.5, 30.3], place: "Sinai" },
      { site: "homo-sapiens@20" }, // Manot, 55 ka
      { via: [29.0, 39.5], place: "Anatolia" },
      { site: "homo-sapiens@9" }, // Pestera cu Oase, 42–37 ka
      { via: [11.0, 48.5], place: "Danube valley" },
      { site: "homo-sapiens@26" }, // Paviland, 33 ka
    ],
  },
  {
    id: "northern-asia",
    name: "Into northern Asia",
    description:
      "From the Near East, modern humans moved through the Zagros and out onto the steppes of Central Asia and Siberia, reaching western Siberia by 45,000 years ago and the Arctic coast of eastern Siberia by about 32,000 years ago.",
    color: "#c77dff",
    until: ICE_AGE_END,
    source: EARLY_MIGRATIONS,
    waypoints: [
      { site: "homo-sapiens@20" }, // Manot, 55 ka
      { via: [47.0, 34.5], place: "Zagros" },
      { via: [62.0, 41.0], place: "Central Asia" },
      { site: "homo-sapiens@23" }, // Ust'-Ishim, 45 ka
      { via: [105.0, 58.0], place: "Southern Siberia" },
      { site: "homo-sapiens@28" }, // Yana RHS, 32 ka
    ],
  },
  {
    id: "east-asia",
    name: "Into East Asia",
    description:
      "The ancestors of today's East Asians spread north from mainland Southeast Asia in several waves. One of them reached northern China, where Tianyuan Cave near Beijing holds a modern human skeleton about 40,000 years old.",
    color: "#3ddc97",
    until: ICE_AGE_END,
    source: EARLY_MIGRATIONS,
    waypoints: [
      { site: "homo-sapiens@21" }, // Tam Pa Ling, 54.5 ka
      { via: [108.0, 26.0], place: "Southern China" },
      { via: [112.5, 33.0], place: "Central China" },
      { site: "homo-sapiens@10" }, // Tianyuan, 42–39 ka
    ],
  },
  {
    id: "americas",
    name: "Into the Americas",
    description:
      "People from northeast Asia crossed Beringia, the land bridge exposed between Siberia and Alaska while sea levels were low. Footprints at White Sands show they were in North America by about 22,000 years ago, and by 14,500 years ago they had reached Monte Verde in southern Chile. Both an inland route, between the ice sheets once they parted, and a route down the Pacific coast have been proposed; the line follows the coast.",
    color: "#4cc9f0",
    until: ICE_AGE_END,
    source: EARLY_MIGRATIONS,
    waypoints: [
      { site: "homo-sapiens@28" }, // Yana RHS, 32 ka
      { via: [172.0, 66.0], place: "Chukotka" },
      { via: [-168.0, 64.5], place: "Beringia" },
      { via: [-150.0, 59.5], place: "Gulf of Alaska" },
      { via: [-131.0, 53.0], place: "Pacific coast" },
      { via: [-124.0, 41.0], place: "Pacific coast" },
      { site: "homo-sapiens@13" }, // White Sands, 23–21 ka
      { via: [-98.0, 18.0], place: "Mexico" },
      { via: [-79.5, 8.8], place: "Panama" },
      { via: [-80.5, -4.0], place: "Pacific coast of South America" },
      { via: [-71.6, -30.0], place: "Pacific coast of South America" },
      { site: "homo-sapiens@14" }, // Monte Verde, 14.5 ka
    ],
  },
];
