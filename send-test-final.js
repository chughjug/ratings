#!/usr/bin/env node
require('dotenv').config();
const smsService = require('./server/services/smsService');

async function test() {
  console.log('📱 Sending short test SMS...\n');
  
  const message = '🏆 R2 WHITE vs Jane Smith Board 5';
  
  console.log('Message:', message);
  console.log('Length:', message.length, 'characters (under 160 limit)\n');
  
  try {
    const result = await smsService.sendSMS('+19802203489', message);
    
    console.log('✅ SMS Sent Successfully!');
    console.log('\nDetails:');
    console.log(`  Message ID: ${result.messageId}`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Method: ${result.method}`);
    console.log(`  Length: ${message.length} characters`);
    
    console.log('\n📱 Check your phone for the message!');
    console.log('\n✅ Your SMS system is ready for tournaments!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();




