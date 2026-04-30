const { calculateAssessmentScore, WEIGHTS } = require('../services/calculation-engine');

const extracted = {
  borrower: {
    businessVintageYears: 6
  },
  financials: {
    revenue: 18500000,
    profit: 2450000,
    liabilities: 6300000,
    netWorth: 7200000,
    currentAssets: 9200000,
    currentLiabilities: 5100000
  },
  banking: {
    averageMonthlyBalance: 820000,
    averageMonthlyCredits: 1550000
  },
  loanRequest: {
    requestedAmount: 2500000,
    collateralOffered: 'Plant and machinery hypothecation'
  },
  compliance: {
    itrFiledOnTime: true,
    financialStatementsAudited: true
  },
  documents: {
    totalDocuments: 3
  }
};

const apiResponses = {
  cibil: {
    creditScore: 742,
    dpdInLast12Months: 0,
    enquiriesLast90Days: 2
  },
  nsdl: {
    panVerified: true
  },
  perfios: {
    bankAnalysis: {
      averageMonthlyBalance: 820000,
      monthlyCreditMedian: 1510000,
      chequeBounceCount: 1,
      suspiciousTransactions: 0
    }
  },
  karza: {
    itr: {
      filed: true
    },
    gst: {
      filingRegularityPercent: 92
    }
  }
};

const result = calculateAssessmentScore({ extracted, apiResponses });
const totalWeight = Object.values(WEIGHTS).reduce((sum, value) => sum + value, 0);

if (totalWeight !== 100) {
  throw new Error(`Expected scoring weights to total 100, received ${totalWeight}`);
}

if (!['Approve', 'Refer', 'Decline'].includes(result.decision)) {
  throw new Error(`Unexpected decision ${result.decision}`);
}

if (result.score < 0 || result.score > 100) {
  throw new Error(`Score out of range: ${result.score}`);
}

if (typeof result.recommendedLimit !== 'number') {
  throw new Error('recommendedLimit must be numeric');
}

console.log('[calculation-engine:smoke]', {
  score: result.score,
  decision: result.decision,
  recommendedLimit: result.recommendedLimit,
  scoreBreakdown: result.scoreBreakdown
});
