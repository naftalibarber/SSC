/* Offline OLL/PLL catalog derived from Logiqx/cubing-algs; setups are exact algorithm inverses. */
(()=>{'use strict';window.SSCTrainingCases=Object.freeze([
  {
    "id": "PLL-Aa",
    "name": "Aa Perm",
    "category": "pll",
    "alg": "R U R' F' r U R' U' r' F R2 U' R'",
    "recognitionGroup": "Aa-Perm",
    "setup": "R U R2 F' r U R U' r' F R U' R'"
  },
  {
    "id": "PLL-Ab",
    "name": "Ab Perm",
    "category": "pll",
    "alg": "U2 x R2 D2 R U R' D2 R U' R' R2 x'",
    "recognitionGroup": "Ab-Perm",
    "setup": "x R2 R U R' D2 R U' R' D2 R2 x' U2"
  },
  {
    "id": "PLL-E",
    "name": "E Perm",
    "category": "pll",
    "alg": "x' R U' R' D R U R' D' R U R' D R U' R' D' x",
    "recognitionGroup": "E-Perm",
    "setup": "x' D R U R' D' R U' R' D R U' R' D' R U R' x"
  },
  {
    "id": "PLL-F",
    "name": "F Perm",
    "category": "pll",
    "alg": "R' U' F' R U R' U' R' F R2 U' R' U' R U R' F' F U R",
    "recognitionGroup": "F-Perm",
    "setup": "R' U' F' F R U' R' U R U R2 F' R U R U' R' F U R"
  },
  {
    "id": "PLL-Ga",
    "name": "Ga Perm",
    "category": "pll",
    "alg": "R2 u R' U R' U' R u' R2 y' R' U R",
    "recognitionGroup": "Ga-Perm",
    "setup": "R' U' R y R2 u R' U R U' R u' R2"
  },
  {
    "id": "PLL-Gb",
    "name": "Gb Perm",
    "category": "pll",
    "alg": "R' U' R y R2 u R' U R U' R u' R2",
    "recognitionGroup": "Gb-Perm",
    "setup": "R2 u R' U R' U' R u' R2 y' R' U R"
  },
  {
    "id": "PLL-Gc",
    "name": "Gc Perm",
    "category": "pll",
    "alg": "U2 R2' F2 R U2 R U2' R' F R U R' U' R' F R2",
    "recognitionGroup": "Gc-Perm",
    "setup": "R2 F' R U R U' R' F' R U2 R' U2 R' F2 R2 U2"
  },
  {
    "id": "PLL-Gd",
    "name": "Gd Perm",
    "category": "pll",
    "alg": "U R2' F' R U R U' R' F' R U2' R' U2 R' F2 R2",
    "recognitionGroup": "Gd-Perm",
    "setup": "R2 F2 R U2 R U2 R' F R U R' U' R' F R2 U'"
  },
  {
    "id": "PLL-H",
    "name": "H Perm",
    "category": "pll",
    "alg": "M2 U' M2 U2 M2' U2' U M2'",
    "recognitionGroup": "H-Perm / X-Perm",
    "setup": "M2 U' U2 M2 U2 M2 U M2"
  },
  {
    "id": "PLL-Ja",
    "name": "Ja Perm",
    "category": "pll",
    "alg": "U' R' U L' U2' R U' L L' R' U2 R L",
    "recognitionGroup": "Ja-Perm",
    "setup": "L' R' U2 R L L' U R' U2 L U' R U"
  },
  {
    "id": "PLL-Jb",
    "name": "Jb Perm",
    "category": "pll",
    "alg": "R U R' F' R U R' U' R' F R2 U' R' U' R U R' F' F R U' R'",
    "recognitionGroup": "Jb-Perm",
    "setup": "R U R' F' F R U' R' U R U R2 F' R U R U' R' F R U' R'"
  },
  {
    "id": "PLL-Na",
    "name": "Na Perm",
    "category": "pll",
    "alg": "R U R' U R U R' F' R U R' U' R' F R2 U' R' U’ U’ R U’ R’",
    "recognitionGroup": "Na-Perm",
    "setup": "R’' U’' R' U’' U’' R U R2 F' R U R U' R' F R U' R' U' R U' R'"
  },
  {
    "id": "PLL-Nb",
    "name": "Nb Perm",
    "category": "pll",
    "alg": "R' U R U' R' F' U' F R U R' F R' F' R U' R",
    "recognitionGroup": "Nb-Perm",
    "setup": "R' U R' F R F' R U' R' F' U F R U R' U' R"
  },
  {
    "id": "PLL-Ra",
    "name": "Ra Perm",
    "category": "pll",
    "alg": "R U R' F' R U2' R' U2 R' F R U R U2' R'",
    "recognitionGroup": "Ra-Perm",
    "setup": "R U2 R' U' R' F' R U2 R U2 R' F R U' R'"
  },
  {
    "id": "PLL-Rb",
    "name": "Rb Perm",
    "category": "pll",
    "alg": "U' R' U2 R U2' R' F R U R' U' R' F' R2",
    "recognitionGroup": "Rb-Perm",
    "setup": "R2 F R U R U' R' F' R U2 R' U2 R U"
  },
  {
    "id": "PLL-T",
    "name": "T Perm",
    "category": "pll",
    "alg": "R U R' U' R' F R F' F R U' R' U' R U R' F'",
    "recognitionGroup": "T-Perm",
    "setup": "F R U' R' U R U R' F' F R' F' R U R U' R'"
  },
  {
    "id": "PLL-Ua",
    "name": "Ua Perm",
    "category": "pll",
    "alg": "U M2 U M U2 M' U2' U' M2'",
    "recognitionGroup": "Ua-Perm",
    "setup": "M2 U U2 M U2 M' U' M2 U'"
  },
  {
    "id": "PLL-Ub",
    "name": "Ub Perm",
    "category": "pll",
    "alg": "U M2 U' M U2 M' U2' U M2'",
    "recognitionGroup": "Ub-Perm",
    "setup": "M2 U' U2 M U2 M' U M2 U'"
  },
  {
    "id": "PLL-V",
    "name": "V Perm",
    "category": "pll",
    "alg": "R' U R' d' R' F' R2 U' R' U R' F R F",
    "recognitionGroup": "V-Perm",
    "setup": "F' R' F' R U' R U R2 F R d R U' R"
  },
  {
    "id": "PLL-Y",
    "name": "Y Perm",
    "category": "pll",
    "alg": "F R U' R' U' R U R' F' R U R' U' R' F R F'",
    "recognitionGroup": "Y-Perm",
    "setup": "F R' F' R U R U' R' F R U' R' U R U R' F'"
  },
  {
    "id": "PLL-Z",
    "name": "Z Perm",
    "category": "pll",
    "alg": "M' U' M2' U' M2' U' M M2 U2' M2'",
    "recognitionGroup": "Z-Perm",
    "setup": "M2 U2 M2 M' U M2 U M2 U M"
  },
  {
    "id": "OLL-1",
    "name": "OLL 1",
    "category": "oll",
    "alg": "R U2 R' R' F R F' U2 R' F R F'",
    "recognitionGroup": "No Edges",
    "setup": "F R' F' R U2 F R' F' R R U2 R'"
  },
  {
    "id": "OLL-2",
    "name": "OLL 2",
    "category": "oll",
    "alg": "R' U2 r U' r' U2 r U r' U2 R",
    "recognitionGroup": "No Edges",
    "setup": "R' U2 r U' r' U2 r U r' U2 R"
  },
  {
    "id": "OLL-3",
    "name": "OLL 3",
    "category": "oll",
    "alg": "M R U R' U r U2' r' U M'",
    "recognitionGroup": "No Edges",
    "setup": "M U' r U2 r' U' R U' R' M'"
  },
  {
    "id": "OLL-4",
    "name": "OLL 4",
    "category": "oll",
    "alg": "M' R' U' R U' r' U2 r U' M",
    "recognitionGroup": "No Edges",
    "setup": "M' U r' U2 r U R' U R M"
  },
  {
    "id": "OLL-5",
    "name": "OLL 5",
    "category": "oll",
    "alg": "U' r' U2' R U R' U r",
    "recognitionGroup": "Square Shape",
    "setup": "r' U' R U' R' U2 r U"
  },
  {
    "id": "OLL-6",
    "name": "OLL 6",
    "category": "oll",
    "alg": "U r U2 R' U' R U' r'",
    "recognitionGroup": "Square Shape",
    "setup": "r U R' U R U2 r' U'"
  },
  {
    "id": "OLL-7",
    "name": "OLL 7",
    "category": "oll",
    "alg": "r U R' U R U2' r'",
    "recognitionGroup": "Small Lightning Bolt",
    "setup": "r U2 R' U' R U' r'"
  },
  {
    "id": "OLL-8",
    "name": "OLL 8",
    "category": "oll",
    "alg": "r' U' R U' R' U2 r",
    "recognitionGroup": "Small Lightning Bolt",
    "setup": "r' U2 R U R' U r"
  },
  {
    "id": "OLL-9",
    "name": "OLL 9",
    "category": "oll",
    "alg": "U2 R U R' U' R' F R F' F R U R' U' F'",
    "recognitionGroup": "Fish Shape",
    "setup": "F U R U' R' F' F R' F' R U R U' R' U2"
  },
  {
    "id": "OLL-10",
    "name": "OLL 10",
    "category": "oll",
    "alg": "U2 R U R' U R' F R F' R U2' R'",
    "recognitionGroup": "Fish Shape",
    "setup": "R U2 R' F R' F' R U' R U' R' U2"
  },
  {
    "id": "OLL-11",
    "name": "OLL 11",
    "category": "oll",
    "alg": "M R U R' U R U2' R' U M'",
    "recognitionGroup": "Small Lightning Bolt",
    "setup": "M U' R U2 R' U' R U' R' M'"
  },
  {
    "id": "OLL-12",
    "name": "OLL 12",
    "category": "oll",
    "alg": "M' R' U' R U' R' U2 R U' M",
    "recognitionGroup": "Small Lightning Bolt",
    "setup": "M' U R' U2 R U R' U R M"
  },
  {
    "id": "OLL-13",
    "name": "OLL 13",
    "category": "oll",
    "alg": "F U R U' R' F' F R U' R' U' R U R' F'",
    "recognitionGroup": "Knight Move",
    "setup": "F R U' R' U R U R' F' F R U R' U' F'"
  },
  {
    "id": "OLL-14",
    "name": "OLL 14",
    "category": "oll",
    "alg": "U2 R' F R U R' F' R U' U F U' F'",
    "recognitionGroup": "Knight Move",
    "setup": "F U F' U' U R' F R U' R' F' R U2"
  },
  {
    "id": "OLL-15",
    "name": "OLL 15",
    "category": "oll",
    "alg": "U' r' U' r R' U' R U r' U r",
    "recognitionGroup": "Knight Move",
    "setup": "r' U' r U' R' U R r' U r U"
  },
  {
    "id": "OLL-16",
    "name": "OLL 16",
    "category": "oll",
    "alg": "U r U r' R U R' U' r U' r'",
    "recognitionGroup": "Knight Move",
    "setup": "r U r' U R U' R' r U' r' U'"
  },
  {
    "id": "OLL-17",
    "name": "OLL 17",
    "category": "oll",
    "alg": "U R U R' U' U2 R' F R F' U2 R' F R F'",
    "recognitionGroup": "No Edges",
    "setup": "F R' F' R U2 F R' F' R U2 U R U' R' U'"
  },
  {
    "id": "OLL-18",
    "name": "OLL 18",
    "category": "oll",
    "alg": "U' R U2' R' R' F R F' U2 M' U R U' r'",
    "recognitionGroup": "No Edges",
    "setup": "r U R' U' M U2 F R' F' R R U2 R' U"
  },
  {
    "id": "OLL-19",
    "name": "OLL 19",
    "category": "oll",
    "alg": "U2 M U R U R' U' M' R' F R F'",
    "recognitionGroup": "No Edges",
    "setup": "F R' F' R M U R U' R' U' M' U2"
  },
  {
    "id": "OLL-20",
    "name": "OLL 20",
    "category": "oll",
    "alg": "M' R U R' U' M2 U R U' R' U' M'",
    "recognitionGroup": "No Edges",
    "setup": "M U R U R' U' M2 U R U' R' M"
  },
  {
    "id": "OLL-21",
    "name": "OLL 21",
    "category": "oll",
    "alg": "U R U2 R' U' R U' R' R U2 R' U' R U' R'",
    "recognitionGroup": "H / Double Sune",
    "setup": "R U R' U R U2 R' R U R' U R U2 R' U'"
  },
  {
    "id": "OLL-22",
    "name": "OLL 22",
    "category": "oll",
    "alg": "R U2' R' R' U' R R U' R' R' U2' R",
    "recognitionGroup": "Pi / Bruno",
    "setup": "R' U2 R R U R' R' U R R U2 R'"
  },
  {
    "id": "OLL-23",
    "name": "OLL 23",
    "category": "oll",
    "alg": "U2 R2 D R' U2 R D' R' U2 R R2'",
    "recognitionGroup": "U / Headlights",
    "setup": "R2 R' U2 R D R' U2 R D' R2 U2"
  },
  {
    "id": "OLL-24",
    "name": "OLL 24",
    "category": "oll",
    "alg": "U' L F R' F' L' F R F'",
    "recognitionGroup": "T / Chameleon",
    "setup": "F R' F' L F R F' L' U"
  },
  {
    "id": "OLL-25",
    "name": "OLL 25",
    "category": "oll",
    "alg": "F' L F R' F' L' F R",
    "recognitionGroup": "L / Bowtie",
    "setup": "R' F' L F R F' L' F"
  },
  {
    "id": "OLL-26",
    "name": "OLL 26",
    "category": "oll",
    "alg": "U R U2 R' U' R U' R'",
    "recognitionGroup": "AS / Anti-Sune",
    "setup": "R U R' U R U2 R' U'"
  },
  {
    "id": "OLL-27",
    "name": "OLL 27",
    "category": "oll",
    "alg": "R U R' U R U2' R'",
    "recognitionGroup": "S / Sune",
    "setup": "R U2 R' U' R U' R'"
  },
  {
    "id": "OLL-28",
    "name": "OLL 28",
    "category": "oll",
    "alg": "U2 M' R U R' U' M U R U' R'",
    "recognitionGroup": "Stealth / Angel Fish",
    "setup": "R U R' U' M' U R U' R' M U2"
  },
  {
    "id": "OLL-29",
    "name": "OLL 29",
    "category": "oll",
    "alg": "U' R U R' U' R U' R' F' U' F R U R'",
    "recognitionGroup": "Awkward Shape",
    "setup": "R U' R' F' U F R U R' U R U' R' U"
  },
  {
    "id": "OLL-30",
    "name": "OLL 30",
    "category": "oll",
    "alg": "F U R U2 R' U' R U2 R' U' F'",
    "recognitionGroup": "Awkward Shape",
    "setup": "F U R U2 R' U R U2 R' U' F'"
  },
  {
    "id": "OLL-31",
    "name": "OLL 31",
    "category": "oll",
    "alg": "U' R' U' F U R U' R' F' R",
    "recognitionGroup": "P Shape",
    "setup": "R' F R U R' U' F' U R U"
  },
  {
    "id": "OLL-32",
    "name": "OLL 32",
    "category": "oll",
    "alg": "U' R U2 R' U' F' U F R U' R'",
    "recognitionGroup": "P Shape",
    "setup": "R U R' F' U' F U R U2 R' U"
  },
  {
    "id": "OLL-33",
    "name": "OLL 33",
    "category": "oll",
    "alg": "U' R U R' U' R' F R F'",
    "recognitionGroup": "T Shape",
    "setup": "F R' F' R U R U' R' U"
  },
  {
    "id": "OLL-34",
    "name": "OLL 34",
    "category": "oll",
    "alg": "R U R2' U' R' F R U R U' F'",
    "recognitionGroup": "C Shape",
    "setup": "F U R' U' R' F' R U R2 U' R'"
  },
  {
    "id": "OLL-35",
    "name": "OLL 35",
    "category": "oll",
    "alg": "U' R U2 R' R' F R F' R U2 R'",
    "recognitionGroup": "Fish Shape",
    "setup": "R U2 R' F R' F' R R U2 R' U"
  },
  {
    "id": "OLL-36",
    "name": "OLL 36",
    "category": "oll",
    "alg": "U' R' U' R U' R' U2 R R' U' R U R B' R' B",
    "recognitionGroup": "W Shape",
    "setup": "B' R B R' U' R' U R R' U2 R U R' U R U"
  },
  {
    "id": "OLL-37",
    "name": "OLL 37",
    "category": "oll",
    "alg": "U' F R U' R' U' R U R' F'",
    "recognitionGroup": "Fish Shape",
    "setup": "F R U' R' U R U R' F' U"
  },
  {
    "id": "OLL-38",
    "name": "OLL 38",
    "category": "oll",
    "alg": "U2 R U R' U R U2' R' R U R' U' R' F R F'",
    "recognitionGroup": "W Shape",
    "setup": "F R' F' R U R U' R' R U2 R' U' R U' R' U2"
  },
  {
    "id": "OLL-39",
    "name": "OLL 39",
    "category": "oll",
    "alg": "R U R' F' U' F U R U2 R'",
    "recognitionGroup": "Big Lightning Bolt",
    "setup": "R U2 R' U' F' U F R U' R'"
  },
  {
    "id": "OLL-40",
    "name": "OLL 40",
    "category": "oll",
    "alg": "U R' F R U R' U' F' U R",
    "recognitionGroup": "Big Lightning Bolt",
    "setup": "R' U' F U R U' R' F' R U'"
  },
  {
    "id": "OLL-41",
    "name": "OLL 41",
    "category": "oll",
    "alg": "R U R' U R U2' R' F R U R' U' F'",
    "recognitionGroup": "Awkward Shape",
    "setup": "F U R U' R' F' R U2 R' U' R U' R'"
  },
  {
    "id": "OLL-42",
    "name": "OLL 42",
    "category": "oll",
    "alg": "U2 R' U' R U' R' U2 R F R U R' U' F'",
    "recognitionGroup": "Awkward Shape",
    "setup": "F U R U' R' F' R' U2 R U R' U R U2"
  },
  {
    "id": "OLL-43",
    "name": "OLL 43",
    "category": "oll",
    "alg": "U2 R' U' F' U F R",
    "recognitionGroup": "P Shape",
    "setup": "R' F' U' F U R U2"
  },
  {
    "id": "OLL-44",
    "name": "OLL 44",
    "category": "oll",
    "alg": "U F U R U' R' F'",
    "recognitionGroup": "P Shape",
    "setup": "F R U R' U' F' U'"
  },
  {
    "id": "OLL-45",
    "name": "OLL 45",
    "category": "oll",
    "alg": "U' F R U R' U' F'",
    "recognitionGroup": "T Shape",
    "setup": "F U R U' R' F' U"
  },
  {
    "id": "OLL-46",
    "name": "OLL 46",
    "category": "oll",
    "alg": "U R' U' R' F R F' U R",
    "recognitionGroup": "C Shape",
    "setup": "R' U' F R' F' R U R U'"
  },
  {
    "id": "OLL-47",
    "name": "OLL 47",
    "category": "oll",
    "alg": "U F R' F' R U2 R U' R' U R U2' R'",
    "recognitionGroup": "L Shape",
    "setup": "R U2 R' U' R U R' U2 R' F R F' U'"
  },
  {
    "id": "OLL-48",
    "name": "OLL 48",
    "category": "oll",
    "alg": "F R U R' U' R U R' U' F'",
    "recognitionGroup": "L Shape",
    "setup": "F U R U' R' U R U' R' F'"
  },
  {
    "id": "OLL-49",
    "name": "OLL 49",
    "category": "oll",
    "alg": "r U' r' r' U r r U r' r' U' r",
    "recognitionGroup": "L Shape",
    "setup": "r' U r r U' r' r' U' r r U r'"
  },
  {
    "id": "OLL-50",
    "name": "OLL 50",
    "category": "oll",
    "alg": "r' U r r U' r' r' U' r r U r'",
    "recognitionGroup": "L Shape",
    "setup": "r U' r' r' U r r U r' r' U' r"
  },
  {
    "id": "OLL-51",
    "name": "OLL 51",
    "category": "oll",
    "alg": "U2 F U R U' R' U R U' R' F'",
    "recognitionGroup": "I Shape",
    "setup": "F R U R' U' R U R' U' F' U2"
  },
  {
    "id": "OLL-52",
    "name": "OLL 52",
    "category": "oll",
    "alg": "U2 R' U' R U' R' U2 R R' U' F' U F R",
    "recognitionGroup": "I Shape",
    "setup": "R' F' U' F U R R' U2 R U R' U R U2"
  },
  {
    "id": "OLL-53",
    "name": "OLL 53",
    "category": "oll",
    "alg": "r' U' R U' R' U2 r r' U' R U' R' U2 r",
    "recognitionGroup": "L Shape",
    "setup": "r' U2 R U R' U r r' U2 R U R' U r"
  },
  {
    "id": "OLL-54",
    "name": "OLL 54",
    "category": "oll",
    "alg": "r U R' U R U2' r' r U R' U R U2' r'",
    "recognitionGroup": "L Shape",
    "setup": "r U2 R' U' R U' r' r U2 R' U' R U' r'"
  },
  {
    "id": "OLL-55",
    "name": "OLL 55",
    "category": "oll",
    "alg": "U R' F R U R U' R2' F' R2 U' R' U R U R'",
    "recognitionGroup": "I Shape",
    "setup": "R U' R' U' R U R2 F R2 U R' U' R' F' R U'"
  },
  {
    "id": "OLL-56",
    "name": "OLL 56",
    "category": "oll",
    "alg": "r U r' U R U' R' U R U' R' r U' r'",
    "recognitionGroup": "I Shape",
    "setup": "r U r' R U R' U' R U R' U' r U' r'"
  },
  {
    "id": "OLL-57",
    "name": "OLL 57",
    "category": "oll",
    "alg": "U R U R' U' M' U R U' R' M",
    "recognitionGroup": "H / I",
    "setup": "M' R U R' U' M U R U' R' U'"
  }
]);})();
