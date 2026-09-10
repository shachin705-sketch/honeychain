const crypto = require('crypto');
const https = require('https');
const http = require('http');

console.log('[ALERT-SYSTEM] Alert service loaded — sendSmsAlert ready');

// ─── Severity Mapping ────────────────────────────────────────────────────────
function getSeverityForDetection(result) {
  const r = result.toLowerCase();
  if (r.includes('foulbrood') || r.includes('swarming precursor') || r.includes('possible swarming')) {
    return 'critical';
  }
  return 'warning';
}

// ─── Alert Message Builder ────────────────────────────────────────────────────
function buildAlertMessage(alertType, result, confidence) {
  const confidenceText = confidence ? ` — ${confidence}% confidence` : '';
  switch (alertType) {
    case 'disease_image':
      return `Image Detection: ${result}${confidenceText}. Please inspect your hive and consult an apiary officer if needed.`;
    case 'disease_audio':
      return `Audio Detection: ${result}${confidenceText}. Please inspect your hive within the recommended timeframe.`;
    case 'iot_risk':
      return `IoT Sensor Alert: ${result}. Monitor your hive closely and take preventive action.`;
    default:
      return `${result}${confidenceText}`;
  }
}

// ─── Real Fast2SMS Integration ────────────────────────────────────────────────
// Falls back to simulated mode if FAST2SMS_API_KEY is not set
function sendSmsAlert(phone, message) {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    // SIMULATED MODE — no API key configured
    process.stdout.write(`[ALERT-DEBUG] sendSmsAlert CALLED (simulated) phone=${phone}\n`);
    console.log(`[SMS-SIMULATED] To: ${phone} | Message: ${message}`);
    return Promise.resolve({
      smsDelivered: true,
      smsError: null,
      simulated: true,
      smsId: 'SMS-SIM-' + crypto.randomBytes(6).toString('hex').toUpperCase(),
      deliveredTo: phone,
      status: 'delivered (simulated)'
    });
  }

  // REAL Fast2SMS API call
  const postData = JSON.stringify({
    sender_id: 'FSTSMS',
    message: message,
    language: 'english',
    route: 'p',
    numbers: phone.replace(/[^0-9]/g, '').slice(-10) // last 10 digits
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'www.fast2sms.com',
      port: 443,
      path: '/dev/bulkV2',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
        'Cache-Control': 'no-cache'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`[SMS-RAW-RESPONSE] Fast2SMS raw body: ${body}`);
        try {
          const data = JSON.parse(body);
          if (data.return === true) {
            console.log(`[SMS-DELIVERED] To: ${phone} | Fast2SMS response: ${body}`);
            resolve({
              smsDelivered: true,
              smsError: null,
              simulated: false,
              smsId: data.request_id || 'SMS-' + crypto.randomBytes(6).toString('hex').toUpperCase(),
              deliveredTo: phone,
              status: 'delivered'
            });
          } else {
            console.error(`[SMS-FAILED] To: ${phone} | Fast2SMS error: ${body}`);
            resolve({
              smsDelivered: false,
              smsError: data.message || 'Fast2SMS returned false',
              simulated: false,
              smsId: null,
              deliveredTo: phone,
              status: 'failed'
            });
          }
        } catch (e) {
          console.error(`[SMS-PARSE-ERROR] To: ${phone} | Error: ${e.message}`);
          resolve({
            smsDelivered: false,
            smsError: `Parse error: ${e.message}`,
            simulated: false,
            smsId: null,
            deliveredTo: phone,
            status: 'failed'
          });
        }
      });
    });

    req.on('error', (e) => {
      console.error(`[SMS-NETWORK-ERROR] To: ${phone} | Error: ${e.message}`);
      resolve({
        smsDelivered: false,
        smsError: `Network error: ${e.message}`,
        simulated: false,
        smsId: null,
        deliveredTo: phone,
        status: 'failed'
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        smsDelivered: false,
        smsError: 'SMS request timed out (10s)',
        simulated: false,
        smsId: null,
        deliveredTo: phone,
        status: 'failed'
      });
    });

    req.write(postData);
    req.end();
  });
}

