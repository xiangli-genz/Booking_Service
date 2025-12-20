const testBookingService = async () => {
  const BASE_URL = 'http://localhost:3001';
  
  console.log('🧪 BẮT ĐẦU TEST BOOKING SERVICE\n');
  
  // Test 1: Tạo booking mới
  console.log('✅ Test 1: Tạo booking tạm thời');
  const createResponse = await fetch(`${BASE_URL}/api/bookings/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      movieId: 'test-movie-123',
      movieName: 'Avengers: Endgame',
      movieAvatar: '/images/avengers.jpg',
      cinema: 'CGV Vincom',
      showtimeDate: new Date().toISOString(),
      showtimeTime: '14:00',
      showtimeFormat: '2D',
      seats: [
        { seatNumber: 'A1', type: 'standard', price: 50000 },
        { seatNumber: 'A2', type: 'standard', price: 50000 }
      ],
      userId: 'test-user-456'
    })
  });
  
  const createData = await createResponse.json();
  console.log('Response:', createData);
  
  if (createData.code !== 'success') {
    console.log('❌ FAILED: Không tạo được booking\n');
    return;
  }
  
  const bookingId = createData.data.bookingId;
  const timeRemaining = createData.data.timeRemaining;
  console.log(`✅ PASSED: Booking ID = ${bookingId}, Time = ${timeRemaining}s\n`);
  
  // Test 2: Kiểm tra ghế đã đặt
  console.log('✅ Test 2: Lấy danh sách ghế đã đặt');
  const bookedResponse = await fetch(
    `${BASE_URL}/api/bookings/seats/booked?movieId=test-movie-123&cinema=CGV+Vincom&date=${new Date().toISOString()}&time=14:00`
  );
  
  const bookedData = await bookedResponse.json();
  console.log('Ghế đã đặt:', bookedData.data.bookedSeats);
  console.log(bookedData.data.bookedSeats.includes('A1') ? '✅ PASSED\n' : '❌ FAILED\n');
  
  // Test 3: Cập nhật combo
  console.log('✅ Test 3: Cập nhật combo');
  const comboResponse = await fetch(`${BASE_URL}/api/bookings/${bookingId}/combos`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      combos: {
        'popcorn': { name: 'Bắp Rang Bơ', quantity: 2, price: 45000 },
        'coke': { name: 'Nước Ngọt', quantity: 2, price: 35000 }
      }
    })
  });
  
  const comboData = await comboResponse.json();
  console.log('Combo Total:', comboData.data?.comboTotal);
  console.log(comboData.data?.comboTotal === 160000 ? '✅ PASSED\n' : '❌ FAILED\n');
  
  // Test 4: Kiểm tra thời gian còn lại
  console.log('✅ Test 4: Kiểm tra trạng thái booking');
  const statusResponse = await fetch(`${BASE_URL}/api/bookings/${bookingId}/status`);
  const statusData = await statusResponse.json();
  console.log('Time Remaining:', statusData.data?.timeRemaining + 's');
  console.log(statusData.data?.timeRemaining > 0 ? '✅ PASSED\n' : '❌ FAILED\n');
  
  // Test 5: Xác nhận booking
  console.log('✅ Test 5: Xác nhận booking');
  const confirmResponse = await fetch(`${BASE_URL}/api/bookings/${bookingId}/confirm`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Nguyễn Văn A',
      phone: '0987654321',
      email: 'test@example.com',
      paymentMethod: 'money'
    })
  });
  
  const confirmData = await confirmResponse.json();
  console.log('Status:', confirmData.data?.status);
  console.log(confirmData.data?.status === 'initial' ? '✅ PASSED\n' : '❌ FAILED\n');
  
  // Test 6: Thử đặt lại ghế đã confirm
  console.log('✅ Test 6: Kiểm tra conflict khi đặt ghế đã có người đặt');
  const conflictResponse = await fetch(`${BASE_URL}/api/bookings/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      movieId: 'test-movie-123',
      movieName: 'Avengers: Endgame',
      cinema: 'CGV Vincom',
      showtimeDate: new Date().toISOString(),
      showtimeTime: '14:00',
      showtimeFormat: '2D',
      seats: [
        { seatNumber: 'A1', type: 'standard', price: 50000 }
      ]
    })
  });
  
  const conflictData = await conflictResponse.json();
  console.log('Expected conflict:', conflictData.code === 'error');
  console.log(conflictData.code === 'error' ? '✅ PASSED\n' : '❌ FAILED\n');
  
  // Test 7: Thống kê
  console.log('✅ Test 7: Lấy thống kê booking');
  const statsResponse = await fetch(`${BASE_URL}/api/bookings/statistics?movieId=test-movie-123`);
  const statsData = await statsResponse.json();
  console.log('Total Bookings:', statsData.data?.total?.bookings);
  console.log(statsData.data?.total?.bookings > 0 ? '✅ PASSED\n' : '❌ FAILED\n');
  
  console.log('🎉 HOÀN THÀNH TẤT CẢ TESTS!');
};