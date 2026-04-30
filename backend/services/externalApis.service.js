async function callCibil({ metadata }) {
  return {
    provider: 'CIBIL',
    pan: metadata.pan,
    creditScore: 742,
    activeTradelines: 4,
    dpdInLast12Months: 0,
    enquiriesLast90Days: 2
  };
}

async function callNsdl({ metadata }) {
  return {
    provider: 'NSDL',
    pan: metadata.pan,
    panVerified: true,
    nameMatchPercent: 96,
    status: 'valid'
  };
}

async function callPerfios() {
  return {
    provider: 'Perfios',
    bankAnalysis: {
      averageMonthlyBalance: 820000,
      monthlyCreditMedian: 1510000,
      chequeBounceCount: 1,
      inwardReturnCount: 1,
      suspiciousTransactions: 0,
      cashDepositPercent: 12
    }
  };
}

async function callKarza({ metadata }) {
  return {
    provider: 'Karza',
    pan: metadata.pan,
    itr: {
      latestAssessmentYear: '2025-26',
      filed: true,
      grossTotalIncome: 13200000,
      taxPaid: 880000
    },
    gst: {
      active: true,
      filingRegularityPercent: 92,
      trailing12MonthTurnover: 18100000
    }
  };
}

async function fetchExternalApiResponses(context) {
  console.log('[external-apis:mock:start]', {
    assessmentId: context.metadata.id
  });

  const [cibil, nsdl, perfios, karza] = await Promise.all([
    callCibil(context),
    callNsdl(context),
    callPerfios(context),
    callKarza(context)
  ]);

  return {
    cibil,
    nsdl,
    perfios,
    karza
  };
}

module.exports = {
  fetchExternalApiResponses
};
