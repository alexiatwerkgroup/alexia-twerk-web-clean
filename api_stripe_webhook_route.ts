// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stripe, verifyWebhookSignature, getTierFromPriceId } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

// ==========================================
// STRIPE WEBHOOK HANDLER
// ==========================================

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text()

    // Get signature
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(Buffer.from(body), signature)

    if (!event) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Handle events
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event as Stripe.Event)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event as Stripe.Event)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event as Stripe.Event)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event as Stripe.Event)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event as Stripe.Event)
        break

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event as Stripe.Event)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// ==========================================
// EVENT HANDLERS
// ==========================================

async function handleSubscriptionCreated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription

  try {
    // Get customer ID
    const customerId = subscription.customer as string

    // Get customer metadata for user_id
    const customer = await stripe.customers.retrieve(customerId)
    const userId = (customer.metadata as any)?.user_id

    if (!userId) {
      console.error('No user_id in customer metadata')
      return
    }

    // Get subscription tier from price
    const priceId = (subscription.items.data[0].price as Stripe.Price).id
    const tier = getTierFromPriceId(priceId)

    if (!tier) {
      console.error('Unknown price ID:', priceId)
      return
    }

    // Update user subscription level
    const { error } = await supabaseAdmin
      .rpc('update_subscription_level', {
        p_user_id: userId,
        p_level: tier,
        p_stripe_subscription_id: subscription.id,
        p_stripe_price_id: priceId,
      })

    if (error) {
      console.error('Error updating subscription:', error)
      return
    }

    console.log(`Subscription created for user ${userId} - tier: ${tier}`)
  } catch (error) {
    console.error('Error in handleSubscriptionCreated:', error)
  }
}

async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription

  try {
    const customerId = subscription.customer as string
    const customer = await stripe.customers.retrieve(customerId)
    const userId = (customer.metadata as any)?.user_id

    if (!userId) {
      console.error('No user_id in customer metadata')
      return
    }

    // Get new tier
    const priceId = (subscription.items.data[0].price as Stripe.Price).id
    const tier = getTierFromPriceId(priceId)

    if (!tier) {
      console.error('Unknown price ID:', priceId)
      return
    }

    // Update user subscription
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        level: tier,
        stripe_price_id: priceId,
        status: subscription.status as any,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('Error updating subscription record:', error)
      return
    }

    // Update user profile
    await supabaseAdmin
      .from('users_profile')
      .update({
        subscription_level: tier,
        subscription_end_date: new Date(subscription.current_period_end * 1000),
      })
      .eq('id', userId)

    console.log(`Subscription updated for user ${userId} - tier: ${tier}`)
  } catch (error) {
    console.error('Error in handleSubscriptionUpdated:', error)
  }
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription

  try {
    const customerId = subscription.customer as string
    const customer = await stripe.customers.retrieve(customerId)
    const userId = (customer.metadata as any)?.user_id

    if (!userId) {
      console.error('No user_id in customer metadata')
      return
    }

    // Downgrade to free
    const { error } = await supabaseAdmin
      .from('users_profile')
      .update({
        subscription_level: 'free',
        stripe_subscription_id: null,
        subscription_end_date: null,
      })
      .eq('id', userId)

    if (error) {
      console.error('Error downgrading user:', error)
      return
    }

    console.log(`Subscription canceled for user ${userId}`)
  } catch (error) {
    console.error('Error in handleSubscriptionDeleted:', error)
  }
}

async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice

  console.log(`Invoice payment succeeded: ${invoice.id}`)

  try {
    const customerId = invoice.customer as string
    const customer = await stripe.customers.retrieve(customerId)
    const userId = (customer.metadata as any)?.user_id

    if (userId) {
      // Award bonus tokens for successful payment
      await supabaseAdmin
        .rpc('add_tokens', {
          p_user_id: userId,
          p_amount: 25,
          p_action: 'purchase',
          p_description: 'Bonus tokens for successful payment',
          p_metadata: {
            invoice_id: invoice.id,
            amount: invoice.amount_paid,
          },
        })
    }
  } catch (error) {
    console.error('Error in handleInvoicePaymentSucceeded:', error)
  }
}

async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice

  console.log(`Invoice payment failed: ${invoice.id}`)

  try {
    const customerId = invoice.customer as string
    const customer = await stripe.customers.retrieve(customerId)
    const userId = (customer.metadata as any)?.user_id

    if (userId) {
      // Send notification about failed payment
      // TODO: Implement email notification service
      console.log(`Payment failed for user: ${userId}`)
    }
  } catch (error) {
    console.error('Error in handleInvoicePaymentFailed:', error)
  }
}

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session

  try {
    const customerId = session.customer as string
    const subscriptionId = session.subscription as string

    if (!customerId || !subscriptionId) {
      return
    }

    const customer = await stripe.customers.retrieve(customerId)
    const userId = (customer.metadata as any)?.user_id

    if (!userId) {
      console.error('No user_id in customer metadata')
      return
    }

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const priceId = (subscription.items.data[0].price as Stripe.Price).id
    const tier = getTierFromPriceId(priceId)

    if (!tier) {
      console.error('Unknown price ID:', priceId)
      return
    }

    // Update user subscription
    const { error } = await supabaseAdmin
      .rpc('update_subscription_level', {
        p_user_id: userId,
        p_level: tier,
        p_stripe_subscription_id: subscriptionId,
        p_stripe_price_id: priceId,
      })

    if (error) {
      console.error('Error updating subscription:', error)
      return
    }

    console.log(
      `Checkout completed for user ${userId} - tier: ${tier}`
    )
  } catch (error) {
    console.error('Error in handleCheckoutCompleted:', error)
  }
}
