// Elke golf: array van spawn-groepen { type, count, interval(ms), delay(ms) }
// delay = ms na golfstart voordat deze groep begint

export const TOTAL_WAVES = 15

export const WAVES = {
  // ── Map 1 – Savanne (intro: rood → geel → zwart/wit → baas) ──────
  1: [
    /* 1 */ [{ type:'red',    count:8,  interval:1400, delay:0 }],
    /* 2 */ [{ type:'red',    count:12, interval:1100, delay:0 }],
    /* 3 */ [{ type:'red',    count:10, interval:1000, delay:0 }, { type:'blue',   count:4,  interval:1600, delay:2000 }],
    /* 4 */ [{ type:'blue',   count:10, interval:900,  delay:0 }],
    /* 5 */ [{ type:'blue',   count:8,  interval:900,  delay:0 }, { type:'green',  count:3,  interval:2500, delay:1000 }],
    /* 6 */ [{ type:'blue',   count:14, interval:800,  delay:0 }, { type:'flying', count:5,  interval:900,  delay:3000 }],
    /* 7 */ [{ type:'green',  count:5,  interval:2000, delay:0 }, { type:'blue',   count:8,  interval:700,  delay:500  }],
    /* 8 */ [{ type:'yellow', count:6,  interval:1400, delay:0 }, { type:'blue',   count:10, interval:800,  delay:2000 }],
    /* 9 */ [{ type:'flying', count:8,  interval:1000, delay:0 }, { type:'green',  count:10, interval:900,  delay:1000 }],
    /*10 */ [{ type:'yellow', count:10, interval:900,  delay:0 }, { type:'black',  count:4,  interval:1400, delay:3000 }],
    /*11 */ [{ type:'black',  count:6,  interval:1600, delay:0 }, { type:'flying', count:8,  interval:900,  delay:1000 }],
    /*12 */ [{ type:'white',  count:6,  interval:1400, delay:0 }, { type:'yellow', count:10, interval:700,  delay:2000 }],
    /*13 */ [{ type:'flying', count:12, interval:800,  delay:0 }, { type:'black',  count:5,  interval:1400, delay:1000 }],
    /*14 */ [{ type:'black',  count:8,  interval:1000, delay:0 }, { type:'white',  count:6,  interval:1200, delay:2000 }, { type:'yellow', count:10, interval:700, delay:5000 }],
    /*15 */ [{ type:'boss',   count:1,  interval:0,    delay:0 }, { type:'white',  count:8,  interval:900,  delay:4000 }, { type:'yellow', count:12, interval:700, delay:8000 }],
  ],

  // ── Map 2 – Jungle (medium: start met blauw, eindig op keramiek) ──
  2: [
    /* 1 */ [{ type:'blue',   count:10, interval:1200, delay:0 }, { type:'red',    count:6,  interval:1000, delay:2000 }],
    /* 2 */ [{ type:'green',  count:8,  interval:1100, delay:0 }, { type:'blue',   count:8,  interval:900,  delay:1500 }],
    /* 3 */ [{ type:'yellow', count:4,  interval:2000, delay:0 }, { type:'blue',   count:12, interval:900,  delay:500  }],
    /* 4 */ [{ type:'yellow', count:8,  interval:1200, delay:0 }, { type:'flying', count:6,  interval:900,  delay:2000 }],
    /* 5 */ [{ type:'black',  count:5,  interval:1600, delay:0 }, { type:'yellow', count:8,  interval:900,  delay:1000 }],
    /* 6 */ [{ type:'yellow', count:14, interval:700,  delay:0 }, { type:'white',  count:5,  interval:1400, delay:2000 }],
    /* 7 */ [{ type:'black',  count:7,  interval:1400, delay:0 }, { type:'flying', count:10, interval:800,  delay:500  }],
    /* 8 */ [{ type:'purple', count:6,  interval:1300, delay:0 }, { type:'yellow', count:10, interval:700,  delay:2500 }],
    /* 9 */ [{ type:'flying', count:14, interval:750,  delay:0 }, { type:'black',  count:8,  interval:1100, delay:2000 }],
    /*10 */ [{ type:'lead',   count:4,  interval:2200, delay:0 }, { type:'yellow', count:14, interval:650,  delay:1000 }],
    /*11 */ [{ type:'purple', count:10, interval:1000, delay:0 }, { type:'flying', count:10, interval:800,  delay:2000 }],
    /*12 */ [{ type:'boss',   count:1,  interval:0,    delay:0 }, { type:'green',  count:20, interval:700,  delay:3000 }],
    /*13 */ [{ type:'ceramic',count:2,  interval:4000, delay:0 }, { type:'black',  count:10, interval:1000, delay:1000 }],
    /*14 */ [{ type:'flying', count:16, interval:700,  delay:0 }, { type:'lead',   count:6,  interval:1800, delay:2000 }],
    /*15 */ [{ type:'boss',   count:2,  interval:5000, delay:0 }, { type:'purple', count:12, interval:850,  delay:4000 }, { type:'flying', count:10, interval:700, delay:10000 }],
  ],

  // ── Map 3 – Woestijn (hard: start met geel, eindig op MOAB-spam) ──
  3: [
    /* 1 */ [{ type:'yellow', count:12, interval:900,  delay:0 }, { type:'black',  count:4,  interval:1400, delay:1000 }],
    /* 2 */ [{ type:'black',  count:6,  interval:1400, delay:0 }, { type:'yellow', count:12, interval:750,  delay:500  }],
    /* 3 */ [{ type:'purple', count:8,  interval:1200, delay:0 }, { type:'flying', count:8,  interval:900,  delay:2000 }],
    /* 4 */ [{ type:'yellow', count:18, interval:650,  delay:0 }, { type:'lead',   count:3,  interval:2200, delay:2000 }],
    /* 5 */ [{ type:'flying', count:14, interval:750,  delay:0 }, { type:'purple', count:10, interval:1000, delay:1500 }],
    /* 6 */ [{ type:'lead',   count:5,  interval:2000, delay:0 }, { type:'yellow', count:16, interval:600,  delay:1000 }],
    /* 7 */ [{ type:'ceramic',count:3,  interval:3000, delay:0 }, { type:'flying', count:12, interval:750,  delay:2000 }],
    /* 8 */ [{ type:'boss',   count:1,  interval:0,    delay:0 }, { type:'yellow', count:20, interval:600,  delay:2000 }],
    /* 9 */ [{ type:'lead',   count:8,  interval:1800, delay:0 }, { type:'purple', count:12, interval:900,  delay:1500 }],
    /*10 */ [{ type:'flying', count:18, interval:650,  delay:0 }, { type:'ceramic',count:4,  interval:2500, delay:2000 }],
    /*11 */ [{ type:'rainbow',count:8,  interval:1200, delay:0 }, { type:'yellow', count:18, interval:600,  delay:2000 }],
    /*12 */ [{ type:'boss',   count:2,  interval:5000, delay:0 }, { type:'lead',   count:14, interval:900,  delay:4000 }],
    /*13 */ [{ type:'flying', count:20, interval:600,  delay:0 }, { type:'ceramic',count:6,  interval:2000, delay:2000 }],
    /*14 */ [{ type:'rainbow',count:12, interval:1000, delay:0 }, { type:'lead',   count:10, interval:1400, delay:2500 }, { type:'yellow', count:16, interval:600, delay:6000 }],
    /*15 */ [{ type:'boss',   count:3,  interval:4500, delay:0 }, { type:'ceramic',count:8,  interval:2000, delay:5000 }, { type:'flying', count:18, interval:600, delay:12000 }],
  ],
}
