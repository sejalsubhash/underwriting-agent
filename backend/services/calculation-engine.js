const WEIGHTS = {
  financialStrength: 35,
  banking: 20,
  credit: 15,
  stability: 15,
  security: 15
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundMoney(value) {
  return Math.round(Number(value || 0));
}

function safeDivide(numerator, denominator) {
  if (!denominator) {
    return 0;
  }

  return numerator / denominator;
}

function decide(score) {
  if (score >= 75) {
    return 'Approve';
  }

  if (score >= 55) {
    return 'Refer';
  }

  return 'Decline';
}

function scoreFinancialStrength(financials) {
  const revenue = Number(financials.revenue || 0);
  const profit = Number(financials.profit || 0);
  const liabilities = Number(financials.liabilities || 0);
  const currentAssets = Number(financials.currentAssets || 0);
  const currentLiabilities = Number(financials.currentLiabilities || 0);
  const netWorth = Number(financials.netWorth || 0);

  const profitMargin = safeDivide(profit, revenue);
  const currentRatio = safeDivide(currentAssets, currentLiabilities);
  const debtToNetWorth = safeDivide(liabilities, netWorth);

  const profitabilityScore = clamp(profitMargin / 0.18, 0, 1) * 14;
  const liquidityScore = clamp(currentRatio / 1.8, 0, 1) * 9;
  const leverageScore = clamp((2.5 - debtToNetWorth) / 2.5, 0, 1) * 8;
  const scaleScore = clamp(revenue / 20000000, 0, 1) * 4;

  return {
    score: Math.round(clamp(profitabilityScore + liquidityScore + leverageScore + scaleScore, 0, WEIGHTS.financialStrength)),
    metrics: {
      profitMargin,
      currentRatio,
      debtToNetWorth
    }
  };
}

function scoreBanking(extracted, apiResponses) {
  const banking = extracted.banking || {};
  const perfios = apiResponses.perfios && apiResponses.perfios.bankAnalysis
    ? apiResponses.perfios.bankAnalysis
    : {};

  const averageMonthlyBalance = Number(
    perfios.averageMonthlyBalance || banking.averageMonthlyBalance || 0
  );
  const averageMonthlyCredits = Number(
    perfios.monthlyCreditMedian || banking.averageMonthlyCredits || 0
  );
  const chequeBounceCount = Number(
    perfios.chequeBounceCount || banking.inwardChequeReturns || 0
  );
  const suspiciousTransactions = Number(perfios.suspiciousTransactions || 0);

  const balanceScore = clamp(averageMonthlyBalance / 1000000, 0, 1) * 7;
  const creditFlowScore = clamp(averageMonthlyCredits / 1800000, 0, 1) * 7;
  const conductScore = clamp(1 - chequeBounceCount / 5, 0, 1) * 4;
  const hygieneScore = suspiciousTransactions === 0 ? 2 : 0;

  return {
    score: Math.round(clamp(balanceScore + creditFlowScore + conductScore + hygieneScore, 0, WEIGHTS.banking)),
    metrics: {
      averageMonthlyBalance,
      averageMonthlyCredits,
      chequeBounceCount,
      suspiciousTransactions
    }
  };
}

function scoreCredit(apiResponses) {
  const cibil = apiResponses.cibil || {};
  const nsdl = apiResponses.nsdl || {};

  const creditScore = Number(cibil.creditScore || 0);
  const dpdInLast12Months = Number(cibil.dpdInLast12Months || 0);
  const enquiriesLast90Days = Number(cibil.enquiriesLast90Days || 0);
  const panVerified = Boolean(nsdl.panVerified);

  const bureauScore = clamp((creditScore - 600) / 180, 0, 1) * 10;
  const repaymentScore = clamp(1 - dpdInLast12Months / 30, 0, 1) * 3;
  const enquiryScore = clamp(1 - enquiriesLast90Days / 8, 0, 1) * 1;
  const identityScore = panVerified ? 1 : 0;

  return {
    score: Math.round(clamp(bureauScore + repaymentScore + enquiryScore + identityScore, 0, WEIGHTS.credit)),
    metrics: {
      creditScore,
      dpdInLast12Months,
      enquiriesLast90Days,
      panVerified
    }
  };
}

function scoreStability(extracted, apiResponses) {
  const borrower = extracted.borrower || {};
  const compliance = extracted.compliance || {};
  const karza = apiResponses.karza || {};
  const gst = karza.gst || {};
  const itr = karza.itr || {};

  const businessVintageYears = Number(borrower.businessVintageYears || 0);
  const gstFilingRegularityPercent = Number(gst.filingRegularityPercent || 0);
  const itrFiled = Boolean(itr.filed || compliance.itrFiledOnTime);
  const auditedFinancials = Boolean(compliance.financialStatementsAudited);

  const vintageScore = clamp(businessVintageYears / 8, 0, 1) * 6;
  const gstScore = clamp(gstFilingRegularityPercent / 100, 0, 1) * 5;
  const itrScore = itrFiled ? 2 : 0;
  const auditScore = auditedFinancials ? 2 : 0;

  return {
    score: Math.round(clamp(vintageScore + gstScore + itrScore + auditScore, 0, WEIGHTS.stability)),
    metrics: {
      businessVintageYears,
      gstFilingRegularityPercent,
      itrFiled,
      auditedFinancials
    }
  };
}

function scoreSecurity(extracted) {
  const loanRequest = extracted.loanRequest || {};
  const financials = extracted.financials || {};

  const collateralOffered = Boolean(loanRequest.collateralOffered);
  const requestedAmount = Number(loanRequest.requestedAmount || 0);
  const netWorth = Number(financials.netWorth || 0);
  const collateralCoverage = collateralOffered ? clamp(netWorth / Math.max(requestedAmount, 1), 0, 1.5) : 0;

  const collateralScore = collateralOffered ? 8 : 0;
  const coverageScore = clamp(collateralCoverage / 1.25, 0, 1) * 5;
  const documentScore = extracted.documents && extracted.documents.totalDocuments >= 2 ? 2 : 1;

  return {
    score: Math.round(clamp(collateralScore + coverageScore + documentScore, 0, WEIGHTS.security)),
    metrics: {
      collateralOffered,
      collateralCoverage: Number(collateralCoverage.toFixed(2))
    }
  };
}

function calculateRecommendedLimit({ extracted, score }) {
  const financials = extracted.financials || {};
  const banking = extracted.banking || {};
  const loanRequest = extracted.loanRequest || {};

  const requestedAmount = Number(loanRequest.requestedAmount || 0);
  const revenueBasedLimit = Number(financials.revenue || 0) * 0.25;
  const bankingBasedLimit = Number(banking.averageMonthlyCredits || 0) * 3;
  const profitBasedLimit = Number(financials.profit || 0) * 1.5;
  const riskMultiplier = score >= 75 ? 1 : score >= 55 ? 0.7 : 0.4;

  return roundMoney(
    Math.min(requestedAmount, revenueBasedLimit, bankingBasedLimit, profitBasedLimit) * riskMultiplier
  );
}

function calculateAssessmentScore({ extracted, apiResponses }) {
  const financialStrength = scoreFinancialStrength(extracted.financials || {});
  const banking = scoreBanking(extracted, apiResponses);
  const credit = scoreCredit(apiResponses);
  const stability = scoreStability(extracted, apiResponses);
  const security = scoreSecurity(extracted);

  const rawScore =
    financialStrength.score +
    banking.score +
    credit.score +
    stability.score +
    security.score;
  const score = Math.round(clamp(rawScore, 0, 100));
  const decision = decide(score);
  const recommendedLimit = calculateRecommendedLimit({ extracted, score });

  return {
    score,
    decision,
    recommendedLimit,
    ratios: {
      profitMargin: Number(financialStrength.metrics.profitMargin.toFixed(3)),
      currentRatio: Number(financialStrength.metrics.currentRatio.toFixed(2)),
      debtToNetWorth: Number(financialStrength.metrics.debtToNetWorth.toFixed(2))
    },
    scoreBreakdown: {
      financialStrength: financialStrength.score,
      banking: banking.score,
      credit: credit.score,
      stability: stability.score,
      security: security.score
    },
    weights: WEIGHTS,
    metrics: {
      financialStrength: financialStrength.metrics,
      banking: banking.metrics,
      credit: credit.metrics,
      stability: stability.metrics,
      security: security.metrics
    },
    calculatedAt: new Date().toISOString()
  };
}

module.exports = {
  WEIGHTS,
  calculateAssessmentScore
};
