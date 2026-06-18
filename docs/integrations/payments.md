# Payments

Invoice lifecycle and Payme gateway integration.

---

## Invoice Lifecycle

Invoices are created automatically when a candidate is hired.

```
HR: POST /applications/:id/hire { agreedSalaryUzs }
  │
  ▼
Placement created:
  { agreedSalaryUzs, feePercentage, guaranteePeriodDays }

  feeAmount = agreedSalaryUzs × feePercentage / 100
  │
  ▼
Invoice created automatically:
  {
    companyId,
    placementId,
    amountUzs: feeAmount,
    status: 'issued',
    dueDate: now + company.paymentTermsDays
  }
```

### Invoice Statuses

```
issued ──► paid (Payme or manual)
       ──► overdue (cron at 1am when dueDate < now)
       ──► cancelled (manual)
```

Overdue invoices trigger reminder emails at 9am via `cleanup` worker (`send-invoice-reminders`).

---

## Payme Integration

Uzbek payment gateway. Uses JSON-RPC 2.0 protocol (not REST).

**Docs:** [dev.payme.uz](https://dev.payme.uz)

### Configuration

```env
PAYME_MERCHANT_ID=<from Payme dashboard>
PAYME_MERCHANT_KEY=<from Payme dashboard>
```

Service: `backend/src/integrations/payme/payme-webhook.service.ts`  
Webhook endpoint: `POST /api/v1/webhooks/payme`  
Auth: HTTP Basic — username: `Paycom`, password: `PAYME_MERCHANT_KEY`

### Flow: Company Pays Invoice

```
1. HR: POST /invoices/:id/pay
   → InvoicesService.getPaymentLink(invoiceId)
   → Generate Payme checkout URL:
       https://checkout.paycom.uz/?m=MERCHANT_ID&ac.invoice_id=UUID&a=AMOUNT&l=ru

2. HR clicks link → Payme checkout page
   → Enter card details, confirm

3. Payme calls our webhook (JSON-RPC):

   CheckPerformTransaction:
     params: { amount, account: { invoice_id } }
     → find Invoice by id
     → verify amount matches Invoice.amountUzs (in tiyin — multiply by 100)
     → return: { allow: true } OR { reason: -31050, message: "Not found" }

   CreateTransaction:
     params: { id, time, amount, account }
     → create PaymeTransaction { paymeTransactionId: id, state: 1, amount }
     → return: { create_time, transaction, state: 1 }

   PerformTransaction:
     params: { id }
     → find PaymeTransaction by paymeTransactionId
     → set PaymeTransaction.state = 2, performTime = now
     → set Invoice.status = 'paid', paidAt = now
     → emit invoice_paid event
     → return: { transaction, perform_time, state: 2 }

   CancelTransaction:
     params: { id, reason }
     → set PaymeTransaction.state = -1 or -2 (depends on reason)
     → store cancellation reason
     → return: { transaction, cancel_time, state }
```

### Error Codes

| Code | Meaning |
|------|---------|
| `-31050` | Invoice not found |
| `-31051` | Amount mismatch |
| `-31052` | Transaction not found |
| `-31057` | Cannot perform (already cancelled) |
| `-31058` | Cannot cancel (already performed) |
| `-31099` | Internal error |

### PaymeTransaction States

| State | Meaning |
|-------|---------|
| `1` | Created (pending) |
| `2` | Performed (paid) |
| `-1` | Cancelled (before perform) |
| `-2` | Cancelled (after perform — refund initiated) |

---

## Generic Payment Webhook

For non-Payme gateways:

```
POST /api/v1/webhooks/payment
  X-Webhook-Signature: <HMAC-SHA256(body, PAYMENT_WEBHOOK_SECRET)>
```

Signature verification:
```typescript
const expectedSig = createHmac('sha256', PAYMENT_WEBHOOK_SECRET)
  .update(rawBody)
  .digest('hex')
if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
  throw new UnauthorizedException()
}
```

---

## Accessing Invoices

**HR company:** `GET /invoices` + `GET /invoices/:id`  
**Staff admin:** `GET /staff/invoices` (all companies)

Invoice response:
```json
{
  "id": "uuid",
  "amountUzs": "1500000",
  "status": "issued",
  "dueDate": "2026-07-18T00:00:00Z",
  "paidAt": null,
  "placement": {
    "candidate": { "fullName": "..." },
    "job": { "title": "..." },
    "agreedSalaryUzs": "15000000",
    "feePercentage": "10"
  }
}
```
