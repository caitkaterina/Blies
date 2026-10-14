export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function brandedEmail(message: string, reference: string) {
  return `<html><body style="margin:0;background:#f3f6fb;font-family:Arial,sans-serif;color:#0c1730"><div style="max-width:600px;margin:24px auto;background:white;padding:32px"><div style="background:#0a1f4d;color:white;padding:20px;font-size:24px;font-weight:bold">BLIES (Pty) Ltd</div><p style="white-space:pre-line;line-height:1.6">${escapeHtml(message)}</p><p style="font-size:12px;color:#44506a">Reference: ${escapeHtml(reference)}</p><p style="font-size:12px;color:#44506a">Business Logistics Imports Exports &amp; Suppliers</p></div></body></html>`;
}
