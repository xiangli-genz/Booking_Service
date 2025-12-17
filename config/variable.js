module.exports.pathAdmin = 'admin';

module.exports.paymentMethod = [
  {
    label: "Thanh toán tiền mặt tại quầy",
    value: "money"
  },
  {
    label: "ZaloPay",
    value: "zalopay"
  },
  {
    label: "Momo",
    value: "momo"
  },
  {
    label: "Chuyển khoản ngân hàng",
    value: "bank"
  }
];

module.exports.paymentStatus = [
  {
    label: "Chưa thanh toán",
    value: "unpaid"
  },
  {
    label: "Đã thanh toán",
    value: "paid"
  }
];

module.exports.bookingStatus = [
  {
    label: "Đang xử lý",
    value: "initial"
  },
  {
    label: "Đã xác nhận",
    value: "confirmed"
  },
  {
    label: "Đã hủy",
    value: "cancelled"
  },
  {
    label: "Hoàn thành",
    value: "completed"
  }
];

// Thể loại phim
module.exports.movieCategories = [
  "Hành động",
  "Phiêu lưu",
  "Hoạt hình",
  "Hài",
  "Tội phạm",
  "Tài liệu",
  "Kịch",
  "Gia đình",
  "Giả tưởng",
  "Lịch sử",
  "Kinh dị",
  "Nhạc kịch",
  "Bí ẩn",
  "Lãng mạn",
  "Khoa học viễn tưởng",
  "Kinh dị",
  "Thể thao",
  "Gây cấn",
  "Chiến tranh",
  "Miền Tây"
];

// Phân loại độ tuổi
module.exports.ageRatings = [
  {
    label: "P - Phù hợp với mọi lứa tuổi",
    value: "P"
  },
  {
    label: "T13 - Không phù hợp với trẻ em dưới 13 tuổi",
    value: "T13"
  },
  {
    label: "T16 - Không phù hợp với trẻ em dưới 16 tuổi",
    value: "T16"
  },
  {
    label: "T18 - Không phù hợp với trẻ em dưới 18 tuổi",
    value: "T18"
  },
  {
    label: "C - Cấm khán giả dưới 18 tuổi",
    value: "C"
  }
];

// Định dạng phim
module.exports.movieFormats = ["2D", "3D", "IMAX", "4DX"];

// Combo bắp nước mặc định
module.exports.defaultCombos = [
  {
    id: "popcorn",
    name: "Bắp Rang Bơ",
    price: 45000,
    description: "1 bắp rang bơ (L)"
  },
  {
    id: "coke",
    name: "Nước Ngọt",
    price: 35000,
    description: "1 ly nước ngọt (L)"
  },
  {
    id: "hotdog",
    name: "Hotdog",
    price: 30000,
    description: "1 hotdog"
  },
  {
    id: "water",
    name: "Nước Suối",
    price: 15000,
    description: "1 chai nước suối"
  },
  {
    id: "comboset",
    name: "Combo Set",
    price: 95000,
    description: "1 bắp (L) + 2 nước ngọt (L)"
  }
];

// Loại ghế
module.exports.seatTypes = [
  {
    label: "Ghế thường",
    value: "standard",
    defaultPrice: 50000
  },
  {
    label: "Ghế VIP",
    value: "vip",
    defaultPrice: 60000
  },
  {
    label: "Ghế đôi",
    value: "couple",
    defaultPrice: 110000
  }
];