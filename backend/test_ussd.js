import { createUssdCode } from './src/modules/ussd/ussd.service.js';

async function test() {
  try {
    const res = await createUssdCode({
      operatorId: null,
      serviceCategory: 'GENERAL',
      code: '5050',
      description: 'NatCA Toll Free',
      isActive: true
    });
    console.log('SUCCESS:', res);
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    process.exit(0);
  }
}
test();
