const router = require('express').Router();
const bookingController = require("../../controllers/client/booking.controller");

router.get('/combo', bookingController.combo);

// Xác nhận thanh toán
router.get('/checkout', bookingController.checkout);

router.post('/create', bookingController.createPost);

router.get('/success', bookingController.success);

router.get('/booked-seats', bookingController.getBookedSeats);

// ZaloPay payment
router.get('/payment-zalopay', async (req, res) => {
  try {
    const bookingId = req.query.bookingId;
  
    const Booking = require("../../models/booking.model");
    const bookingDetail = await Booking.findOne({
      _id: bookingId,
      paymentStatus: "unpaid",
      deleted: false
    });

    if(!bookingDetail) {
      res.redirect("/");
      return;
    }

    const axios = require('axios').default;
    const CryptoJS = require('crypto-js');
    const moment = require('moment');

    const config = {
      app_id: process.env.ZALOPAY_APPID,
      key1: process.env.ZALOPAY_KEY1,
      key2: process.env.ZALOPAY_KEY2,
      endpoint: `${process.env.ZALOPAY_DOMAIN}/v2/create`
    };

    const embed_data = {
      redirecturl: `${process.env.DOMAIN_WEBSITE}/booking/success?bookingId=${bookingDetail.id}&phone=${bookingDetail.phone}`
    };

    const items = [{}];
    const transID = Math.floor(Math.random() * 1000000);
    const order = {
      app_id: config.app_id,
      app_trans_id: `${moment().format('YYMMDD')}_${transID}`,
      app_user: `${bookingDetail.phone}-${bookingDetail.id}`,
      app_time: Date.now(),
      item: JSON.stringify(items),
      embed_data: JSON.stringify(embed_data),
      amount: bookingDetail.total,
      description: `Thanh toán đặt vé ${bookingDetail.bookingCode}`,
      bank_code: "",
      callback_url: `${process.env.DOMAIN_WEBSITE}/booking/payment-zalopay-result`
    };

    const data = config.app_id + "|" + order.app_trans_id + "|" + order.app_user + "|" + order.amount + "|" + order.app_time + "|" + order.embed_data + "|" + order.item;
    order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    const response = await axios.post(config.endpoint, null, { params: order });
    if(response.data.return_code == 1) {
      res.redirect(response.data.order_url);
    } else {
      res.redirect("/");
    }
  } catch (error) {
    res.redirect("/");
  }
});

router.post('/payment-zalopay-result', async (req, res) => {
  const CryptoJS = require('crypto-js');
  const Booking = require("../../models/booking.model");

  const config = {
    key2: process.env.ZALOPAY_KEY2
  };

  let result = {};

  try {
    let dataStr = req.body.data;
    let reqMac = req.body.mac;

    let mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();

    if (reqMac !== mac) {
      result.return_code = -1;
      result.return_message = "mac not equal";
    } else {
      let dataJson = JSON.parse(dataStr, config.key2);
      const [ phone, bookingId ] = dataJson.app_user.split("-");

      await Booking.updateOne({
        _id: bookingId,
        phone: phone,
        deleted: false
      }, {
        paymentStatus: "paid",
        status: "confirmed"
      });

      result.return_code = 1;
      result.return_message = "success";
    }
  } catch (ex) {
    result.return_code = 0;
    result.return_message = ex.message;
  }

  res.json(result);
});

module.exports = router;