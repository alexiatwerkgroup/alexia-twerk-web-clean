// src/lib/stripe.ts
import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ''

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
})

// Pricing configuration
export const PRICING_TIERS = {
  basic: {
    name: 'Basic',
    price: 4.99,
    features: [
      'Access to Free Portal',
      'Basic Portal Access',
      '10 Tokens Daily',
      'Watch History',
    ],
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC || '',
  },
  medium: {
    name: 'Medium',
    price: 9.99,
    features: [
      'Everything in Basic',
      'Private Portal Access',
      '20 Tokens Daily',
      'Priority Support',
      'Offline Downloads',
    ],
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MEDIUM || '',
  },
  full: {
    name: 'Full Access',
    price: 19.99,
    features: [
      'Everything in Medium',
      'Playlist Portal Access',
      '50 Tokens Daily',
      '24/7 Premium Support',
      'HD Quality',
      'Ad-Free Experience',
    ],
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FULL || '',
  },
}

// ==========================================
// CUSTOMER FUNCTIONS
// ==========================================

export async function getOrCreateCustomer(
  email: string,
  userId: string,
  name?: string
): Promise<string | null> {
  try {
    // Check if customer exists
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0].id
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name: name || email,
      metadata: {
        user_id: userId,
      },
    })

    return customer.id
  } catch (error) {
    console.error('Error getting/creating customer:', error)
    return null
  }
}

// ==========================================
// SUBSCRIPTION FUNCTIONS
// ==========================================

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string | null> {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'required',
      allow_promotion_codes: true,
    })

    return session.id
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return null
  }
}

export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    return subscription
  } catch (error) {
    console.error('Error retrieving subscription:', error)
    return null
  }
}

export async function cancelSubscription(
  subscriptionId: string,
  immediate: boolean = false
): Promise<boolean> {
  try {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: !immediate,
    })
    return true
  } catch (error) {
    console.error('Error canceling subscription:', error)
    return false
  }
}

export async function updateSubscription(
  subscriptionId: string,
  priceId: string
): Promise<boolean> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
    })

    return true
  } catch (error) {
    console.error('Error updating subscription:', error)
    return false
  }
}

// ==========================================
// WEBHOOK VERIFICATION
// ==========================================

export async function verifyWebhookSignature(
  body: Buffer,
  signature: string
): Promise<Stripe.Event | null> {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    return event
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return null
  }
}

// ==========================================
// INVOICE FUNCTIONS
// ==========================================

export async function getInvoices(
  customerId: string
): Promise<Stripe.Invoice[]> {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 100,
    })

    return invoices.data
  } catch (error) {
    console.error('Error retrieving invoices:', error)
    return []
  }
}

// ==========================================
// PAYMENT METHOD FUNCTIONS
// ==========================================

export async function getPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })

    return paymentMethods.data
  } catch (error) {
    console.error('Error retrieving payment methods:', error)
    return []
  }
}

export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<boolean> {
  try {
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    })

    return true
  } catch (error) {
    console.error('Error setting default payment method:', error)
    return false
  }
}

// ==========================================
// REFUND FUNCTIONS
// ==========================================

export async function refundInvoice(
  invoiceId: string,
  chargeId: string
): Promise<boolean> {
  try {
    await stripe.refunds.create({
      charge: chargeId,
    })

    return true
  } catch (error) {
    console.error('Error refunding invoice:', error)
    return false
  }
}

// ==========================================
// PRICE HELPER FUNCTIONS
// ==========================================

export function getPriceAmount(tier: 'basic' | 'medium' | 'full'): number {
  return PRICING_TIERS[tier]?.price || 0
}

export function getPriceId(tier: 'basic' | 'medium' | 'full'): string {
  return PRICING_TIERS[tier]?.stripe_price_id || ''
}

export function getTierFromPriceId(priceId: string): 'basic' | 'medium' | 'full' | null {
  for (const [tier, config] of Object.entries(PRICING_TIERS)) {
    if (config.stripe_price_id === priceId) {
      return tier as 'basic' | 'medium' | 'full'
    }
  }
  return null
}

// ==========================================
// CUSTOMER PORTAL
// ==========================================

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string | null> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return session.url
  } catch (error) {
    console.error('Error creating billing portal session:', error)
    return null
  }
}
