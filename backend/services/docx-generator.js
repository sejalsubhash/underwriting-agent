const {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} = require('docx');

function tableRow(label, value) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 40, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })]
      }),
      new TableCell({
        width: { size: 60, type: WidthType.PERCENTAGE },
        children: [new Paragraph(String(value))]
      })
    ]
  });
}

async function generateAssessmentReport({ metadata, extracted, results }) {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'MSME Loan Underwriting Report',
                bold: true,
                size: 32
              })
            ]
          }),
          new Paragraph(`Assessment ID: ${metadata.id}`),
          new Paragraph(`Company: ${metadata.companyName}`),
          new Paragraph(' '),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              tableRow('PAN', metadata.pan),
              tableRow('Requested Amount', metadata.loanAmount),
              tableRow('Revenue', extracted.financials.revenue),
              tableRow('Profit', extracted.financials.profit),
              tableRow('Liabilities', extracted.financials.liabilities),
              tableRow('Score', results.score),
              tableRow('Decision', results.decision),
              tableRow('Recommended Limit', results.recommendedLimit)
            ]
          })
        ]
      }
    ]
  });

  return Packer.toBuffer(doc);
}

module.exports = {
  generateAssessmentReport
};
