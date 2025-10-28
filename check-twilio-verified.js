#!/usr/bin/env node
/**
 * Check Twilio Verified Numbers
 */

require('dotenv').config();
const twilio = require('twilio');

async function checkVerification() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const toNumber = '+19802203489';
  
  console.log('🔍 Checking Twilio verification requirements...\n');
  
  try {
    const client = twilio(accountSid, authToken);
    
    // Get account info
    const account = await client.api.accounts(accountSid).fetch();
    
    console.log('Account Information:');
    console.log(`  Name: ${account.friendlyName}`);
    console.log(`  Status: ${account.status}`);
    console.log(`  Type: ${account.type}`);
    
    // Check if this is a trial account
    const isTrial = account.type === 'Trial';
    
    console.log(`\n📱 Phone Number to send to: ${toNumber}`);
    console.log(`\n${isTrial ? '⚠️  TRIAL ACCOUNT DETECTED' : '✅ Production Account'}`);
    
    if (isTrial) {
      console.log('\n📝 IMPORTANT: Twilio Trial Accounts require phone verification');
      console.log('\nTo send SMS messages to 980-220-3489:');
      console.log('\nOption 1: Verify the Phone Number');
      console.log('1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
      console.log('2. Click "Add a new number"');
      console.log('3. Enter: +19802203489');
      console.log('4. Click "Call me" or "Text me" to verify');
      console.log('\nOption 2: Upgrade to Production Account');
      console.log('1. Go to: https://console.twilio.com/billing/overview');
      console.log('2. Add payment method');
      console.log('3. Account will be upgraded automatically');
      
      console.log('\n💡 For testing, you can also send to your own verified number');
    } else {
      console.log('\n✅ Production account - no verification needed for most numbers');
      console.log('\nIf still not receiving:');
      console.log('1. Check phone number format');
      console.log('2. Verify carrier supports SMS');
      console.log('3. Check for blocked messages');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkVerification();




