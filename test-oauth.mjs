import axios from 'axios';

const testOAuthCallback = async () => {
  try {
    // محاكاة طلب OAuth callback
    const testCode = "test-code-123";
    const testState = Buffer.from("https://3000-i9nttuajr1do8seezzfz4-7f31f148.us2.manus.computer/api/oauth/callback").toString('base64');
    
    console.log("🔍 اختبار OAuth Callback:");
    console.log("Code:", testCode);
    console.log("State (base64):", testState);
    console.log("Decoded State:", Buffer.from(testState, 'base64').toString());
    
    // محاولة الاتصال بـ OAuth server
    const response = await axios.post('https://api.manus.im/webdev.v1.WebDevAuthPublicService/ExchangeToken', {
      clientId: process.env.VITE_APP_ID || "unknown",
      grantType: "authorization_code",
      code: testCode,
      redirectUri: Buffer.from(testState, 'base64').toString(),
    }, {
      timeout: 5000
    });
    
    console.log("✅ OAuth Server Response:", response.data);
  } catch (error) {
    console.error("❌ OAuth Error:", error.response?.data || error.message);
    console.error("Status:", error.response?.status);
  }
};

testOAuthCallback();
