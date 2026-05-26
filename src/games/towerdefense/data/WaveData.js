// Each wave: array of spawn groups { type, count, interval(ms), delay(ms) }
// delay = ms after wave start before this group starts spawning

export const TOTAL_WAVES = 15

export const WAVES = {
  // Map 1 - Savanne (15 waves, lekker toegankelijk)
  1: [
    [{ type:'basic',   count:8,  interval:1400, delay:0 }],
    [{ type:'basic',   count:12, interval:1200, delay:0 }],
    [{ type:'basic',   count:10, interval:1100, delay:0 }, { type:'fast', count:4, interval:1800, delay:2000 }],
    [{ type:'fast',    count:10, interval:900,  delay:0 }],
    [{ type:'basic',   count:8,  interval:1000, delay:0 }, { type:'tank', count:2, interval:3000, delay:1000 }],
    [{ type:'basic',   count:15, interval:900,  delay:0 }, { type:'fast', count:6, interval:800,  delay:3000 }],
    [{ type:'tank',    count:4,  interval:2500, delay:0 }, { type:'fast', count:8, interval:700,  delay:500  }],
    [{ type:'armored', count:6,  interval:1400, delay:0 }, { type:'basic', count:10, interval:800, delay:2000 }],
    [{ type:'flying',  count:8,  interval:1000, delay:0 }, { type:'basic', count:10, interval:900, delay:1000 }],
    [{ type:'fast',    count:12, interval:700,  delay:0 }, { type:'armored', count:5, interval:1200, delay:2000 }],
    [{ type:'tank',    count:6,  interval:2000, delay:0 }, { type:'flying', count:8, interval:900,  delay:1000 }],
    [{ type:'armored', count:10, interval:1000, delay:0 }, { type:'fast', count:10, interval:600,  delay:2500 }],
    [{ type:'flying',  count:12, interval:800,  delay:0 }, { type:'tank', count:4, interval:2200, delay:1000 }],
    [{ type:'armored', count:8,  interval:900,  delay:0 }, { type:'fast', count:14, interval:600, delay:1000 }, { type:'tank', count:3, interval:2500, delay:4000 }],
    [{ type:'boss',    count:1,  interval:0,    delay:0 }, { type:'armored', count:8, interval:900, delay:3000 }, { type:'fast', count:12, interval:700, delay:6000 }],
  ],
  // Map 2 - Jungle (15 waves, harder)
  2: [
    [{ type:'basic',   count:10, interval:1200, delay:0 }, { type:'fast', count:3, interval:1000, delay:2000 }],
    [{ type:'fast',    count:10, interval:900,  delay:0 }, { type:'basic', count:8, interval:1000, delay:1500 }],
    [{ type:'tank',    count:3,  interval:2500, delay:0 }, { type:'basic', count:12, interval:900, delay:500  }],
    [{ type:'armored', count:8,  interval:1200, delay:0 }, { type:'fast', count:8,  interval:800,  delay:2000 }],
    [{ type:'flying',  count:10, interval:900,  delay:0 }, { type:'tank', count:3,  interval:2500, delay:1000 }],
    [{ type:'fast',    count:15, interval:700,  delay:0 }, { type:'armored', count:6, interval:1100, delay:2000 }],
    [{ type:'tank',    count:5,  interval:2200, delay:0 }, { type:'flying', count:10, interval:800,  delay:500  }],
    [{ type:'armored', count:12, interval:1000, delay:0 }, { type:'fast', count:10, interval:650,  delay:3000 }],
    [{ type:'flying',  count:14, interval:750,  delay:0 }, { type:'armored', count:8, interval:900, delay:2000 }],
    [{ type:'tank',    count:7,  interval:2000, delay:0 }, { type:'fast', count:14, interval:600,  delay:1000 }],
    [{ type:'armored', count:14, interval:900,  delay:0 }, { type:'flying', count:10, interval:700, delay:2000 }],
    [{ type:'boss',    count:1,  interval:0,    delay:0 }, { type:'basic', count:20, interval:700, delay:2000 }],
    [{ type:'armored', count:16, interval:800,  delay:0 }, { type:'tank', count:6,  interval:1800, delay:2000 }],
    [{ type:'flying',  count:16, interval:700,  delay:0 }, { type:'fast', count:16, interval:550,  delay:2000 }],
    [{ type:'boss',    count:2,  interval:4000, delay:0 }, { type:'armored', count:12, interval:750, delay:3000 }, { type:'flying', count:10, interval:700, delay:8000 }],
  ],
  // Map 3 - Woestijn (15 waves, hardest)
  3: [
    [{ type:'fast',    count:12, interval:900,  delay:0 }, { type:'armored', count:4, interval:1400, delay:1000 }],
    [{ type:'tank',    count:4,  interval:2200, delay:0 }, { type:'fast', count:12, interval:750,  delay:500  }],
    [{ type:'armored', count:10, interval:1100, delay:0 }, { type:'flying', count:8, interval:900,  delay:2000 }],
    [{ type:'fast',    count:18, interval:650,  delay:0 }, { type:'tank', count:4,  interval:2000, delay:2000 }],
    [{ type:'flying',  count:14, interval:750,  delay:0 }, { type:'armored', count:10, interval:950, delay:1500 }],
    [{ type:'tank',    count:6,  interval:2000, delay:0 }, { type:'fast', count:16, interval:600,  delay:1000 }],
    [{ type:'armored', count:14, interval:900,  delay:0 }, { type:'flying', count:12, interval:750, delay:2000 }],
    [{ type:'boss',    count:1,  interval:0,    delay:0 }, { type:'fast', count:20, interval:600,  delay:2000 }],
    [{ type:'tank',    count:8,  interval:1800, delay:0 }, { type:'armored', count:12, interval:850, delay:1500 }],
    [{ type:'flying',  count:18, interval:650,  delay:0 }, { type:'tank', count:6,  interval:1800, delay:2000 }],
    [{ type:'armored', count:18, interval:800,  delay:0 }, { type:'fast', count:18, interval:550,  delay:2000 }],
    [{ type:'boss',    count:2,  interval:5000, delay:0 }, { type:'armored', count:14, interval:750, delay:3000 }],
    [{ type:'flying',  count:20, interval:600,  delay:0 }, { type:'fast', count:20, interval:500,  delay:2000 }],
    [{ type:'tank',    count:10, interval:1600, delay:0 }, { type:'armored', count:16, interval:750, delay:2000 }, { type:'fast', count:16, interval:550, delay:5000 }],
    [{ type:'boss',    count:3,  interval:4000, delay:0 }, { type:'armored', count:18, interval:700, delay:4000 }, { type:'flying', count:18, interval:600, delay:10000 }],
  ],
}
