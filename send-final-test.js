#!/usr/bin/env node
require('dotenv').config();
const smsService = require('./server/services/smsService');

async function test() {
  console.log('📱 Sending test SMS to verified number...\n');
  
  try {
    const result = await smsService.sendSMS(
      '+19802203489',
      '✅ Chess Tournament SMS Test\n\n' +
      'Congratulations! Your SMS notifications are now working!\n\n' +
      'You\'ll automatically receive notifications when pairings are generated.\n\n' +
      'This means your tournament players will get instant updates via text! 🎯'
    );
    
    console.log('✅ SMS Sent Successfully!');
    console.log('\nDetails:');
    console.log(`  Message ID: ${result.messageId}`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Method: ${result.method}`);
    
    console.log('\n📱 Check your phone for the message!');
    console.log('\n🎉 Your SMS notification system is fully operational!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();