// ─── Unified Dual-Channel Alert Dispatcher ────────────────────────────────────
// Fires BOTH web alert (DB insert) AND SMS in parallel via Promise.all
// Neither blocks the other — a slow/failed SMS won't delay the web alert
//
// alertData = {
//   beekeeperId,   (required)
//   hiveId,        (optional — defaults to '')
//   alertType,     (required — 'disease_image' | 'disease_audio' | 'iot_risk')
//   severity,      (optional — auto-detected from detectionResult if omitted)
//   message,       (optional — auto-built from alertType + detectionResult if omitted)
//   detectionResult, (required)
//   confidence,    (optional)
//   phoneNumber    (optional — looked up from DB if omitted)
// }
async function dispatchAlert(db, alertData) {
  const {
    beekeeperId,
    hiveId = '',
    alertType,
    severity: overrideSeverity,
    message: overrideMessage,
    detectionResult,
    confidence,
    phoneNumber
  } = alertData;

  const severity = overrideSeverity || getSeverityForDetection(detectionResult);
  const message = overrideMessage || buildAlertMessage(alertType, detectionResult, confidence);
  const detectionLabel = confidence != null ? `${detectionResult} (${confidence}%)` : detectionResult;

  console.log(`[ALERT-DISPATCH] ENTRY | type=${alertType} | result="${detectionResult}" | severity=${severity} | beekeeper=${beekeeperId}`);
  process.stdout.write(`[ALERT-DEBUG] dispatchAlert ENTRY type=${alertType} beekeeper=${beekeeperId} severity=${severity}\n`);

  // Look up beekeeper phone if not provided
  let phone = phoneNumber;
  if (!phone) {
    const user = db.prepare('SELECT phone FROM users WHERE id = ?').get(beekeeperId);
    phone = user?.phone || '+91-0000000000';
  }

  // ── TEST MODE: Override SMS destination ──────────────────────────────────
  // TEMPORARY — all alerts SMS to one fixed test number regardless of beekeeper.
  // The original per-beekeeper phone is preserved in deliveredTo for UI display.
  // REMOVE this override before real deployment.
  const originalPhone = phone;
  const testPhone = process.env.TEST_ALERT_PHONE_NUMBER;
  const smsPhone = testPhone || phone;
  if (testPhone) {
    console.log(`[SMS-TEST-MODE] Overriding SMS destination: ${phone} → ${testPhone}`);
  }

  // STEP 1: Insert alert record into DB immediately (web channel = delivered once inserted)
  const dbResult = db.prepare(
    'INSERT INTO alerts (beekeeper_id, hive_id, alert_type, severity, message, detection_result, status, sms_details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(beekeeperId, hiveId || '', alertType, severity, message, detectionLabel, 'sent', '{}', new Date().toISOString());

  const alertId = dbResult.lastInsertRowid;
  console.log(`[ALERT-DISPATCH] Alert #${alertId} inserted into DB (sms_details={})`);

  // STEP 2: Fire both channels in PARALLEL (non-blocking)
  const webDelivery = Promise.resolve({
    webDelivered: true,
    alertId,
    severity,
    message
  });

  process.stdout.write(`[ALERT-DEBUG] dispatchAlert calling sendSmsAlert phone=${smsPhone} alertId=${alertId}\n`);
  const smsDelivery = sendSmsAlert(smsPhone, message);

  // Wait for both to complete — SMS failure does NOT affect web delivery
  const [webResult, smsResult] = await Promise.all([webDelivery, smsDelivery]);

  // Restore original phone for UI/DB display (real SMS went to test number,
  // but Alerts Panel shows the beekeeper's registered number)
  smsResult.deliveredTo = originalPhone;

  // STEP 3: Update the alert record with dual-channel delivery status
  const smsDetails = {
    webDelivered: webResult.webDelivered,
    smsDelivered: smsResult.smsDelivered,
    smsError: smsResult.smsError,
    simulated: smsResult.simulated,
    smsId: smsResult.smsId,
    deliveredTo: smsResult.deliveredTo,
    status: smsResult.status
  };

  db.prepare('UPDATE alerts SET sms_details = ? WHERE id = ?')
    .run(JSON.stringify(smsDetails), alertId);

  console.log(`[ALERT-DISPATCH] Alert #${alertId} delivery COMPLETE | web=true sms=${smsResult.smsDelivered} simulated=${smsResult.simulated} phone=${smsResult.deliveredTo}`);
  process.stdout.write(`[ALERT-DEBUG] dispatchAlert COMPLETE alertId=${alertId} smsDelivered=${smsResult.smsDelivered} simulated=${smsResult.simulated}\n`);

  return {
    alertId,
    beekeeperId,
    hiveId: hiveId || '',
    alertType,
    severity,
    message,
    detectionResult: detectionLabel,
    ...smsDetails
  };
}

// ─── Backward-compatible alias ────────────────────────────────────────────────
// Existing callers (disease.js, hive.js, alerts.js) can still import this
function sendSimulatedAlert(db, beekeeperId, alertType, result, confidence) {
  return dispatchAlert(db, { beekeeperId, alertType, detectionResult: result, confidence });
}

module.exports = {
  dispatchAlert,
  sendSimulatedAlert,
  getSeverityForDetection,
  buildAlertMessage,
  sendSmsAlert
};
