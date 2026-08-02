async function testApi() {
  try {
    // Login
    const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@natca.gov.sl',
        password: 'Admin@12345'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    // Post to USSD
    const ussdRes = await fetch('http://localhost:5000/api/v1/ussd', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({
        operatorId: null,
        serviceCategory: 'GENERAL',
        code: '5050',
        description: 'NatCA Toll Free',
        isActive: true
      })
    });

    const ussdData = await ussdRes.json();
    if (!ussdRes.ok) {
      console.error('ERROR HTTP', ussdRes.status, ussdData);
    } else {
      console.log('SUCCESS:', ussdData);
    }
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}
testApi();
