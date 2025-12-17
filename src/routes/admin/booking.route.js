const router = require("express").Router();
const Booking = require("../../models/booking.model");
const User = require("../../models/user.model");
const moment = require("moment");
const bookingValidate = require("../../validates/admin/booking.validate");

// Danh sách đặt vé
router.get("/list", async (req, res) => {
  const find = {
    deleted: false
  };

  const dateFiler = {};

  if(req.query.startDate) {
    const startDate = moment(req.query.startDate).startOf("date").toDate();
    dateFiler.$gte = startDate;
  }

  if(req.query.endDate) {
    const endDate = moment(req.query.endDate).endOf("date").toDate();
    dateFiler.$lte = endDate;
  }

  if(Object.keys(dateFiler).length > 0) {
    find.createdAt = dateFiler;
  }

  if (req.query.keyword) {
    const kw = req.query.keyword.trim();
    if (kw.length > 0) {
      const keywordRegex = new RegExp(kw, "i");
      find.$or = [
        { bookingCode: keywordRegex },
        { fullName: keywordRegex },
        { phone: keywordRegex }
      ];
    }
  }

  // PHÂN TRANG
  const limit = 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const totalRecords = await Booking.countDocuments(find);
  const totalPages = Math.ceil(totalRecords / limit);

  const bookingList = await Booking
    .find(find)
    .sort({
      createdAt: "desc"
    })
    .skip(skip)
    .limit(limit);

  for (const booking of bookingList) {
    booking.paymentMethodName = {
      money: "Tiền mặt",
      zalopay: "ZaloPay",
      bank: "Chuyển khoản",
      momo: "Momo"
    }[booking.paymentMethod] || booking.paymentMethod;

    booking.paymentStatusName = booking.paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán";

    booking.statusName = {
      initial: "Đang xử lý",
      confirmed: "Đã xác nhận", 
      cancelled: "Đã hủy",
      completed: "Hoàn thành"
    }[booking.status] || booking.status;

    booking.createdAtTime = moment(booking.createdAt).format("HH:mm");
    booking.createdAtDate = moment(booking.createdAt).format("DD/MM/YYYY");
    if(booking.showtime && booking.showtime.date) {
      booking.showtimeDateFormat = moment(booking.showtime.date).format("DD/MM/YYYY");
    } else {
      booking.showtimeDateFormat = "--";
    }
    
    // Nếu có userId, gắn thông tin user để hiển thị
    if(booking.userId) {
      try {
        const userInfo = await User.findOne({ _id: booking.userId }).select('fullName email');
        booking.userFullName = userInfo ? (userInfo.fullName || userInfo.email) : null;
      } catch (e) {
        booking.userFullName = null;
      }
    }
  }

  res.render("admin/pages/booking-list", {
    pageTitle: "Quản lý đặt vé",
    bookingList: bookingList,
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalRecords: totalRecords,
      limit: limit,
      endRecord: Math.min(page * limit, totalRecords)
    }
  });
});

// Chi tiết đặt vé
router.get('/edit/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const bookingDetail = await Booking.findOne({
      _id: id,
      deleted: false
    });

    if(!bookingDetail) {
      res.redirect(`/${pathAdmin}/booking/list`);
      return;
    }

    bookingDetail.createdAtFormat = moment(bookingDetail.createdAt).format("YYYY-MM-DDTHH:mm");
    if(bookingDetail.showtime && bookingDetail.showtime.date) {
      bookingDetail.showtimeDateFormat = moment(bookingDetail.showtime.date).format("DD/MM/YYYY");
    } else {
      bookingDetail.showtimeDateFormat = "--";
    }

    res.render("admin/pages/booking-edit", {
      pageTitle: `Đặt vé: ${bookingDetail.bookingCode}`,
      bookingDetail: bookingDetail,
      paymentMethod: [
        { label: "Tiền mặt", value: "money" },
        { label: "ZaloPay", value: "zalopay" },
        { label: "Momo", value: "momo" },
        { label: "Chuyển khoản", value: "bank" }
      ],
      paymentStatus: [
        { label: "Chưa thanh toán", value: "unpaid" },
        { label: "Đã thanh toán", value: "paid" }
      ],
      bookingStatus: [
        { label: "Đang xử lý", value: "initial" },
        { label: "Đã xác nhận", value: "confirmed" },
        { label: "Đã hủy", value: "cancelled" },
        { label: "Hoàn thành", value: "completed" }
      ]
    });
  } catch (error) {
    res.redirect(`/${pathAdmin}/booking/list`);
  }
});

// Cập nhật đặt vé
router.patch('/edit/:id', bookingValidate.editPatch, async (req, res) => {
  try {
    const id = req.params.id;

    const booking = await Booking.findOne({
      _id: id,
      deleted: false
    });

    if(!booking) {
      return res.json({
        code: "error",
        message: "Thông tin đặt vé không hợp lệ!"
      });
    }

    await Booking.updateOne({
      _id: id,
      deleted: false
    }, {
      fullName: req.body.fullName,
      phone: req.body.phone,
      email: req.body.email,
      note: req.body.note,
      paymentMethod: req.body.paymentMethod,
      paymentStatus: req.body.paymentStatus,
      status: req.body.status
    });

    req.flash("success", "Cập nhật đặt vé thành công!");

    res.json({
      code: "success"
    });
  } catch (error) {
    res.json({
      code: "error",
      message: "Thông tin đặt vé không hợp lệ!"
    });
  }
});

// Xóa đặt vé
router.patch('/delete/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    await Booking.deleteOne({
      _id: id
    });

    req.flash("success", "Xóa đặt vé thành công!");

    res.json({
      code: "success"
    });
  } catch (error) {
    res.json({
      code: "error",
      message: "Id không hợp lệ!"
    });
  }
});

module.exports = router;