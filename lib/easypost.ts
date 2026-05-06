const EASYPOST_BASE = 'https://api.easypost.com/v2'
const MARKUP = 1.18

export interface ShipmentResult {
  id: string
  tracking_code: string
  label_url: string
  rate: number
  charged_rate: number
}

export async function createShipment(params: {
  toName: string
  toStreet: string
  toCity: string
  toState: string
  toZip: string
  fromName: string
  fromStreet: string
  fromCity: string
  fromState: string
  fromZip: string
  weightOz: number
}): Promise<ShipmentResult> {
  const headers = {
    Authorization: `Bearer ${process.env.EASYPOST_API_KEY}`,
    'Content-Type': 'application/json',
  }

  const shipmentRes = await fetch(`${EASYPOST_BASE}/shipments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      shipment: {
        to_address: { name: params.toName, street1: params.toStreet, city: params.toCity, state: params.toState, zip: params.toZip, country: 'US' },
        from_address: { name: params.fromName, street1: params.fromStreet, city: params.fromCity, state: params.fromState, zip: params.fromZip, country: 'US' },
        parcel: { weight: params.weightOz },
      },
    }),
  })

  const shipment = await shipmentRes.json()
  const uspsRates = shipment.rates.filter((r: { carrier: string }) => r.carrier === 'USPS')
  const cheapest = uspsRates.sort((a: { rate: string }, b: { rate: string }) => parseFloat(a.rate) - parseFloat(b.rate))[0]

  const buyRes = await fetch(`${EASYPOST_BASE}/shipments/${shipment.id}/buy`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ rate: { id: cheapest.id } }),
  })

  const bought = await buyRes.json()
  const carrierRate = parseFloat(cheapest.rate)

  return {
    id: bought.id,
    tracking_code: bought.tracking_code,
    label_url: bought.postage_label.label_url,
    rate: carrierRate,
    charged_rate: Math.round(carrierRate * MARKUP * 100) / 100,
  }
}
