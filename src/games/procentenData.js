// ── Procenten ↔ breuken ↔ kommagetallen ───────────────────────────────
// Elke set hoort bij elkaar: percentage, breuk (vereenvoudigd) en kommagetal.
export const PROCENT_SETS = [
  { id: 'p5',    pct: '5%',    breuk: '1/20', deci: '0,05'  },
  { id: 'p10',   pct: '10%',   breuk: '1/10', deci: '0,1'   },
  { id: 'p125',  pct: '12,5%', breuk: '1/8',  deci: '0,125' },
  { id: 'p20',   pct: '20%',   breuk: '1/5',  deci: '0,2'   },
  { id: 'p25',   pct: '25%',   breuk: '1/4',  deci: '0,25'  },
  { id: 'p40',   pct: '40%',   breuk: '2/5',  deci: '0,4'   },
  { id: 'p50',   pct: '50%',   breuk: '1/2',  deci: '0,5'   },
  { id: 'p60',   pct: '60%',   breuk: '3/5',  deci: '0,6'   },
  { id: 'p625',  pct: '62,5%', breuk: '5/8',  deci: '0,625' },
  { id: 'p70',   pct: '70%',   breuk: '7/10', deci: '0,7'   },
  { id: 'p75',   pct: '75%',   breuk: '3/4',  deci: '0,75'  },
  { id: 'p80',   pct: '80%',   breuk: '4/5',  deci: '0,8'   },
  { id: 'p875',  pct: '87,5%', breuk: '7/8',  deci: '0,875' },
  { id: 'p90',   pct: '90%',   breuk: '9/10', deci: '0,9'   },
  { id: 'p100',  pct: '100%',  breuk: '1/1',  deci: '1'     },
]

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
