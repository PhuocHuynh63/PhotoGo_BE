const axios = require('axios');

// Thay thế bằng API key thực của bạn
const GOONG_API_KEY = 'your_goong_api_key_here';

async function testGoongAPI() {
  try {
    console.log('🔍 Testing GoongAPI...');
    
    // Test 1: Geocoding
    console.log('\n📍 Test 1: Geocoding');
    const geocodingResponse = await axios.get('https://rsapi.goong.io/geocode', {
      params: {
        address: '123 Đường ABC, Quận 1, TP. Hồ Chí Minh',
        api_key: GOONG_API_KEY,
      },
    });
    
    if (geocodingResponse.data.status === 'OK') {
      console.log('✅ Geocoding: SUCCESS');
      console.log(`   Coordinates: ${geocodingResponse.data.results[0].geometry.location.lat}, ${geocodingResponse.data.results[0].geometry.location.lng}`);
    } else {
      console.log('❌ Geocoding: FAILED');
      console.log(`   Status: ${geocodingResponse.data.status}`);
    }
    
    // Test 2: Reverse Geocoding
    console.log('\n🔄 Test 2: Reverse Geocoding');
    const reverseResponse = await axios.get('https://rsapi.goong.io/geocode', {
      params: {
        latlng: '10.762622,106.660172',
        api_key: GOONG_API_KEY,
      },
    });
    
    if (reverseResponse.data.status === 'OK') {
      console.log('✅ Reverse Geocoding: SUCCESS');
      console.log(`   Address: ${reverseResponse.data.results[0].formatted_address}`);
    } else {
      console.log('❌ Reverse Geocoding: FAILED');
      console.log(`   Status: ${reverseResponse.data.status}`);
    }
    
    // Test 3: Place Search
    console.log('\n🔍 Test 3: Place Search');
    const placeResponse = await axios.get('https://rsapi.goong.io/place/autocomplete', {
      params: {
        input: 'Nhà hàng',
        api_key: GOONG_API_KEY,
      },
    });
    
    if (placeResponse.data.status === 'OK') {
      console.log('✅ Place Search: SUCCESS');
      console.log(`   Found ${placeResponse.data.predictions.length} places`);
    } else {
      console.log('❌ Place Search: FAILED');
      console.log(`   Status: ${placeResponse.data.status}`);
    }
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Error testing GoongAPI:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

// Chạy test
testGoongAPI(); 