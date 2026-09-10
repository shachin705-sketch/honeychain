const QRCode = require('qrcode');

// SIMULATED — In production, QR codes would include NFC chip signatures
// and would be physically embedded in tamper-evident packaging seals.

async function generateBatchQR(batchId, baseUrl = 'http://localhost:5173') {
  const verifyUrl = `${baseUrl}/verify/${batchId}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 300,
    margin: 2,
    color: { dark: '#3E2C00', light: '#FFFDF7' }
  });
  return { url: verifyUrl, qrDataUrl };
}

async function generateOrderQR(orderId, batchId, baseUrl = 'http://localhost:5173') {
  const orderUrl = `${baseUrl}/order/${batchId}`;
  const qrDataUrl = await QRCode.toDataURL(orderUrl, {
    width: 200,
    margin: 2,
    color: { dark: '#3E2C00', light: '#FFFDF7' }
  });
  return { url: orderUrl, qrDataUrl };
}

module.exports = { generateBatchQR, generateOrderQR };
