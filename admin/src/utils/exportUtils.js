/**
 * Data Export Utilities (CSV & PDF Document Export)
 */

/**
 * Export data array to CSV format and trigger browser download
 */
export function exportToCSV(filename, data) {
  if (!data || !data.length) return;

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Header row
  csvRows.push(headers.join(','));

  // Data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      const escaped = ('' + (val ?? '')).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate official executive PDF report window for printing or saving as PDF
 */
export function exportExecutivePDF(summaryData) {
  const win = window.open('', '_blank');
  if (!win) return;

  const counts = summaryData?.counts || {};
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>NatCA Telecom Executive Compliance Report</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: 700; color: #0284c7; margin: 0; }
        .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
        .meta { text-align: right; font-size: 12px; color: #64748b; }
        .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
        .kpi-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; background: #f8fafc; }
        .kpi-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .kpi-value { font-size: 28px; font-weight: 800; color: #0f172a; margin-top: 6px; }
        .section-title { font-size: 16px; font-weight: 700; border-left: 4px solid #0284c7; padding-left: 10px; margin: 30px 0 15px 0; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
        th { background: #f1f5f9; text-align: left; padding: 10px; font-weight: 700; border-bottom: 2px solid #cbd5e1; }
        td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
        .footer { margin-top: 50px; font-size: 11px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">National Telecommunications Commission</h1>
          <div class="subtitle">Executive Telecom Compliance & Quality of Service Summary</div>
        </div>
        <div class="meta">
          <div><strong>Report Date:</strong> ${dateStr}</div>
          <div><strong>Authority:</strong> NatCA Sierra Leone</div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total Complaints</div>
          <div class="kpi-value">${counts.total || 0}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Pending Review</div>
          <div class="kpi-value">${counts.new_count || 0}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Resolved Cases</div>
          <div class="kpi-value">${counts.resolved || 0}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Critical Incidents</div>
          <div class="kpi-value">${counts.critical || 0}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">SLA Breached</div>
          <div class="kpi-value">${counts.sla_breached || 0}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Closed Cases</div>
          <div class="kpi-value">${counts.closed || 0}</div>
        </div>
      </div>

      <div class="section-title">Regulatory Status Overview</div>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Compliance Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Resolution Rate</td>
            <td>${counts.total > 0 ? (((counts.resolved + counts.closed) / counts.total) * 100).toFixed(1) : 0}%</td>
            <td>Optimal</td>
          </tr>
          <tr>
            <td>SLA Compliance Rate</td>
            <td>${counts.total > 0 ? (((counts.total - counts.sla_breached) / counts.total) * 100).toFixed(1) : 100}%</td>
            <td>${counts.sla_breached > 0 ? 'Action Required' : 'Compliant'}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        Confidential — Official Document of NatCA Sierra Leone Telecom Regulatory Authority
      </div>

      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  win.document.write(html);
  win.document.close();
}
