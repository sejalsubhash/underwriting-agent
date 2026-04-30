function deriveBusinessVintage(caseId) {
  const numericSignal = String(caseId || '')
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return 3 + (numericSignal % 9);
}

async function extractUnderwritingData({ metadata, documents, documentDetections, textractOutputs }) {
  console.log('[claude:mock:start]', {
    assessmentId: metadata.id,
    documents: documents.length,
    textractDocuments: textractOutputs.length
  });

  const revenue = 18500000;
  const profit = 2450000;
  const liabilities = 6300000;
  const requestedLoanAmount = Number(metadata.loanAmount);

  return {
    source: 'claude-api-mock',
    borrower: {
      companyName: metadata.companyName,
      pan: metadata.pan,
      constitution: 'Private Limited',
      industry: 'Light manufacturing',
      businessVintageYears: deriveBusinessVintage(metadata.caseId),
      registeredAddress: 'Industrial Area, Pune, Maharashtra',
      gstin: '27ABCDE1234F1Z5',
      udyamRegistration: 'UDYAM-MH-26-0012345'
    },
    financials: {
      revenue,
      profit,
      liabilities,
      netWorth: 7200000,
      ebitda: 3350000,
      cashBalance: 1450000,
      receivables: 3100000,
      inventory: 2600000,
      debtorsDays: 48,
      creditorsDays: 42,
      currentAssets: 9200000,
      currentLiabilities: 5100000
    },
    banking: {
      averageMonthlyBalance: 820000,
      inwardChequeReturns: 1,
      outwardChequeReturns: 0,
      averageMonthlyCredits: 1550000,
      overdraftUtilizationPercent: 42
    },
    loanRequest: {
      requestedAmount: requestedLoanAmount,
      purpose: 'Working capital expansion',
      tenureMonths: 36,
      collateralOffered: 'Plant and machinery hypothecation'
    },
    compliance: {
      gstFiledOnTime: true,
      itrFiledOnTime: true,
      bankStatementsAvailableMonths: 12,
      financialStatementsAudited: true
    },
    documents: {
      totalDocuments: documents.length,
      scannedDocuments: documentDetections.filter((item) => item.scanned).length,
      digitalDocuments: documentDetections.filter((item) => !item.scanned).length
    },
    extractionConfidence: 0.91
  };
}

module.exports = {
  extractUnderwritingData
};
