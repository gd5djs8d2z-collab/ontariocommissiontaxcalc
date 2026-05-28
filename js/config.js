// All 2026 tax rates — single source of truth. Never hardcode values elsewhere.
const CONFIG = {
  taxYear: 2026,

  federal: {
    brackets: [
      { upTo: 58523,  rate: 0.14   },
      { upTo: 117045, rate: 0.205  },
      { upTo: 181440, rate: 0.26   },
      { upTo: 258482, rate: 0.29   },
      { upTo: null,   rate: 0.33   }
    ],
    bpa: {
      max:           16452,
      min:           14829,
      phaseoutStart: 181440,
      phaseoutEnd:   258482,
      creditRate:    0.14
    }
  },

  ontario: {
    brackets: [
      { upTo: 53891,  rate: 0.0505 },
      { upTo: 107785, rate: 0.0915 },
      { upTo: 150000, rate: 0.1116 },
      { upTo: 220000, rate: 0.1216 },
      { upTo: null,   rate: 0.1316 }
    ],
    bpa: {
      amount:     12989,
      creditRate: 0.0505
    },
    surtax: {
      threshold1: 5818,
      rate1:      0.20,
      threshold2: 7446,
      rate2:      0.36
    }
  },

  cpp1: {
    rate:            0.0595,
    ympe:            74600,
    basicExemption:  3500,
    maxContribution: 4230.45
  },

  cpp2: {
    rate:            0.04,
    ympe:            74600,
    yampe:           85000,
    maxContribution: 416.00
  },

  ei: {
    rate:       0.0163,
    mie:        68900,
    maxPremium: 1123.07
  }
};
