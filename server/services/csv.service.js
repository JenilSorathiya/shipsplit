const Papa = require('papaparse');

/**
 * Parse a platform-specific CSV export and normalize rows
 * into the Order schema shape.
 */
exports.parsePlatformCSV = (csvText, platform) => {
  const { data } = Papa.parse(csvText, {
    header:         true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (!data.length) return [];

  switch (platform) {
    case 'amazon':   return parseAmazon(data);
    case 'flipkart': return parseFlipkart(data);
    case 'meesho':   return parseMeesho(data);
    case 'myntra':   return parseMyntra(data);
    default:         return [];
  }
};

const trim = (v) => (v || '').trim();
const num  = (v) => parseFloat(v || 0) || 0;
const qty  = (v) => parseInt(v || 1) || 1;

function parseAmazon(rows) {
  return rows
    .map((r) => ({
      orderId:         trim(r['order-id']        || r['Order ID']),
      platformOrderId: trim(r['order-id']        || r['Order ID']),
      awb:             trim(r['tracking-number'] || r['Tracking Number']) || undefined,
      productName:     trim(r['product-name']    || r['Product Name']),
      sku:             trim(r['sku']             || r['SKU']),
      quantity:        qty(r['quantity-purchased']|| r['Quantity']),
      buyerName:       trim(r['recipient-name']  || r['Buyer Name']),
      buyerPhone:      trim(r['buyer-phone-number']),
      address: {
        line1:   trim(r['ship-address-1']    || r['Address 1']),
        line2:   trim(r['ship-address-2']    || r['Address 2']),
        city:    trim(r['ship-city']         || r['City']),
        state:   trim(r['ship-state']        || r['State']),
        pincode: trim(r['ship-postal-code']  || r['Pincode']),
        country: 'India',
      },
      orderValue: num(r['item-price']    || r['Order Amount']),
      isCOD:      (r['payment-method']   || '').toLowerCase() === 'cod',
    }))
    .filter((o) => o.orderId);
}

function parseFlipkart(rows) {
  return rows
    .map((r) => ({
      orderId:         trim(r['Order ID']    || r['order_id']),
      platformOrderId: trim(r['Order ID']    || r['order_id']),
      awb:             trim(r['Tracking ID'] || r['tracking_id']) || undefined,
      productName:     trim(r['Product Name']|| r['product_name']),
      sku:             trim(r['SKU']         || r['sku']),
      quantity:        qty(r['Quantity']     || r['quantity']),
      buyerName:       trim(r['Customer Name']|| r['customer_name']),
      buyerPhone:      trim(r['Customer Phone']|| r['customer_phone']),
      address: {
        line1:   trim(r['Delivery Address']  || r['address']),
        city:    trim(r['City']),
        state:   trim(r['State']),
        pincode: trim(r['Pincode']),
        country: 'India',
      },
      orderValue: num(r['Order Amount'] || r['order_amount']),
      isCOD:      (r['Payment Method'] || '').toLowerCase() === 'cod',
    }))
    .filter((o) => o.orderId);
}

function parseMeesho(rows) {
  return rows
    .map((r) => ({
      orderId:         trim(r['Sub Order No'] || r['Order ID']),
      platformOrderId: trim(r['Order No']     || r['Order ID']),
      awb:             trim(r['AWB Number']   || r['Tracking ID']) || undefined,
      productName:     trim(r['Product Name'] || r['Item Name']),
      sku:             trim(r['SKU']          || r['Product SKU']),
      quantity:        qty(r['Quantity']),
      buyerName:       trim(r['Customer Name']),
      address: {
        line1:   trim(r['Delivery Address'] || r['Address']),
        city:    trim(r['City']),
        state:   trim(r['State']),
        pincode: trim(r['Pincode']          || r['Pin Code']),
        country: 'India',
      },
      orderValue: num(r['Final Price'] || r['Order Amount']),
      isCOD:      true,   // Meesho is always COD
    }))
    .filter((o) => o.orderId);
}

function parseMyntra(rows) {
  return rows
    .map((r) => ({
      orderId:         trim(r['Order No']    || r['OrderId']),
      platformOrderId: trim(r['Order No']    || r['OrderId']),
      awb:             trim(r['AWB No']      || r['TrackingId']) || undefined,
      productName:     trim(r['Style Name']  || r['Product Name']),
      sku:             trim(r['SKU']         || r['StyleId']),
      quantity:        qty(r['Quantity']),
      buyerName:       trim(r['Customer Name']),
      address: {
        line1:   trim(r['Shipping Address']),
        city:    trim(r['City']),
        state:   trim(r['State']),
        pincode: trim(r['Pincode']),
        country: 'India',
      },
      orderValue: num(r['MRP'] || r['Amount']),
      isCOD:      (r['Payment Mode'] || '').toLowerCase() === 'cod',
    }))
    .filter((o) => o.orderId);
}
