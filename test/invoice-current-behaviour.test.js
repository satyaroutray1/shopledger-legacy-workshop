'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const pricing = require('../lib/pricing');
const invoice = require('../lib/invoice');
const reports = require('../lib/reports');

function sampleItems() {
  return [{ id: 1, name: 'Rice', sku: 'GRN-001', hsn: '1006', price: 1000, qty: 1 }];
}

test('invoice uses the same HSN slab and GST split as order pricing', function () {
  const items = sampleItems();
  const charged = pricing.computeTotals(items, '');
  const printed = invoice.computeInvoiceFigures({ items: items, coupon: '' });

  assert.deepEqual(
    { subtotal: charged.subtotal, tax: charged.tax, cgst: charged.cgst, sgst: charged.sgst, total: charged.total },
    { subtotal: 1000, tax: 50, cgst: 25, sgst: 25, total: 1050 }
  );
  assert.deepEqual(
    { subtotal: printed.subtotal, tax: printed.tax, cgst: printed.cgst, sgst: printed.sgst, total: printed.total },
    { subtotal: charged.subtotal, tax: charged.tax, cgst: charged.cgst, sgst: charged.sgst, total: charged.total }
  );
  assert.equal(printed.rows[0].gstPercent, charged.lines[0].gstPercent);
});

test('invoice uses the same coupon discount allocation and total as order pricing', function () {
  const items = sampleItems();
  const charged = pricing.computeTotals(items, 'SAVE10');
  const printed = invoice.computeInvoiceFigures({ items: items, coupon: 'SAVE10' });

  assert.deepEqual(
    { discount: charged.discount, tax: charged.tax, total: charged.total },
    { discount: 100, tax: 45, total: 945 }
  );
  assert.deepEqual(
    { discount: printed.discount, tax: printed.tax, total: printed.total },
    { discount: charged.discount, tax: charged.tax, total: charged.total }
  );
});

test('reconciliation reports the billed order and invoice as matched', function () {
  const items = sampleItems();
  const charged = pricing.computeTotals(items, 'SAVE10');
  const db = {
    orders: [{
      id: 42,
      date: '21/11/2026',
      customer: 'In-memory customer',
      status: 'completed',
      items: items,
      coupon: 'SAVE10',
      subtotal: charged.subtotal,
      discount: charged.discount,
      tax: charged.tax,
      total: charged.total
    }]
  };

  const result = reports.getGstReconciliation(db);
  assert.equal(result.totalChecked, 1);
  assert.equal(result.mismatchCount, 0);
  assert.deepEqual(
    {
      ledgerTax: result.rows[0].ledgerTax,
      invoiceTax: result.rows[0].invoiceTax,
      ledgerTotal: result.rows[0].ledgerTotal,
      invoiceTotal: result.rows[0].invoiceTotal,
      delta: result.rows[0].delta,
      matched: result.rows[0].matched
    },
    { ledgerTax: 45, invoiceTax: 45, ledgerTotal: 945, invoiceTotal: 945, delta: 0, matched: true }
  );
});

test('invoice HTML prints the billed total without a mismatch notice', function () {
  const items = sampleItems();
  const charged = pricing.computeTotals(items, 'SAVE10');
  const html = invoice.render({
    id: 42,
    date: '21/11/2026',
    customer: 'In-memory customer',
    paymentMode: 'cash',
    status: 'completed',
    items: items,
    coupon: 'SAVE10',
    total: charged.total
  });

  assert.match(html, /Invoice Total<\/td><td class="r">₹945\.00/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});

test('invoice output shows billed HSN GST and separate CGST and SGST amounts', function () {
  const items = sampleItems();
  const charged = pricing.computeTotals(items, 'SAVE10');
  const printed = invoice.computeInvoiceFigures({ items: items, coupon: 'SAVE10' });
  const html = invoice.render({
    id: 42,
    date: '21/11/2026',
    customer: 'In-memory customer',
    paymentMode: 'cash',
    status: 'completed',
    items: items,
    coupon: 'SAVE10',
    total: charged.total
  });

  assert.deepEqual(
    { subtotal: printed.subtotal, discount: printed.discount, tax: printed.tax,
      cgst: printed.cgst, sgst: printed.sgst, total: printed.total },
    { subtotal: charged.subtotal, discount: charged.discount, tax: charged.tax,
      cgst: charged.cgst, sgst: charged.sgst, total: charged.total }
  );
  assert.equal(printed.rows[0].gstPercent, charged.lines[0].gstPercent);
  assert.equal(printed.rows[0].lineTax, charged.lines[0].tax);
  assert.match(html, /GST %<\/th><th class="r">GST Amt/);
  assert.match(html, /<td class="r">5%<\/td><td class="r">₹45\.00<\/td>/);
  assert.match(html, /CGST<\/td><td class="r">₹22\.50/);
  assert.match(html, /SGST<\/td><td class="r">₹22\.50/);
  assert.match(html, /Invoice Total<\/td><td class="r">₹945\.00/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});
